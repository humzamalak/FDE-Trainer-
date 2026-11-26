# Using the app

## What is in the app

| Part | What it gives you |
|---|---|
| **14 tracks, 87 lessons** | Start here → Python from zero → Maths for FDE → Coding interview patterns → SQL → JavaScript/TypeScript → Debugging → LLM engineering → Portfolio projects → System design → Decomposition → Engineering practice → Customer skills → Interview ready |
| **Live examples** | Every Python example in a lesson is an editor with a **Run** button. Earlier examples on the page run first, like a notebook |
| **192 coding exercises** (165 Python, 18 SQL, 9 JavaScript) | Write Python in the browser. Click **Check** to run the tests. You see which test failed, what was expected and what you got |
| **76 quizzes** | Fast checks after each lesson, with explanations. Every answer is also a spaced-repetition review |
| **29 flashcard sets** (121 cards) | Show the answer, then rate it **Again / Hard / Good / Easy**; the rating decides when the card comes back in Review |
| **11 checklists** | Milestones for the portfolio projects and preparation steps. Ticks are saved |
| **41 written tasks** | Free-text answers (designs, STAR stories, customer cases). The AI tutor grades them against a rubric |
| **AI tutor** | A chat panel that knows the lesson you are on. Ask questions, get hints, get your code explained or reviewed |
| **Practise this lesson** | At the end of every lesson: unlimited AI-written exercises (easier / same / harder, each tested before you see it), a 5-question quiz, flashcards, and "explain it back" grading. Non-coding lessons get fresh scenarios instead |
| **Playground** | A free Python editor to try ideas |
| **Timed drill** | A random exercise (from lessons you studied, one track, or everything — works from day one), with an empty editor and a 20-minute timer |
| **Review queue** | Due quiz questions and flashcards (spaced repetition), and every quiz question you answered wrongly |
| **Placement test** | About 25 questions across all skills. It fills the skill map and tells you which track to start with |
| **Skill map and study plan** | On the dashboard: a score per skill, and where you should be in the 24-week plan at your hours per week |
| **Job search** | A tracker for applications: company, role, source, stage, next step, notes |
| **Study streak** | Days in a row with study activity, shown on the dashboard |
| **Mock interviews** | 8 types (live coding, system design, customer case, behavioural, decomposition, hard client conversation, project deep dive, debugging), each with a timer and a verdict; an interview readiness score; and a full loop day |
| **Progress tracking** | Completed lessons, passed exercises, quiz answers and graded written tasks are saved twice: in `data/progress.json` and in your browser's local storage. Tutor chats are saved in `data/chats.json` |

The maths track covers everything an FDE interview uses: Big-O and logarithms, binary and powers of two, counting, probability, statistics for AI evaluations (precision, recall, confidence intervals), vectors and cosine similarity for embeddings, and back-of-envelope estimation. No calculus is needed.

## A tour of the app

### Dashboard
Shows lessons done, exercises passed, your **study streak**, your **quiz accuracy**, a **Continue** button to your next lesson, and progress per track (lessons and exercises).

**Your study plan**: set a start date and your real hours per week. The card then shows the plan week, the track the plan has you in, and how many lessons ahead or behind you are. The week ranges are set in each track for about 10 hours per week; at 5 hours per week the plan takes 48 weeks. **Change plan** resets it.

**Skill map**: one bar per skill (coding, data and SQL, maths, LLM engineering, system design, customer skills, interview and job search). Each score is how well you did (exercises passed, quiz accuracy, written grades) times how much of that skill's lessons you finished. **Take the placement test** fills in a placement score per skill and suggests where to start.

Everything is clickable: **Lessons done** opens your next lesson, **Exercises passed** opens Drill, **Quiz accuracy** opens the Review queue. Click a **track card** (or **Show lessons**) to open its lesson list, then click any lesson. **Start track / Continue** opens the first unfinished lesson in that track. The app remembers which tracks you left open.

A day counts towards the streak when you complete a lesson, run an exercise's tests, answer a quiz or submit a written task. The streak stays alive until the end of the next day.

### Drill (top menu)
**Due today** (the default when anything is due) is spaced repetition: an exercise you pass comes back after 1 day, then 6 days, then longer each time — and tomorrow again if you could not solve it or opened the solution. The dashboard tile **Due for review today** shows the count.

