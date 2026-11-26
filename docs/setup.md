# Setup

## What you need

- A Windows, macOS or Linux computer.
- **Python 3.11 or newer.**
- **Git** (to clone the repo).
- **Internet only for the AI features.** Lessons, live examples, exercises, quizzes, drills and the Playground work offline: Pyodide, CodeMirror, KaTeX, marked, DOMPurify and highlight.js are bundled in `static/vendor/`.
- **An Anthropic API key** for the AI tutor and mock interviews. The lessons, exercises and quizzes work without a key. The tutor, written-task grading and mock interviews do not.

## Install and run on Windows (step by step)

### Step 1 — Install Python

1. Go to https://www.python.org/downloads/ and download Python 3.12 (or newer).
2. Run the installer. **Select "Add python.exe to PATH"** on the first screen.
3. Open **PowerShell** and type:
   ```powershell
   python --version
   ```
   You must see `Python 3.12.x` or newer.

### Step 2 — Install Git

1. Download Git from https://git-scm.com/download/win and install it with the default options.
2. Check it:
   ```powershell
   git --version
   ```

### Step 3 — Get the code

```powershell
cd $HOME\Documents\Code
git clone https://github.com/humzamalak/FDE-Trainer-.git fde-trainer
cd fde-trainer
```

### Step 4 — Get an API key

1. Go to https://console.anthropic.com/ and sign in.
2. Add credit in **Billing**. Set a monthly spend limit (for example £10).
3. Go to **API keys** and create a key. Copy it. It starts with `sk-ant-`.

### Step 5 — First run

**Easiest:** double-click `start.cmd` in the `fde-trainer` folder.

Or, in PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\run.ps1
```

The first run:
- creates a virtual environment in `.venv`,
- installs the packages from `requirements.txt` (and again automatically whenever that file changes after a `git pull`),
- creates a `.env` file from `.env.example`,
- opens the browser as soon as the server answers.

### Step 6 — Add your key

Open `.env` in VS Code or Notepad. Paste your key after the `=`:

```
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

Save the file.

### Step 7 — (Optional) Tell the tutor about you

```powershell
Copy-Item learner_profile.example.md learner_profile.md
```

Edit `learner_profile.md`: your role, what you are good at, what you are weak at, your goal. The tutor uses this to choose examples and the right level. Git ignores this file.

### Step 8 — Run the app

Double-click `start.cmd`, or:

```powershell
powershell -ExecutionPolicy Bypass -File .\run.ps1
```

Your browser opens http://127.0.0.1:8765. If it does not, open that address yourself.

**To stop the app:** press `Ctrl+C` in the PowerShell window.
**To start it again later:** run the same command. Setup does not repeat.

## Install and run on macOS or Linux

```bash
git clone https://github.com/humzamalak/FDE-Trainer-.git fde-trainer
cd fde-trainer
./run.sh            # first run: creates .venv, installs packages, creates .env
nano .env           # add ANTHROPIC_API_KEY=sk-ant-...
cp learner_profile.example.md learner_profile.md   # optional
./run.sh
```

Open http://127.0.0.1:8765.

## Manual setup (without the run script)

Use this if you want to understand each step, or if the script does not work.

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1          # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
Copy-Item .env.example .env           # macOS/Linux: cp .env.example .env
# edit .env and add your key
python -m uvicorn server.app:app --host 127.0.0.1 --port 8765
```

For development, add `--reload` so the server restarts when you change Python files. Lesson Markdown files reload without a restart.

### Settings in `.env`

| Setting | Default | Meaning |
|---|---|---|
| `ANTHROPIC_API_KEY` | (empty) | Your API key. Required for the tutor |
| `ANTHROPIC_MODEL` | `claude-sonnet-5-5` | The model the tutor uses. A smaller model is cheaper; a larger model gives better feedback |
| `TUTOR_MAX_TOKENS` | `2000` | Maximum length of one tutor reply |
| `MONTHLY_BUDGET_USD` | `10` | AI features stop when this month's estimated spend reaches it. `0` = no limit |
| `PRICE_INPUT_PER_MTOK` … `PRICE_CACHE_READ_PER_MTOK` | `3` / `15` / `3.75` / `0.30` | USD per million tokens, used to estimate cost. Check the current prices for your model |
| `FDE_DATA_DIR` | `data/` | Where your progress and other data files are kept |

## Update to a new version

```powershell
cd $HOME\Documents\Code\fde-trainer
git pull
```

Then close the app's terminal window and double-click `start.cmd`. New packages install automatically. Your progress is kept: it is in `data/` (not in git) and in your browser.
