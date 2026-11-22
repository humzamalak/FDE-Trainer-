# Pattern: binary search
<!-- minutes: 45 -->

Binary search finds a target in **sorted** data in $O(\log n)$: check the middle, then throw away the half that cannot contain the answer.

```python
def search(nums, target):
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if nums[mid] == target:
            return mid
        if nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1
```

Off-by-one errors are the main risk. Test with: an empty list, 1 item, target at the first and last position, target missing.

## Binary search on the answer

A powerful idea: if you can check "does value $x$ work?", and the answer goes `no no no yes yes yes` as $x$ grows, binary search over $x$.

Example: "What is the smallest GPU throughput that finishes all jobs in $h$ hours?" Check a speed; if it works, try smaller; if not, try bigger.

`git bisect` is binary search over commits. You already use the idea.

Python has `bisect.bisect_left(sorted_list, x)`: the position where `x` would be inserted.

:::exercise Binary search
Return the index of `target` in the sorted list, or `-1`. Do not use `.index()` or `in`.
--- starter ---
def search(nums, target):
    pass
--- tests ---
assert search([-1, 0, 3, 5, 9, 12], 9) == 4
assert search([-1, 0, 3, 5, 9, 12], 2) == -1
assert search([], 1) == -1
assert search([5], 5) == 0
assert search([1, 2, 3], 1) == 0
assert search([1, 2, 3], 3) == 2
--- solution ---
def search(nums, target):
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if nums[mid] == target:
            return mid
        if nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1
:::

:::exercise First bad build
Builds `1..n` are in order. After the first bad build, every build is bad. `is_bad(k)` tells you if build `k` is bad. Return the first bad build using as few calls as possible ($O(\log n)$).
--- starter ---
def first_bad(n, is_bad):
    pass
--- tests ---
calls = []
def checker(first):
    def is_bad(k):
        calls.append(k)
        return k >= first
    return is_bad
assert first_bad(5, checker(4)) == 4
assert first_bad(1, checker(1)) == 1
calls.clear()
assert first_bad(1_000_000, checker(777_777)) == 777_777
assert len(calls) <= 21, f"too many calls: {len(calls)}"
--- solution ---
def first_bad(n, is_bad):
    lo, hi = 1, n
    while lo < hi:
        mid = (lo + hi) // 2
        if is_bad(mid):
            hi = mid
        else:
            lo = mid + 1
    return lo
:::

:::exercise Minimum capacity
`jobs` is a list of job sizes that must run **in order**. Each day the cluster can process up to `capacity` units, and a job cannot be split across days. Return the smallest `capacity` that finishes all jobs in `days` days. Binary search on the answer: the lowest possible is `max(jobs)`, the highest is `sum(jobs)`.
--- starter ---
def min_capacity(jobs, days):
    pass
--- tests ---
assert min_capacity([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5) == 15
assert min_capacity([3, 2, 2, 4, 1, 4], 3) == 6
assert min_capacity([1, 2, 3, 1, 1], 4) == 3
--- solution ---
def min_capacity(jobs, days):
    def fits(cap):
        used, load = 1, 0
        for j in jobs:
            if load + j > cap:
                used += 1
                load = 0
            load += j
        return used <= days

    lo, hi = max(jobs), sum(jobs)
    while lo < hi:
        mid = (lo + hi) // 2
        if fits(mid):
            hi = mid
        else:
            lo = mid + 1
    return lo
:::

:::quiz
Q: What must be true for binary search to work?
- [ ] The data must be numbers
- [x] The data (or the yes/no answer) must be sorted / monotonic
- [ ] The list must have an even length
:::
