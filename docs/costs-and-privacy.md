# Costs, security and privacy

## Cost of the AI tutor

- Lessons, exercises, quizzes and the Playground are **free** (they run in your browser).
- The tutor, written-task grading and mock interviews call the Claude API. You pay per token.
- Each tutor call includes the current lesson text, so a normal question costs roughly a penny or a few pence. A full mock interview costs more, because the whole conversation is sent on each turn.
- Check prices on the Anthropic website. **Set a monthly spend limit in the Anthropic Console.**
- **Budget:** `MONTHLY_BUDGET_USD` in `.env` (default 10). When the estimate reaches it, AI calls stop until you raise it. See the spend in **Settings** and at the top of the tutor panel.
- **Prompt caching** makes repeat questions on the same lesson cheaper: the lesson text is cached by the API for a few minutes.
- Chat history sent to the API is capped at the last 30 messages.
- To spend less: use a smaller model in `.env`, clear long chats (**Clear** button), and ask focused questions.

## Security and privacy

- The server listens on `127.0.0.1` only. Other computers on your network cannot reach it.
- Every API call needs a random token that changes each time the app starts, and requests with another host name are refused. So a web site open in another tab cannot use the app's API or spend your credit (CSRF and DNS rebinding protection).
- AI-written exercise code runs only in the browser sandbox, never in your computer's Python.
- `.env` (your API key), `data/` (your progress and answers) and `learner_profile.md` are in `.gitignore`. **Never commit your API key.** If you leak it, delete it in the Anthropic Console at once.
- Exercise code runs in your browser's sandbox, not on the server.
- Tutor messages, your code and your written answers are sent to the Claude API when you use an AI feature. Nothing else leaves your computer: the page loads no external scripts or fonts. Do not paste confidential work data into it.
