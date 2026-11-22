# Patterns: two pointers and sliding window
<!-- minutes: 60 -->

## Two pointers

Use two indexes that move towards each other (or in the same direction). Often works on **sorted** data and gives $O(n)$ time and $O(1)$ space.

```python
def pair_sum_sorted(nums, target):
    left, right = 0, len(nums) - 1
    while left < right:
        s = nums[left] + nums[right]
        if s == target:
            return [left, right]
        if s < target:
            left += 1        # need a bigger sum
        else:
            right -= 1       # need a smaller sum
    return []
```

## Sliding window

For "the best contiguous substring/subarray". Keep a window `[left, right]`. Grow it on the right. Shrink it from the left when it breaks a rule. Each item enters and leaves once: $O(n)$.

```python
def longest_unique(s):
    last_seen = {}
    left = best = 0
    for right, ch in enumerate(s):
        if ch in last_seen and last_seen[ch] >= left:
            left = last_seen[ch] + 1     # jump past the repeat
        last_seen[ch] = right
        best = max(best, right - left + 1)
    return best
```

A real use: "find the busiest 5-minute window in the logs".

:::exercise Valid palindrome (two pointers)
Return `True` if `s` is a palindrome when you keep only letters and digits and ignore case. Use two pointers, not `[::-1]`. Hint: `ch.isalnum()`.
--- starter ---
def is_palindrome(s):
    pass
--- tests ---
assert is_palindrome("A man, a plan, a canal: Panama") is True
assert is_palindrome("race a car") is False
assert is_palindrome(" ") is True
assert is_palindrome("0P") is False
--- solution ---
def is_palindrome(s):
    left, right = 0, len(s) - 1
    while left < right:
        if not s[left].isalnum():
            left += 1
        elif not s[right].isalnum():
            right -= 1
        elif s[left].lower() != s[right].lower():
            return False
        else:
            left += 1
            right -= 1
    return True
:::

:::exercise Container with most water
`heights[i]` is the height of a line at position `i`. Two lines and the x-axis make a container. Return the largest area: `min(h[i], h[j]) * (j - i)`. Do it in $O(n)$: move the pointer with the shorter line.
--- starter ---
def max_area(heights):
    pass
--- tests ---
assert max_area([1, 8, 6, 2, 5, 4, 8, 3, 7]) == 49
assert max_area([1, 1]) == 1
assert max_area([4, 3, 2, 1, 4]) == 16
--- solution ---
def max_area(heights):
    left, right = 0, len(heights) - 1
    best = 0
    while left < right:
        best = max(best, min(heights[left], heights[right]) * (right - left))
        if heights[left] < heights[right]:
            left += 1
        else:
            right -= 1
    return best
:::

:::exercise Longest substring without repeats
Return the length of the longest substring with no repeated characters.
--- starter ---
def longest_unique(s):
    pass
--- tests ---
assert longest_unique("abcabcbb") == 3
assert longest_unique("bbbbb") == 1
assert longest_unique("pwwkew") == 3
assert longest_unique("") == 0
assert longest_unique("abba") == 2
--- solution ---
def longest_unique(s):
    last_seen = {}
    left = best = 0
    for right, ch in enumerate(s):
        if ch in last_seen and last_seen[ch] >= left:
            left = last_seen[ch] + 1
        last_seen[ch] = right
        best = max(best, right - left + 1)
    return best
:::

:::exercise Busiest window
`timestamps` is a **sorted** list of request times in seconds. Return the largest number of requests inside any window of `width` seconds (a window `[t, t + width)` that starts at a request time).
--- starter ---
def busiest_window(timestamps, width):
    pass
--- tests ---
assert busiest_window([1, 2, 3, 10, 11, 12, 13], 5) == 4
assert busiest_window([0, 100, 200], 10) == 1
assert busiest_window([], 10) == 0
assert busiest_window([5, 5, 5, 6], 1) == 3
--- solution ---
def busiest_window(timestamps, width):
    best = 0
    left = 0
    for right, t in enumerate(timestamps):
        while t - timestamps[left] >= width:
            left += 1
        best = max(best, right - left + 1)
    return best
:::

:::exercise Best time to buy and sell
`prices[i]` is the price on day `i`. Buy once and sell later once. Return the maximum profit, or 0. One pass: track the lowest price so far.
--- starter ---
def max_profit(prices):
    pass
--- tests ---
assert max_profit([7, 1, 5, 3, 6, 4]) == 5
assert max_profit([7, 6, 4, 3, 1]) == 0
assert max_profit([]) == 0
--- solution ---
def max_profit(prices):
    lowest = float("inf")
    best = 0
    for p in prices:
        lowest = min(lowest, p)
        best = max(best, p - lowest)
    return best
:::

:::quiz
Q: Why is the sliding window O(n) even though it has a loop inside a loop?
- [x] Each element enters the window once and leaves once, so the total work is 2n
- [ ] Because the inner loop is a while loop
- [ ] It is not O(n)
:::
