# FDE Trainer

A local, self-contained learning app that takes you from **"I cannot code"** to **interview-ready for Forward Deployed Engineer (FDE) roles**.

- **10 tracks, 57 lessons**: Python from zero (including asyncio and messy real data), the maths interviews use, coding interview patterns, SQL, JavaScript/TypeScript, LLM engineering, system design, customer skills, and interview preparation.
- **152 coding exercises** (Python, SQL, JavaScript) that run in your browser with tests, hints and solutions. Every code example in a lesson is live and editable.
- **AI tutor** (Claude API) that knows the lesson you are on, **unlimited new exercises** tested before you see them, quizzes, written tasks graded against rubrics, and **mock interviews** with verdicts.
- **Spaced repetition** drills, a review queue, study streak and study time, progress saved on disk and in the browser.
- Works **offline**: Python (Pyodide), SQLite, the editor and the maths renderer are bundled. Only the AI features use the internet.

## Quick start (Windows)

1. Install **Python 3.12+** (tick "Add python.exe to PATH") and **Git**.
2. Clone the repo:
   ```powershell
   cd $HOME\Documents\Code
   git clone https://github.com/humzamalak/FDE-Trainer-.git fde-trainer
   ```
3. Double-click **`start.cmd`** in the `fde-trainer` folder. The first run installs everything and creates `.env`.
4. For the AI features, put your key in `.env` (`ANTHROPIC_API_KEY=sk-ant-...`, from https://console.anthropic.com/), close the terminal window and double-click `start.cmd` again.
5. Study at **http://127.0.0.1:8765**. Start with **0. Start here → How to use this app**.

macOS / Linux: `./run.sh`. Details, manual setup and settings: [docs/setup.md](docs/setup.md).

## Documentation

| Document | Read it to… |
|---|---|
| [Setup](docs/setup.md) | install, run, update, and change settings (`.env`) |
| [Using the app](docs/using-the-app.md) | learn every page and button |
| [How to study](docs/studying.md) | follow the daily routine and the 24-week plan, and know when you are interview-ready |
| [Costs, security and privacy](docs/costs-and-privacy.md) | understand API cost, the monthly budget, and what leaves your computer |
| [Troubleshooting](docs/troubleshooting.md) | fix common problems |
| [Architecture](docs/architecture.md) | understand how the code works |
| [Writing lessons](docs/content.md) | add your own lessons and exercises |
| [Development](docs/development.md) | run the tests, lint, CI, and practice projects to improve the app |

## Your data

Progress, chats, generated exercises, mock interviews and usage are in `data/` (ignored by git) and progress is also copied to your browser. **Settings → Export all my data** makes a backup file. `.env` and `learner_profile.md` are ignored by git too — never commit your API key.
