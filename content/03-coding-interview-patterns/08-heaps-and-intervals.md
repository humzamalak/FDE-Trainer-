# Patterns: heaps, sorting and intervals
<!-- minutes: 60 -->

## Heaps

A **heap** gives you the smallest item in $O(1)$ and adds/removes in $O(\log n)$. Python's `heapq` is a **min-heap** on a list.

```python
import heapq
h = []
heapq.heappush(h, (5, "low"))
heapq.heappush(h, (1, "urgent"))
heapq.heappop(h)          # (1, "urgent")
heapq.nlargest(3, nums)   # top 3
```

For a max-heap, push negative values: `heappush(h, -priority)`.

Uses: top-k, k-th largest, merge k sorted lists, schedulers (which job runs next), Dijkstra's shortest path.

"Top k of n items" with a heap of size k: $O(n \log k)$, better than sorting $O(n \log n)$ when k is small.

## Sorting with a key

Python's sort is stable and $O(n \log n)$. Sort by several keys with a tuple: `sorted(jobs, key=lambda j: (-j.priority, j.submitted))`.

## Intervals

Meetings, bookings, maintenance windows, IP ranges. Almost always: **sort by start time first.**

```python
def merge(intervals):
    intervals = sorted(intervals)
    merged = []
    for start, end in intervals:
        if merged and start <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], end)   # overlap: extend
        else:
            merged.append([start, end])
    return merged
```

"How many rooms (or GPUs) are needed at the same time?" — sort the starts, and use a heap of end times.

:::exercise K-th largest
Return the k-th largest number. Use a min-heap of size k for $O(n \log k)$.
--- starter ---
import heapq

def kth_largest(nums, k):
    pass
--- tests ---
assert kth_largest([3, 2, 1, 5, 6, 4], 2) == 5
assert kth_largest([3, 2, 3, 1, 2, 4, 5, 5, 6], 4) == 4
assert kth_largest([1], 1) == 1
--- solution ---
import heapq

def kth_largest(nums, k):
    heap = []
    for x in nums:
        heapq.heappush(heap, x)
        if len(heap) > k:
            heapq.heappop(heap)
    return heap[0]
:::

:::exercise Merge overlapping intervals
Merge all overlapping intervals. Intervals that touch (end == next start) also merge. Return a list of `[start, end]` lists, sorted.
--- starter ---
def merge(intervals):
    pass
--- tests ---
assert merge([[1, 3], [2, 6], [8, 10], [15, 18]]) == [[1, 6], [8, 10], [15, 18]]
assert merge([[1, 4], [4, 5]]) == [[1, 5]]
assert merge([[5, 6], [1, 2]]) == [[1, 2], [5, 6]]
assert merge([[1, 10], [2, 3]]) == [[1, 10]]
assert merge([]) == []
--- solution ---
def merge(intervals):
    merged = []
    for start, end in sorted(intervals):
        if merged and start <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], end)
        else:
            merged.append([start, end])
    return merged
:::

:::exercise GPUs needed at the same time
Each job is `(start, end)` and uses 1 GPU. A job that ends at time t frees its GPU for a job that starts at t. Return the maximum number of GPUs in use at once.
--- starter ---
import heapq

def max_concurrent(jobs):
    pass
--- tests ---
assert max_concurrent([(0, 30), (5, 10), (15, 20)]) == 2
assert max_concurrent([(7, 10), (2, 4)]) == 1
assert max_concurrent([(1, 5), (2, 6), (3, 7), (5, 8)]) == 3
assert max_concurrent([]) == 0
--- solution ---
import heapq

def max_concurrent(jobs):
    ends = []
    best = 0
    for start, end in sorted(jobs):
        while ends and ends[0] <= start:
            heapq.heappop(ends)
        heapq.heappush(ends, end)
        best = max(best, len(ends))
    return best
:::

:::exercise Merge sorted log streams
You have several lists of `(timestamp, message)`, each already sorted by time. Return one list sorted by time. Use `heapq.merge` or your own heap. (Real use: merging logs from many pods.)
--- starter ---
import heapq

def merge_logs(streams):
    pass
--- tests ---
a = [(1, "a1"), (4, "a2")]
b = [(2, "b1"), (3, "b2"), (9, "b3")]
c = []
assert merge_logs([a, b, c]) == [(1, "a1"), (2, "b1"), (3, "b2"), (4, "a2"), (9, "b3")]
assert merge_logs([]) == []
--- solution ---
import heapq

def merge_logs(streams):
    return list(heapq.merge(*streams))
:::

:::quiz
Q: Python's heapq is a…
- [x] min-heap
- [ ] max-heap
- [ ] sorted list
> For max-heap behaviour, push negated values.
Q: What is the first step for most interval problems?
- [ ] Use a hash map
- [x] Sort by start time
- [ ] Use recursion
:::
