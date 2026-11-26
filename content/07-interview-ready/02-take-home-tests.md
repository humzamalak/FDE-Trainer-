# Take-home tests
<!-- minutes: 40 -->

A take-home shows how you work when nobody watches. Reviewers read the **README first**, then the tests, then the code.

## How to do it well

1. **Read the brief twice.** List the requirements. Ask questions by email if something is unclear — this is part of the test.
2. **Time-box.** If they say 4 hours, spend about 4 hours. Write down what you would do with more time.
3. **Scope first.** Build the core path end to end, then improve. A complete simple solution beats an unfinished clever one.
4. **Structure**: small modules, clear names, type hints, config through environment variables, no secrets in the repo.
5. **Tests**: the main path plus edge cases. Make `pytest` pass with one command.
6. **README**: how to run it (one command, e.g. `docker compose up` or `make run`), design decisions and trade-offs, assumptions, what you would do next, how you used AI tools (be honest if they ask).
7. **For an AI take-home**: include a small eval (even 10–20 cases) and report the score. This sets you apart.

## README template

```markdown
# <Project>
## Run it
## What it does
## Design decisions (and trade-offs)
## Evaluation (method + results)
## Assumptions
## With more time I would…
```

## This repo is an example

This app is a small, real project: a FastAPI backend, ES-module frontend, tests in `tests/` (including browser tests), CI, and docs in `docs/`. Read `server/content.py`, `server/progress.py` and `tests/test_progress.py` when you are comfortable with track 1. Then add a feature yourself (see `docs/development.md` for ideas). That is excellent take-home practice.

:::written Practice take-home plan
Brief: "Build a service that takes a PDF of a research grant application and returns a structured JSON summary (applicant, institution, amount, duration, topic, risks). You have 4 hours." Write your plan: scope, architecture, how you extract text, the prompt/schema approach, tests and eval, and the README sections.
--- rubric ---
- Realistic scope for 4 hours, core path first, explicit out-of-scope list
- Architecture: FastAPI endpoint, PDF text extraction library, LLM call with schema/structured output, validation with Pydantic
- Handles failures (bad PDF, long documents/chunking, invalid model output with retry)
- Tests for parsing/validation with a fake LLM, plus a small labelled eval set with field-level accuracy
- README with run instructions, decisions, eval results and next steps
:::
