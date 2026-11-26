"""Statistics, streaks and the review queue, computed from progress.json and the content."""

from __future__ import annotations

import re
from datetime import date, timedelta

from server import progress as progress_mod
from server.content import Content

SCORE_RE = re.compile(r"(\d+(?:\.\d+)?)\s*/\s*10\b")
LOW_SCORE = 7.0


def streak(activity: dict[str, int], today: date) -> int:
    """Days in a row with activity, ending today (or yesterday, so the streak survives until you study today)."""
    active = {day for day, count in activity.items() if count}
    day = today if today.isoformat() in active else today - timedelta(days=1)
    count = 0
    while day.isoformat() in active:
        count += 1
        day -= timedelta(days=1)
    return count


def compute_stats(progress: dict, content: Content, today: date) -> dict:
    tracks = []
    totals = {"lessons_done": 0, "lessons": 0, "exercises_passed": 0, "exercises": 0}
    exercises_state = progress.get("exercises", {})
    for track in content.tracks:
        lessons_done = sum(1 for lesson in track.lessons if progress.get("lessons", {}).get(lesson.id))
        exercise_ids = [
            block["id"]
            for lesson in track.lessons
            for block in content.lesson_data(lesson.id)["blocks"]
            if block["kind"] in ("exercise", "sql", "js")
        ]
        passed = sum(1 for eid in exercise_ids if (exercises_state.get(eid) or {}).get("passed"))
        tracks.append(
            {
                "id": track.id,
                "title": track.title,
                "lessons_done": lessons_done,
                "lessons": len(track.lessons),
                "exercises_passed": passed,
                "exercises": len(exercise_ids),
            }
        )
        totals["lessons_done"] += lessons_done
        totals["lessons"] += len(track.lessons)
        totals["exercises_passed"] += passed
        totals["exercises"] += len(exercise_ids)

    quizzes = progress.get("quizzes", {})
    activity = progress.get("activity", {})
    due = progress_mod.due_items(progress, today)
    return {
        "tracks": tracks,
        "totals": {
            **totals,
            "quiz_answered": len(quizzes),
            "quiz_correct": sum(1 for v in quizzes.values() if v),
            "written_graded": sum(1 for v in progress.get("written", {}).values() if (v or {}).get("feedback")),
        },
        "streak": streak(activity, today),
        "active_days": sum(1 for v in activity.values() if v),
        "due_today": len([k for k in due if not progress_mod.is_concept(k)]),
        "due_concepts": len([k for k in due if progress_mod.is_concept(k)]),
        "skills": skill_map(progress, content),
        "plan": progress_mod.plan_status(progress, content.curriculum(), today),
        "placement": progress.get("placement") or None,
        "seconds_today": ((progress.get("time") or {}).get("days") or {}).get(today.isoformat(), 0),
        "seconds_week": progress_mod.week_seconds(progress, today),
    }


SKILL_NAMES = {
    "coding": "Coding",
    "data": "Data and SQL",
    "maths": "Maths and estimation",
    "ai": "LLM engineering",
    "design": "System design",
    "customer": "Customer skills",
    "career": "Interview and job search",
}


