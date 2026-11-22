"""FDE Trainer web server.

Run:  python -m uvicorn server.app:app --port 8765
Then open http://127.0.0.1:8765
"""

from __future__ import annotations

import json
import threading
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from server.content import Content
from server.tutor import MODES, api_key_present, stream_reply

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

CONTENT = Content(ROOT / "content")
DATA_DIR = ROOT / "data"
PROGRESS_FILE = DATA_DIR / "progress.json"
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

EMPTY_PROGRESS = {"lessons": {}, "exercises": {}, "quizzes": {}, "written": {}, "last_lesson": None}


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


@app.post("/api/progress")
def update_progress(update: ProgressUpdate) -> dict:
    if update.section not in EMPTY_PROGRESS:
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
        DATA_DIR.mkdir(exist_ok=True)
        tmp = PROGRESS_FILE.with_suffix(".tmp")
        tmp.write_text(json.dumps(data, indent=2), encoding="utf-8")
        tmp.replace(PROGRESS_FILE)  # atomic write: a crash never leaves half a file
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

app.mount("/static", StaticFiles(directory=ROOT / "static"), name="static")


@app.get("/")
def index() -> FileResponse:
    return FileResponse(ROOT / "static" / "index.html")
