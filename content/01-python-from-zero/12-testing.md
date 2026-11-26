# Testing with pytest
<!-- minutes: 45 -->

Tests prove that code works and keeps working. In take-home tests, **code without tests looks junior**. In live coding, saying "let me test this with an edge case" looks senior.

## pytest basics

```python
# file: tests/test_costs.py
from my_tool.costs import monthly_cost
import pytest


def test_monthly_cost_default_hours():
    assert monthly_cost(1.0) == 730


def test_negative_rate_raises():
    with pytest.raises(ValueError):
        monthly_cost(-1)


@pytest.mark.parametrize(
    "hourly, count, expected",
    [
        (1.0, 1, 730),
        (0.5, 2, 730),
        (0, 5, 0),
    ],
)
def test_many_cases(hourly, count, expected):
    assert monthly_cost(hourly, count=count) == expected
```

Run with `python -m pytest` in the project folder. pytest finds files named `test_*.py` and functions named `test_*`.

## What to test

1. The **normal** case.
2. **Edge cases**: empty input, one item, very large, zero, negative, duplicates.
3. **Error cases**: bad input raises the right error.

## Fakes and mocks

Do not call real APIs in unit tests. Replace them with a fake. The easiest way: pass the dependency in as a parameter (dependency injection), like `fetch_page` in the last lesson.

```python
def test_alert_sends_on_high_cpu():
    sent = []
    check_and_alert(cpu=95, send=sent.append)  # fake "send"
    assert sent == ["CPU critical: 95%"]
```

`unittest.mock` and pytest's `monkeypatch` can also replace functions, but injection is simpler and clearer.

## Fixtures

A fixture creates shared setup for tests:

```python
@pytest.fixture
def sample_config(tmp_path):
    p = tmp_path / "config.json"
    p.write_text('{"region": "eu-west-2"}')
    return p
```

`tmp_path` is a built-in fixture: a temporary folder for each test.

## Test-driven development (TDD) for practice

1. Write a test that fails.
2. Write the smallest code that passes.
3. Clean the code. Tests stay green.

Every exercise in this app works like this: the tests already exist, you write the code.

:::exercise Write the tests yourself
The function `slugify` is already written. Write **3 test functions** for it: `test_basic`, `test_spaces_and_case`, `test_empty`. Each must use `assert`. The checker calls your test functions.
--- starter ---
def slugify(text):
    return "-".join(text.lower().split())

# Write your tests below
def test_basic():
    pass
--- tests ---
test_basic()
test_spaces_and_case()
test_empty()
_real = slugify
slugify = lambda text: "WRONG"
caught = 0
for _t in (test_basic, test_spaces_and_case, test_empty):
    try:
        _t()
    except AssertionError:
        caught += 1
slugify = _real
assert caught == 3, f"a broken slugify must fail all 3 tests, but only {caught} failed"
--- solution ---
def slugify(text):
    return "-".join(text.lower().split())

def test_basic():
    assert slugify("hello world") == "hello-world"

def test_spaces_and_case():
    assert slugify("  Research   Computing ") == "research-computing"

def test_empty():
    assert slugify("") == ""
:::

:::exercise Make it testable
`check_and_alert(cpu, send)` must call `send(message)` with `"CPU critical: 95%"` when cpu is 90 or more, and must not call it otherwise. It returns `True` if it sent an alert.
--- starter ---
def check_and_alert(cpu, send):
    pass
--- tests ---
sent = []
assert check_and_alert(95, sent.append) is True
assert sent == ["CPU critical: 95%"]
assert check_and_alert(50, sent.append) is False
assert len(sent) == 1
--- solution ---
def check_and_alert(cpu, send):
    if cpu >= 90:
        send(f"CPU critical: {cpu}%")
        return True
    return False
:::

:::quiz
Q: Why pass `send` as a parameter instead of calling Slack directly inside the function?
- [ ] It runs faster
- [x] Tests can pass a fake, so no real messages are sent
- [ ] Python requires it
> This is dependency injection. It makes code easy to test.
:::
