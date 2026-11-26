"""FDE Trainer web server.

Run:  python -m uvicorn server.app:app --port 8765
Then open http://127.0.0.1:8765
"""

from __future__ import annotations

import json
import mimetypes
import re
import threading
from datetime import date
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from starlette.middleware.trustedhost import TrustedHostMiddleware

from server import config, usage
from server import progress as progress_mod
from server.content import Content
from server.generate import generate_exercise, validate_exercise
from server.stats import compute_stats, review_items
from server.tutor import MODES, stream_reply

mimetypes.add_type("application/wasm", ".wasm")  # Pyodide loads faster with the right type

ROOT = config.ROOT
CONTENT = Content(config.CONTENT_DIR)
DATA_DIR = config.DATA_DIR
PROGRESS_FILE = DATA_DIR / "progress.json"
CHATS_FILE = DATA_DIR / "chats.json"
GENERATED_FILE = DATA_DIR / "generated.json"
MOCKS_FILE = DATA_DIR / "mocks.json"
_lock = threading.Lock()

app = FastAPI(title="FDE Trainer")


@app.middleware("http")
async def require_token(request: Request, call_next):
    """Every /api call (except /api/health) must carry the token the page got at load time.
    Another web site in the same browser cannot read the page, so it cannot get the token."""
    path = request.url.path
    if path.startswith("/api/") and path != "/api/health" and request.headers.get("x-fde-token") != config.API_TOKEN:
        return JSONResponse({"detail": "Missing or wrong app token. Reload the page."}, status_code=403)
    return await call_next(request)


@app.middleware("http")
async def cache_headers(request: Request, call_next):
    """App files: the browser must check for a newer version each time (cheap 304 if unchanged).
    Bundled libraries never change, so they may be cached for a day."""
    response = await call_next(request)
    path = request.url.path
    if path.startswith("/static/vendor/"):
        response.headers["Cache-Control"] = "public, max-age=86400"
    elif path == "/" or path.startswith("/static/") or path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-cache"
    return response


# Added last, so it runs first: refuse requests whose Host is not this computer (DNS rebinding).
app.add_middleware(TrustedHostMiddleware, allowed_hosts=config.ALLOWED_HOSTS)


@app.get("/api/health")
def health() -> dict:
    return {"ok": True}


@app.get("/api/usage")
def get_usage() -> dict:
    return usage.this_month()


# ---------- content ----------


@app.get("/api/curriculum")
def curriculum() -> dict:
    CONTENT.reload()  # pick up edits to the Markdown files without a restart
    return {"tracks": CONTENT.curriculum(), "tutor_ready": config.api_key_present(), "modes": list(MODES)}


@app.get("/api/lesson/{lesson_id:path}")
def lesson(lesson_id: str) -> dict:
    data = CONTENT.lesson(lesson_id)
    if data is None:
        raise HTTPException(404, "Lesson not found")
    return data


# ---------- progress (stored in data/progress.json, not in git) ----------

EMPTY_PROGRESS = progress_mod.EMPTY_PROGRESS
merge_progress = progress_mod.merge  # kept as a name for the tests


def read_json(path: Path, default):
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        path.replace(path.with_suffix(".broken.json"))  # keep the bad file for inspection
        return default


def write_json(path: Path, data: object) -> None:
    DATA_DIR.mkdir(exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, indent=2), encoding="utf-8")
    tmp.replace(path)  # atomic write: a crash never leaves half a file


def read_progress() -> dict:
    """Load progress, fill in new sections, and migrate old block IDs (saved back once)."""
    data = progress_mod.normalise(read_json(PROGRESS_FILE, {}))
    data, changed = progress_mod.migrate(data, CONTENT.legacy_map())
    if changed:
        write_json(PROGRESS_FILE, data)
    return data


class ProgressUpdate(BaseModel):
    section: str  # lessons | exercises | quizzes | written | last_lesson
    key: str | None = None
    value: object = None


@app.get("/api/progress")
def get_progress() -> dict:
    with _lock:
        return read_progress()


