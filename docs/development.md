# Development

## Run the tests

```powershell
.\.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
python -m playwright install chromium   # once, for the browser tests
python -m pytest                         # everything
python -m pytest --ignore=tests/e2e      # fast: no browser
ruff check . ; ruff format --check . ; mypy
```

| Test file | What it checks |
|---|---|
| `test_content.py` | Every Python/SQL/JS exercise: solution passes, starter fails; quizzes have answers |
| `test_progress.py` | Stable IDs (snapshot), migration, SM-2, study time, review queue, mocks, export/import |
| `test_api.py` | Endpoints, token and host checks, cache headers |
| `test_tutor.py` | Prompt caching blocks, history cap, cost and budget |
| `test_generate.py` | Exercise generation with a fake API client |
| `test_vendor.py` | Bundled libraries match their hashes; no external URLs |
| `e2e/test_browser.py` | Real browser with the internet blocked: exercises, SQL, JS, async, progress restore, mobile menu |

All tests must pass before you commit changes to the content or the server. GitHub Actions runs the same tests on every push (see the **Actions** tab on GitHub).

## Improve the app yourself (practice projects)

Many features started as items on this list. Read how one works — `server/progress.py` (spaced repetition) and `tests/test_progress.py` are short — then try these. They are good take-home-style tasks once you finish track 1. Use a branch, write tests, and open a pull request to yourself.

1. **Drill history** — keep each drill's time and quality; show your average time per track and per pattern.
2. **Weak-topic finder** — rank lessons by failed test runs, wrong quiz answers and low written scores; suggest what to review.
3. **Lesson search** — a search box over all lessons (try the BM25-lite idea from track 4).
4. **Flashcard deck** — save "Make flashcards" output as cards and add them to spaced repetition.
5. **Dark/light toggle** — store the choice in `localStorage`.
6. **A new track** — for example Docker and Kubernetes for FDEs, with your own exercises and IDs snapshot.
