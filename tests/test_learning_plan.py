"""Tests for the learning-plan features: checklists, flashcards, concept spaced repetition,
lesson order, the skill map, plan tracking, placement and the job tracker."""

from datetime import date, timedelta
from pathlib import Path

from fastapi.testclient import TestClient

import server.app as app_module
from server import config
from server import progress as P
from server.content import Content, parse_lesson
from server.stats import compute_stats, review_items, skill_map
from server.tutor import MODES

ROOT = Path(__file__).resolve().parent.parent
CONTENT = Content(ROOT / "content")
TODAY = date(2026, 11, 26)


def _client(tmp_path, monkeypatch):
    monkeypatch.setattr(app_module, "DATA_DIR", tmp_path)
    for name, file in [
        ("PROGRESS_FILE", "progress.json"),
        ("CHATS_FILE", "chats.json"),
        ("GENERATED_FILE", "generated.json"),
        ("MOCKS_FILE", "mocks.json"),
    ]:
        monkeypatch.setattr(app_module, name, tmp_path / file)
    return TestClient(app_module.app, headers={"X-FDE-Token": config.API_TOKEN})


def test_checklist_and_cards_blocks_parse():
    text = """# L

:::checklist Milestones
Tick as you go.
- [ ] First thing
- [x] Second thing
:::

:::cards Basics
Front one :: Back one
Front :: two :: has a colon pair
not a card line
:::
"""
    blocks = parse_lesson(text, "t/l")["blocks"]
    assert blocks[0] == {
        "id": "t/l#cl-milestones",
        "legacy_id": None,
        "kind": "checklist",
        "title": "Milestones",
        "prompt": "Tick as you go.",
        "items": ["First thing", "Second thing"],
    }
    assert blocks[1]["id"] == "t/l#cards-basics"
    assert blocks[1]["cards"] == [
        {"front": "Front one", "back": "Back one"},
        {"front": "Front", "back": "two :: has a colon pair"},
    ]


def test_every_cards_and_checklist_block_has_content():
    for lesson_id in CONTENT.lessons:
        for block in CONTENT.lesson(lesson_id)["blocks"]:
            if block["kind"] == "cards":
                assert block["cards"], f"empty cards block in {lesson_id}"
                assert all(c["front"] and c["back"] for c in block["cards"]), lesson_id
            if block["kind"] == "checklist":
                assert block["items"], f"empty checklist in {lesson_id}"


def test_lesson_order_comment_places_lessons():
    titles = [lesson.title for lesson in next(t for t in CONTENT.tracks if t.id == "03-coding-interview-patterns").lessons]
    assert titles.index("Linked lists") == titles.index("Pattern: stacks and queues") + 1
    assert titles[-1] == "Practical FDE coding problems"
    final = next(t for t in CONTENT.tracks if t.id == "07-interview-ready").lessons
    assert final[-1].title == "Final practice set"


def test_every_track_has_a_skill_and_weeks():
    for track in CONTENT.tracks:
        assert track.skill in {"coding", "data", "maths", "ai", "design", "customer", "career"}, track.id
        assert track.weeks and 1 <= track.weeks[0] <= track.weeks[1] <= 24, track.id


def test_new_mock_modes_exist():
    for mode in ("decomposition", "client-roleplay", "deep-dive", "debugging"):
        assert mode in MODES


def test_concepts_are_separated_from_exercises():
    assert P.is_concept("card:a/b#cards-x/0")
    assert P.is_concept("a/b#q-1/2")
    assert not P.is_concept("a/b#ex-two-sum")
    assert not P.is_concept("a/b#sql-q-1-revenue")  # a slug that contains "q-" is still an exercise


def test_due_quiz_questions_and_cards_appear_in_review():
    lesson_id = "10-decomposition/01-the-decomposition-method"
    blocks = CONTENT.lesson_data(lesson_id)["blocks"]
    quiz = next(b for b in blocks if b["kind"] == "quiz")
    cards = next(b for b in blocks if b["kind"] == "cards")
    progress = P.normalise({})
    yesterday = TODAY - timedelta(days=1)
    progress["srs"][f"{quiz['id']}/0"] = {"due": yesterday.isoformat(), "interval": 1, "ease": 2.5, "reps": 1, "last": "x"}
    progress["srs"][f"card:{cards['id']}/1"] = {"due": TODAY.isoformat(), "interval": 1, "ease": 2.5, "reps": 1, "last": "x"}
    progress["srs"][f"card:{cards['id']}/2"] = {
        "due": (TODAY + timedelta(days=3)).isoformat(),
        "interval": 4,
        "ease": 2.5,
        "reps": 2,
        "last": "x",
    }
    result = review_items(progress, CONTENT, TODAY)
    assert [q["key"] for q in result["due_quizzes"]] == [f"{quiz['id']}/0"]
    assert [c["key"] for c in result["due_cards"]] == [f"card:{cards['id']}/1"]
    assert result["due_cards"][0]["front"] == cards["cards"][1]["front"]
    stats = compute_stats(progress, CONTENT, TODAY)
    assert stats["due_concepts"] == 2 and stats["due_today"] == 0


