# Backtracking
<!-- order: 6.6 -->
<!-- minutes: 40 -->

**Backtracking** builds a solution one choice at a time. After each choice it goes deeper; when a path cannot work, it **undoes the last choice** and tries the next one. Use it for "find all…" problems: all subsets, all orderings, all combinations that add up to a target, puzzles.

## The template

```python
def solve(items):
    results = []
    path = []

    def go(start):
        results.append(path[:])        # 1. record (a copy!) if path is a valid answer
        for i in range(start, len(items)):
            path.append(items[i])      # 2. choose
            go(i + 1)                  # 3. explore
            path.pop()                 # 4. un-choose
    go(0)
    return results
```

Two common bugs: appending `path` instead of `path[:]` (every result then points at the same list, which ends empty), and forgetting `path.pop()`.

**Pruning** makes it fast: stop exploring a path as soon as it cannot lead to an answer (for example the sum is already above the target).

The number of results is often exponential ($2^n$ subsets, $n!$ orderings), so backtracking is for small inputs. Say this in the interview.

:::exercise All subsets
Write `subsets(items)` that returns every subset of `items` (including the empty one). Each subset keeps the original order of items. The order of subsets in the result does not matter.
--- starter ---
def subsets(items):
    return [items]
--- tests ---
got = subsets([1, 2, 3])
assert sorted(map(tuple, got)) == sorted([(), (1,), (2,), (3,), (1, 2), (1, 3), (2, 3), (1, 2, 3)])
assert subsets([]) == [[]]
assert len(subsets(list(range(10)))) == 1024
--- solution ---
def subsets(items):
    results, path = [], []

    def go(start):
        results.append(path[:])
        for i in range(start, len(items)):
            path.append(items[i])
            go(i + 1)
            path.pop()

    go(0)
    return results
:::

:::exercise Combination sum
Write `combos(candidates, target)` that returns every combination of the positive numbers in `candidates` that adds up to `target`. Each number may be used **any number of times**. Each combination is sorted, and the result must not contain duplicates. Prune paths whose sum goes over the target.
--- starter ---
def combos(candidates, target):
    return [[c] for c in candidates if c == target]
--- tests ---
assert sorted(combos([2, 3, 6, 7], 7)) == [[2, 2, 3], [7]]
assert sorted(combos([2, 3, 5], 8)) == [[2, 2, 2, 2], [2, 3, 3], [3, 5]]
assert combos([2], 1) == []
--- solution ---
def combos(candidates, target):
    candidates = sorted(candidates)
    results, path = [], []

    def go(start, remaining):
        if remaining == 0:
            results.append(path[:])
            return
        for i in range(start, len(candidates)):
            c = candidates[i]
            if c > remaining:
                break            # prune: the list is sorted, so every later number is too big too
            path.append(c)
            go(i, remaining - c)  # i, not i + 1: the same number may be used again
            path.pop()

    go(0, target)
    return results
:::

:::quiz
Q: Your subsets function returns `[[], [], [], []]`. What is the most likely bug?
- [x] You appended `path` instead of a copy `path[:]`
- [ ] The loop starts at the wrong index
Q: How many orderings (permutations) of 10 distinct items are there?
- [ ] 1,024
- [x] 3,628,800 (10!)
:::

:::cards Backtracking
Backtracking template :: Record, then for each option: choose, explore, un-choose.
Pruning :: Stop exploring a path as soon as it cannot lead to a valid answer.
Number of subsets of n items :: 2^n.
:::
