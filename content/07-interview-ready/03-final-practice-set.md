# Final practice set
<!-- minutes: 120 -->

Treat each exercise as a real interview: **35 minutes, no hints, talk aloud** (record yourself). Then click **Review my code** and compare with an interviewer's view. If you cannot finish one, go back to the matching lesson in track 3.

:::exercise Merge k sorted lists
Merge `k` sorted lists of numbers into one sorted list in $O(n \log k)$ using a heap. Do not use `heapq.merge` or `sorted`.
--- starter ---
import heapq

def merge_k(lists):
    pass
--- tests ---
assert merge_k([[1, 4, 5], [1, 3, 4], [2, 6]]) == [1, 1, 2, 3, 4, 4, 5, 6]
assert merge_k([]) == []
assert merge_k([[], [1]]) == [1]
--- solution ---
import heapq

def merge_k(lists):
    heap = [(lst[0], i, 0) for i, lst in enumerate(lists) if lst]
    heapq.heapify(heap)
    result = []
    while heap:
        value, i, j = heapq.heappop(heap)
        result.append(value)
        if j + 1 < len(lists[i]):
            heapq.heappush(heap, (lists[i][j + 1], i, j + 1))
    return result
:::

:::exercise Rate-limited batch processor
Write `plan_batches(items, batch_size, max_per_minute)`. Split `items` into batches of `batch_size`. You may send at most `max_per_minute` batches per minute. Return a list of `(minute, batch)` tuples, starting at minute 0.
--- starter ---
def plan_batches(items, batch_size, max_per_minute):
    pass
--- tests ---
assert plan_batches(list(range(7)), 2, 2) == [(0, [0, 1]), (0, [2, 3]), (1, [4, 5]), (1, [6])]
assert plan_batches([], 3, 1) == []
assert plan_batches([1, 2, 3], 1, 1) == [(0, [1]), (1, [2]), (2, [3])]
--- solution ---
def plan_batches(items, batch_size, max_per_minute):
    batches = [items[i:i + batch_size] for i in range(0, len(items), batch_size)]
    return [(n // max_per_minute, b) for n, b in enumerate(batches)]
:::

:::exercise Word ladder (BFS)
Return the length of the shortest transformation sequence from `begin` to `end`, changing one letter at a time, where every intermediate word must be in `words`. Count the words in the sequence (including begin and end). Return 0 if impossible.
--- starter ---
from collections import deque

def ladder_length(begin, end, words):
    pass
--- tests ---
assert ladder_length("hit", "cog", ["hot", "dot", "dog", "lot", "log", "cog"]) == 5
assert ladder_length("hit", "cog", ["hot", "dot", "dog", "lot", "log"]) == 0
assert ladder_length("a", "c", ["a", "b", "c"]) == 2
--- solution ---
from collections import deque
import string

def ladder_length(begin, end, words):
    word_set = set(words)
    if end not in word_set:
        return 0
    queue = deque([(begin, 1)])
    seen = {begin}
    while queue:
        word, steps = queue.popleft()
        if word == end:
            return steps
        for i in range(len(word)):
            for ch in string.ascii_lowercase:
                nxt = word[:i] + ch + word[i + 1:]
                if nxt in word_set and nxt not in seen:
                    seen.add(nxt)
                    queue.append((nxt, steps + 1))
    return 0
:::

:::exercise Usage report from events
You receive GPU usage events `{"user", "project", "start", "end"}` (times in hours). Write `usage_report(events)` that returns a list of `(project, total_hours, top_user)` sorted by total hours (highest first, then project name). `top_user` is the user with the most hours in that project (tie: alphabetical). Ignore events where `end <= start`.
--- starter ---
def usage_report(events):
    pass
--- tests ---
ev = [
    {"user": "ana", "project": "clear", "start": 0, "end": 5},
    {"user": "bo", "project": "clear", "start": 1, "end": 4},
    {"user": "bo", "project": "clear", "start": 10, "end": 13},
    {"user": "cy", "project": "geo", "start": 0, "end": 2},
    {"user": "dee", "project": "geo", "start": 5, "end": 5},
]
assert usage_report(ev) == [("clear", 11, "bo"), ("geo", 2, "cy")]
assert usage_report([]) == []
--- solution ---
from collections import defaultdict

def usage_report(events):
    by_project = defaultdict(lambda: defaultdict(float))
    for e in events:
        hours = e["end"] - e["start"]
        if hours <= 0:
            continue
        by_project[e["project"]][e["user"]] += hours
    rows = []
    for project, users in by_project.items():
        total = sum(users.values())
        top = min(users, key=lambda u: (-users[u], u))
        rows.append((project, total, top))
    return sorted(rows, key=lambda r: (-r[1], r[0]))
:::

:::quiz
Q: You finish a practice problem in 20 minutes. What next?
- [x] Test edge cases aloud, state complexity, then click Review and do a second problem
- [ ] Stop for the day
- [ ] Look at the solution to confirm
:::
