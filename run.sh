#!/usr/bin/env bash
# Start FDE Trainer on macOS / Linux / WSL.
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -d .venv ]; then
  python3 -m venv .venv
  .venv/bin/pip install --upgrade pip
  .venv/bin/pip install -r requirements.txt
fi
[ -f .env ] || { cp .env.example .env; echo "Created .env - add your ANTHROPIC_API_KEY."; }

echo "Open http://127.0.0.1:8765"
exec .venv/bin/python -m uvicorn server.app:app --host 127.0.0.1 --port 8765
