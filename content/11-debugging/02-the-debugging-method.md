# The debugging method
<!-- minutes: 45 -->

Debugging is the scientific method on a small scale. Guessing and changing random lines wastes hours and can hide the real bug.

1. **Reproduce.** Get a failing case you can run in seconds. Best of all: a failing **test**.
2. **Minimise.** Remove everything that does not matter until the failing case is tiny.
3. **Hypothesise.** "I think X happens because Y." Write it down.
4. **Test the hypothesis** with one experiment: a print, a log line, a debugger breakpoint, or a smaller input. Change one thing at a time.
5. **Fix the cause**, not the symptom. A `try/except: pass` around the error is not a fix.
6. **Keep the test.** The failing test from step 1 now passes and protects you from the bug coming back (a *regression test*).

## Tools

- `print()` and `logging` with the values you are unsure about: `print(f"{len(rows)=} {rows[:2]=}")`.
- The debugger: `breakpoint()` stops the program; then `p name` prints, `n` next line, `s` step in, `c` continue.
- **Binary search** for "it worked last week": `git bisect start`, `git bisect bad`, `git bisect good <commit>`, and git finds the commit that broke it in about $\log_2 n$ steps.
- Binary search on **data**: if 10,000 rows fail and 1 row does not, split the rows in half until you find the bad one.

## Classic Python bugs

| Bug | Example | Fix |
|---|---|---|
| Mutable default argument | `def add(x, items=[])` keeps the list between calls | `items=None`, then `items = [] if items is None else items` |
| Off-by-one | `range(1, n)` misses `n` | Check the first and the last case |
| Integer division / rounding | `round(2.5) == 2` (banker's rounding) | Use `decimal` for money |
| Naive datetimes | `datetime.now()` has no time zone | `datetime.now(timezone.utc)` |
| Changing a list while looping over it | `for x in xs: xs.remove(x)` | Loop over a copy, or build a new list |
| `is` vs `==` | `x is "abc"` | Use `==` for values |

:::exercise The shopping basket that remembers
Bug report: *"When two customers use the checkout one after the other, the second customer's basket contains the first customer's items."* Fix it.
--- starter ---
def new_basket(items=[]):
    return items

def add_item(basket, item):
    basket.append(item)
    return basket

def checkout(items_to_buy):
    basket = new_basket()
    for item in items_to_buy:
        add_item(basket, item)
    return basket
--- tests ---
assert checkout(["apple"]) == ["apple"]
assert checkout(["pear", "plum"]) == ["pear", "plum"]
assert checkout([]) == []
assert new_basket(["x"]) == ["x"]
--- solution ---
def new_basket(items=None):
    return [] if items is None else items  # a default list is created once and shared by every call

def add_item(basket, item):
    basket.append(item)
    return basket

def checkout(items_to_buy):
    basket = new_basket()
    for item in items_to_buy:
        add_item(basket, item)
    return basket
:::

:::exercise The missing last page
Bug report: *"The export skips the last records. With 25 records and a page size of 10, we only get 20."* Fix `pages`.
--- starter ---
def pages(records, size):
    result = []
    for i in range(len(records) // size):
        result.append(records[i * size:(i + 1) * size])
    return result
--- tests ---
r = list(range(25))
assert pages(r, 10) == [list(range(10)), list(range(10, 20)), list(range(20, 25))]
assert pages(list(range(20)), 10) == [list(range(10)), list(range(10, 20))]
assert pages([], 10) == []
assert pages([1], 5) == [[1]]
--- solution ---
def pages(records, size):
    return [records[i:i + size] for i in range(0, len(records), size)]
:::

:::exercise Find the bad row
A job fails on one row in a large file, but the error message does not say which. You have a function `ok(rows)` that returns `False` if **any** row in the list is bad, and it is slow, so you must call it as few times as possible. Write `find_bad(rows, ok)` that returns the index of the one bad row using binary search (at most about $\log_2 n + 1$ calls).
--- starter ---
def find_bad(rows, ok):
    for i, row in enumerate(rows):
        if not ok([row]):
            return i
--- tests ---
calls = []
def make_ok(bad):
    def ok(part):
        calls.append(1)
        return bad not in part
    return ok
rows = list(range(1000))
assert find_bad(rows, make_ok(737)) == 737
assert len(calls) <= 12, f"too many calls: {len(calls)}"
calls.clear()
assert find_bad(rows, make_ok(0)) == 0
calls.clear()
assert find_bad(rows, make_ok(999)) == 999
assert find_bad([5], make_ok(5)) == 0
--- solution ---
def find_bad(rows, ok):
    lo, hi = 0, len(rows)  # the bad row is in rows[lo:hi]
    while hi - lo > 1:
        mid = (lo + hi) // 2
        if ok(rows[lo:mid]):
            lo = mid
        else:
            hi = mid
    return lo
:::

:::quiz
Q: You found the bug and the fix is one line. What else should you add?
- [x] A test that failed before the fix and passes after it
- [ ] A comment with your name
- [ ] Nothing
Q: "It worked last Tuesday; 40 commits since." Fastest way to find the breaking commit?
- [ ] Read all 40 diffs
- [x] git bisect: binary search over the commits, about 6 steps
Q: Which is a fix and not just hiding the symptom?
- [ ] Wrapping the failing line in try/except and continuing
- [x] Validating the input where it enters the system, and rejecting bad records with a clear error
:::
