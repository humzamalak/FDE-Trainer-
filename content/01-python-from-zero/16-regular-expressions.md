# Regular expressions
<!-- minutes: 40 -->

A **regular expression** (regex) is a small pattern language for finding and extracting text: IDs in log lines, dates in messy files, emails in free text. Python's `re` module runs them. Use them for **small, well-defined patterns**; for HTML, JSON or CSV use a real parser.

```python
import re

line = "2026-03-14 09:12:55 ERROR job=48213 user=ab12 exit=137"
m = re.search(r"job=(\d+)", line)
print(m.group(1))                       # 48213
print(re.findall(r"(\w+)=(\w+)", line)) # [('job', '48213'), ('user', 'ab12'), ('exit', '137')]
```

Always write patterns as **raw strings** `r"..."` so that `\d` is not read as a Python escape.

## The pieces you need

| Pattern | Matches |
|---|---|
| `.` | any character except a newline |
| `\d` `\w` `\s` | a digit, a word character (letter, digit, `_`), whitespace |
| `[abc]` `[^abc]` `[a-z]` | one of these, none of these, a range |
| `*` `+` `?` `{3}` `{2,5}` | 0 or more, 1 or more, 0 or 1, exactly 3, 2 to 5 |
| `^` `$` | start and end of the string (or line, with `re.M`) |
| `( )` | a group you can extract |
| `(?P<name> )` | a named group: `m["name"]` |
| `a\|b` | a or b |
| `\b` | a word boundary |

**Greedy vs lazy.** `.*` takes as much as it can; `.*?` as little as it can. On `<b>x</b><b>y</b>`, `<b>.*</b>` matches the whole string, `<b>.*?</b>` matches `<b>x</b>`.

## Useful functions

- `re.search(p, s)`: first match anywhere (or `None`). `re.fullmatch(p, s)`: the whole string must match (use this for **validation**).
- `re.findall(p, s)`: all matches. `re.finditer`: matches as objects.
- `re.sub(p, repl, s)`: replace. `repl` can use groups: `r"\2/\1"`.
- `re.compile(p)`: compile once, reuse in a loop.
- Flags: `re.I` (ignore case), `re.M` (`^`/`$` per line), `re.X` (verbose: spaces and comments allowed).

```python
uk_date = re.compile(r"(?P<d>\d{2})/(?P<m>\d{2})/(?P<y>\d{4})")
print(uk_date.sub(r"\g<y>-\g<m>-\g<d>", "Due 31/01/2026 or 28/02/2026"))
# Due 2026-01-31 or 2026-02-28
```

:::exercise Parse Slurm-style log lines
Write `parse(line)` that returns a dict with `time` (the `HH:MM:SS` part), `level`, and every `key=value` pair after it. Return `None` if the line does not start with a date and time.
--- starter ---
import re

def parse(line):
    parts = line.split()
    return {"time": parts[1], "level": parts[2]}
--- tests ---
assert parse("2026-03-14 09:12:55 ERROR job=48213 user=ab12 exit=137") == {
    "time": "09:12:55", "level": "ERROR", "job": "48213", "user": "ab12", "exit": "137"}
assert parse("2026-03-14 10:00:01 INFO job=7") == {"time": "10:00:01", "level": "INFO", "job": "7"}
assert parse("garbage line") is None
assert parse("") is None
--- solution ---
import re

HEAD = re.compile(r"^\d{4}-\d{2}-\d{2} (?P<time>\d{2}:\d{2}:\d{2}) (?P<level>[A-Z]+)")
PAIR = re.compile(r"(\w+)=(\S+)")

def parse(line):
    m = HEAD.match(line)
    if not m:
        return None
    result = {"time": m["time"], "level": m["level"]}
    result.update(PAIR.findall(line[m.end():]))
    return result
:::

:::exercise Validate and normalise UK postcodes
Write `normalise(postcode)` that accepts UK postcodes in any case and with any spacing (for example `"sw1a1aa"`, `" SW1A  1AA "`), and returns them in the standard form `"SW1A 1AA"`. Return `None` if it is not a valid shape. A simple valid shape is: an outward code of 1–2 letters, a digit, and an optional letter or digit; then an inward code of a digit and two letters.
--- starter ---
import re

def normalise(postcode):
    return postcode.upper()
--- tests ---
assert normalise("sw1a1aa") == "SW1A 1AA"
assert normalise(" SW1A  1AA ") == "SW1A 1AA"
assert normalise("b33 8th") == "B33 8TH"
assert normalise("M1 1AE") == "M1 1AE"
assert normalise("EC1A1BB") == "EC1A 1BB"
assert normalise("12345") is None
assert normalise("SW1A 1A") is None
--- solution ---
import re

SHAPE = re.compile(r"([A-Z]{1,2}\d[A-Z\d]?)(\d[A-Z]{2})")

def normalise(postcode):
    compact = re.sub(r"\s+", "", postcode).upper()
    m = SHAPE.fullmatch(compact)
    return f"{m.group(1)} {m.group(2)}" if m else None
:::

:::exercise Redact secrets before logging
Before you send logs to a customer or an LLM, remove secrets. Write `redact(text)` that replaces email addresses with `[EMAIL]` and any value after `password=`, `token=` or `api_key=` (any case) with `[REDACTED]`, keeping the key name.
--- starter ---
import re

def redact(text):
    return text.replace("password", "[REDACTED]")
--- tests ---
assert redact("user j.doe@example.ac.uk logged in") == "user [EMAIL] logged in"
assert redact("password=hunter2 next") == "password=[REDACTED] next"
assert redact("TOKEN=abc.def-123&x=1") == "TOKEN=[REDACTED]&x=1"
assert redact("api_key=sk-123 and a@b.co") == "api_key=[REDACTED] and [EMAIL]"
assert redact("nothing here") == "nothing here"
--- solution ---
import re

EMAIL = re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+")
SECRET = re.compile(r"\b(password|token|api_key)=[^\s&]+", re.I)

def redact(text):
    text = EMAIL.sub("[EMAIL]", text)
    return SECRET.sub(lambda m: f"{m.group(1)}=[REDACTED]", text)
:::

:::quiz
Q: Which function should you use to check that a whole string is a valid ID?
- [ ] re.search
- [x] re.fullmatch
- [ ] re.findall
> re.search finds a match anywhere, so "abc123xyz" would pass a digits check.
Q: Why write regex patterns as raw strings, r"\d+"?
- [x] So Python does not treat the backslashes as string escapes
- [ ] They run faster
Q: Should you parse HTML with a regex?
- [ ] Yes, it is the fastest way
- [x] No, use an HTML parser; regex is for small, regular patterns
:::

:::cards Regex
\d \w \s :: A digit, a word character, whitespace.
Greedy vs lazy :: .* takes as much as possible; .*? as little as possible.
Named group :: (?P<name>...) and read it with m["name"].
search vs fullmatch :: search finds a match anywhere; fullmatch needs the whole string to match (validation).
:::
