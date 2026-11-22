from types import SimpleNamespace

from fastapi.testclient import TestClient

import server.app as app_module
from server.generate import generate_exercise, validate_exercise

GOOD = {
    "title": "Sum evens",
    "prompt": "Write `sum_even(nums)`.",
    "starter": "def sum_even(nums):\n    pass",
    "tests": "assert sum_even([1, 2, 4]) == 6\nassert sum_even([]) == 0",
    "solution": "def sum_even(nums):\n    return sum(n for n in nums if n % 2 == 0)",
    "hint": "Use % 2.",
}


class FakeClient:
    """Stands in for anthropic.Anthropic(): returns queued tool inputs."""

    def __init__(self, *inputs):
        self.inputs = list(inputs)
        self.calls = []
        self.messages = self

    def create(self, **kwargs):
        self.calls.append(kwargs)
        data = self.inputs.pop(0)
        return SimpleNamespace(content=[SimpleNamespace(type="tool_use", input=data)])


def test_validate_good_exercise():
    assert validate_exercise(GOOD) == []


def test_validate_catches_problems():
    bad = {**GOOD, "solution": "def f(:\n", "tests": "print(1)"}
    problems = validate_exercise(bad)
    assert any("syntax error" in p for p in problems)
    assert "tests contain no assert" in problems
    assert validate_exercise({**GOOD, "solution": "import requests\n"})
    assert validate_exercise({"title": "x"})


def test_generate_forces_the_tool_and_returns_exercise():
    client = FakeClient(GOOD)
    result = generate_exercise({"title": "Loops", "raw": "# Loops"}, "harder", ["Old one"], client=client)
    assert result["exercise"]["title"] == "Sum evens"
    call = client.calls[0]
    assert call["tool_choice"] == {"type": "tool", "name": "create_exercise"}
    assert "Old one" in call["messages"][0]["content"]
    assert "harder" in call["messages"][0]["content"].lower()


def test_generate_retries_once_then_gives_up():
    broken = {**GOOD, "tests": "print('no asserts')"}
    client = FakeClient(broken, GOOD)
    assert "exercise" in generate_exercise(None, client=client)
    assert "previous attempt was invalid" in client.calls[1]["messages"][0]["content"]
    client = FakeClient(broken, broken)
    assert "error" in generate_exercise(None, client=client)


def test_generated_store_roundtrip(tmp_path, monkeypatch):
    monkeypatch.setattr(app_module, "DATA_DIR", tmp_path)
    monkeypatch.setattr(app_module, "GENERATED_FILE", tmp_path / "generated.json")
    client = TestClient(app_module.app)
    saved = client.post("/api/generated", json={"lesson_id": "01-x/02-y", "exercise": GOOD}).json()
    assert saved["id"] == "01-x/02-y#gen-1" and saved["generated"] is True
    second = client.post("/api/generated", json={"lesson_id": "01-x/02-y", "exercise": GOOD}).json()
    assert second["id"] == "01-x/02-y#gen-2"
    assert len(client.get("/api/generated", params={"lesson_id": "01-x/02-y"}).json()["items"]) == 2
    assert len(client.get("/api/generated").json()["items"]) == 2
    client.delete("/api/generated", params={"id": saved["id"]})
    assert [e["id"] for e in client.get("/api/generated").json()["items"]] == ["01-x/02-y#gen-2"]
    assert client.post("/api/generated", json={"lesson_id": "a", "exercise": {"title": "x"}}).status_code == 400
