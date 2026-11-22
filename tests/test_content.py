"""Checks for the parser and for every exercise in the curriculum.

Run:  python -m pytest
"""

import ast
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


EXERCISES = CONTENT.all_exercises()


@pytest.mark.parametrize("exercise", EXERCISES, ids=[e["id"] for e in EXERCISES])
def test_exercise_solution_passes_its_tests(exercise):
    """Every reference solution must pass, and every starter must fail (so the tests test something)."""
    assert exercise.get("tests"), "exercise has no tests"
    assert exercise.get("solution"), "exercise has no solution"
    ast.parse(exercise["starter"] if exercise.get("starter") else "")

    namespace: dict = {}
    exec(compile(exercise["solution"], "solution.py", "exec"), namespace)
    exec(compile(exercise["tests"], "tests.py", "exec"), namespace)

    starter_ns: dict = {}
    with pytest.raises(Exception):
        exec(compile(exercise.get("starter", ""), "starter.py", "exec"), starter_ns)
        exec(compile(exercise["tests"], "tests.py", "exec"), starter_ns)
