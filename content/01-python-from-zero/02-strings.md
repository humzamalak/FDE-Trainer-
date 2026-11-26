# Strings
<!-- minutes: 40 -->

A string (`str`) is text. You will process a lot of text: logs, API responses, config files, prompts for LLMs.

## f-strings: put values into text

```python
name = "web-01"
cpu = 87.456
print(f"Server {name} CPU is {cpu:.1f}%")  # Server web-01 CPU is 87.5%
```

`:.1f` means "float with 1 decimal place".

## Indexing and slicing

Positions start at **0**. Negative positions count from the end.

```python
s = "eu-west-2"
s[0]  # "e"
s[-1]  # "2"
s[0:2]  # "eu"      start at 0, stop BEFORE 2
s[3:]  # "west-2"
s[::-1]  # "2-tsew-ue"  reversed
len(s)  # 9
```

## Useful methods

Strings cannot change (they are **immutable**). Methods return a new string.

```python
line = "  ERROR: Disk full on /dev/sda1  "
line.strip()  # removes spaces at both ends
line.lower()  # lower case
line.strip().startswith("ERROR")  # True
"a,b,c".split(",")  # ["a", "b", "c"]
"-".join(["eu", "west", "2"])  # "eu-west-2"
line.replace("ERROR", "WARN")
"Disk" in line  # True
line.find("Disk")  # position, or -1 if not found
```

`split` and `join` are opposites. Learn them well. You will use them in almost every data task.

:::exercise Parse a log line
A log line looks like this: `"2026-11-22 13:01:02 ERROR disk full"`.

Write a function `parse_log(line)` that returns the **level** (the third word), in lower case.

`parse_log("2026-11-22 13:01:02 ERROR disk full")` returns `"error"`.

Hint: `split()` with no argument splits on spaces.
--- starter ---
def parse_log(line):
    pass
--- tests ---
assert parse_log("2026-11-22 13:01:02 ERROR disk full") == "error"
assert parse_log("2026-11-22 13:01:03 INFO started") == "info"
assert parse_log("  2026-11-22 13:01:04 WARN slow  ") == "warn"
--- solution ---
def parse_log(line):
    parts = line.split()
    return parts[2].lower()
:::

:::exercise Make a resource name
Write `resource_name(team, env, n)` that returns names like `"research-prod-007"`.

- `team` and `env` must be lower case and have no spaces at the ends.
- `n` must have 3 digits with leading zeros. In an f-string, `{n:03d}` does this.
--- starter ---
def resource_name(team, env, n):
    pass
--- tests ---
assert resource_name("Research", "prod", 7) == "research-prod-007"
assert resource_name(" DTS ", "Dev", 42) == "dts-dev-042"
assert resource_name("ml", "test", 123) == "ml-test-123"
--- solution ---
def resource_name(team, env, n):
    return f"{team.strip().lower()}-{env.strip().lower()}-{n:03d}"
:::

:::exercise Is it a palindrome?
Write `is_palindrome(text)`. It returns `True` if the text reads the same forwards and backwards, ignoring case and spaces.

`is_palindrome("Never odd or even")` → `True`.
--- starter ---
def is_palindrome(text):
    pass
--- tests ---
assert is_palindrome("racecar") is True
assert is_palindrome("Never odd or even") is True
assert is_palindrome("hello") is False
assert is_palindrome("") is True
--- solution ---
def is_palindrome(text):
    clean = text.replace(" ", "").lower()
    return clean == clean[::-1]
:::

:::quiz
Q: What is `"eu-west-2"[3:7]`?
- [ ] "west-"
- [x] "west"
- [ ] "-wes"
> The slice starts at index 3 and stops before index 7.
Q: What does `",".join(["a", "b"])` return?
- [x] "a,b"
- [ ] ["a", "b"]
- [ ] "ab,"
> join puts the separator between the items.
:::
