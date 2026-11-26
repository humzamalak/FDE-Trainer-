# Architecture

## Project structure

```
fde-trainer/
├── start.cmd                    Windows: double-click to start (calls run.ps1)
├── run.ps1 / run.sh             Start scripts: venv, reinstall when requirements change, wait for /api/health
├── requirements.txt             Runtime packages, pinned
├── requirements-dev.txt         Test, lint and type-check tools
├── pyproject.toml               ruff, mypy and pytest settings
├── .env.example                 Settings template (copy to .env)
├── learner_profile.example.md   Template for your profile (copy to learner_profile.md)
├── server/
│   ├── app.py        FastAPI app: security middleware and every /api endpoint
│   ├── config.py     All settings (paths, model, budget, prices, per-start API token)
│   ├── content.py    Reads lesson Markdown; stable block IDs; cache by file modification time
│   ├── progress.py   Progress document: migration, merge with the browser copy, study time, SM-2
│   ├── stats.py      Totals per track, streak, due count, review queue
│   ├── tutor.py      Tutor prompt (with prompt caching), history cap, streaming
│   ├── generate.py   Writes new exercises with a forced tool call, static checks
│   └── usage.py      API cost per month and the monthly budget
├── static/
│   ├── index.html    The page (the server inserts the API token)
│   ├── style.css
│   ├── js/           The frontend as ES modules (no build step)
│   │   ├── main.js        start-up (with retry) and router
│   │   ├── api.js         fetch with token, clear errors, progress + localStorage, tutor stream
│   │   ├── state.js, dom.js, markdown.js, editor.js, runner.js
│   │   ├── tutor.js, sidebar.js, widgets.js, practice.js, timer.js
│   │   └── pages/         dashboard, lesson, drill, review, playground, mock, settings
│   ├── pyworker.js   Python in a Web Worker (Pyodide); top-level await allowed
│   ├── sqlworker.js  SQL in a Web Worker (sql.js = SQLite in WebAssembly)
│   ├── jsworker.js   JavaScript exercises in a Web Worker
│   └── vendor/       Bundled libraries + MANIFEST.sha256
├── content/          All training material (Markdown), one folder per track
├── scripts/
│   ├── snapshot_ids.py     Records every block ID (tests fail if one disappears)
│   └── vendor_manifest.py  Records the hashes of the bundled libraries
├── tests/            pytest: content, API, progress, tutor, generator, vendor; e2e/ in a real browser
├── docs/             This documentation
└── data/             Your progress, chats, exercises, mocks, usage (created at run time, ignored by git)
```

## How a request flows

1. `start.cmd` → `run.ps1` starts uvicorn on `127.0.0.1:8765`, waits for `/api/health`, then opens the browser.
2. The server renders `index.html` with a random **API token** made at start-up. Every `/api/...` call must send it in the `X-FDE-Token` header. Requests whose `Host` is not `127.0.0.1` or `localhost` are refused (protection against DNS rebinding). So another web site open in your browser cannot use the API or spend your API credit.
3. `main.js` loads the curriculum and progress, merges the browser's localStorage copy (`/api/progress/merge`), and routes on the URL hash (`#/lesson/...`, `#/drill`, ...).
4. The server parses a lesson's Markdown into HTML text plus **blocks** (`:::exercise`, `:::sql`, `:::js`, `:::quiz`, `:::written`). Parsed lessons are cached until the file changes.
5. Code never runs on the server. Python runs in Pyodide, SQL in sql.js, JavaScript in a worker — each in a Web Worker that is stopped after 8 seconds.
6. Progress changes go to `/api/progress`, `/api/srs` (spaced repetition) and `/api/time` (study time). The server writes `data/progress.json` atomically (temporary file, then rename).

## Stable IDs and migration

Saved progress is keyed by block IDs such as `01-python-from-zero/04-loops#ex-sum-of-even-numbers`. IDs come from the exercise title (or from `{#explicit-id}` at the end of the title line), never from the block's position, so adding a block does not move your progress. Old position-based IDs (`#exercise-3`) are migrated automatically on read. `tests/block_ids.txt` lists every ID; a test fails if one disappears.

## AI features

- **Tutor** (`/api/tutor`): the system prompt has a stable part (mode, your profile, the lesson) marked with `cache_control`, so repeat questions on a lesson are cheaper. The changing part (your current code) comes after it. Chat history is capped at 30 messages.
- **Generated exercises** (`/api/generate`): Claude must call a `create_exercise` tool (fixed JSON shape). The server checks that the code parses. The **browser** runs the solution (must pass) and the starter (must fail) in Pyodide, then saves it with `verified: true`. AI-written code is never run on your computer's own Python.
- **Usage** (`/api/usage`): every response's token counts are priced with the values in `.env` and added to `data/usage.json`. When the month's total reaches `MONTHLY_BUDGET_USD`, AI calls stop with a clear message.

## Spaced repetition (SM-2)

`server/progress.py:review()` updates an item's ease, repetitions and interval. Quality comes from the drill: solved in under 10 minutes = 5, inside 20 minutes = 4, over = 3, "I could not solve it" or opening the solution = 1. Intervals: 1 day, 6 days, then the previous interval × ease. Passing an exercise in a lesson for the first time schedules it for tomorrow.

## Data files (all in `data/`, ignored by git)

| File | Content |
|---|---|
| `progress.json` | lessons, exercises, quizzes, written answers, activity, srs, study time |
| `chats.json` | tutor chats per lesson |
| `generated.json` | AI-written exercises per lesson |
| `mocks.json` | mock interview transcripts and verdicts |
| `usage.json` | API cost per month |

Settings → **Export all my data** puts all of them in one JSON file; **Import** merges one back without overwriting anything.
