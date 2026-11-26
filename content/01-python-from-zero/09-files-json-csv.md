# Files, JSON and CSV
<!-- minutes: 50 -->

FDE work is mostly moving data between systems. JSON and CSV are the most common formats.

## Files

```python
with open("hosts.txt", encoding="utf-8") as f:
    for line in f:
        print(line.strip())

with open("report.txt", "w", encoding="utf-8") as f:
    f.write("done\n")
```

`with` closes the file automatically, even if there is an error. Always use it.

For paths, use `pathlib`:

```python
from pathlib import Path

p = Path("data") / "costs.csv"
p.exists()
p.read_text(encoding="utf-8")
p.suffix  # ".csv"
```

## JSON

JSON maps directly to Python: object → `dict`, array → `list`, string → `str`, number → `int`/`float`, `true` → `True`, `null` → `None`.

```python
import json

text = '{"name": "gpu-01", "gpus": 8, "tags": ["h200"]}'
data = json.loads(text)  # str  -> Python
data["gpus"]  # 8
json.dumps(data, indent=2)  # Python -> str
# json.load(f) / json.dump(data, f) work with files
```

Real API JSON is **nested**. Walk it step by step, and use `.get()` for fields that may be missing.

```python
resp = {"items": [{"metadata": {"name": "pod-a"}, "status": {"phase": "Running"}}]}
names = [i["metadata"]["name"] for i in resp["items"] if i.get("status", {}).get("phase") == "Running"]
```

## CSV

```python
import csv, io

text = "service,cost\nec2,900\ns3,120\n"
reader = csv.DictReader(io.StringIO(text))  # with a file: csv.DictReader(f)
for row in reader:
    print(row["service"], float(row["cost"]))  # values are always strings!
```

`io.StringIO` makes a string behave like a file. It is useful in tests.

:::exercise Running pods from kubectl JSON
Write `running_pods(json_text)`. The input is the JSON text of `kubectl get pods -o json`. Return a sorted list of pod names whose `status.phase` is `"Running"`. Some pods may have no `status`.
--- starter ---
import json

def running_pods(json_text):
    pass
--- tests ---
doc = '{"items": [{"metadata": {"name": "b"}, "status": {"phase": "Running"}}, {"metadata": {"name": "a"}, "status": {"phase": "Running"}}, {"metadata": {"name": "c"}, "status": {"phase": "Pending"}}, {"metadata": {"name": "d"}}]}'
assert running_pods(doc) == ["a", "b"]
assert running_pods('{"items": []}') == []
--- solution ---
import json

def running_pods(json_text):
    data = json.loads(json_text)
    names = []
    for item in data["items"]:
        if item.get("status", {}).get("phase") == "Running":
            names.append(item["metadata"]["name"])
    return sorted(names)
:::

:::exercise Total cost per service from CSV
Write `cost_summary(csv_text)`. The CSV has columns `date,service,cost`. Return a dict of service → total cost (float), rounded to 2 decimals.
--- starter ---
import csv, io

def cost_summary(csv_text):
    pass
--- tests ---
text = "date,service,cost\n2026-11-01,ec2,10.5\n2026-11-01,s3,1.25\n2026-11-02,ec2,9.75\n"
assert cost_summary(text) == {"ec2": 20.25, "s3": 1.25}
assert cost_summary("date,service,cost\n") == {}
--- solution ---
import csv, io

def cost_summary(csv_text):
    totals = {}
    for row in csv.DictReader(io.StringIO(csv_text)):
        totals[row["service"]] = totals.get(row["service"], 0) + float(row["cost"])
    return {k: round(v, 2) for k, v in totals.items()}
:::

:::exercise Flatten nested config
Write `flatten(d)` that turns a nested dict into one level with dotted keys.

`flatten({"db": {"host": "x", "port": 5432}, "debug": True})` → `{"db.host": "x", "db.port": 5432, "debug": True}`

Hint: a function can call itself (recursion) for the inner dicts. Use `isinstance(value, dict)`.
--- starter ---
def flatten(d, prefix=""):
    pass
--- tests ---
assert flatten({"db": {"host": "x", "port": 5432}, "debug": True}) == {"db.host": "x", "db.port": 5432, "debug": True}
assert flatten({"a": {"b": {"c": 1}}}) == {"a.b.c": 1}
assert flatten({}) == {}
--- solution ---
def flatten(d, prefix=""):
    result = {}
    for key, value in d.items():
        full = f"{prefix}.{key}" if prefix else key
        if isinstance(value, dict):
            result.update(flatten(value, full))
        else:
            result[full] = value
    return result
:::

:::quiz
Q: You read a CSV with DictReader. What type is `row["cost"]`?
- [ ] float
- [x] str
- [ ] int
> CSV has no types. Convert with float() or int().
Q: What does JSON `null` become in Python?
- [x] None
- [ ] 0
- [ ] "null"
:::
