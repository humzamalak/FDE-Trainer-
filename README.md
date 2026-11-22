# FDE Trainer

A local learning app that takes you from **"I cannot code"** to **interview-ready for Forward Deployed Engineer (FDE) roles**.

It runs on your own computer. It contains all the lessons, more than 110 coding exercises that run in your browser, quizzes, written tasks, an AI tutor connected to the Claude API, and AI mock interviews.

---

## Contents

1. [What is in the app](#1-what-is-in-the-app)
2. [What you need](#2-what-you-need)
3. [Install and run on Windows (step by step)](#3-install-and-run-on-windows-step-by-step)
4. [Install and run on macOS or Linux](#4-install-and-run-on-macos-or-linux)
5. [Manual setup (without the run script)](#5-manual-setup-without-the-run-script)
6. [A tour of the app](#6-a-tour-of-the-app)
7. [How to learn with this app](#7-how-to-learn-with-this-app)
8. [The 24-week plan](#8-the-24-week-plan)
9. [When are you interview-ready?](#9-when-are-you-interview-ready)
10. [Cost of the AI tutor](#10-cost-of-the-ai-tutor)
11. [Troubleshooting](#11-troubleshooting)
12. [Project structure](#12-project-structure)
13. [Add your own lessons](#13-add-your-own-lessons)
14. [Run the tests](#14-run-the-tests)
15. [Improve the app yourself (practice projects)](#15-improve-the-app-yourself-practice-projects)
16. [Security and privacy](#16-security-and-privacy)

---

## 1. What is in the app

| Part | What it gives you |
|---|---|
| **8 tracks, 47 lessons** | Start here → Python from zero → Maths for FDE → Coding interview patterns → LLM engineering → System design → Customer skills → Interview ready |
| **117 coding exercises** | Write Python in the browser. Click **Check** to run the tests. You see which test failed, what was expected and what you got |
| **44 quizzes** | Fast checks after each lesson, with explanations |
| **20 written tasks** | Free-text answers (designs, STAR stories, customer cases). The AI tutor grades them against a rubric |
| **AI tutor** | A chat panel that knows the lesson you are on. Ask questions, get hints, get your code explained or reviewed |
| **Playground** | A free Python editor to try ideas |
| **Timed drill** | A random exercise from lessons you have studied, with an empty editor and a 20-minute timer |
| **Review queue** | Every quiz question you answered wrongly, to answer again until it is right |
| **Study streak** | Days in a row with study activity, shown on the dashboard |
| **Mock interviews** | Live coding (with an editor), system design, customer case and behavioural rounds, each with a timer and a verdict |
| **Progress tracking** | Completed lessons, passed exercises, quiz answers, graded written tasks and tutor chats are saved on your computer |

The maths track covers everything an FDE interview uses: Big-O and logarithms, binary and powers of two, counting, probability, statistics for AI evaluations (precision, recall, confidence intervals), vectors and cosine similarity for embeddings, and back-of-envelope estimation. No calculus is needed.

---

## 2. What you need

- A Windows, macOS or Linux computer.
- **Python 3.11 or newer.**
- **Git** (to clone the repo).
- **An internet connection.** The page loads the Python runtime (Pyodide), the code editor and the maths renderer from public CDNs.
- **An Anthropic API key** for the AI tutor and mock interviews. The lessons, exercises and quizzes work without a key. The tutor, written-task grading and mock interviews do not.

---

## 3. Install and run on Windows (step by step)

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

```powershell
powershell -ExecutionPolicy Bypass -File .\run.ps1
```

The first run:
- creates a virtual environment in `.venv`,
- installs the packages from `requirements.txt`,
- creates a `.env` file from `.env.example`.

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

```powershell
powershell -ExecutionPolicy Bypass -File .\run.ps1
```

Your browser opens http://127.0.0.1:8765. If it does not, open that address yourself.

**To stop the app:** press `Ctrl+C` in the PowerShell window.
**To start it again later:** run the same command. Setup does not repeat.

---

## 4. Install and run on macOS or Linux

```bash
git clone https://github.com/humzamalak/FDE-Trainer-.git fde-trainer
cd fde-trainer
./run.sh            # first run: creates .venv, installs packages, creates .env
nano .env           # add ANTHROPIC_API_KEY=sk-ant-...
cp learner_profile.example.md learner_profile.md   # optional
./run.sh
```

Open http://127.0.0.1:8765.

---

## 5. Manual setup (without the run script)

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

---

## 6. A tour of the app

### Dashboard
Shows lessons done, exercises passed, your **study streak**, your **quiz accuracy**, a **Continue** button to your next lesson, and progress per track (lessons and exercises).

A day counts towards the streak when you complete a lesson, run an exercise's tests, answer a quiz or submit a written task. The streak stays alive until the end of the next day.

### Drill (top menu)
Picks a random exercise from lessons you completed or practised. The editor starts with the starter code, not your old answer, so you solve it **from memory**. A 20-minute timer runs. When the tests pass, you see how long you took. Click **New drill** for another. Do one or two drills every day: this is spaced repetition under interview pressure.

### Review (top menu)
Lists every quiz question you last answered wrongly, with a link to its lesson. Answer it again. A correct answer removes it from the queue. The dashboard shows how many are waiting.

### Sidebar
All tracks and lessons. A ✓ marks a completed lesson. Click a track name to open or close it.

### A lesson
- **Text and code examples.** Read them. Type the examples into the Playground.
- **Exercise cards.** Each has:
  - an editor with starter code,
  - **Run** — runs your code and shows printed output,
  - **Check (run tests)** — runs the tests and shows ✓ or ✗ for each one, with the expected and actual values,
  - **Hint** — the tutor gives one small hint, not the answer,
  - **Explain my error** — the tutor explains the error in simple words,
  - **Review my code** — the tutor reviews it like an interviewer,
  - **Reset** — back to the starter code,
  - **Show solution** — use only after a real attempt.

  Your code is saved. When all tests pass, the exercise is marked as passed.
- **Quiz cards.** Click an answer to see if it is right and why.
- **Written tasks.** Write your answer and click **Submit for grading**. The tutor grades it against a rubric and gives a score and improvements. The answer and feedback are saved.
- **Mark lesson complete** at the bottom. Do this only when you can do the exercises without help.

### Ask tutor (top right)
Opens a chat panel. The tutor knows the current lesson. Each lesson has its own chat, saved in `data/chats.json`, so it is still there after a restart. **Clear** deletes the chat for that lesson. Good questions:
- "Explain dictionaries again with an AWS example."
- "Give me 3 more exercises like this one, without solutions."
- "Quiz me on this lesson, one question at a time."
- "Why is this O(n log n) and not O(n)?"

### Playground
A free editor. Press **Run** or `Ctrl+Enter`. **Explain this code** and **Review** send your code to the tutor. Your code stays in this browser.

### Mock interviews
| Mode | Length | What happens |
|---|---|---|
| **Live coding** | 35 min | The interviewer gives a problem. You talk in the chat and code in the editor. **Share code with interviewer** sends your current code |
| **System design** | 45 min | A realistic customer scenario. You drive the design; the interviewer pushes on gaps |
| **Customer case** | 40 min | The AI plays a customer with a vague problem. You run discovery and propose a solution |
| **Behavioural** | 30 min | A hiring manager asks ownership, conflict and failure questions, with follow-ups |

Press **Start** to begin and start the timer. Press **Get feedback** at the end to get a verdict (hire / lean hire / lean no / no) and the main gaps.

---

## 7. How to learn with this app

### The daily routine (about 1.5 hours, 5–6 days a week)

| Time | Activity |
|---|---|
| 10 min | One **Drill** (a past exercise from memory) and clear the **Review** queue |
| 40 min | New lesson: read, type the examples, do the exercises |
| 30 min | Extra practice: 1–2 problems on neetcode.io that match the lesson (from track 3 onwards) |
| 10 min | Ask the tutor about anything unclear. Write one line in a learning log |

Once a week, do a longer session (3–4 hours): a written task, a mini project, or a mock interview.

### Rules that make you improve faster

1. **Struggle for 15–20 minutes before you ask for help.** Then use **Hint**, not **Show solution**.
2. **If you look at a solution, write it again from memory the next day.**
3. **Type everything.** Do not copy and paste code. Your hands must learn the syntax.
4. **Talk out loud while you code** from week 1. Interviews require it.
5. **Read error messages from the bottom up.** Most of the time they tell you the answer.
6. **Mark a lesson complete only when you can do its exercises without help.**
7. **Do the "Do it for real" tasks** on your own machine (tracks 4 and 5). The browser exercises teach the logic; real projects give you interview stories.
8. **Commit your own projects to GitHub every week.** Your history is part of your portfolio.

### How to use the tutor well

- Ask for **hints and explanations**, not answers. Interviews will expose copied knowledge.
- Ask it to **quiz you**. Active recall beats re-reading.
- Paste your **written answers** and ask "What would a strict interviewer criticise?"
- If you do not understand an explanation, say "Explain it again, simpler, with an example from infrastructure."

---

## 8. The 24-week plan

At about 10 hours per week. Go slower if you need to; do not skip exercises.

| Weeks | Track | Goal | Exit check |
|---|---|---|---|
| 1 | 0. Start here | Tools installed, study routine fixed | Python, VS Code and Git work; weekly time in calendar |
| 2–7 | 1. Python from zero | Write real programs | All track 1 exercises pass without hints |
| 5–8 | 2. Maths for FDE (in parallel) | Big-O, probability, statistics, vectors, estimation | You can state the complexity of any function you write |
| 7–12 | 3. Coding interview patterns | LeetCode Easy/Medium | 3 of 4 random Mediums in 35 min, talking aloud |
| 10–15 | 4. LLM engineering | Build RAG, agents, evals, MCP | Portfolio project 1 (RAG with evals) is on GitHub |
| 10–16 | Portfolio project 2 | LLM inference service on real GPUs | Real users and measured results |
| 14–18 | 5. System design | Customer-focused designs | 2 written designs graded 7/10 or better |
| 17–21 | 6. Customer skills | Case round, STAR stories | 8 STAR stories; 3 customer-case mocks passed |
| 21–24 | 7. Interview ready | Full mock loops, applications | The checklist in section 9 |

---

## 9. When are you interview-ready?

Apply to your top companies when all of these are true:

- [ ] You solve 3 of 4 random LeetCode Medium problems in 35 minutes each, talking aloud.
- [ ] You have two portfolio projects with READMEs, tests and measured results.
- [ ] You can design an LLM deployment for a regulated or air-gapped customer in 45 minutes, with numbers.
- [ ] You have 8 STAR stories and a calm, short answer for difficult CV questions.
- [ ] You passed each mock interview type at least 3 times with "lean hire" or better.

Apply to less important companies first, to practise real interviews.

---

## 10. Cost of the AI tutor

- Lessons, exercises, quizzes and the Playground are **free** (they run in your browser).
- The tutor, written-task grading and mock interviews call the Claude API. You pay per token.
- Each tutor call includes the current lesson text, so a normal question costs roughly a penny or a few pence. A full mock interview costs more, because the whole conversation is sent on each turn.
- Check prices on the Anthropic website. **Set a monthly spend limit in the Anthropic Console.**
- To spend less: use a smaller model in `.env`, clear long chats (**Clear** button), and ask focused questions.

---

## 11. Troubleshooting

| Problem | Fix |
|---|---|
| `run.ps1 cannot be loaded because running scripts is disabled` | Use `powershell -ExecutionPolicy Bypass -File .\run.ps1` |
| `python` is not recognised | Reinstall Python and select "Add python.exe to PATH", or use `py` instead of `python` |
| The page shows "The AI tutor is off" | Add `ANTHROPIC_API_KEY` to `.env`, then stop (`Ctrl+C`) and start the app again |
| Tutor says "The API key was rejected" | The key is wrong or deleted. Create a new key and paste it again, with no spaces or quotes |
| Tutor says "API error" | Check your internet connection and your Anthropic credit balance. A `429` error means rate limit: wait and try again |
| "Loading Python…" never finishes | Pyodide loads from cdn.jsdelivr.net. Check your internet connection, VPN or firewall. Reload the page |
| "Time limit (8s) reached" | Your code has an infinite loop (often a `while` loop whose condition never changes) |
| `address already in use` / port 8765 busy | The app is already running in another window, or change the port: `python -m uvicorn server.app:app --port 8766` |
| Package errors after a Python upgrade | Delete the `.venv` folder and run `run.ps1` again |
| You want to reset all progress | Stop the app and delete `data\progress.json` (and `data\chats.json` for tutor chats) |
| Every file shows as changed in `git status` on Windows | Line endings. Run `git config core.autocrlf true`, then `git add --renormalize .` |

---

## 12. Project structure

```
fde-trainer/
├── run.ps1                      Windows start script (setup on first run)
├── run.sh                       macOS/Linux start script
├── requirements.txt             Python packages
├── .env.example                 Settings template (copy to .env)
├── learner_profile.example.md   Template for your profile (copy to learner_profile.md)
├── server/
│   ├── app.py        FastAPI server: /api/curriculum, /api/lesson, /api/progress, /api/stats,
│   │                 /api/review, /api/chats, /api/tutor
│   ├── content.py    Reads the lesson Markdown and its exercise/quiz/written blocks
│   ├── stats.py      Totals per track, study streak, review queue
│   └── tutor.py      Builds the tutor prompt (mode + your profile + lesson) and streams Claude's reply
├── static/
│   ├── index.html    The page
│   ├── app.js        The frontend: routing, dashboard, lessons, editor, quizzes, tutor, drill,
│   │                 review queue, mock interviews
│   ├── pyworker.js   Runs Python in a Web Worker with Pyodide and grades the tests
│   └── style.css
├── content/          All the training material (Markdown)
│   ├── 00-start-here/
│   ├── 01-python-from-zero/
│   ├── 02-maths-for-fde/
│   ├── 03-coding-interview-patterns/
│   ├── 04-llm-engineering/
│   ├── 05-system-design/
│   ├── 06-customer-skills/
│   └── 07-interview-ready/
├── tests/
│   ├── test_content.py   Every exercise: solution passes, starter fails; every quiz has an answer
│   ├── test_api.py       API endpoint tests
│   └── test_stats.py     Streak, stats, review queue and saved chats
├── .github/workflows/tests.yml   Runs pytest on GitHub for every push
└── data/             Your progress and tutor chats (created at run time, ignored by git)
```

### How it works

1. The browser asks the server for the curriculum and a lesson.
2. The server reads the lesson's Markdown file and turns each `:::exercise`, `:::quiz` and `:::written` block into data.
3. The browser shows the lesson. Exercise code runs **in the browser** in a Web Worker with Pyodide (Python compiled to WebAssembly). The worker runs your code, then each test line, and reports the results. If the code runs longer than 8 seconds, the worker is stopped.
4. Progress is sent to the server and written to `data/progress.json`. Each save also records today's date in `activity`, which drives the streak. `/api/stats` and `/api/review` are computed from this file and the lesson content. Tutor chats are saved to `data/chats.json`.
5. Tutor questions go to `/api/tutor`. The server adds a system prompt (the mode, your profile and the lesson text) and streams the reply from the Claude API back to the browser.

Reading `server/app.py`, `server/content.py` and `server/tutor.py` after track 1 is good practice: it is a small, real FastAPI project.

---

## 13. Add your own lessons

1. Create a Markdown file in a track folder. The number at the start sets the order, for example `content/03-coding-interview-patterns/10-my-topic.md`.
2. The first `# ` heading is the lesson title. Add `<!-- minutes: 30 -->` to set the estimated time.
3. Use these blocks:

````markdown
:::exercise Title of the exercise
Explain the task in Markdown.
--- starter ---
def f(x):
    pass
--- tests ---
assert f(1) == 2
assert f(0) == 1
--- solution ---
def f(x):
    return x + 1
:::

:::quiz
Q: The question?
- [ ] a wrong answer
- [x] the right answer
> Why it is right.
:::

:::written Title of the written task
The prompt for a free-text answer.
--- rubric ---
- What a good answer must contain
:::
````

4. Maths: `$inline$` and `$$display$$` (LaTeX). Money: write `\$5` so it is not read as maths.
5. Run the tests (next section). They check that your solution passes and your starter fails.
6. To add a new track, create a folder like `08-my-track/` with a `_track.md` file (first line `# Title`, then a description).

---

## 14. Run the tests

```powershell
.\.venv\Scripts\Activate.ps1
python -m pytest
```

All tests must pass before you commit changes to the content or the server. GitHub Actions runs the same tests on every push (see the **Actions** tab on GitHub).

---

## 15. Improve the app yourself (practice projects)

The first six practice features (review queue, streak, saved chats, stats endpoint, CI, timed drill) are now built in. Read how they work — `server/stats.py` and `tests/test_stats.py` are short — then try these. They are good take-home-style tasks once you finish track 1. Use a branch, write tests, and open a pull request to yourself.

1. **Drill history** — save each drill result (exercise, time taken, passed) and show your average time per track.
2. **Weak-topic finder** — rank lessons by failed test runs and wrong quiz answers; suggest what to review.
3. **Export progress** — a button that downloads a Markdown summary of your progress for your learning log.
4. **Tutor cost meter** — read token usage from the API response and show the cost per chat.
5. **Lesson search** — a search box that finds lessons by keyword (try the BM25-lite idea from track 4).
6. **Dark/light toggle** — store the choice in `localStorage`.

---

## 16. Security and privacy

- The server listens on `127.0.0.1` only. Other computers on your network cannot reach it.
- `.env` (your API key), `data/` (your progress and answers) and `learner_profile.md` are in `.gitignore`. **Never commit your API key.** If you leak it, delete it in the Anthropic Console at once.
- Exercise code runs in your browser's sandbox, not on the server.
- Tutor messages, your code and your written answers are sent to the Claude API when you use the tutor. Do not paste confidential work data into it.
