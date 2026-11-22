# Practical FDE coding problems
<!-- minutes: 90 -->

Many FDE loops use **practical** problems instead of puzzles: parse messy data, call an API, transform records, build a small class. They test clean code, edge cases and speed. Do each exercise below in **35 minutes**, talking out loud. Then click **Review my code**.

:::exercise Parse an access log
Each line is: `IP - - [timestamp] "METHOD PATH HTTP/1.1" STATUS BYTES`.

Write `summarise(lines)` that returns a dict:
- `"requests"`: number of valid lines
- `"errors"`: number of lines with status 500–599
- `"top_path"`: the most requested path (tie: alphabetically first), or `None`
- `"bad_lines"`: number of lines you could not parse

Skip blank lines (do not count them as bad).
--- starter ---
def summarise(lines):
    pass
--- tests ---
logs = [
    '10.0.0.1 - - [22/Nov/2026:10:00:00] "GET /api/jobs HTTP/1.1" 200 512',
    '10.0.0.2 - - [22/Nov/2026:10:00:01] "POST /api/jobs HTTP/1.1" 503 0',
    '10.0.0.1 - - [22/Nov/2026:10:00:02] "GET /health HTTP/1.1" 200 2',
    'garbage line',
    '',
    '10.0.0.3 - - [22/Nov/2026:10:00:03] "GET /api/jobs HTTP/1.1" 500 0',
]
assert summarise(logs) == {"requests": 4, "errors": 2, "top_path": "/api/jobs", "bad_lines": 1}
assert summarise([]) == {"requests": 0, "errors": 0, "top_path": None, "bad_lines": 0}
--- solution ---
import re
from collections import Counter

LINE = re.compile(r'^(\S+) \S+ \S+ \[[^\]]+\] "(\S+) (\S+) [^"]+" (\d{3}) (\d+|-)$')

def summarise(lines):
    paths = Counter()
    requests = errors = bad = 0
    for line in lines:
        line = line.strip()
        if not line:
            continue
        m = LINE.match(line)
        if not m:
            bad += 1
            continue
        requests += 1
        status = int(m.group(4))
        if 500 <= status <= 599:
            errors += 1
        paths[m.group(3)] += 1
    top = min(paths, key=lambda p: (-paths[p], p)) if paths else None
    return {"requests": requests, "errors": errors, "top_path": top, "bad_lines": bad}
:::

:::exercise Reconcile two systems
The HR system and the cluster's user list disagree. Each is a list of dicts with `"email"` and `"active"` (bool). Emails may differ in case and spaces.

Write `reconcile(hr, cluster)` that returns a dict of sorted lists:
- `"to_create"`: active in HR, not on the cluster
- `"to_disable"`: on the cluster and active there, but not active in HR (or not in HR at all)
--- starter ---
def reconcile(hr, cluster):
    pass
--- tests ---
hr = [{"email": "A@lse.ac.uk", "active": True}, {"email": "b@lse.ac.uk", "active": False}, {"email": " c@lse.ac.uk", "active": True}]
cluster = [{"email": "a@lse.ac.uk", "active": True}, {"email": "b@lse.ac.uk", "active": True}, {"email": "d@lse.ac.uk", "active": True}, {"email": "e@lse.ac.uk", "active": False}]
assert reconcile(hr, cluster) == {"to_create": ["c@lse.ac.uk"], "to_disable": ["b@lse.ac.uk", "d@lse.ac.uk"]}
assert reconcile([], []) == {"to_create": [], "to_disable": []}
--- solution ---
def reconcile(hr, cluster):
    norm = lambda e: e.strip().lower()
    hr_active = {norm(u["email"]) for u in hr if u["active"]}
    on_cluster = {norm(u["email"]) for u in cluster}
    cluster_active = {norm(u["email"]) for u in cluster if u["active"]}
    return {
        "to_create": sorted(hr_active - on_cluster),
        "to_disable": sorted(cluster_active - hr_active),
    }
:::

:::exercise An LRU cache
Build `LRUCache(capacity)` with `get(key)` (return the value or `-1`) and `put(key, value)`. When full, remove the **least recently used** key. Both must be $O(1)$. Hint: `collections.OrderedDict` with `move_to_end` and `popitem(last=False)`.
--- starter ---
class LRUCache:
    def __init__(self, capacity):
        pass

    def get(self, key):
        pass

    def put(self, key, value):
        pass
--- tests ---
c = LRUCache(2)
c.put(1, "a")
c.put(2, "b")
assert c.get(1) == "a"
c.put(3, "c")
assert c.get(2) == -1
assert c.get(3) == "c"
c.put(1, "A")
c.put(4, "d")
assert c.get(3) == -1
assert c.get(1) == "A"
--- solution ---
from collections import OrderedDict

class LRUCache:
    def __init__(self, capacity):
        self.capacity = capacity
        self.data = OrderedDict()

    def get(self, key):
        if key not in self.data:
            return -1
        self.data.move_to_end(key)
        return self.data[key]

    def put(self, key, value):
        if key in self.data:
            self.data.move_to_end(key)
        self.data[key] = value
        if len(self.data) > self.capacity:
            self.data.popitem(last=False)
:::

:::exercise Text chunker for RAG
Write `chunk_text(text, max_words, overlap)`. Split the text into chunks of at most `max_words` words. Each new chunk starts `max_words - overlap` words after the previous one, so neighbouring chunks share `overlap` words. Return a list of strings (words joined by single spaces). Stop when the last chunk reaches the end. Raise `ValueError` if `overlap >= max_words`.
--- starter ---
def chunk_text(text, max_words, overlap):
    pass
--- tests ---
t = "a b c d e f g h i j"
assert chunk_text(t, 4, 1) == ["a b c d", "d e f g", "g h i j"]
assert chunk_text(t, 5, 0) == ["a b c d e", "f g h i j"]
assert chunk_text("one two", 10, 2) == ["one two"]
assert chunk_text("", 3, 1) == []
try:
    chunk_text(t, 3, 3)
    ok = False
except ValueError:
    ok = True
assert ok
--- solution ---
def chunk_text(text, max_words, overlap):
    if overlap >= max_words:
        raise ValueError("overlap must be smaller than max_words")
    words = text.split()
    chunks = []
    step = max_words - overlap
    for start in range(0, len(words), step):
        chunks.append(" ".join(words[start:start + max_words]))
        if start + max_words >= len(words):
            break
    return chunks
:::

:::quiz
Q: In a practical round you finish early. What is the best use of the time?
- [ ] Say you are done and wait
- [x] Add edge-case handling and tests, and explain what you would add for production (logging, retries, validation)
- [ ] Rewrite everything in a different style
:::