def _count_activity(data: dict) -> None:
    today = date.today().isoformat()
    data["activity"][today] = data["activity"].get(today, 0) + 1


@app.post("/api/progress")
def update_progress(update: ProgressUpdate) -> dict:
    if update.section not in {"lessons", "exercises", "quizzes", "written", "last_lesson"}:
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
                _count_activity(data)
        write_json(PROGRESS_FILE, data)
        return data


class ProgressMerge(BaseModel):
    progress: dict


@app.post("/api/progress/merge")
def merge_local_progress(body: ProgressMerge) -> dict:
    """The browser sends its localStorage copy on start-up; the result is saved and returned."""
    with _lock:
        local, _ = progress_mod.migrate(progress_mod.normalise(body.progress), CONTENT.legacy_map())
        merged = progress_mod.merge(read_progress(), local)
        write_json(PROGRESS_FILE, merged)
        return merged


# ---------- spaced repetition and study time ----------


class SrsReview(BaseModel):
    item_id: str
    quality: int  # 5 easy, 4 good, 3 hard, 0-2 failed


@app.post("/api/srs")
def srs_review(body: SrsReview) -> dict:
    with _lock:
        data = read_progress()
        data["srs"][body.item_id] = progress_mod.review(data["srs"].get(body.item_id), body.quality, date.today())
        _count_activity(data)
        write_json(PROGRESS_FILE, data)
        return data


@app.get("/api/srs/due")
def srs_due() -> dict:
    with _lock:
        data = read_progress()
    return {"items": progress_mod.due_items(data, date.today())}


class TimeReport(BaseModel):
    lesson_id: str | None = None
    seconds: int


@app.post("/api/time")
def report_time(body: TimeReport) -> dict:
    with _lock:
        data = progress_mod.add_time(read_progress(), body.lesson_id, body.seconds, date.today())
        write_json(PROGRESS_FILE, data)
    return {"today": data["time"]["days"].get(date.today().isoformat(), 0)}


# ---------- stats, streak and review queue ----------


@app.get("/api/stats")
def stats() -> dict:
    CONTENT.reload()
    with _lock:
        data = read_progress()
    return compute_stats(data, CONTENT, date.today())


@app.get("/api/review")
def review() -> dict:
    CONTENT.reload()
    with _lock:
        data = read_progress()
    return review_items(data, CONTENT)


# ---------- saved tutor chats (data/chats.json) ----------

MAX_CHAT_MESSAGES = 200


def read_chats() -> dict:
    return read_json(CHATS_FILE, {})


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
        {"role": m["role"], "content": str(m.get("content", ""))} for m in body.messages if m.get("role") in ("user", "assistant")
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
    return read_json(GENERATED_FILE, {})


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
    verified: bool = False  # the browser ran the solution (passes) and the starter (fails) in Pyodide


@app.post("/api/generated")
def save_generated(body: SaveGenerated) -> dict:
    # AI-written code is never run on this computer's Python: it runs only in the browser sandbox.
    # So the server needs the browser's confirmation that both checks passed.
    if not body.verified:
        raise HTTPException(400, "Check the exercise in the browser first (solution must pass, starter must fail).")
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
            "verified": True,
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


# ---------- mock interview history (data/mocks.json) ----------

VERDICT_RE = re.compile(r"\b(strong hire|lean hire|lean no hire|lean no|no hire|hire)\b", re.I)


def verdict_of(messages: list[dict]) -> str | None:
    """The last hiring verdict the interviewer gave, if any."""
    for m in reversed(messages):
        if m.get("role") == "assistant":
            found = VERDICT_RE.findall(str(m.get("content", "")))
            if found:
                return found[0].lower()
    return None


class MockSave(BaseModel):
    mode: str
    started: str
    messages: list[dict]


