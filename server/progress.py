"""The progress document (data/progress.json): its shape, migration, merging, study time
and spaced repetition. Pure functions, so they are easy to test."""

from __future__ import annotations

import copy
import re
from datetime import date, timedelta

EMPTY_PROGRESS: dict = {
    "lessons": {},  # lesson id -> ISO date completed
    "exercises": {},  # block id -> {"passed": bool, "code": str}
    "quizzes": {},  # "<block id>/<question index>" -> bool (last answer correct)
    "written": {},  # block id -> {"answer": str, "feedback": str}
    "last_lesson": None,
    "activity": {},  # ISO date -> number of study actions
    "srs": {},  # item id -> spaced-repetition state (see review()): exercises, quiz questions, cards
    "time": {"days": {}, "lessons": {}},  # seconds studied per day / per lesson
    "checklists": {},  # "<block id>/<item index>" -> True (ticked)
    "plan": {},  # {"start": ISO date, "hours_per_week": number}
    "placement": {},  # {"date": ISO date, "skills": {skill: percent}, "start_track": id}
    "applications": [],  # job search tracker rows (see the job-search lesson)
}
ACTIVITY_SECTIONS = {"lessons", "exercises", "quizzes", "written", "checklists"}
LEGACY_RE = re.compile(r"#(exercise|quiz|written)-\d+")


def empty() -> dict:
    return copy.deepcopy(EMPTY_PROGRESS)


def normalise(data: dict) -> dict:
    """Fill in sections that older progress files do not have."""
    result = empty()
    data = copy.deepcopy(data or {})
    for key, value in data.items():
        if key == "time" and isinstance(value, dict):
            result["time"]["days"].update(value.get("days") or {})
            result["time"]["lessons"].update(value.get("lessons") or {})
        else:
            result[key] = value
    return result


# ---------- migration from position-based block IDs ----------


def _migrate_key(key: str, mapping: dict[str, str]) -> str:
    match = LEGACY_RE.search(key)
    if not match:
        return key
    block_part = key[: match.end()]
    return mapping.get(block_part, block_part) + key[match.end() :]


def migrate(progress: dict, mapping: dict[str, str]) -> tuple[dict, bool]:
    """Rename old IDs like 'lesson#exercise-3' to stable IDs like 'lesson#ex-two-sum'.
    Returns (new progress, changed?)."""
    out = copy.deepcopy(progress)
    changed = False
    for section in ("exercises", "quizzes", "written", "srs"):
        old = out.get(section) or {}
        new = {}
        for key, value in old.items():
            new_key = _migrate_key(key, mapping)
            changed |= new_key != key
            if new_key not in new or key == new_key:  # if both exist, the newest name wins below
                new[new_key] = value
        out[section] = new
    return out, changed


# ---------- merging the browser copy (localStorage) into the file ----------


def merge(server: dict, local: dict) -> dict:
    """Combine two progress copies. Nothing done is ever lost.

    - lessons / written / quizzes: keep every entry; the server's value wins when both have one
    - exercises: passed if passed in either copy; keep the server's code if it has some
    - activity and study time: per key, the larger number
    - srs: the copy reviewed most recently wins
    - checklists: ticked in either copy
    - plan / placement / applications: the server's value, unless it is empty
    """
    merged = normalise(server)
    local = normalise(local or {})
    for section in ("lessons", "written", "quizzes"):
        for key, value in local[section].items():
            if value is not None and key not in merged[section]:
                merged[section][key] = value
    for key, value in local["exercises"].items():
        if not isinstance(value, dict):
            continue
        mine = merged["exercises"].get(key)
        if mine is None:
            merged["exercises"][key] = value
        else:
            mine["passed"] = bool(mine.get("passed") or value.get("passed"))
            if not mine.get("code") and value.get("code"):
                mine["code"] = value["code"]
    for day, count in local["activity"].items():
        if isinstance(count, int):
            merged["activity"][day] = max(merged["activity"].get(day, 0), count)
    for part in ("days", "lessons"):
        for key, secs in local["time"][part].items():
            if isinstance(secs, (int, float)):
                merged["time"][part][key] = max(merged["time"][part].get(key, 0), secs)
    for key, ticked in local["checklists"].items():
        if ticked:
            merged["checklists"][key] = True
    for key in ("plan", "placement"):
        if not merged.get(key) and local.get(key):
            merged[key] = local[key]
    if not merged.get("applications") and local.get("applications"):
        merged["applications"] = local["applications"]
    for key, state in local["srs"].items():
        mine = merged["srs"].get(key)
        if not isinstance(state, dict):
            continue
        if mine is None or state.get("last", "") > mine.get("last", ""):
            merged["srs"][key] = state
    if not merged.get("last_lesson") and local.get("last_lesson"):
        merged["last_lesson"] = local["last_lesson"]
    return merged


