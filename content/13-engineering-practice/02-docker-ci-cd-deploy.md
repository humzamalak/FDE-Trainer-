# Docker, CI/CD and safe deploys
<!-- minutes: 50 -->

You know containers and clusters from the platform side. As an FDE you also **package your own application**, set up its pipeline, and deploy it into the customer's environment without breaking anything.

## A good Dockerfile for a Python service

```dockerfile
# syntax=docker/dockerfile:1
FROM python:3.12-slim AS base            # a pinned, small base image (never :latest)
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app

COPY requirements.txt .                   # dependencies first: this layer is cached
RUN pip install --no-cache-dir -r requirements.txt

COPY . .                                  # then the code, which changes often
RUN useradd --create-home app
USER app                                  # do not run as root
EXPOSE 8000
HEALTHCHECK CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health')"
CMD ["uvicorn", "server.app:app", "--host", "0.0.0.0", "--port", "8000"]
```

Rules: pin the base image; copy the dependency file before the code (layer caching); a `.dockerignore` for `.git`, `.venv`, `.env` and data; run as a non-root user; **never put secrets in the image** (`ENV API_KEY=...` stays in every layer forever) — pass them at run time from the platform's secret store; one process per container; log to stdout. Multi-stage builds keep compilers out of the final image.

`docker compose` runs the app with its database locally, the same way every time:

```yaml
services:
  app:
    build: .
    env_file: .env          # secrets from a file that is not in git
    ports: ["8000:8000"]
    depends_on: [db]
  db:
    image: postgres:16
    environment: { POSTGRES_PASSWORD: example }
    volumes: [dbdata:/var/lib/postgresql/data]
volumes: { dbdata: {} }
```

## CI: every push

1. **Lint and type-check** (ruff, mypy) — fast, fails early.
2. **Unit tests**, then integration tests (with a real database in a service container).
3. **Build** the image, tag it with the git commit SHA (not only `latest`).
4. **Scan** the image and dependencies for known vulnerabilities.
5. **Push** to the registry.

## CD: getting it to production safely

- **Environments**: dev → staging (like production, with fake data) → production. The same image moves through all of them; only configuration changes.
- **Rolling** update: replace instances a few at a time (Kubernetes default).
- **Blue/green**: run the new version beside the old one, switch traffic at once, switch back if needed.
- **Canary**: send a small share of traffic (for example 5%) to the new version, compare error rate and latency, then increase.
- **Feature flags**: deploy the code switched off; turn it on for some users. Deploy and release become separate steps.
- **Database migrations**: make them backward-compatible (add a column first, use it later, remove the old one last) so a rollback does not break.
- **Rollback**: know the command before you deploy. Practise it.

At many customers there is a **change process** (a change request, a change window, approval by a change board). Respect it; ask early what it needs.

:::exercise Lint a Dockerfile
Write `lint(dockerfile)` that returns a list of problems (strings, in this order) for these rules:
`"unpinned base image"` if any `FROM` image has no tag or uses `:latest`;
`"runs as root"` if there is no `USER` line, or the last `USER` is `root`;
`"secret in image"` if an `ENV` or `ARG` line contains `KEY`, `TOKEN`, `PASSWORD` or `SECRET` (any case) followed by `=`;
`"code copied before dependencies"` if a `COPY . ` line comes before the line that installs requirements (`pip install`).
Ignore comment lines and the text after a `#` on any line.
--- starter ---
def lint(dockerfile):
    problems = []
    if "latest" in dockerfile:
        problems.append("unpinned base image")
    return problems
--- tests ---
good = """FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
USER app
CMD ["python", "main.py"]"""
assert lint(good) == []
bad = """FROM python
ENV OPENAI_API_KEY=sk-123
COPY . .
RUN pip install -r requirements.txt
CMD ["python", "main.py"]"""
assert lint(bad) == ["unpinned base image", "runs as root", "secret in image", "code copied before dependencies"]
assert lint("FROM node:latest\nUSER root") == ["unpinned base image", "runs as root"]
assert lint("# FROM python\nFROM python:3.12 AS build  # :latest is bad\nUSER app") == []
--- solution ---
import re