def test_plan_status_ahead_and_behind():
    tracks = [
        {"title": "A", "weeks": [1, 2], "lessons": [{"id": f"a{i}"} for i in range(4)]},
        {"title": "B", "weeks": [3, 4], "lessons": [{"id": f"b{i}"} for i in range(4)]},
    ]
    assert P.plan_status({}, tracks, TODAY) is None
    start = TODAY - timedelta(days=21)  # three weeks in: plan week 4.0 at 10 h/week
    progress = {"plan": {"start": start.isoformat(), "hours_per_week": 10}, "lessons": {"a0": "x", "a1": "x"}}
    s = P.plan_status(progress, tracks, TODAY)
    assert s["week"] == 4 and s["total_weeks"] == 4
    assert s["expected_lessons"] == 6  # all of A, half of B
    assert s["difference"] == -4 and s["should_be_in"] == "B"
    slow = {**progress, "plan": {"start": start.isoformat(), "hours_per_week": 5}}
    s = P.plan_status(slow, tracks, TODAY)
    assert s["total_weeks"] == 8 and s["expected_lessons"] == 3 and s["difference"] == -1  # plan week 2.5: 3 of A


def test_skill_map_scores_follow_progress():
    progress = P.normalise({})
    empty = {r["skill"]: r for r in skill_map(progress, CONTENT)}
    assert set(empty) == {"coding", "data", "maths", "ai", "design", "customer", "career"}
    assert all(r["score"] == 0 for r in empty.values())
    track = next(t for t in CONTENT.tracks if t.id == "02-maths-for-fde")
    for lesson in track.lessons:
        progress["lessons"][lesson.id] = "2026-11-01"
        for block in CONTENT.lesson_data(lesson.id)["blocks"]:
            if block["kind"] == "exercise":
                progress["exercises"][block["id"]] = {"passed": True}
    maths = {r["skill"]: r for r in skill_map(progress, CONTENT)}["maths"]
    assert maths["score"] == 100 and maths["lessons_done"] == maths["lessons"]


def test_merge_keeps_checklists_plan_and_applications():
    server = P.normalise({"checklists": {"x/0": True}})
    local = P.normalise(
        {"checklists": {"x/1": True}, "plan": {"start": "2026-11-01", "hours_per_week": 8}, "applications": [{"company": "Acme"}]}
    )
    merged = P.merge(server, local)
    assert merged["checklists"] == {"x/0": True, "x/1": True}
    assert merged["plan"]["hours_per_week"] == 8
    assert merged["applications"] == [{"company": "Acme"}]
    kept = P.merge(P.normalise({"plan": {"start": "2026-10-01"}}), local)
    assert kept["plan"] == {"start": "2026-10-01"}


def test_api_sections_checklist_plan_placement_applications(tmp_path, monkeypatch):
    client = _client(tmp_path, monkeypatch)
    r = client.post("/api/progress", json={"section": "checklists", "key": "l#cl-a/0", "value": True}).json()
    assert r["checklists"] == {"l#cl-a/0": True}
    r = client.post("/api/progress", json={"section": "checklists", "key": "l#cl-a/0", "value": None}).json()
    assert r["checklists"] == {}
    r = client.post("/api/progress", json={"section": "plan", "value": {"start": "2026-11-01", "hours_per_week": 12}}).json()
    assert r["plan"]["hours_per_week"] == 12
    assert client.get("/api/stats").json()["plan"]["start"] == "2026-11-01"
    r = client.post("/api/progress", json={"section": "plan", "value": None}).json()
    assert r["plan"] == {}
    assert client.post("/api/progress", json={"section": "plan", "value": "soon"}).status_code == 400
    r = client.post("/api/progress", json={"section": "applications", "value": [{"company": "Acme", "stage": "Applied"}]}).json()
    assert r["applications"][0]["company"] == "Acme"
    assert client.post("/api/progress", json={"section": "applications", "value": {"a": 1}}).status_code == 400
    assert client.post("/api/progress", json={"section": "nonsense", "key": "a", "value": 1}).status_code == 400
    placement = client.get("/api/placement").json()["skills"]
    assert {s["skill"] for s in placement} >= {"coding", "data", "maths", "ai", "design", "customer"}
    for s in placement:
        assert 1 <= len(s["questions"]) <= 4
        assert all("answer" in q and q["key"].endswith("/0") for q in s["questions"])
    r = client.post(
        "/api/progress", json={"section": "placement", "value": {"date": "2026-11-26", "skills": {"coding": 50}}}
    ).json()
    assert client.get("/api/stats").json()["placement"]["skills"] == {"coding": 50}
    assert client.get("/api/export").json()["progress"]["applications"][0]["stage"] == "Applied"
