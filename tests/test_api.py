from fastapi.testclient import TestClient

import server.app as app_module

client = TestClient(app_module.app)


def test_curriculum_endpoint():
    response = client.get("/api/curriculum")
    assert response.status_code == 200
    assert response.json()["tracks"]


def test_lesson_endpoint_and_404():
    first = client.get("/api/curriculum").json()["tracks"][0]["lessons"][0]["id"]
    assert client.get(f"/api/lesson/{first}").status_code == 200
    assert client.get("/api/lesson/../../etc/passwd").status_code == 404


def test_progress_roundtrip(tmp_path, monkeypatch):
    monkeypatch.setattr(app_module, "DATA_DIR", tmp_path)
    monkeypatch.setattr(app_module, "PROGRESS_FILE", tmp_path / "progress.json")
    client.post("/api/progress", json={"section": "lessons", "key": "a/b", "value": True})
    assert client.get("/api/progress").json()["lessons"] == {"a/b": True}


def test_tutor_without_key(monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    response = client.post("/api/tutor", json={"messages": [{"role": "user", "content": "hi"}]})
    assert "No API key" in response.text


def test_cache_headers():
    assert client.get("/static/app.js").headers["cache-control"] == "no-cache"
    assert client.get("/").headers["cache-control"] == "no-cache"
    assert "max-age" in client.get("/static/vendor/marked/marked.min.js").headers["cache-control"]
