#!/usr/bin/env bash
# Start FDE Trainer on macOS / Linux / WSL.
# Reinstalls packages when requirements.txt changes; opens the browser when the server answers.
set -euo pipefail
cd "$(dirname "$0")"

URL="http://127.0.0.1:8765"
STAMP=".venv/requirements.sha256"

[ -x .venv/bin/python ] || python3 -m venv .venv

want=$(python3 -c "import hashlib;print(hashlib.sha256(open('requirements.txt','rb').read()).hexdigest().upper())")
have=$(cat "$STAMP" 2>/dev/null || true)
if [ "$want" != "$have" ]; then
  echo "Installing packages (requirements.txt changed or first run)..."
  .venv/bin/pip install --upgrade pip --quiet
  .venv/bin/pip install -r requirements.txt
  echo "$want" > "$STAMP"
fi

[ -f .env ] || { cp .env.example .env; echo "Created .env - add your ANTHROPIC_API_KEY for the AI features."; }

(
  for _ in $(seq 120); do
    if curl -fs "$URL/api/health" >/dev/null 2>&1; then
      (command -v xdg-open >/dev/null && xdg-open "$URL") || (command -v open >/dev/null && open "$URL") || true
      exit 0
    fi
    sleep 0.5
  done
) &

echo "Starting FDE Trainer at $URL (Ctrl+C to stop)"
exec .venv/bin/python -m uvicorn server.app:app --host 127.0.0.1 --port 8765