Or choose where exercises come from: **Lessons I studied**, one **track**, or **All tracks** (so it works on day one). It picks a random exercise, including your AI-generated ones. The editor starts with the starter code, not your old answer, so you solve it **from memory**. A 20-minute timer runs. When the tests pass, you see how long you took. Click **New drill** for another. Do one or two drills every day: this is spaced repetition under interview pressure.

### Review (top menu)
Four lists, each with a link to its lesson:
- **Due for spaced repetition**: flashcards and quiz questions whose review date has come. Rate each card; answer each question.
- **Quiz questions** you last answered wrongly. Answer again; a correct answer removes it.
- **Exercises to finish**: you changed the code but have not passed. The exercise is right there to finish.
- **Written tasks below 7/10**. Improve the answer in the lesson and submit again.

### Sidebar
All tracks and lessons. A ✓ marks a completed lesson. Click a track name to open or close it.

### A lesson
- **Text and "Try it" examples.** Every Python example is a live editor. Change it and press **Run** (or `Ctrl+Enter`). Earlier examples on the page run first, so later examples can use their variables. **Explain this** and **Give me a challenge** ask the tutor about the example. Examples that need packages the browser does not have (for example `anthropic` or `fastapi`) are marked read-only: run those on your own machine.
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
- **Practise this lesson** at the end:
  1. **Unlimited exercises** — *Easier*, *New* or *Harder*. The tutor writes an exercise for this lesson. The app runs its solution against its tests and checks that the starter code fails, and only then shows it. Bad exercises are fixed or rejected automatically. Your exercises are saved (`data/generated.json`), can be deleted, and join the Drill pool. Lessons without code get **New scenario** / **Harder scenario** instead.
  2. **Quiz me** — five mixed questions in the tutor panel, one at a time, with a score at the end. **Make flashcards** gives 6 Q&A cards.
  3. **Explain it back** — write the lesson's main idea in your own words; the tutor scores it and shows a model explanation.
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
| **Decomposition** | 45 min | A big, vague real-world problem. Clarify, break it down, prioritise, propose a first version |
| **Hard client conversation** | 25 min | A difficult stakeholder (outage, scope creep, impossible deadline, blocked rollout). Type FEEDBACK to finish |
| **Project deep dive** | 45 min | Present a project; the interviewer digs into decisions, failures and your own role |
| **Debugging round** | 40 min | A short broken program and a bug report; find and fix the bug with evidence |

**Interview readiness** (top of the page) counts how many of your last 3 mocks of each loop round passed (hire or lean hire). **Full loop day** runs the five loop rounds (live coding, decomposition, customer case, deep dive, behavioural) back to back and gives a loop result.

Press **Start** to begin and start the timer. Press **Get feedback** at the end to get a verdict (hire / lean hire / lean no / no) and the main gaps.

### Job search (top menu)
Add a row per application. Fields save when you leave them. The stage counts show at the top. The tracker is part of your progress, so **Export** includes it.

### Settings (top menu)
- **AI usage this month**: estimated cost, budget bar, and cost per feature. The tutor panel also shows the month's total and the cost of the last reply.
- **Export all my data** / **Import**: one JSON file with progress, chats, generated exercises and mocks. Import merges; it never overwrites.
- **Reset progress**: asks you to confirm, and keeps a backup (`data/progress.backup.json`).

### Mock interview history
Every mock is saved with its transcript and verdict. **Mock interviews → Your past mocks** lists them by date, type and verdict. Click **Open** to read the transcript.

### Study time
The app counts time while the tab is visible and you used the mouse or keyboard in the last 2 minutes. The dashboard shows this week's time against your plan's hours per week (10 h if no plan is set), and each lesson in a track list shows how long you studied it.

### SQL and JavaScript
Tracks **3b (SQL)** and **3c (JavaScript and TypeScript)** have the same live examples and exercises. **pandas** works in Python exercises and examples; the first run that imports it takes about 10 seconds while it loads. SQL runs in SQLite inside the browser; a SQL exercise passes when your query returns the same rows as the reference answer. The Playground has a language picker (Python, JavaScript, SQL).

### Narrow screens
Below 1000 px the sidebar is hidden. Press **☰** (top left) to open the lesson list.

### Keyboard
In a code editor, **Tab** indents and **Esc** leaves the editor (the next button gets focus). **Ctrl+Enter** runs the code.
