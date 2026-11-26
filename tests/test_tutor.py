from datetime import date

from server import config, usage
from server.tutor import build_system, clean_history


def test_system_prompt_marks_stable_part_for_caching():
    blocks = build_system("tutor", {"title": "Loops", "raw": "# Loops"}, "my code")
    assert blocks[0]["cache_control"] == {"type": "ephemeral"}
    assert "<lesson>" in blocks[0]["text"]
    assert "cache_control" not in blocks[1] and "my code" in blocks[1]["text"]
    assert len(build_system("tutor", None, None)) == 1


def test_history_is_capped_and_starts_with_user():
    msgs = []
    for i in range(40):
        msgs += [{"role": "user", "content": f"q{i}"}, {"role": "assistant", "content": f"a{i}"}]
    out = clean_history(msgs, limit=10)
    assert out[0]["content"] == "q0"  # the opening question is kept
    assert out[-1]["content"] == "a39"
    assert len(out) <= 12
    assert clean_history([{"role": "assistant", "content": "hi"}])[0]["role"] == "user"
    assert clean_history([{"role": "system", "content": "x"}, {"role": "user", "content": " "}]) == [
        {"role": "user", "content": "Start."}
    ]


def test_usage_cost_and_budget(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "DATA_DIR", tmp_path)
    monkeypatch.setenv("MONTHLY_BUDGET_USD", "0.01")
    for name in ("PRICE_INPUT_PER_MTOK", "PRICE_OUTPUT_PER_MTOK", "PRICE_CACHE_WRITE_PER_MTOK", "PRICE_CACHE_READ_PER_MTOK"):
        monkeypatch.delenv(name, raising=False)
    cost = usage.cost_of({"input_tokens": 1000, "output_tokens": 200, "cache_read_input_tokens": 10000})
    assert round(cost, 6) == 0.009
    today = date(2026, 11, 26)
    usage.record({"input_tokens": 1000, "output_tokens": 200}, "tutor:tutor", today)
    state = usage.this_month(today)
    assert state["calls"] == 1 and state["cost"] == 0.006 and not state["over_budget"]
    usage.record({"output_tokens": 1000}, "generate", today)
    assert usage.this_month(today)["over_budget"]
