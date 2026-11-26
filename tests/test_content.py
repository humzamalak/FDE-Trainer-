"""Checks for the parser and for every exercise in the curriculum.

Run:  python -m pytest
"""

import ast
import shutil
import subprocess
from pathlib import Path

import pytest

from server.content import Content, parse_lesson

ROOT = Path(__file__).resolve().parent.parent
CONTENT = Content(ROOT / "content")

SAMPLE = """# Sample

Some text.

:::exercise Add two numbers
Write `add(a, b)`.
--- starter ---
def add(a, b):
    pass
--- tests ---
assert add(1, 2) == 3
--- solution ---
def add(a, b):
    return a + b
:::

:::quiz
Q: What is 2 + 2?
- [ ] 3
- [x] 4
> Basic addition.
:::
"""


def test_parse_lesson_finds_blocks():
    parsed = parse_lesson(SAMPLE, "x/y")
    kinds = [b["kind"] for b in parsed["blocks"]]
    assert kinds == ["exercise", "quiz"]
    exercise = parsed["blocks"][0]
    assert exercise["title"] == "Add two numbers"
    assert "pass" in exercise["starter"]
    assert exercise["tests"] == "assert add(1, 2) == 3"
    quiz = parsed["blocks"][1]["questions"][0]
    assert quiz["answer"] == 1
    assert quiz["explanation"] == "Basic addition."
    assert 'data-block="0"' in parsed["markdown"]


def test_curriculum_is_not_empty():
    assert CONTENT.tracks, "no tracks found in content/"
    for track in CONTENT.tracks:
        assert track.lessons, f"track {track.id} has no lessons"


def test_every_quiz_has_one_answer():
    for lesson_id in CONTENT.lessons:
        for block in CONTENT.lesson(lesson_id)["blocks"]:
            if block["kind"] == "quiz":
                assert block["questions"], f"empty quiz in {lesson_id}"
                for q in block["questions"]:
                    assert q["answer"] is not None, f"{lesson_id}: no answer for {q['question']}"
                    assert len(q["options"]) >= 2


def run_python(code: str) -> None:
    """Run code like the browser does: top-level await is allowed (asyncio lessons)."""
    import asyncio
    import inspect

    compiled = compile(code, "exercise.py", "exec", flags=ast.PyCF_ALLOW_TOP_LEVEL_AWAIT)
    namespace: dict = {"__name__": "__main__"}
    result = eval(compiled, namespace)
    if inspect.iscoroutine(result):
        asyncio.run(result)


EXERCISES = CONTENT.all_exercises()


@pytest.mark.parametrize("exercise", EXERCISES, ids=[e["id"] for e in EXERCISES])
def test_exercise_solution_passes_its_tests(exercise):
    """Every reference solution must pass, and every starter must fail (so the tests test something)."""
    assert exercise.get("tests"), "exercise has no tests"
    assert exercise.get("solution"), "exercise has no solution"
    run_python(exercise["solution"] + "\n" + exercise["tests"])
    with pytest.raises(Exception):  # noqa: B017 - any failure (AssertionError, TypeError, ...) is fine
        run_python((exercise.get("starter") or "") + "\n" + exercise["tests"])


SQL_EXERCISES = CONTENT.all_exercises("sql")


def _sql_rows(schema: str, query: str):
    import sqlite3

    db = sqlite3.connect(":memory:")
    db.executescript(schema)
    cursor = db.execute(query) if query.strip().count(";") <= 1 else None
    if cursor is None:  # several statements: like sql.js, use the last result set
        *before, last = [q for q in query.split(";") if q.strip()]
        for q in before:
            db.execute(q)
        cursor = db.execute(last)
    return [d[0] for d in cursor.description or []], cursor.fetchall()


@pytest.mark.parametrize("exercise", SQL_EXERCISES, ids=[e["id"] for e in SQL_EXERCISES])
def test_sql_solution_runs_and_starter_differs(exercise):
    """Python's sqlite3 and sql.js are both SQLite, so the browser gives the same result."""
    assert exercise.get("schema") and exercise.get("solution")
    columns, rows = _sql_rows(exercise["schema"], exercise["solution"])
    assert rows, "the solution returns no rows: the check would be too easy"
    try:
        s_columns, s_rows = _sql_rows(exercise["schema"], exercise.get("starter") or "SELECT 1")
    except Exception:
        return  # a starter that errors is fine
    ordered = "order by" in exercise["solution"].lower()
    same = (s_rows == rows) if ordered else (sorted(map(repr, s_rows)) == sorted(map(repr, rows)))
    assert not (same and len(s_columns) == len(columns)), "the starter already gives the right answer"


JS_EXERCISES = CONTENT.all_exercises("js")
JS_HARNESS = r"""
const fmt = (v) => JSON.stringify(v);
const assert = (c, m) => { if (!c) throw new Error(m || "assertion failed"); };
const assertEqual = (a, b) => { if (fmt(a) !== fmt(b)) throw new Error(`expected ${fmt(b)}, got ${fmt(a)}`); };
const console = { log() {} };
(async () => {
  CODE
  const checks = [TESTS];
  for (const check of checks) await check();
})().then(() => process.exit(0), (e) => { process.stderr.write(String(e && e.message)); process.exit(1); });
"""


def _run_js(code: str, tests: str) -> subprocess.CompletedProcess:
    lines = [line.strip() for line in tests.splitlines() if line.strip() and not line.strip().startswith("//")]
    script = JS_HARNESS.replace("CODE", code).replace("TESTS", ",".join(f"async () => {{ {line} }}" for line in lines))
    return subprocess.run(["node", "-e", script], capture_output=True, text=True, timeout=20)


@pytest.mark.skipif(shutil.which("node") is None, reason="Node.js is not installed")
@pytest.mark.parametrize("exercise", JS_EXERCISES, ids=[e["id"] for e in JS_EXERCISES])
def test_js_solution_passes_and_starter_fails(exercise):
    ok = _run_js(exercise["solution"], exercise["tests"])
    assert ok.returncode == 0, ok.stderr
    assert _run_js(exercise.get("starter") or "", exercise["tests"]).returncode != 0, "the starter already passes"
