"""Generate new practice exercises with the Claude API, so practice never runs out.

The model must call the `create_exercise` tool, which forces a fixed JSON shape.
The browser then runs the solution against the tests in Pyodide before it shows
the exercise, so a broken exercise is never shown to the learner.
"""

from __future__ import annotations

import ast

from server import config, usage
from server.tutor import learner_profile

EXERCISE_TOOL = {
    "name": "create_exercise",
    "description": "Create one Python practice exercise with starter code, tests and a reference solution.",
    "input_schema": {
        "type": "object",
        "properties": {
            "title": {"type": "string", "description": "Short title, max 8 words."},
            "prompt": {
                "type": "string",
                "description": "The task in Markdown, in simplified technical English. Name the function, its inputs and its output, and give one example.",
            },
            "starter": {"type": "string", "description": "Starter code: the function signature with `pass` as the body."},
            "tests": {
                "type": "string",
                "description": "4 to 6 lines, each one `assert ...` on a single line. Include edge cases (empty input, one item, ties).",
            },
            "solution": {"type": "string", "description": "A correct, readable reference solution."},
            "hint": {"type": "string", "description": "One short hint that does not give the solution away."},
        },
        "required": ["title", "prompt", "starter", "tests", "solution", "hint"],
    },
}

LEVELS = {
    "easier": "Make it easier than the lesson's exercises.",
    "same": "Make it about as hard as the lesson's exercises.",
    "harder": "Make it harder than the lesson's exercises, like a LeetCode Medium or a practical interview task.",
}


def validate_exercise(data: dict) -> list[str]:
    """Static checks. The browser also runs the solution against the tests."""
    problems = []
    for key in ("title", "prompt", "starter", "tests", "solution"):
        if not isinstance(data.get(key), str) or not data[key].strip():
            problems.append(f"missing {key}")
    if problems:
        return problems
    for key in ("starter", "tests", "solution"):
        try:
            ast.parse(data[key])
        except SyntaxError as exc:
            problems.append(f"{key} has a syntax error: {exc.msg} (line {exc.lineno})")
    try:
        asserts = sum(isinstance(node, ast.Assert) for node in ast.walk(ast.parse(data["tests"])))
    except SyntaxError:
        asserts = 0
    if asserts == 0:
        problems.append("tests contain no assert")
    for module in ("requests", "anthropic", "openai", "fastapi", "numpy", "pandas"):
        if f"import {module}" in data["solution"] or f"from {module}" in data["solution"]:
            problems.append(f"solution imports {module}; only the standard library is available")
    return problems


def build_request(lesson: dict | None, level: str, avoid: list[str], feedback: str | None) -> dict:
    parts = [
        "Write ONE new Python practice exercise for the lesson below.",
        LEVELS.get(level, LEVELS["same"]),
        "Use only the Python standard library. The code runs in the browser (Pyodide): no network, no files, no input().",
        "Use a realistic context from cloud, HPC, data or AI engineering where it fits.",
        "The starter code must fail the tests. The solution must pass every test.",
    ]
    if avoid:
        parts.append("Do not repeat these exercises: " + "; ".join(avoid[:20]))
    if feedback:
        parts.append(f"Your previous attempt was invalid: {feedback}. Fix it.")
    system = "You write practice exercises for a learning app.\n" + learner_profile()
    content = "\n".join(parts)
    if lesson:
        content += f'\n\n<lesson title="{lesson["title"]}">\n{lesson["raw"][:15000]}\n</lesson>'
    return {
        "model": config.model(),
        "max_tokens": 2500,
        "system": system,
        "tools": [EXERCISE_TOOL],
        "tool_choice": {"type": "tool", "name": "create_exercise"},
        "messages": [{"role": "user", "content": content}],
    }


def generate_exercise(
    lesson: dict | None, level: str = "same", avoid: list[str] | None = None, feedback: str | None = None, client=None
) -> dict:
    """Return {"exercise": {...}} or {"error": "..."}."""
    if client is None:
        if not config.api_key_present():
            return {"error": "No API key. Add ANTHROPIC_API_KEY to .env and restart the app."}
        over = usage.budget_message()
        if over:
            return {"error": over.replace("**", "").replace("\\$", "$")}
        import anthropic

        client = anthropic.Anthropic()
    request = build_request(lesson, level, avoid or [], feedback)
    last_problems: list[str] = []
    for _ in range(2):  # one automatic retry if the static checks fail
        try:
            response = client.messages.create(**request)
        except Exception as exc:  # network, auth, rate limit
            return {"error": f"API error: {exc}"}
        if getattr(response, "usage", None) is not None:
            usage.record(response.usage, "generate")
        block = next((b for b in response.content if getattr(b, "type", "") == "tool_use"), None)
        if block is None:
            last_problems = ["the model did not return an exercise"]
            continue
        data = dict(block.input)
        last_problems = validate_exercise(data)
        if not last_problems:
            return {"exercise": {k: data.get(k, "") for k in ("title", "prompt", "starter", "tests", "solution", "hint")}}
        request = build_request(lesson, level, avoid or [], "; ".join(last_problems))
    return {"error": "Could not generate a valid exercise: " + "; ".join(last_problems)}
