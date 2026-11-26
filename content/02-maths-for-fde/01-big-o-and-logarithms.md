# Big-O and logarithms
<!-- minutes: 50 -->

Every coding interview asks: **"What is the time and space complexity?"** Big-O is the answer.

## What Big-O means

Big-O describes how the work grows when the input size $n$ grows. We ignore constants and keep the biggest term.

$$3n^2 + 5n + 100 \;\Rightarrow\; O(n^2)$$

| Big-O | Name | Example | $n = 1{,}000{,}000$ |
|---|---|---|---|
| $O(1)$ | constant | dict lookup, list index | 1 step |
| $O(\log n)$ | logarithmic | binary search | ~20 steps |
| $O(n)$ | linear | one loop over the list | 1 million |
| $O(n \log n)$ | linearithmic | sorting | ~20 million |
| $O(n^2)$ | quadratic | a loop inside a loop | $10^{12}$ — too slow |
| $O(2^n)$ | exponential | all subsets | impossible |

Rule of thumb: Python does about $10^7$ simple steps per second. So for $n = 10^5$, $O(n^2) = 10^{10}$ is too slow, and $O(n \log n)$ is fine.

## How to find the Big-O of code

- One loop over $n$ items → $O(n)$.
- A loop inside a loop, both over $n$ → $O(n^2)$.
- Two loops one after the other → $O(n) + O(n) = O(n)$.
- Halving the problem each step → $O(\log n)$.
- **Hidden costs**: `x in list` is $O(n)$. `x in set` is $O(1)$. `list.insert(0, x)` is $O(n)$. `sorted()` is $O(n \log n)$. String `+=` in a loop can be $O(n^2)$ — use `"".join()`.

```python
def has_duplicate_slow(nums):  # O(n^2) time, O(1) space
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] == nums[j]:
                return True
    return False


def has_duplicate_fast(nums):  # O(n) time, O(n) space
    seen = set()
    for x in nums:
        if x in seen:
            return True
        seen.add(x)
    return False
```

This trade — **use more memory to save time** — is the most common interview improvement.

## Logarithms

$\log_2 n$ answers: **"How many times can I halve $n$ until I reach 1?"** Or: "2 to what power gives $n$?"

$$2^{10} = 1024 \;\Rightarrow\; \log_2 1024 = 10 \qquad \log_2(1{,}000{,}000) \approx 20 \qquad \log_2(10^9) \approx 30$$

Rules you need:

$$\log(ab) = \log a + \log b \qquad \log(a^k) = k\log a \qquad \log_2 n = \frac{\ln n}{\ln 2}$$

In Big-O the base of the log does not matter, because it only changes a constant.

**Where logs appear**: binary search, balanced trees, heaps, the depth of a tree, sorting, and the number of bits to store a number ($\lceil \log_2 n \rceil$ bits).

## Space complexity

Count the **extra** memory. A new list of size $n$ → $O(n)$. A few variables → $O(1)$. Recursion depth $d$ → $O(d)$ stack.

:::exercise Count the halvings
Write `halvings(n)` that returns how many times you can halve `n` (with integer division `//`) until it becomes 1. This is $\lfloor \log_2 n \rfloor$. Do it with a loop, not with `math.log`.
--- starter ---
def halvings(n):
    pass
--- tests ---
assert halvings(1) == 0
assert halvings(2) == 1
assert halvings(1024) == 10
assert halvings(1000) == 9
assert halvings(1_000_000) == 19
--- solution ---
def halvings(n):
    count = 0
    while n > 1:
        n //= 2
        count += 1
    return count
:::

:::exercise Make it fast
`common_slow` finds items that are in both lists, but it is $O(n \times m)$. Write `common(a, b)` that gives the same result in $O(n + m)$ (plus the sort). Return a sorted list with no duplicates. The last test uses big lists: the slow version would time out.
--- starter ---
def common(a, b):
    pass


def common_slow(a, b):
    result = []
    for x in a:
        for y in b:
            if x == y and x not in result:
                result.append(x)
    return sorted(result)
--- tests ---
assert common([1, 2, 3, 2], [2, 3, 4]) == [2, 3]
assert common([], [1]) == []
big = list(range(200_000))
assert common(big, big[::2])[:3] == [0, 2, 4]
--- solution ---
def common(a, b):
    return sorted(set(a) & set(b))
:::

:::quiz
Q: What is the time complexity of a loop over n items, with a dict lookup inside?
- [ ] O(n²)
- [x] O(n)
- [ ] O(log n)
> The loop is O(n). Each dict lookup is O(1). n × 1 = O(n).
Q: About how many steps does binary search need for 1 billion sorted items?
- [ ] 1,000
- [x] 30
- [ ] 1,000,000
> log₂(10⁹) ≈ 30.
Q: What is the complexity of `x in my_list`?
- [ ] O(1)
- [x] O(n)
- [ ] O(log n)
> A list must check each item. Use a set for O(1) membership.
Q: Which is the Big-O of 5n + n log n + 200?
- [ ] O(n)
- [x] O(n log n)
- [ ] O(200)
> Keep the fastest-growing term.
:::

:::cards Big-O
O(log n) example :: Binary search: each step halves what is left. 1 million items take about 20 steps.
Dict / set lookup :: O(1) on average.
Sorting :: O(n log n).
Nested loop over the same list :: O(n²).
log₂ of 1,000,000 :: About 20 (2^10 ≈ 1,000).
:::
