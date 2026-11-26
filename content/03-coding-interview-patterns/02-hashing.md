# Pattern: hash maps and sets
<!-- minutes: 60 -->

A hash map (dict) gives $O(1)$ average lookup. Many $O(n^2)$ brute-force solutions become $O(n)$ with one.

## Two Sum (the most famous problem)

Find the indices of two numbers that add to `target`.

```python
def two_sum(nums, target):
    seen = {}  # value -> index
    for i, x in enumerate(nums):
        need = target - x
        if need in seen:
            return [seen[need], i]
        seen[x] = i
    return []
```

Key idea: for each number, ask "have I already seen the number that completes it?"

## Group by a key

Anagrams have the same letters. `sorted("eat") == sorted("tea")`. Use the sorted string as the dict key.

## Prefix sums + hash map

"How many subarrays sum to k?" Store how often each running total appears. If `running - k` was seen before, those subarrays end here.

:::exercise Two Sum
Return the indices `[i, j]` (i < j) of the two numbers that add up to `target`. Exactly one answer exists. Do it in $O(n)$.
--- starter ---
def two_sum(nums, target):
    pass
--- tests ---
assert two_sum([2, 7, 11, 15], 9) == [0, 1]
assert two_sum([3, 2, 4], 6) == [1, 2]
assert two_sum([3, 3], 6) == [0, 1]
assert two_sum(list(range(100000)), 199997) == [99998, 99999]
--- solution ---
def two_sum(nums, target):
    seen = {}
    for i, x in enumerate(nums):
        if target - x in seen:
            return [seen[target - x], i]
        seen[x] = i
    return []
:::

:::exercise Valid anagram
Return `True` if `t` is an anagram of `s` (same letters, same counts).
--- starter ---
def is_anagram(s, t):
    pass
--- tests ---
assert is_anagram("anagram", "nagaram") is True
assert is_anagram("rat", "car") is False
assert is_anagram("aab", "abb") is False
assert is_anagram("", "") is True
--- solution ---
from collections import Counter

def is_anagram(s, t):
    return Counter(s) == Counter(t)
:::

:::exercise Group anagrams
Group the words that are anagrams of each other. Return a list of groups. Sort the words inside each group, and sort the groups, so the answer is predictable.
--- starter ---
def group_anagrams(words):
    pass
--- tests ---
assert group_anagrams(["eat", "tea", "tan", "ate", "nat", "bat"]) == [["ate", "eat", "tea"], ["bat"], ["nat", "tan"]]
assert group_anagrams([""]) == [[""]]
--- solution ---
def group_anagrams(words):
    groups = {}
    for w in words:
        groups.setdefault("".join(sorted(w)), []).append(w)
    return sorted(sorted(g) for g in groups.values())
:::

:::exercise Top k frequent
Return the `k` most frequent items, most frequent first. If two items have the same count, the smaller item comes first.
--- starter ---
def top_k_frequent(nums, k):
    pass
--- tests ---
assert top_k_frequent([1, 1, 1, 2, 2, 3], 2) == [1, 2]
assert top_k_frequent([4, 4, 5, 5, 6], 2) == [4, 5]
assert top_k_frequent([7], 1) == [7]
--- solution ---
from collections import Counter

def top_k_frequent(nums, k):
    counts = Counter(nums)
    return sorted(counts, key=lambda x: (-counts[x], x))[:k]
:::

:::exercise Subarray sum equals k
Return how many contiguous subarrays sum to `k`. Numbers can be negative. Aim for $O(n)$ with prefix sums.
--- starter ---
def subarray_sum(nums, k):
    pass
--- tests ---
assert subarray_sum([1, 1, 1], 2) == 2
assert subarray_sum([1, 2, 3], 3) == 2
assert subarray_sum([1, -1, 0], 0) == 3
assert subarray_sum([], 0) == 0
--- solution ---
def subarray_sum(nums, k):
    count = 0
    running = 0
    seen = {0: 1}
    for x in nums:
        running += x
        count += seen.get(running - k, 0)
        seen[running] = seen.get(running, 0) + 1
    return count
:::

:::quiz
Q: What is the time and space complexity of the hash map Two Sum?
- [ ] O(n²) time, O(1) space
- [x] O(n) time, O(n) space
- [ ] O(n log n) time, O(1) space
:::
