"""All settings in one place. Values come from .env (see .env.example)."""

from __future__ import annotations

import os
import secrets
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

CONTENT_DIR = ROOT / "content"
STATIC_DIR = ROOT / "static"
DATA_DIR = Path(os.environ.get("FDE_DATA_DIR") or ROOT / "data")  # tests use a temporary folder
PROFILE_FILE = ROOT / "learner_profile.md"

DEFAULT_MODEL = "claude-sonnet-5-5"

# A new random token each time the server starts. The page receives it inside index.html
# and must send it with every /api call, so other web pages cannot use the API.
API_TOKEN = secrets.token_urlsafe(24)
ALLOWED_HOSTS = ["127.0.0.1", "localhost", "testserver"]

MAX_HISTORY_MESSAGES = 30  # older chat turns are dropped before calling the API


def _float(name: str, default: float) -> float:
    try:
        return float(os.environ.get(name, default))
    except ValueError:
        return default


def model() -> str:
    return os.environ.get("ANTHROPIC_MODEL", DEFAULT_MODEL)


def max_tokens() -> int:
    return int(_float("TUTOR_MAX_TOKENS", 2000))


def monthly_budget_usd() -> float:
    """0 means no limit."""
    return _float("MONTHLY_BUDGET_USD", 10.0)


def prices() -> dict[str, float]:
    """USD per million tokens. Check current prices and set them in .env."""
    return {
        "input": _float("PRICE_INPUT_PER_MTOK", 3.0),
        "output": _float("PRICE_OUTPUT_PER_MTOK", 15.0),
        "cache_write": _float("PRICE_CACHE_WRITE_PER_MTOK", 3.75),
        "cache_read": _float("PRICE_CACHE_READ_PER_MTOK", 0.30),
    }


def api_key_present() -> bool:
    return bool(os.environ.get("ANTHROPIC_API_KEY"))
