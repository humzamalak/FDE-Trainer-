"""Track API spend per month in data/usage.json, and enforce the monthly budget."""

from __future__ import annotations

import json
import threading
from datetime import date
from pathlib import Path
from typing import Any

from server import config

_lock = threading.Lock()


def usage_file() -> Path:
    return config.DATA_DIR / "usage.json"


def cost_of(usage: Any) -> float:
    """Cost in USD of one API response's usage object (or dict)."""

    def get(name: str) -> int:
        value = usage.get(name, 0) if isinstance(usage, dict) else getattr(usage, name, 0)
        return int(value or 0)

    p = config.prices()
    total = (
        get("input_tokens") * p["input"]
        + get("output_tokens") * p["output"]
        + get("cache_creation_input_tokens") * p["cache_write"]
        + get("cache_read_input_tokens") * p["cache_read"]
    )
    return total / 1_000_000


def _read() -> dict:
    path = usage_file()
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def record(usage: Any, feature: str, today: date | None = None) -> float:
    cost = cost_of(usage)
    month = (today or date.today()).strftime("%Y-%m")
    with _lock:
        data = _read()
        entry = data.setdefault(month, {"cost": 0.0, "calls": 0, "by_feature": {}})
        entry["cost"] = round(entry["cost"] + cost, 6)
        entry["calls"] += 1
        entry["by_feature"][feature] = round(entry["by_feature"].get(feature, 0.0) + cost, 6)
        entry["last_call_cost"] = round(cost, 6)
        config.DATA_DIR.mkdir(exist_ok=True)
        tmp = usage_file().with_suffix(".tmp")
        tmp.write_text(json.dumps(data, indent=2), encoding="utf-8")
        tmp.replace(usage_file())
    return cost


def this_month(today: date | None = None) -> dict:
    month = (today or date.today()).strftime("%Y-%m")
    with _lock:
        entry = _read().get(month, {"cost": 0.0, "calls": 0, "by_feature": {}})
    budget = config.monthly_budget_usd()
    return {
        "month": month,
        "cost": round(entry.get("cost", 0.0), 4),
        "calls": entry.get("calls", 0),
        "by_feature": entry.get("by_feature", {}),
        "last_call_cost": entry.get("last_call_cost", 0.0),
        "budget": budget,
        "over_budget": budget > 0 and entry.get("cost", 0.0) >= budget,
    }


def budget_message() -> str | None:
    state = this_month()
    if state["over_budget"]:
        return (
            f"**Monthly budget reached** (\\${state['cost']:.2f} of \\${state['budget']:.2f}). "
            "Raise MONTHLY_BUDGET_USD in .env and restart the app to continue."
        )
    return None
