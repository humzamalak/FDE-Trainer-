# Memoisation and dynamic programming
<!-- order: 6.5 -->
<!-- minutes: 55 -->

**Dynamic programming (DP)** solves a problem by combining answers to smaller versions of the same problem, and **saves each answer** so it is computed once. You need it when a plain recursive solution computes the same sub-problem again and again.

## From slow recursion to DP

```python
def fib(n):            # O(2^n): fib(30) makes over a million calls
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)
```

**Step 1: memoise** (top-down). Save results in a dict, or use `functools.cache`:

```python
from functools import cache

@cache
def fib(n):            # O(n): each n is computed once
    return n if n < 2 else fib(n - 1) + fib(n - 2)
```

**Step 2: tabulate** (bottom-up). Fill a table from the smallest case up. No recursion limit, often less memory:

```python
def fib(n):
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a
```

## The recipe

1. **Define the state** in words: "`best[i]` = the answer for the first `i` items".
2. **Write the recurrence**: how `best[i]` comes from smaller states.
3. **Base cases**.
4. **Order**: compute small states before big ones (or let memoisation do it).
5. **Answer**: which state holds the final answer?

Time is usually (number of states) × (work per state).

## Signals that a problem is DP

"How many ways…", "the minimum/maximum cost to…", "can you reach…", and choices at each step where a greedy choice can be wrong. Classic examples: climbing stairs, coin change, longest common subsequence, edit distance (used in fuzzy matching of customer names!).

:::exercise Coin change
Write `min_coins(coins, amount)` that returns the smallest number of coins that add up to `amount`, or `-1` if it is impossible. You have unlimited coins of each value. A greedy "take the biggest coin" approach fails for coins `[1, 3, 4]` and amount 6 (greedy: 4+1+1 = 3 coins; best: 3+3 = 2 coins).
--- starter ---
def min_coins(coins, amount):
    count = 0
    for c in sorted(coins, reverse=True):
        while amount >= c:
            amount -= c
            count += 1
    return count if amount == 0 else -1
--- tests ---
assert min_coins([1, 3, 4], 6) == 2
assert min_coins([1, 2, 5], 11) == 3
assert min_coins([2], 3) == -1
assert min_coins([1], 0) == 0
assert min_coins([5, 7], 24) == 4
--- solution ---
def min_coins(coins, amount):
    INF = float("inf")
    best = [0] + [INF] * amount   # best[a] = fewest coins that make amount a
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a and best[a - c] + 1 < best[a]:
                best[a] = best[a - c] + 1
    return best[amount] if best[amount] != INF else -1
:::

:::exercise Edit distance
Write `edit_distance(a, b)`: the smallest number of single-character inserts, deletes or substitutions that turn string `a` into `b`. This is how you match "Jon Smiht" to "John Smith" in messy customer data.

Hint: `d[i][j]` = distance between the first `i` characters of `a` and the first `j` of `b`.
--- starter ---
def edit_distance(a, b):
    return abs(len(a) - len(b))
--- tests ---
assert edit_distance("kitten", "sitting") == 3
assert edit_distance("", "abc") == 3
assert edit_distance("abc", "abc") == 0
assert edit_distance("flaw", "lawn") == 2
assert edit_distance("Jon Smiht", "John Smith") == 3
--- solution ---
def edit_distance(a, b):
    d = [[0] * (len(b) + 1) for _ in range(len(a) + 1)]
    for i in range(len(a) + 1):
        d[i][0] = i          # delete everything
    for j in range(len(b) + 1):
        d[0][j] = j          # insert everything
    for i in range(1, len(a) + 1):
        for j in range(1, len(b) + 1):
            same = a[i - 1] == b[j - 1]
            d[i][j] = min(
                d[i - 1][j] + 1,                    # delete a[i-1]
                d[i][j - 1] + 1,                    # insert b[j-1]
                d[i - 1][j - 1] + (0 if same else 1),  # keep or substitute
            )
    return d[len(a)][len(b)]
:::

:::exercise Climbing stairs with a memo
You can climb 1 or 2 steps at a time. Write `ways(n)` that returns how many different ways there are to climb `n` steps. It must be fast for `n = 200` (the plain recursion would never finish).
--- starter ---
def ways(n):
    if n <= 1:
        return 1
    return 1
--- tests ---
assert ways(1) == 1
assert ways(2) == 2
assert ways(3) == 3
assert ways(5) == 8
assert ways(200) == 453973694165307953197296969697410619233826
--- solution ---
from functools import cache

@cache
def ways(n):
    if n <= 1:
        return 1
    return ways(n - 1) + ways(n - 2)
:::

:::quiz
Q: What turns an exponential recursive solution into a polynomial one?
- [x] Saving the answer to each sub-problem so it is computed only once
- [ ] Using a faster computer
- [ ] Using a while loop instead of recursion
Q: The coin change solution has `amount` states and tries every coin for each. Its time is…
- [ ] O(amount)
- [x] O(amount × number of coins)
- [ ] O(2^amount)
Q: Which problem is a good fit for DP?
- [ ] Find an item in a sorted list
- [x] The cheapest way to cut a rod into pieces with different prices
:::

:::cards DP
DP in one sentence :: Solve each sub-problem once, save the answer, and build bigger answers from smaller ones.
DP recipe :: State, recurrence, base cases, order, answer.
Memoisation vs tabulation :: Top-down recursion with a cache vs bottom-up filling of a table.
Edit distance recurrence :: d[i][j] = min(delete, insert, substitute-or-keep) from the three neighbouring cells.
:::
