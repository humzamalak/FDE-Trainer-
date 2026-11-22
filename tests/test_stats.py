from datetime import date
from pathlib import Path

from fastapi.testclient import TestClient

import server.app as app_module
from server.content import Content
from server.stats import compute_stats, review_items, streak

ROOT = Path(__file__).resolve().parent.parent
CONTENT = Content(ROOT / "content")
TODAY = date(2026, 11, 22)


def test_streak_counts_consecutive_days():
    activity = {"2026-11-22": 3, "2026-11-21": 1, "2026-11-20": 2, "2026-11-18": 5}
    assert streak(activity, TODAY) == 3


def test_streak_survives_until_end_of_today():
    assert streak({"2026-11-21": 1, "2026-11-20": 1}, TODAY) == 2


def test_streak_broken():
    assert streak({"2026-11-19": 1}, TODAY) == 0
    assert streak({}, TODAY) == 0


def test_compute_stats_totals():
    first = CONTENT.tracks[1].lessons[0].id
    exercise_id = next(b["id"] for b in CONTENT.lesson(first)["blocks"] if b["kind"] == "exercise")
    progress = {
        "lessons": {first: "2026-11-22"},
        "exercises": {exercise_id: {"passed": True, "code": ""}},
        "quizzes": {"a": True, "b": False},
        "written": {"w": {"answer": "x", "feedback": "good"}},
        "activity": {"2026-11-22": 2},
    }
    stats = compute_stats(progress, CONTENT, TODAY)
    assert stats["totals"]["lessons_done"] == 1
    assert stats["totals"]["exercises_passed"] == 1
    assert stats["totals"]["quiz_answered"] == 2
    assert stats["totals"]["quiz_correct"] == 1
    assert stats["totals"]["written_graded"] == 1
    assert stats["streak"] == 1
    track = next(t for t in stats["tracks"] if t["id"] == CONTENT.tracks[1].id)
    assert track["lessons_done"] == 1 and track["exercises_passed"] == 1


def test_review_items_lists_wrong_answers_only():
    lesson_id = CONTENT.tracks[0].lessons[0].id
    quiz = next(b for b in CONTENT.lesson(lesson_id)["blocks"] if b["kind"] == "quiz")
    progress = {"quizzes": {f"{quiz['id']}/0": False, f"{quiz['id']}/1": True}}
    items = review_items(progress, CONTENT)
    assert len(items) == 1
    assert items[0]["lesson_id"] == lesson_id
    assert items[0]["question"] == quiz["questions"][0]["question"]


def test_api_stats_review_and_chats(tmp_path, monkeypatch):
    monkeypatch.setattr(app_module, "DATA_DIR", tmp_path)
    monkeypatch.setattr(app_module, "PROGRESS_FILE", tmp_path / "progress.json")
    monkeypatch.setattr(app_module, "CHATS_FILE", tmp_path / "chats.json")
    client = TestClient(app_module.app)

    client.post("/api/progress", json={"section": "quizzes", "key": "x/quiz-0/0", "value": False})
    assert client.get("/api/progress").json()["activity"] == {date.today().isoformat(): 1}
    assert client.get("/api/stats").json()["streak"] == 1
    assert client.get("/api/review").json() == {"items": []}  # unknown key is ignored
    assert client.post("/api/progress", json={"section": "activity", "key": "x", "value": 1}).status_code == 400

    msgs = [{"role": "user", "content": "hi"}, {"role": "assistant", "content": "hello"}, {"role": "system", "content": "no"}]
    assert client.put("/api/chats/01-python/02-strings", json={"messages": msgs}).json() == {"saved": 2}
    assert client.get("/api/chats/01-python/02-strings").json()["messages"][1]["content"] == "hello"
    client.put("/api/chats/01-python/02-strings", json={"messages": []})
    assert client.get("/api/chats/01-python/02-strings").json() == {"messages": []}
