# Functions
<!-- minutes: 45 -->

A function is a named, reusable block of code. It takes **parameters** and **returns** a value.

```python
def monthly_cost(hourly, hours=730, count=1):
    """Return the monthly cost in GBP."""
    return hourly * hours * count


monthly_cost(0.2)  # uses the defaults
monthly_cost(0.2, count=4)  # keyword argument
```

- `return` sends a value back and **ends** the function.
- A function with no `return` returns `None`. This is a common beginner bug.
- The text in `"""..."""` is a **docstring**. It explains the function.

## print vs return

`print` shows text to a human. `return` gives a value to the code that called the function. Tests check the return value.

```python
def bad(x):
    print(x * 2)  # caller gets None


def good(x):
    return x * 2  # caller gets the value
```

## Scope

Variables made inside a function exist only inside it. Pass values in with parameters. Send values out with `return`. Do not depend on global variables.

## Type hints

Type hints say what types a function expects. Python does not enforce them, but editors and reviewers use them. Use them in interviews and take-homes.

```python
def healthy(nodes: list[str], limit: int = 80) -> list[str]: ...
```

## Functions are values

You can pass a function to another function. You saw this with `sorted(key=...)`.

```python
def apply_all(items, fn):
    return [fn(x) for x in items]


apply_all(["a", "b"], str.upper)  # ["A", "B"]
```

## *args and **kwargs (recognise them)

```python
def log(message, *args, **kwargs):
    print(message, args, kwargs)


log("hi", 1, 2, level="info")  # hi (1, 2) {'level': 'info'}
```

:::exercise Fix the bug
This function prints the answer but returns `None`, so the test fails. Fix it.
--- starter ---
def area(width, height):
    print(width * height)
--- tests ---
assert area(3, 4) == 12
assert area(0, 9) == 0
--- solution ---
def area(width, height):
    return width * height
:::

:::exercise Default arguments
Write `format_bytes(n, unit="MB")` that converts a number of bytes into `"KB"`, `"MB"` or `"GB"` (1 KB = 1024 bytes) and returns a string with 1 decimal place, for example `"1.5 MB"`.
--- starter ---
def format_bytes(n, unit="MB"):
    pass
--- tests ---
assert format_bytes(1572864) == "1.5 MB"
assert format_bytes(2048, "KB") == "2.0 KB"
assert format_bytes(1073741824, unit="GB") == "1.0 GB"
--- solution ---
def format_bytes(n, unit="MB"):
    powers = {"KB": 1, "MB": 2, "GB": 3}
    value = n / (1024 ** powers[unit])
    return f"{value:.1f} {unit}"
:::

:::exercise Pass a function in
Write `count_if(items, predicate)`. `predicate` is a function that returns `True` or `False`. Return how many items make it return `True`.
--- starter ---
def count_if(items, predicate):
    pass
--- tests ---
assert count_if([1, 2, 3, 4], lambda x: x % 2 == 0) == 2
assert count_if(["a", "bb"], lambda s: len(s) > 1) == 1
assert count_if([], lambda x: True) == 0
--- solution ---
def count_if(items, predicate):
    return sum(1 for x in items if predicate(x))
:::

:::quiz
Q: What does a function return if it has no return statement?
- [ ] 0
- [x] None
- [ ] An error
> Every function returns something. With no return, it is None.
:::