# ---------- study time ----------


def add_time(progress: dict, lesson_id: str | None, seconds: int, today: date) -> dict:
    seconds = max(0, min(int(seconds), 300))  # one report covers at most 5 minutes
    out = normalise(progress)
    day = today.isoformat()
    out["time"]["days"][day] = out["time"]["days"].get(day, 0) + seconds
    if lesson_id:
        out["time"]["lessons"][lesson_id] = out["time"]["lessons"].get(lesson_id, 0) + seconds
    return out


def week_seconds(progress: dict, today: date) -> int:
    """Seconds studied in the last 7 days, including today."""
    days = (progress.get("time") or {}).get("days") or {}
    return sum(days.get((today - timedelta(days=i)).isoformat(), 0) for i in range(7))


# ---------- spaced repetition (SM-2) ----------


def review(state: dict | None, quality: int, today: date) -> dict:
    """Update one item's schedule with the SM-2 algorithm.

    quality: 5 = easy, 4 = good, 3 = hard but solved, 0-2 = failed (start again).
    State: reps (successful reviews in a row), interval (days), ease (>= 1.3), due (ISO date), last.
    """
    quality = max(0, min(5, int(quality)))
    state = dict(state or {"reps": 0, "interval": 0, "ease": 2.5})
    ease = float(state.get("ease", 2.5))
    reps = int(state.get("reps", 0))
    interval = int(state.get("interval", 0))
    if quality < 3:
        reps, interval = 0, 1
    else:
        reps += 1
        interval = 1 if reps == 1 else 6 if reps == 2 else round(interval * ease)
    ease = max(1.3, ease + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    return {
        "reps": reps,
        "interval": interval,
        "ease": round(ease, 3),
        "due": (today + timedelta(days=interval)).isoformat(),
        "last": today.isoformat(),
        "quality": quality,
    }


QUIZ_KEY_RE = re.compile(r"#q-[^/#]*/\d+$")


def is_concept(key: str) -> bool:
    """Quiz questions and flashcards are 'concepts'; everything else in srs is a coding exercise."""
    return key.startswith("card:") or bool(QUIZ_KEY_RE.search(key))


def plan_status(progress: dict, tracks: list[dict], today: date) -> dict | None:
    """Where you should be in the plan today, and how far ahead or behind you are.

    Each track has a week range (<!-- weeks: 2-7 --> in _track.md), set for about 10 hours per week.
    Its lessons are spread evenly over those weeks. With more or fewer hours, the plan runs faster or slower."""
    plan = progress.get("plan") or {}
    if not plan.get("start"):
        return None
    start = date.fromisoformat(plan["start"])
    hours = float(plan.get("hours_per_week") or 10)
    pace = hours / 10
    days = max(0, (today - start).days)
    plan_week = days / 7 * pace + 1  # the "plan week" you reach at your pace
    expected = 0.0
    should_be_in = None
    for track in tracks:
        if not track.get("weeks"):
            continue
        first, last = track["weeks"]
        n = len(track["lessons"])
        if plan_week >= last + 1:
            expected += n
        elif plan_week >= first:
            expected += n * (plan_week - first) / (last - first + 1)
            should_be_in = should_be_in or track["title"]
    done = sum(1 for t in tracks for lesson in t["lessons"] if (progress.get("lessons") or {}).get(lesson["id"]))
    final_week = max((t["weeks"][1] for t in tracks if t.get("weeks")), default=24)
    return {
        "start": plan["start"],
        "hours_per_week": hours,
        "week": days // 7 + 1,
        "total_weeks": round(final_week / pace),
        "expected_lessons": round(expected),
        "done_lessons": done,
        "difference": done - round(expected),  # positive = ahead of plan
        "should_be_in": should_be_in,
    }


def due_items(progress: dict, today: date) -> list[str]:
    srs = progress.get("srs") or {}
    return sorted((k for k, v in srs.items() if v.get("due", "9999") <= today.isoformat()), key=lambda k: srs[k]["due"])
