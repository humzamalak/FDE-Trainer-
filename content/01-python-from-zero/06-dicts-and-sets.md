# Dictionaries and sets
<!-- minutes: 50 -->

## Dictionaries

A **dict** maps **keys** to **values**. It is like a key-value store (Redis, DynamoDB) or a JSON object. Looking up a key is very fast: $O(1)$ on average.

```python
instance = {"id": "i-0abc", "type": "g5.xlarge", "running": True}
instance["type"]                 # "g5.xlarge"
instance["az"] = "eu-west-2a"    # add or change
instance.get("owner")            # None (no KeyError)
instance.get("owner", "unknown") # default value
"id" in instance                 # True (checks keys)
del instance["running"]

for key, value in instance.items():
    print(key, value)
```

`instance["owner"]` raises `KeyError` if the key is missing. Use `.get()` when the key can be missing.

## The counting pattern

You will use this in many interviews.

```python
def count_words(words):
    counts = {}
    for w in words:
        counts[w] = counts.get(w, 0) + 1
    return counts
```

The standard library also has `collections.Counter` and `collections.defaultdict`:

```python
from collections import Counter, defaultdict
Counter(["a", "b", "a"]).most_common(1)   # [("a", 2)]

by_team = defaultdict(list)
by_team["research"].append("vm-1")        # no need to create the list first
```

## The grouping pattern

```python
def group_by_region(instances):
    groups = {}
    for inst in instances:
        groups.setdefault(inst["region"], []).append(inst["id"])
    return groups
```

## Sets

A **set** holds unique items, with no order. `in` is fast.

```python
allowed = {"eu-west-1", "eu-west-2"}
used = {"eu-west-2", "us-east-1"}
used - allowed      # {"us-east-1"}   in used, not in allowed
used & allowed      # {"eu-west-2"}   in both
used | allowed      # all of them
```

Use a set when you only care "is it there?". Use a dict when you also need a value.

:::exercise Count log levels
Write `count_levels(lines)`. Each line looks like `"ERROR disk full"` (the level is the first word). Return a dict of level → count.
--- starter ---
def count_levels(lines):
    pass
--- tests ---
assert count_levels(["ERROR a", "INFO b", "ERROR c"]) == {"ERROR": 2, "INFO": 1}
assert count_levels([]) == {}
--- solution ---
def count_levels(lines):
    counts = {}
    for line in lines:
        level = line.split()[0]
        counts[level] = counts.get(level, 0) + 1
    return counts
:::

:::exercise Group instances by team
Each instance is a dict like `{"id": "i-1", "team": "econ", "cost": 10}`. Write `cost_by_team(instances)` that returns a dict of team → total cost.
--- starter ---
def cost_by_team(instances):
    pass
--- tests ---
data = [
    {"id": "i-1", "team": "econ", "cost": 10},
    {"id": "i-2", "team": "geo", "cost": 5},
    {"id": "i-3", "team": "econ", "cost": 7.5},
]
assert cost_by_team(data) == {"econ": 17.5, "geo": 5}
assert cost_by_team([]) == {}
--- solution ---
def cost_by_team(instances):
    totals = {}
    for inst in instances:
        totals[inst["team"]] = totals.get(inst["team"], 0) + inst["cost"]
    return totals
:::

:::exercise Find the drift
Your Ansible inventory says these hosts must exist. A scan found other hosts. Write `drift(expected, found)` that returns a dict with two **sorted lists**:
- `"missing"`: in expected, not found
- `"unexpected"`: found, not expected
--- starter ---
def drift(expected, found):
    pass
--- tests ---
assert drift(["a", "b", "c"], ["b", "c", "d"]) == {"missing": ["a"], "unexpected": ["d"]}
assert drift([], []) == {"missing": [], "unexpected": []}
assert drift(["x"], ["x", "x"]) == {"missing": [], "unexpected": []}
--- solution ---
def drift(expected, found):
    e, f = set(expected), set(found)
    return {"missing": sorted(e - f), "unexpected": sorted(f - e)}
:::

:::exercise First repeated character
Write `first_repeat(text)` that returns the first character that appears for the second time, reading left to right. Return `None` if no character repeats.

`first_repeat("abcbad")` → `"b"` (b is seen again at position 3, before a is seen again at position 4).
--- starter ---
def first_repeat(text):
    pass
--- tests ---
assert first_repeat("abcbad") == "b"
assert first_repeat("abc") is None
assert first_repeat("aa") == "a"
--- solution ---
def first_repeat(text):
    seen = set()
    for ch in text:
        if ch in seen:
            return ch
        seen.add(ch)
    return None
:::

:::quiz
Q: `d = {"a": 1}`. What does `d["b"]` do?
- [ ] Returns None
- [x] Raises KeyError
- [ ] Returns 0
> Use d.get("b") to get None instead of an error.
Q: Which structure is best to check "have I seen this ID before?"
- [ ] list
- [x] set
- [ ] tuple
> in on a set is O(1) on average; in on a list is O(n).
:::
