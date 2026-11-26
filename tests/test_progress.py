import json
from datetime import date
from pathlib import Path

from fastapi.testclient import TestClient

import server.app as app_module
from server import config
from server import progress as P
from server.content import Content, parse_lesson
from server.stats import review_items, score_of

ROOT = Path(__file__).resolve().parent.parent
CONTENT = Content(ROOT / "content")
TODAY = date(2026, 11, 26)


def test_block_ids_are_unique_and_none_disappeared():
    ids = [b["id"] for b in CONTENT.all_blocks()]
    assert len(ids) == len(set(ids)), "two blocks in one lesson have the same title"
    snapshot = set((ROOT / "tests" / "block_ids.txt").read_text().split())
    missing = sorted(snapshot - set(ids))
    assert not missing, f"These block IDs disappeared, so saved progress would be lost: {missing}. See scripts/snapshot_ids.py"
    new = sorted(set(ids) - snapshot)
    assert not new, f"New block IDs: {new}. Run: python scripts/snapshot_ids.py"


def test_ids_come_from_titles_not_positions():
    text = ":::quiz\nQ: a?\n- [x] y\n- [ ] n\n:::\n\n:::exercise Two Sum\nx\n--- tests ---\nassert 1\n:::\n\n:::exercise Other {#keep-me}\nx\n:::\n"
    blocks = parse_lesson(text, "t/l")["blocks"]
    assert [b["id"] for b in blocks] == ["t/l#q-1", "t/l#ex-two-sum", "t/l#ex-keep-me"]
    assert blocks[2]["title"] == "Other"
    assert [b["legacy_id"] for b in blocks] == ["t/l#quiz-0", "t/l#exercise-1", "t/l#exercise-2"]


def test_migrate_old_ids():
    mapping = {"a/b#exercise-1": "a/b#ex-two-sum", "a/b#quiz-0": "a/b#q-1"}
    old = {"exercises": {"a/b#exercise-1": {"passed": True}}, "quizzes": {"a/b#quiz-0/2": False}, "written": {}, "srs": {}}
    new, changed = P.migrate(old, mapping)
    assert changed
    assert new["exercises"] == {"a/b#ex-two-sum": {"passed": True}}
    assert new["quizzes"] == {"a/b#q-1/2": False}
    assert P.migrate(new, mapping) == (new, False)


def test_progress_file_is_migrated_on_read(tmp_path, monkeypatch):
    monkeypatch.setattr(app_module, "DATA_DIR", tmp_path)
    monkeypatch.setattr(app_module, "PROGRESS_FILE", tmp_path / "progress.json")
    legacy, stable = next(iter(CONTENT.legacy_map().items()))
    (tmp_path / "progress.json").write_text(json.dumps({"exercises": {legacy: {"passed": True}}}))
    data = app_module.read_progress()
    assert stable in data["exercises"] and legacy not in data["exercises"]
    assert stable in (tmp_path / "progress.json").read_text()


def test_sm2_schedule():
    s1 = P.review(None, 4, TODAY)
    assert s1["interval"] == 1 and s1["due"] == "2026-11-27"
    s2 = P.review(s1, 4, TODAY)
    assert s2["interval"] == 6
    s3 = P.review(s2, 5, TODAY)
    assert s3["interval"] == round(6 * s2["ease"])
    failed = P.review(s3, 1, TODAY)
    assert failed["reps"] == 0 and failed["interval"] == 1 and failed["ease"] >= 1.3
    assert P.due_items({"srs": {"x": s1, "y": {**s1, "due": "2026-11-26"}}}, TODAY) == ["y"]


def test_time_tracking():
    p = P.add_time(P.empty(), "a/b", 60, TODAY)
    p = P.add_time(p, "a/b", 9999, TODAY)  # capped at 5 minutes per report
    assert p["time"]["days"]["2026-11-26"] == 360
    assert p["time"]["lessons"]["a/b"] == 360
    assert P.week_seconds(p, date(2026, 12, 2)) == 360
    assert P.week_seconds(p, date(2026, 12, 3)) == 0


def test_review_lists_failed_exercises_and_low_written_scores():
    ex = CONTENT.all_exercises()[0]
    written = CONTENT.all_exercises("written")[0]
    progress = {
        "exercises": {ex["id"]: {"passed": False, "code": "def x(): return 1"}},
        "written": {written["id"]: {"answer": "a", "feedback": "**Score: 5/10**. Missing points..."}},
    }
    r = review_items(progress, CONTENT)
    assert [e["block"]["id"] for e in r["exercises"]] == [ex["id"]]
    assert r["written"][0]["score"] == 5.0
    assert score_of("Score 8.5 / 10") == 8.5 and score_of("no score") is None


def _client(tmp_path, monkeypatch):
    for name in ("DATA_DIR",):
        monkeypatch.setattr(app_module, name, tmp_path)
    monkeypatch.setattr(app_module, "PROGRESS_FILE", tmp_path / "progress.json")
    monkeypatch.setattr(app_module, "CHATS_FILE", tmp_path / "chats.json")
    monkeypatch.setattr(app_module, "GENERATED_FILE", tmp_path / "generated.json")
    monkeypatch.setattr(app_module, "MOCKS_FILE", tmp_path / "mocks.json")
    return TestClient(app_module.app, headers={"X-FDE-Token": config.API_TOKEN})


def test_srs_time_mocks_export_import_reset(tmp_path, monkeypatch):
    c = _client(tmp_path, monkeypatch)
    assert c.post("/api/srs", json={"item_id": "a/b#ex-x", "quality": 1}).json()["srs"]["a/b#ex-x"]["interval"] == 1
    assert c.get("/api/srs/due").json() == {"items": []}  # due tomorrow
    assert c.post("/api/time", json={"lesson_id": "a/b", "seconds": 30}).json()["today"] == 30
    assert c.get("/api/stats").json()["seconds_today"] == 30

    msgs = [{"role": "user", "content": "FEEDBACK"}, {"role": "assistant", "content": "Verdict: **Lean hire**. Good structure."}]
    assert (
        c.put("/api/mocks/m1", json={"mode": "coding-interviewer", "started": "2026-11-26T10:00", "messages": msgs}).json()[
            "verdict"
        ]
        == "lean hire"
    )
    assert c.get("/api/mocks").json()["items"][0]["turns"] == 2
    assert c.get("/api/mocks/m1").json()["messages"][1]["content"].startswith("Verdict")
    assert c.put("/api/mocks/../x", json={"mode": "x", "started": "", "messages": []}).status_code in (400, 404)

    export = c.get("/api/export").json()
    assert export["app"] == "fde-trainer" and "m1" in export["mocks"]
    c.post("/api/reset")
    assert c.get("/api/progress").json()["srs"] == {}
    assert (tmp_path / "progress.backup.json").exists()
    result = c.post("/api/import", json={"data": export}).json()
    assert "a/b#ex-x" in result["progress"]["srs"]
    assert c.post("/api/import", json={"data": {"app": "other"}}).status_code == 400
