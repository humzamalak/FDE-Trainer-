"""FDE Trainer web server.

Run:  python -m uvicorn server.app:app --port 8765
Then open http://127.0.0.1:8765
"""

from __future__ import annotations

import json
import mimetypes
import threading
from datetime import date
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from server.content import Content
from server.generate import generate_exercise, validate_exercise
from server.stats import compute_stats, review_items
from server.tutor import MODES, api_key_present, stream_reply

mimetypes.add_type("application/wasm", ".wasm")  # Pyodide loads faster with the right type

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

CONTENT = Content(ROOT / "content")
DATA_DIR = ROOT / "data"
PROGRESS_FILE = DATA_DIR / "progress.json"
CHATS_FILE = DATA_DIR / "chats.json"
GENERATED_FILE = DATA_DIR / "generated.json"
_lock = threading.Lock()

app = FastAPI(title="FDE Trainer")


# ---------- content ----------

@app.get("/api/curriculum")
def curriculum() -> dict:
    CONTENT.reload()  # pick up edits to the Markdown files without a restart
    return {"tracks": CONTENT.curriculum(), "tutor_ready": api_key_present(), "modes": list(MODES)}


@app.get("/api/lesson/{lesson_id:path}")
def lesson(lesson_id: str) -> dict:
    data = CONTENT.lesson(lesson_id)
    if data is None:
        raise HTTPException(404, "Lesson not found")
    return data


# ---------- progress (stored in data/progress.json, not in git) ----------

EMPTY_PROGRESS = {"lessons": {}, "exercises": {}, "quizzes": {}, "written": {}, "last_lesson": None, "activity": {}}
ACTIVITY_SECTIONS = {"lessons", "exercises", "quizzes", "written"}  # these count as a study day


def read_progress() -> dict:
    if not PROGRESS_FILE.exists():
        return json.loads(json.dumps(EMPTY_PROGRESS))
    try:
        data = json.loads(PROGRESS_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        backup = PROGRESS_FILE.with_suffix(".broken.json")
        PROGRESS_FILE.replace(backup)
        return json.loads(json.dumps(EMPTY_PROGRESS))
    return {**EMPTY_PROGRESS, **data}


class ProgressUpdate(BaseModel):
    section: str  # lessons | exercises | quizzes | written | last_lesson
    key: str | None = None
    value: object = None


@app.get("/api/progress")
def get_progress() -> dict:
    with _lock:
        return read_progress()


def write_json(path: Path, data: object) -> None:
    DATA_DIR.mkdir(exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, indent=2), encoding="utf-8")
    tmp.replace(path)  # atomic write: a crash never leaves half a file


@app.post("/api/progress")
def update_progress(update: ProgressUpdate) -> dict:
    if update.section not in EMPTY_PROGRESS or update.section == "activity":
        raise HTTPException(400, "Unknown section")
    with _lock:
        data = read_progress()
        if update.section == "last_lesson":
            data["last_lesson"] = update.value
        elif update.key:
            if update.value is None:
                data[update.section].pop(update.key, None)
            else:
                data[update.section][update.key] = update.value
                if update.section in ACTIVITY_SECTIONS:
                    today = date.today().isoformat()
                    data["activity"][today] = data["activity"].get(today, 0) + 1
        write_json(PROGRESS_FILE, data)
        return data


def merge_progress(server: dict, local: dict) -> dict:
    """Combine progress from the browser's localStorage with progress.json. Nothing done is ever lost.

    - lessons / written: keep every entry; the server's value wins when both have one
    - exercises: passed if passed in either copy; keep the server's code if it has some
    - quizzes: keep the server's answer, add answers only the browser has
    - activity: per day, the larger count
    """
    merged = {**EMPTY_PROGRESS, **json.loads(json.dumps(server))}
    for section in ("lessons", "written", "quizzes"):
        for key, value in (local.get(section) or {}).items():
            if value is not None and key not in merged[section]:
                merged[section][key] = value
    for key, value in (local.get("exercises") or {}).items():
        if not isinstance(value, dict):
            continue
        mine = merged["exercises"].get(key)
        if mine is None:
            merged["exercises"][key] = value
        else:
            mine["passed"] = bool(mine.get("passed") or value.get("passed"))
            if not mine.get("code") and value.get("code"):
                mine["code"] = value["code"]
    for day, count in (local.get("activity") or {}).items():
        if isinstance(count, int):
            merged["activity"][day] = max(merged["activity"].get(day, 0), count)
    if not merged.get("last_lesson") and local.get("last_lesson"):
        merged["last_lesson"] = local["last_lesson"]
    return merged


class ProgressMerge(BaseModel):
    progress: dict


