"""Statistics, streaks and the review queue, computed from progress.json and the content."""

from __future__ import annotations

from datetime import date, timedelta

from server.content import Content


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
            for block in content.lesson(lesson.id)["blocks"]
            if block["kind"] == "exercise"
        ]
        passed = sum(1 for eid in exercise_ids if (exercises_state.get(eid) or {}).get("passed"))
        tracks.append({
            "id": track.id,
            "title": track.title,
            "lessons_done": lessons_done,
            "lessons": len(track.lessons),
            "exercises_passed": passed,
            "exercises": len(exercise_ids),
        })
        totals["lessons_done"] += lessons_done
        totals["lessons"] += len(track.lessons)
        totals["exercises_passed"] += passed
        totals["exercises"] += len(exercise_ids)

    quizzes = progress.get("quizzes", {})
    activity = progress.get("activity", {})
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
    }


def review_items(progress: dict, content: Content) -> list[dict]:
    """Every quiz question the learner last answered wrongly, with its lesson."""
    wrong = {key for key, correct in progress.get("quizzes", {}).items() if not correct}
    items = []
    if not wrong:
        return items
    for lesson_id, lesson in content.lessons.items():
        data = content.lesson(lesson_id)
        for block in data["blocks"]:
            if block["kind"] != "quiz":
                continue
            for qi, q in enumerate(block["questions"]):
                key = f"{block['id']}/{qi}"
                if key in wrong:
                    items.append({
                        "key": key,
                        "lesson_id": lesson_id,
                        "lesson_title": lesson.title,
                        "question": q["question"],
                        "options": q["options"],
                        "answer": q["answer"],
                        "explanation": q["explanation"],
                    })
    return items