def lint(dockerfile):
    lines = []
    for raw in dockerfile.splitlines():
        line = raw.split("#", 1)[0].strip()
        if line:
            lines.append(line)
    problems = []
    images = [line.split()[1] for line in lines if line.upper().startswith("FROM ") and len(line.split()) > 1]
    if any(":" not in image or image.endswith(":latest") for image in images):
        problems.append("unpinned base image")
    users = [line.split()[1] for line in lines if line.upper().startswith("USER ") and len(line.split()) > 1]
    if not users or users[-1] == "root":
        problems.append("runs as root")
    if any(re.match(r"(ENV|ARG)\s", line, re.I) and re.search(r"(KEY|TOKEN|PASSWORD|SECRET)\w*\s*=", line, re.I) for line in lines):
        problems.append("secret in image")
    copy_all = next((i for i, line in enumerate(lines) if re.match(r"COPY\s+\.\s", line, re.I)), None)
    install = next((i for i, line in enumerate(lines) if "pip install" in line), None)
    if copy_all is not None and install is not None and copy_all < install:
        problems.append("code copied before dependencies")
    return problems
:::

:::exercise Should the canary continue?
Write `canary_decision(baseline, canary, max_error_increase=0.005, max_latency_ratio=1.2, min_requests=500)`. Each argument `baseline` and `canary` is a dict with `requests`, `errors` and `p95_ms`. Return `"wait"` if the canary has fewer than `min_requests` requests; `"rollback"` if its error rate is more than `max_error_increase` above the baseline's, or its p95 is more than `max_latency_ratio` times the baseline's; otherwise `"promote"`.
--- starter ---
def canary_decision(baseline, canary, max_error_increase=0.005, max_latency_ratio=1.2, min_requests=500):
    return "promote"
--- tests ---
base = {"requests": 20000, "errors": 40, "p95_ms": 300}
assert canary_decision(base, {"requests": 100, "errors": 0, "p95_ms": 290}) == "wait"
assert canary_decision(base, {"requests": 1000, "errors": 3, "p95_ms": 310}) == "promote"
assert canary_decision(base, {"requests": 1000, "errors": 9, "p95_ms": 300}) == "rollback"
assert canary_decision(base, {"requests": 1000, "errors": 2, "p95_ms": 400}) == "rollback"
--- solution ---
def canary_decision(baseline, canary, max_error_increase=0.005, max_latency_ratio=1.2, min_requests=500):
    if canary["requests"] < min_requests:
        return "wait"  # too little traffic to judge
    base_rate = baseline["errors"] / baseline["requests"]
    canary_rate = canary["errors"] / canary["requests"]
    if canary_rate - base_rate > max_error_increase:
        return "rollback"
    if canary["p95_ms"] > baseline["p95_ms"] * max_latency_ratio:
        return "rollback"
    return "promote"
:::

:::quiz
Q: Why copy requirements.txt and install dependencies before copying the rest of the code?
- [x] So Docker reuses the cached dependency layer when only the code changes
- [ ] Because pip needs an empty folder
Q: You put `ENV API_KEY=...` in a Dockerfile and later removed the line. Is the key safe?
- [ ] Yes
- [x] No: it stays in the old image layers and in any image already pushed. Rotate the key.
Q: What makes a database migration safe to roll back?
- [x] It is backward-compatible: the old code still works with the new schema
- [ ] It runs at night
:::

:::cards Docker and deploys
Dockerfile essentials :: Pinned slim base, dependencies before code, .dockerignore, non-root USER, no secrets, health check.
Image tag in CI :: The git commit SHA, so you know exactly what runs.
Blue/green :: Run old and new side by side; switch traffic at once; switch back to roll back.
Canary :: Send a small share of traffic to the new version; compare errors and latency before going further.
Feature flag :: Deploy the code switched off; release it separately.
Backward-compatible migration :: Expand (add), migrate, then contract (remove) in later releases.
:::
