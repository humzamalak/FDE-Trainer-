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

## Jitter and idempotency keys

Two ideas separate a toy client from a production one.

**Jitter.** If 1,000 clients fail at the same moment and all retry after exactly 1, 2, 4 seconds, they hit the server together again each time (a "thundering herd"). Add randomness: **full jitter** waits a random time between 0 and the exponential delay, capped at a maximum:

$$\text{wait} = \text{random}(0,\ \min(\text{cap},\ \text{base} \times 2^{\text{attempt}}))$$

If the server sends a `Retry-After` header (common with 429 and 503), wait at least that long.

**Idempotency keys.** A retry is only safe if doing the request twice has the same effect as doing it once. `GET`, `PUT` and `DELETE` are idempotent by design; `POST` ("create a payment") is not. If the response is lost after the server created the payment, a retry creates a **second** payment. The fix: the client generates a unique key (`uuid.uuid4()`) per logical operation and sends it in a header like `Idempotency-Key`. The server stores the key with the result; a repeat with the same key returns the stored result instead of acting again. Stripe and many payment APIs work this way, and you should build your own APIs this way too.

:::exercise Backoff with full jitter
Write `delays(attempts, base, cap, rand)` that returns the list of waits before each retry (so `attempts - 1` values). Each wait is `rand() * min(cap, base * 2 ** i)` for `i = 0, 1, 2, …`. `rand` is passed in (normally `random.random`) so the tests can control it.
--- starter ---
def delays(attempts, base, cap, rand):
    return [base * 2 ** i for i in range(attempts - 1)]
--- tests ---
assert delays(4, 1, 100, lambda: 0.5) == [0.5, 1.0, 2.0]
assert delays(6, 1, 5, lambda: 1.0) == [1, 2, 4, 5, 5]
assert delays(1, 1, 5, lambda: 1.0) == []
import random
random.seed(1)
ws = delays(5, 2, 10, random.random)
assert len(ws) == 4 and all(0 <= w <= 10 for w in ws) and len(set(ws)) == 4
--- solution ---
def delays(attempts, base, cap, rand):
    return [rand() * min(cap, base * 2 ** i) for i in range(attempts - 1)]
:::

:::exercise An idempotent payments endpoint
Write a class `Payments` with `create(key, amount)`. The first call with a key creates a payment and returns `{"id": n, "amount": amount}` with ids 1, 2, 3, …. A repeat call with the **same key** returns the same result and creates nothing. A repeat with the same key but a **different amount** is a client bug: raise `ValueError`.
--- starter ---
class Payments:
    def __init__(self):
        self.created = []

    def create(self, key, amount):
        payment = {"id": len(self.created) + 1, "amount": amount}
        self.created.append(payment)
        return payment
--- tests ---
p = Payments()
first = p.create("k1", 50)
assert first == {"id": 1, "amount": 50}
assert p.create("k1", 50) == first          # a retry: same answer
assert len(p.created) == 1                  # and no second payment
assert p.create("k2", 20) == {"id": 2, "amount": 20}
try:
    p.create("k1", 99)
    raise AssertionError("expected ValueError")
except ValueError:
    pass
--- solution ---
class Payments:
    def __init__(self):
        self.created = []
        self.by_key = {}

    def create(self, key, amount):
        if key in self.by_key:
            stored = self.by_key[key]
            if stored["amount"] != amount:
                raise ValueError("idempotency key reused with a different request")
            return stored
        payment = {"id": len(self.created) + 1, "amount": amount}
        self.created.append(payment)
        self.by_key[key] = payment
        return payment
:::

:::cards HTTP reliability
Retry these status codes :: 429, 500, 502, 503, 504 and network errors — with backoff. Not 400, 401, 403, 404.
Full jitter :: wait = random(0, min(cap, base × 2^attempt)); stops many clients retrying at the same moment.
Retry-After header :: The server tells you how long to wait; respect it.
Idempotency key :: A unique key per logical operation, so a retried POST does not act twice.
Idempotent methods :: GET, PUT, DELETE (by design). POST is not.
:::