@app.post("/api/progress/merge")
def merge_local_progress(body: ProgressMerge) -> dict:
    """The browser sends its localStorage copy on start-up; the result is saved and returned."""
    with _lock:
        merged = merge_progress(read_progress(), body.progress)
        write_json(PROGRESS_FILE, merged)
        return merged


# ---------- stats, streak and review queue ----------

@app.get("/api/stats")
def stats() -> dict:
    with _lock:
        progress = read_progress()
    return compute_stats(progress, CONTENT, date.today())


@app.get("/api/review")
def review() -> dict:
    with _lock:
        progress = read_progress()
    return {"items": review_items(progress, CONTENT)}


# ---------- saved tutor chats (data/chats.json) ----------

MAX_CHAT_MESSAGES = 200


def read_chats() -> dict:
    if not CHATS_FILE.exists():
        return {}
    try:
        return json.loads(CHATS_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


class ChatSave(BaseModel):
    messages: list[dict]


@app.get("/api/chats/{key:path}")
def get_chat(key: str) -> dict:
    with _lock:
        return {"messages": read_chats().get(key, [])}


@app.put("/api/chats/{key:path}")
def save_chat(key: str, body: ChatSave) -> dict:
    if len(key) > 200:
        raise HTTPException(400, "Key too long")
    clean = [
        {"role": m["role"], "content": str(m.get("content", ""))}
        for m in body.messages
        if m.get("role") in ("user", "assistant")
    ][-MAX_CHAT_MESSAGES:]
    with _lock:
        chats = read_chats()
        if clean:
            chats[key] = clean
        else:
            chats.pop(key, None)
        write_json(CHATS_FILE, chats)
    return {"saved": len(clean)}


# ---------- AI-generated practice exercises (data/generated.json) ----------

class GenerateRequest(BaseModel):
    lesson_id: str | None = None
    level: str = "same"
    feedback: str | None = None


def read_generated() -> dict:
    if not GENERATED_FILE.exists():
        return {}
    try:
        return json.loads(GENERATED_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


@app.post("/api/generate")
def generate(req: GenerateRequest) -> dict:
    lesson_data = CONTENT.lesson(req.lesson_id) if req.lesson_id else None
    with _lock:
        avoid = [e["title"] for e in read_generated().get(req.lesson_id or "general", [])]
    if lesson_data:
        avoid += [b["title"] for b in lesson_data["blocks"] if b["kind"] == "exercise"]
    return generate_exercise(lesson_data, req.level, avoid, req.feedback)


class SaveGenerated(BaseModel):
    lesson_id: str
    exercise: dict


@app.post("/api/generated")
def save_generated(body: SaveGenerated) -> dict:
    problems = validate_exercise(body.exercise)
    if problems:
        raise HTTPException(400, "; ".join(problems))
    with _lock:
        data = read_generated()
        items = data.setdefault(body.lesson_id, [])
        n = max([int(e["id"].rsplit("-", 1)[1]) for e in items] or [0]) + 1
        item = {
            "id": f"{body.lesson_id}#gen-{n}",
            "kind": "exercise",
            "generated": True,
            **{k: str(body.exercise.get(k, "")) for k in ("title", "prompt", "starter", "tests", "solution", "hint")},
        }
        items.append(item)
        write_json(GENERATED_FILE, data)
    return item


@app.get("/api/generated")
def list_generated(lesson_id: str | None = None) -> dict:
    with _lock:
        data = read_generated()
    if lesson_id is not None:
        return {"items": data.get(lesson_id, [])}
    return {"items": [e for items in data.values() for e in items]}


@app.delete("/api/generated")
def delete_generated(id: str) -> dict:
    with _lock:
        data = read_generated()
        for lesson_id, items in data.items():
            data[lesson_id] = [e for e in items if e["id"] != id]
        write_json(GENERATED_FILE, data)
    return {"deleted": id}


# ---------- AI tutor ----------

class TutorRequest(BaseModel):
    mode: str = "tutor"
    messages: list[dict]
    lesson_id: str | None = None
    context: str | None = None


@app.post("/api/tutor")
def tutor(req: TutorRequest) -> StreamingResponse:
    lesson_data = CONTENT.lesson(req.lesson_id) if req.lesson_id else None
    return StreamingResponse(
        stream_reply(req.mode, req.messages, lesson_data, req.context),
        media_type="text/plain; charset=utf-8",
    )


# ---------- static frontend ----------

app.mount("/static", StaticFiles(directory=ROOT / "static"), name="static")


@app.get("/")
def index() -> FileResponse:
    return FileResponse(ROOT / "static" / "index.html")
