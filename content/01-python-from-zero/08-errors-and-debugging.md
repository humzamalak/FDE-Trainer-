# Errors, exceptions and debugging
<!-- minutes: 45 -->

## Read the error message from the bottom

```
Traceback (most recent call last):
  File "your_code.py", line 3, in <module>
    total = price * qty
NameError: name 'qty' is not defined
```

1. **Last line**: the error type and message. Start here.
2. **The line above**: where it happened.
3. Lines above that: how the program got there.

## Common errors

| Error | Usual cause |
|---|---|
| `SyntaxError` | Missing `:`, bracket or quote |
| `IndentationError` | Mixed or wrong spaces |
| `NameError` | Typo in a name, or used before assignment |
| `TypeError` | Wrong type, e.g. `"3" + 4` |
| `KeyError` | Dict key not there |
| `IndexError` | List position too big |
| `AttributeError` | `None.split()` — often a function returned None |
| `ValueError` | Right type, bad value, e.g. `int("abc")` |

## Handling exceptions

```python
def parse_port(text):
    try:
        port = int(text)
    except ValueError:
        return None
    if not 1 <= port <= 65535:
        return None
    return port
```

Rules:
- Catch **specific** errors (`except ValueError`), not everything (`except:`). A bare `except` hides real bugs.
- Use `finally` for clean-up that must always run.
- Raise your own errors for bad input: `raise ValueError("port must be 1-65535")`.

## How to debug

1. **Reproduce** with the smallest input that fails.
2. **Print** the values just before the failing line: `print(repr(x), type(x))`.
3. **Make one change at a time.** Run again.
4. **Explain the code out loud** line by line (rubber duck). You often find the bug while you explain.
5. In VS Code, set a **breakpoint** (click left of the line number) and press F5. Step through.

This is the same method you use for a failing Kubernetes pod: logs first, smallest change, observe.

:::exercise Safe port parser
Write `parse_port(text)`. Return the port as an `int` if `text` is a whole number from 1 to 65535 (spaces at the ends are OK). Otherwise return `None`. Never raise an error.
--- starter ---
def parse_port(text):
    pass
--- tests ---
assert parse_port("443") == 443
assert parse_port(" 8080 ") == 8080
assert parse_port("0") is None
assert parse_port("70000") is None
assert parse_port("http") is None
assert parse_port("") is None
--- solution ---
def parse_port(text):
    try:
        port = int(text.strip())
    except ValueError:
        return None
    if 1 <= port <= 65535:
        return port
    return None
:::

:::exercise Raise a clear error
Write `withdraw(balance, amount)`. It returns the new balance. If `amount` is not positive, raise `ValueError`. If `amount` is more than `balance`, raise `ValueError` too.
--- starter ---
def withdraw(balance, amount):
    pass
--- tests ---
assert withdraw(100, 30) == 70
try:
    withdraw(100, 200)
    raised = False
except ValueError:
    raised = True
assert raised
try:
    withdraw(100, -5)
    raised = False
except ValueError:
    raised = True
assert raised
--- solution ---
def withdraw(balance, amount):
    if amount <= 0:
        raise ValueError("amount must be positive")
    if amount > balance:
        raise ValueError("insufficient funds")
    return balance - amount
:::

:::exercise Debug this
This function must return the average of the numbers, but it has 2 bugs. Find and fix them. Run it first and read the error.
--- starter ---
def average(nums):
    if nums == []:
        return 0
    total = 0
    for n in nums:
        total = n
    return total / len(num)
--- tests ---
assert average([2, 4, 6]) == 4
assert average([5]) == 5
assert average([]) == 0
--- solution ---
def average(nums):
    if not nums:
        return 0
    total = 0
    for n in nums:
        total += n
    return total / len(nums)
:::

:::quiz
Q: You see `AttributeError: 'NoneType' object has no attribute 'split'`. What is the most likely cause?
- [ ] split is spelled wrong
- [x] A variable you expected to be a string is None, often because a function did not return
- [ ] Python is not installed correctly
> Check where the value came from. A missing return is a common cause.
Q: Why avoid a bare `except:`?
- [ ] It is slower
- [x] It hides unexpected bugs, including typos
- [ ] It is a syntax error
> Catch only the errors you expect and can handle.
:::