def skill_map(progress: dict, content: Content) -> list[dict]:
    """Per skill (set per track with <!-- skill: x -->): a 0-100 score from exercises passed,
    quiz accuracy and written grades, scaled by how many of the skill's lessons you have finished."""
    acc: dict[str, dict] = {}
    for track in content.tracks:
        e = acc.setdefault(track.skill, {"ex": 0, "ex_ok": 0, "q": 0, "q_ok": 0, "w": [], "n": 0, "done": 0})
        for lesson in track.lessons:
            e["n"] += 1
            e["done"] += 1 if (progress.get("lessons") or {}).get(lesson.id) else 0
            for block in content.lesson_data(lesson.id)["blocks"]:
                if block["kind"] in ("exercise", "sql", "js"):
                    e["ex"] += 1
                    e["ex_ok"] += 1 if ((progress.get("exercises") or {}).get(block["id"]) or {}).get("passed") else 0
                elif block["kind"] == "quiz":
                    for qi in range(len(block["questions"])):
                        answer = (progress.get("quizzes") or {}).get(f"{block['id']}/{qi}")
                        if answer is not None:
                            e["q"] += 1
                            e["q_ok"] += 1 if answer else 0
                elif block["kind"] == "written":
                    score = score_of(((progress.get("written") or {}).get(block["id"]) or {}).get("feedback", ""))
                    if score is not None:
                        e["w"].append(score)
    result = []
    for skill, e in acc.items():
        parts = []
        if e["ex_ok"]:
            parts.append(e["ex_ok"] / e["ex"])
        if e["q"]:
            parts.append(e["q_ok"] / e["q"])
        if e["w"]:
            parts.append(sum(e["w"]) / len(e["w"]) / 10)
        coverage = e["done"] / e["n"] if e["n"] else 0
        quality = sum(parts) / len(parts) if parts else 0
        result.append(
            {
                "skill": skill,
                "name": SKILL_NAMES.get(skill, skill.title()),
                "score": round(100 * quality * coverage),
                "lessons_done": e["done"],
                "lessons": e["n"],
                "exercises_passed": e["ex_ok"],
                "exercises": e["ex"],
                "quiz_accuracy": round(100 * e["q_ok"] / e["q"]) if e["q"] else None,
                "written_average": round(sum(e["w"]) / len(e["w"]), 1) if e["w"] else None,
            }
        )
    order = list(SKILL_NAMES)
    return sorted(result, key=lambda r: order.index(r["skill"]) if r["skill"] in order else 99)


def score_of(feedback: str) -> float | None:
    """The first 'N/10' score in a tutor's feedback, if any."""
    match = SCORE_RE.search(feedback or "")
    return float(match.group(1)) if match else None


def review_items(progress: dict, content: Content, today: date | None = None) -> dict:
    """What needs another look:
    - quizzes: questions last answered wrongly
    - exercises: exercises you tried (code saved) but have not passed
    - written: written tasks graded below 7/10
    """
    wrong = {key for key, correct in progress.get("quizzes", {}).items() if not correct}
    due = set(progress_mod.due_items(progress, today or date.today()))
    quizzes: list[dict] = []
    exercises: list[dict] = []
    written: list[dict] = []
    due_quizzes: list[dict] = []
    due_cards: list[dict] = []
    for lesson_id, lesson in content.lessons.items():
        data = content.lesson_data(lesson_id)
        for block in data["blocks"]:
            if block["kind"] == "quiz":
                for qi, q in enumerate(block["questions"]):
                    key = f"{block['id']}/{qi}"
                    item = {
                        "key": key,
                        "lesson_id": lesson_id,
                        "lesson_title": lesson.title,
                        "question": q["question"],
                        "options": q["options"],
                        "answer": q["answer"],
                        "explanation": q["explanation"],
                    }
                    if key in wrong:
                        quizzes.append(item)
                    elif key in due:
                        due_quizzes.append(item)
            elif block["kind"] == "cards":
                for ci, card in enumerate(block["cards"]):
                    key = f"card:{block['id']}/{ci}"
                    if key in due:
                        due_cards.append({"key": key, "lesson_id": lesson_id, "lesson_title": lesson.title, **card})
            elif block["kind"] in ("exercise", "sql", "js"):
                state = progress.get("exercises", {}).get(block["id"]) or {}
                if (
                    state
                    and not state.get("passed")
                    and (state.get("code") or "").strip() != (block.get("starter") or "").strip()
                ):
                    exercises.append({"lesson_id": lesson_id, "lesson_title": lesson.title, "block": block})
            elif block["kind"] == "written":
                state = progress.get("written", {}).get(block["id"]) or {}
                score = score_of(state.get("feedback", ""))
                if score is not None and score < LOW_SCORE:
                    written.append(
                        {"lesson_id": lesson_id, "lesson_title": lesson.title, "title": block["title"], "score": score}
                    )
    return {
        "quizzes": quizzes,
        "exercises": exercises,
        "written": written,
        "due_quizzes": due_quizzes,
        "due_cards": due_cards,
    }