@app.put("/api/mocks/{mock_id}")
def save_mock(mock_id: str, body: MockSave) -> dict:
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,64}", mock_id):
        raise HTTPException(400, "Bad mock id")
    messages = [
        {"role": m["role"], "content": str(m.get("content", ""))} for m in body.messages if m.get("role") in ("user", "assistant")
    ][-200:]
    with _lock:
        mocks = read_json(MOCKS_FILE, {})
        mocks[mock_id] = {
            "id": mock_id,
            "mode": body.mode,
            "started": body.started,
            "messages": messages,
            "verdict": verdict_of(messages),
        }
        write_json(MOCKS_FILE, mocks)
    return {"saved": mock_id, "verdict": mocks[mock_id]["verdict"]}


@app.get("/api/mocks")
def list_mocks() -> dict:
    with _lock:
        mocks = read_json(MOCKS_FILE, {})
    items = [{k: v for k, v in m.items() if k != "messages"} | {"turns": len(m["messages"])} for m in mocks.values()]
    return {"items": sorted(items, key=lambda m: m["started"], reverse=True)}


@app.get("/api/mocks/{mock_id}")
def get_mock(mock_id: str) -> dict:
    with _lock:
        mock = read_json(MOCKS_FILE, {}).get(mock_id)
    if mock is None:
        raise HTTPException(404, "Mock not found")
    return mock


# ---------- export / import all your data as one JSON file ----------


@app.get("/api/export")
def export_all() -> dict:
    with _lock:
        return {
            "app": "fde-trainer",
            "version": 1,
            "exported": date.today().isoformat(),
            "progress": read_progress(),
            "chats": read_json(CHATS_FILE, {}),
            "generated": read_json(GENERATED_FILE, {}),
            "mocks": read_json(MOCKS_FILE, {}),
        }


class ImportBody(BaseModel):
    data: dict


@app.post("/api/import")
def import_all(body: ImportBody) -> dict:
    """Merge an export into this app. Nothing here is overwritten; missing items are added."""
    data = body.data
    if data.get("app") != "fde-trainer":
        raise HTTPException(400, "This is not an FDE Trainer export file.")
    added = {"chats": 0, "generated": 0, "mocks": 0}
    with _lock:
        local, _ = progress_mod.migrate(progress_mod.normalise(data.get("progress") or {}), CONTENT.legacy_map())
        write_json(PROGRESS_FILE, progress_mod.merge(read_progress(), local))
        chats = read_json(CHATS_FILE, {})
        for key, messages in (data.get("chats") or {}).items():
            if key not in chats and isinstance(messages, list):
                chats[key] = messages
                added["chats"] += 1
        write_json(CHATS_FILE, chats)
        generated = read_json(GENERATED_FILE, {})
        known = {e["id"] for items in generated.values() for e in items}
        for lesson_id, items in (data.get("generated") or {}).items():
            for e in items if isinstance(items, list) else []:
                if isinstance(e, dict) and e.get("id") not in known and not validate_exercise(e):
                    generated.setdefault(lesson_id, []).append(e)
                    added["generated"] += 1
        write_json(GENERATED_FILE, generated)
        mocks = read_json(MOCKS_FILE, {})
        for key, mock in (data.get("mocks") or {}).items():
            if key not in mocks and isinstance(mock, dict):
                mocks[key] = mock
                added["mocks"] += 1
        write_json(MOCKS_FILE, mocks)
        merged = read_progress()
    return {"progress": merged, "added": added}


@app.post("/api/reset")
def reset_progress() -> dict:
    """Start again: progress only. A copy of the old file is kept as progress.backup.json."""
    with _lock:
        if PROGRESS_FILE.exists():
            PROGRESS_FILE.replace(PROGRESS_FILE.with_suffix(".backup.json"))
        data = progress_mod.empty()
        write_json(PROGRESS_FILE, data)
    return data


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

app.mount("/static", StaticFiles(directory=config.STATIC_DIR), name="static")


@app.get("/", response_class=HTMLResponse)
def index() -> str:
    html = (config.STATIC_DIR / "index.html").read_text(encoding="utf-8")
    return html.replace("__API_TOKEN__", config.API_TOKEN)
