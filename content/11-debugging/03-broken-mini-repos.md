# Broken mini-repos
<!-- minutes: 60 -->

Each exercise is a small customer program, written as several "modules" in one file (the `# --- file: ... ---` lines show where each file would start). Each has a bug report written by a customer, and one or two real bugs. Use the method: reproduce with **Run**, form a hypothesis, test it with a print, fix the cause, then **Check**.

Do not read the solution until you have a hypothesis. In an interview, saying your hypothesis out loud is worth as much as the fix.

:::exercise The import that loses a day
Bug report from the finance team: *"Payments made late in the evening in summer show up on the next day in the daily report. Also, the import crashes if the file is empty."*

The report must group payments by their **UK local date** (Europe/London). Times in the file are UTC. Note: `zoneinfo` works in this app and in normal Python.
--- starter ---
# --- file: parse.py ---
from datetime import datetime, timezone

def parse_row(line):
    when, amount = line.split(",")
    # times in the file look like 2026-07-01T22:30:00 and are UTC
    return datetime.fromisoformat(when), float(amount)

# --- file: report.py ---
def daily_totals(lines):
    totals = {}
    header, *rows = lines
    for line in rows:
        when, amount = parse_row(line)
        day = when.date().isoformat()
        totals[day] = round(totals.get(day, 0) + amount, 2)
    return totals
--- tests ---
lines = ["when,amount", "2026-07-01T22:30:00,10.00", "2026-07-01T23:30:00,5.50", "2026-07-02T08:00:00,1.25"]
assert daily_totals(lines) == {"2026-07-01": 10.0, "2026-07-02": 6.75}, daily_totals(lines)
winter = ["when,amount", "2026-01-15T23:30:00,3.00"]
assert daily_totals(winter) == {"2026-01-15": 3.0}
assert daily_totals([]) == {}
assert daily_totals(["when,amount"]) == {}
--- solution ---
# --- file: parse.py ---
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

LONDON = ZoneInfo("Europe/London")

def parse_row(line):
    when, amount = line.split(",")
    # Bug 1: the time was "naive" (no time zone). Mark it as UTC, then convert to UK time.
    utc = datetime.fromisoformat(when).replace(tzinfo=timezone.utc)
    return utc.astimezone(LONDON), float(amount)

# --- file: report.py ---
def daily_totals(lines):
    totals = {}
    for line in lines[1:]:  # Bug 2: "header, *rows = lines" crashes on an empty file
        when, amount = parse_row(line)
        day = when.date().isoformat()
        totals[day] = round(totals.get(day, 0) + amount, 2)
    return totals
:::

:::exercise The retry that never stops
Bug report from operations: *"When the supplier API is down, our sync job runs for hours and floods their API. It should give up after 4 attempts and wait longer between each try."*

`call` is a function that raises `ConnectionError` when the API is down. `sleep` is passed in so the tests do not really wait. The delays must be 1, 2, 4 seconds (3 waits for 4 attempts), and after the 4th failure the job must raise the error.
--- starter ---
# --- file: sync.py ---
def with_retries(call, sleep, attempts=4, base=1):
    for attempt in range(1, 1000):  # "attempts" is never used
        try:
            return call()
        except ConnectionError:
            sleep(base * attempt)
--- tests ---
waits = []
def always_down():
    raise ConnectionError("down")
try:
    with_retries(always_down, waits.append)
    raise AssertionError("it should raise after 4 attempts")
except ConnectionError:
    pass
assert waits == [1, 2, 4], waits
results = iter([ConnectionError(), ConnectionError(), "ok"])
def flaky():
    r = next(results)
    if isinstance(r, Exception):
        raise r
    return r
waits.clear()
assert with_retries(flaky, waits.append) == "ok"
assert waits == [1, 2]
--- solution ---
# --- file: sync.py ---
def with_retries(call, sleep, attempts=4, base=1):
    for attempt in range(attempts):
        try:
            return call()
        except ConnectionError:
            if attempt == attempts - 1:
                raise  # bug 1: the old loop ignored attempts and tried 999 times
            sleep(base * 2 ** attempt)  # bug 2: the wait grew linearly (1, 2, 3), not exponentially
:::

:::exercise The cache that leaks data
Bug report from a customer's security officer, **severity critical**: *"User B sometimes sees User A's account summary."*

The summary is slow to compute, so the developer added a cache. Find why users see each other's data, and fix it. The tests check that the cache still works (the slow function is called once per user, not once per request).
--- starter ---
# --- file: cache.py ---
_cache = {}

def cached(func):
    def wrapper(user_id, *args):
        key = func.__name__
        if key not in _cache:
            _cache[key] = func(user_id, *args)
        return _cache[key]
    return wrapper

# --- file: accounts.py ---
calls = []

@cached
def account_summary(user_id):
    calls.append(user_id)  # pretend this is a slow database query
    return {"user": user_id, "balance": len(user_id) * 100}
--- tests ---
_cache.clear(); calls.clear()
assert account_summary("alice")["user"] == "alice"
assert account_summary("bob")["user"] == "bob"
assert account_summary("alice")["user"] == "alice"
assert calls == ["alice", "bob"], calls
--- solution ---
# --- file: cache.py ---
_cache = {}

def cached(func):
    def wrapper(user_id, *args):
        key = (func.__name__, user_id, *args)  # the bug: the key did not include the user
        if key not in _cache:
            _cache[key] = func(user_id, *args)
        return _cache[key]
    return wrapper

# --- file: accounts.py ---
calls = []

@cached
def account_summary(user_id):
    calls.append(user_id)  # pretend this is a slow database query
    return {"user": user_id, "balance": len(user_id) * 100}
:::

:::written Write up the cache incident
The cache bug above was in production for a week. Write a short incident summary for the customer's security officer: what happened, the impact, the fix, how you know it is fixed, and how you will prevent this class of bug. Use under 200 words.
--- rubric ---
- States plainly that users could see other users' data, and the time window
- Impact: which data, how many users could be affected, and that logs are being checked to find who saw what (or says what is not known yet)
- Fix: cache key includes the user; cache was cleared; regression test added
- Prevention: code review checklist for caches, tests for per-user isolation, considering not caching personal data or using per-user scopes
- Mentions data protection obligations (for example whether this is a reportable personal data breach) without over-promising
:::

:::cards Debugging patterns
Naive datetime :: A datetime with no time zone. Mark UTC times with tzinfo=timezone.utc, then convert with astimezone().
Exponential backoff :: Wait base × 2^attempt between retries, stop after a maximum number of attempts, and add jitter in real systems.
Cache key rule :: The key must include everything the result depends on, especially the user or tenant.
Empty input :: Always test the empty file, empty list and missing key cases.
:::
