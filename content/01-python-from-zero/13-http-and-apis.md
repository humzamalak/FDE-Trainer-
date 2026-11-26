# HTTP, REST APIs and FastAPI
<!-- minutes: 60 -->

An FDE connects a product to a customer's systems. Nearly all of that is HTTP APIs.

## HTTP in one table

| Part | Example |
|---|---|
| Method | `GET` read, `POST` create, `PUT`/`PATCH` update, `DELETE` remove |
| URL | `https://api.example.com/v1/projects?page=2` |
| Headers | `Authorization: Bearer <token>`, `Content-Type: application/json` |
| Body | JSON for POST/PUT |
| Status | `200` OK, `201` created, `400` bad request, `401` not logged in, `403` forbidden, `404` not found, `429` too many requests, `500`/`503` server error |

**Retry** on `429` and `5xx` (with backoff). **Do not retry** on `4xx` other than 429: the request itself is wrong.

## Calling an API with requests

```python
import requests


def get_projects(base_url, token):
    resp = requests.get(
        f"{base_url}/v1/projects",
        headers={"Authorization": f"Bearer {token}"},
        params={"page": 1},
        timeout=10,  # always set a timeout
    )
    resp.raise_for_status()  # raises for 4xx/5xx
    return resp.json()
```

`httpx` is a modern alternative with the same style, and it supports async.

## Building an API with FastAPI

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()


class JobIn(BaseModel):
    name: str
    gpus: int = 1


JOBS: dict[int, dict] = {}


@app.post("/jobs", status_code=201)
def create_job(job: JobIn):
    if job.gpus > 8:
        raise HTTPException(400, "max 8 GPUs")
    job_id = len(JOBS) + 1
    JOBS[job_id] = job.model_dump()
    return {"id": job_id, **JOBS[job_id]}


@app.get("/jobs/{job_id}")
def get_job(job_id: int):
    if job_id not in JOBS:
        raise HTTPException(404, "not found")
    return JOBS[job_id]
```

Run: `uvicorn main:app --reload`. Open `/docs` for automatic API docs. Pydantic checks the input types for you. **This app's own server (`server/app.py`) is FastAPI. Read it.**

## Auth patterns you will meet

- **API keys** in a header. Simple. Keep them in environment variables or a secrets manager (you know Vault).
- **OAuth 2 / OIDC**: tokens from an identity provider (Azure AD / Entra ID, Okta). Client credentials flow for service-to-service.
- **SAML**: older enterprise SSO.
- **Webhooks**: the other system calls *your* URL. Verify an HMAC signature.

:::exercise Should I retry?
Write `should_retry(status, attempt, max_attempts=3)`. Return `True` only if the status is `429` or `500`–`599` **and** `attempt` is less than `max_attempts`.
--- starter ---
def should_retry(status, attempt, max_attempts=3):
    pass
--- tests ---
assert should_retry(503, 1) is True
assert should_retry(429, 2) is True
assert should_retry(429, 3) is False
assert should_retry(404, 1) is False
assert should_retry(200, 1) is False
assert should_retry(500, 4, max_attempts=5) is True
--- solution ---
def should_retry(status, attempt, max_attempts=3):
    retryable = status == 429 or 500 <= status <= 599
    return retryable and attempt < max_attempts
:::

:::exercise A client with retries
Write `call_with_retry(send, max_attempts=3)`. `send()` returns a tuple `(status, body)`. Call it until the status is not retryable (use your rule: 429 or 5xx) or you reach `max_attempts` calls. Return the last `(status, body)`.
--- starter ---
def call_with_retry(send, max_attempts=3):
    pass
--- tests ---
responses = iter([(503, None), (429, None), (200, "ok")])
assert call_with_retry(lambda: next(responses)) == (200, "ok")
responses2 = iter([(500, "a"), (500, "b"), (500, "c"), (200, "never")])
assert call_with_retry(lambda: next(responses2)) == (500, "c")
responses3 = iter([(404, "missing"), (200, "never")])
assert call_with_retry(lambda: next(responses3)) == (404, "missing")
--- solution ---
def call_with_retry(send, max_attempts=3):
    for attempt in range(1, max_attempts + 1):
        status, body = send()
        retryable = status == 429 or 500 <= status <= 599
        if not retryable or attempt == max_attempts:
            return status, body
:::

:::exercise Verify a webhook signature
A webhook sender signs the body with a shared secret using HMAC-SHA256. Write `verify(secret, body, signature)` that returns `True` if `signature` equals the hex HMAC of `body`.

Use `hmac.new(secret.encode(), body.encode(), hashlib.sha256).hexdigest()` and compare with `hmac.compare_digest` (it prevents timing attacks).
--- starter ---
import hmac, hashlib

def verify(secret, body, signature):
    pass
--- tests ---
import hmac, hashlib
good = hmac.new(b"s3cret", b'{"event":"done"}', hashlib.sha256).hexdigest()
assert verify("s3cret", '{"event":"done"}', good) is True
assert verify("s3cret", '{"event":"hacked"}', good) is False
assert verify("wrong", '{"event":"done"}', good) is False
--- solution ---
import hmac, hashlib

def verify(secret, body, signature):
    expected = hmac.new(secret.encode(), body.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)
:::

:::written Design a small REST API
A research team wants an API to request GPU time on the cluster. Write the endpoints (method + path), the JSON body for creating a request, the status codes you return, and how you authenticate users. Keep it under 250 words.
--- rubric ---
- Resource-oriented paths (e.g. POST /gpu-requests, GET /gpu-requests/{id}, list with pagination, maybe PATCH for approve/cancel)
- A sensible JSON body (project, gpus, hours, purpose/justification) with validation rules
- Correct status codes (201, 400/422, 401, 403, 404, 409 or 429 where relevant)
- Authentication via SSO/OIDC with the institution identity provider (e.g. Entra ID), and authorisation by role/project
- Mentions idempotency or audit logging as a bonus
:::

:::quiz
Q: An API returns 401. What does it mean?
- [ ] The server crashed
- [x] You are not authenticated (missing or bad credentials)
- [ ] Rate limited
Q: Which status should you retry?
- [ ] 400
- [ ] 404
- [x] 503
:::
