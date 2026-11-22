# Modules, packages, iterators and clean code
<!-- minutes: 45 -->

## Modules and imports

Every `.py` file is a **module**. A folder of modules is a **package**.

```
my_tool/
├── pyproject.toml
├── src/my_tool/
│   ├── __init__.py
│   ├── client.py
│   └── cli.py
└── tests/
    └── test_client.py
```

```python
import json                      # standard library
from pathlib import Path         # one name from a module
from my_tool.client import fetch # your own code
```

The **standard library** is large. Learn these first: `json`, `csv`, `pathlib`, `collections`, `itertools`, `datetime`, `re`, `logging`, `subprocess`, `dataclasses`, `typing`.

## Running a file as a script

```python
def main():
    print("running")

if __name__ == "__main__":
    main()
```

The `if` block runs only when you run the file directly, not when another file imports it.

## Packages from PyPI

`pip install requests` inside a venv. Record dependencies in `requirements.txt` or `pyproject.toml`. Modern teams often use **uv** (very fast) or **poetry**.

## Generators and iterators

A generator produces values one at a time, so it uses little memory. Use it for big files and paginated APIs.

```python
def read_lines(path):
    with open(path) as f:
        for line in f:
            yield line.rstrip("\n")    # yield: give one value, pause, continue later

for line in read_lines("huge.log"):    # never loads the whole file
    ...
```

A generator expression is a comprehension with `()`: `sum(x * x for x in nums)`.

## Clean code checklist (interviewers look for this)

- Clear names. Short functions that do one thing.
- Type hints on public functions.
- Handle edge cases: empty input, missing keys, bad values.
- No repeated code: extract a function.
- Use `logging`, not `print`, in real services.
- Format with **ruff** or **black**. Check types with **mypy** or Pylance.

:::exercise A paginating generator
Many APIs return results in pages. `fetch_page(token)` returns `(items, next_token)`. `next_token` is `None` on the last page.

Write a **generator** `all_items(fetch_page)` that yields every item from every page. Start with `token=None`.
--- starter ---
def all_items(fetch_page):
    pass
--- tests ---
pages = {None: ([1, 2], "p2"), "p2": ([3], "p3"), "p3": ([4, 5], None)}
calls = []
def fake_fetch(token):
    calls.append(token)
    return pages[token]
import types
gen = all_items(fake_fetch)
assert isinstance(gen, types.GeneratorType)
assert list(gen) == [1, 2, 3, 4, 5]
assert calls == [None, "p2", "p3"]
--- solution ---
def all_items(fetch_page):
    token = None
    while True:
        items, token = fetch_page(token)
        yield from items
        if token is None:
            break
:::

:::exercise Group consecutive items
Write `runs(items)` that groups equal neighbours: `runs("aaabcc")` → `[("a", 3), ("b", 1), ("c", 2)]`. This is run-length encoding.

You can use a loop, or `itertools.groupby`.
--- starter ---
def runs(items):
    pass
--- tests ---
assert runs("aaabcc") == [("a", 3), ("b", 1), ("c", 2)]
assert runs([1, 1, 2, 1]) == [(1, 2), (2, 1), (1, 1)]
assert runs("") == []
--- solution ---
from itertools import groupby

def runs(items):
    return [(key, len(list(group))) for key, group in groupby(items)]
:::

:::quiz
Q: What does `if __name__ == "__main__":` do?
- [x] Runs the block only when the file is run directly, not when imported
- [ ] Makes the file a package
- [ ] Defines the main class
Q: Why use a generator for a 50 GB log file?
- [ ] It is required by open()
- [x] It processes one line at a time, so memory stays small
- [ ] It sorts the file
:::
