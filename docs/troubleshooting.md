# Troubleshooting


| Problem | Fix |
|---|---|
| `run.ps1 cannot be loaded because running scripts is disabled` | Use `powershell -ExecutionPolicy Bypass -File .\run.ps1` |
| `python` is not recognised | Reinstall Python and select "Add python.exe to PATH", or use `py` instead of `python` |
| The page shows "The AI tutor is off" | Add `ANTHROPIC_API_KEY` to `.env`, then stop (`Ctrl+C`) and start the app again |
| Tutor says "The API key was rejected" | The key is wrong or deleted. Create a new key and paste it again, with no spaces or quotes |
| Tutor says "API error" | Check your internet connection and your Anthropic credit balance. A `429` error means rate limit: wait and try again |
| The page says "The app server is not answering" | The terminal window from `start.cmd` is closed or crashed. Double-click `start.cmd`. The page retries by itself |
| "Error 403 … Reload the page" | The app restarted, so the page's token is old. Press F5 |
| AI features say "Monthly budget reached" | Raise `MONTHLY_BUDGET_USD` in `.env` and restart the app |
| "Loading Python…" never finishes | Pyodide is bundled in `static/vendor/pyodide`. Check that the folder exists (run `git pull`), then reload the page with `Ctrl+F5` |
| "New exercise" says "Could not make a working exercise" | The model's exercise failed the automatic checks 3 times. Click again; try *Easier* |
| "Time limit (8s) reached" | Your code has an infinite loop (often a `while` loop whose condition never changes) |
| `address already in use` / port 8765 busy | The app is already running in another window, or change the port: `python -m uvicorn server.app:app --port 8766` |
| Package errors after a Python upgrade | Delete the `.venv` folder and run `run.ps1` again |
| You want to reset all progress | Stop the app, delete `data\progress.json` (and `data\chats.json` for tutor chats), and clear the browser's local storage for 127.0.0.1:8765 (F12 → Application → Local Storage → Clear). Otherwise the browser copy restores it |
| Every file shows as changed in `git status` on Windows | Line endings. Run `git config core.autocrlf true`, then `git add --renormalize .` |
