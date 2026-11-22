# FDE Trainer

A local learning app that takes you from "I cannot code" to interview-ready for **Forward Deployed Engineer** roles.

- **8 tracks, 47 lessons**: Python from zero, the maths you need, coding interview patterns, LLM engineering, system design, customer skills, and interview preparation.
- **110+ coding exercises** that run Python in your browser (Pyodide), with tests, hints and solutions.
- **Quizzes** and **written tasks** graded by an AI tutor against a rubric.
- **AI tutor** (Claude API) that knows which lesson you are on: ask questions, get hints, get code reviews.
- **Mock interviews**: live coding (with an editor), system design, customer case, behavioural — each with a timer and a verdict.
- **Progress** is saved in `data/progress.json` on your computer.

## Run it (Windows)

Requirements: Python 3.11+ and an internet connection (the page loads Pyodide, CodeMirror and KaTeX from CDNs).

```powershell
cd Documents\Code\fde-trainer
powershell -ExecutionPolicy Bypass -File .\run.ps1
```

The first run creates `.venv`, installs packages and creates `.env`. Open `.env` and add your key:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Get a key at https://console.anthropic.com/settings/keys. Then run `run.ps1` again. The app opens at http://127.0.0.1:8765.

Optional: copy `learner_profile.example.md` to `learner_profile.md` and describe yourself. The tutor reads it. Git ignores it.

On macOS/Linux: `./run.sh`.

## Cost

The tutor uses `claude-sonnet-5-5` by default (change `ANTHROPIC_MODEL` in `.env`). A normal question costs a fraction of a penny to a few pence, because each call includes the current lesson text. A full mock interview costs more (long conversation). Set a monthly spend limit in the Anthropic Console.

## How to study

Work through the tracks in order (see "How to use this app" in track 0). About 10 hours a week takes about 24 weeks. Struggle before you ask for hints. Type everything. Talk aloud while you code.

## Project layout

```
server/
  app.py        FastAPI server: content, progress and tutor endpoints
  content.py    Parses lesson Markdown and its :::exercise / :::quiz / :::written blocks
  tutor.py      Builds the system prompt and streams replies from the Claude API
static/
  index.html, style.css, app.js   The single-page frontend (no build step)
  pyworker.js                     Runs Python in a Web Worker with Pyodide
content/
  NN-track/_track.md              Track title and description
  NN-track/NN-lesson.md           Lessons (edit or add your own)
tests/
  test_content.py   Checks every exercise: the solution passes and the starter fails
  test_api.py       API tests
```

## Add your own lessons

Create a Markdown file in a track folder, for example `content/03-coding-interview-patterns/10-my-topic.md`. Use these blocks:

```
:::exercise Title
Explain the task in Markdown.
--- starter ---
def f(x):
    pass
--- tests ---
assert f(1) == 2
--- solution ---
def f(x):
    return x + 1
:::

:::quiz
Q: Question?
- [ ] wrong
- [x] right
> Explanation.
:::

:::written Title
The prompt.
--- rubric ---
What a good answer contains.
:::
```

Run `python -m pytest` to check that your new exercises work. Maths: `$inline$` and `$$display$$`. Money: write `\$5`.

## Practice ideas: improve this app yourself

These are good take-home-style tasks once you finish track 1:

1. Add a "review queue" page that lists quizzes you got wrong.
2. Add a streak counter (days in a row with a completed lesson).
3. Save tutor chats to `data/` so they survive a restart.
4. Add a `/api/stats` endpoint and a test for it.
5. Add GitHub Actions to run `pytest` on every push.

## Security notes

- The server listens on `127.0.0.1` only.
- `.env`, `data/` and `learner_profile.md` are in `.gitignore`. Never commit your API key.
- Exercise code runs in your browser sandbox, not on the server.
