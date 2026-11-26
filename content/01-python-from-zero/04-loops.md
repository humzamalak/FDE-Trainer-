# Loops
<!-- minutes: 45 -->

A loop repeats code. Python has two loops: `for` and `while`.

## for: do something for each item

```python
servers = ["web-01", "web-02", "db-01"]
for server in servers:
    print(f"Checking {server}")
```

## range: count

```python
for i in range(5):  # 0, 1, 2, 3, 4
    print(i)
range(2, 10, 2)  # 2, 4, 6, 8   (start, stop, step)
```

`range` stops **before** the stop value. Same rule as slices.

## enumerate: index and item together

```python
for i, server in enumerate(servers):
    print(i, server)  # 0 web-01, 1 web-02, ...
```

## The accumulator pattern

Most loop problems use this pattern: start with an empty result, update it in the loop, return it.

```python
def total_cost(costs):
    total = 0  # 1. start value
    for c in costs:
        total += c  # 2. update
    return total  # 3. result
```

## while: repeat until a condition changes

```python
attempts = 0
while attempts < 3:
    attempts += 1
    print("retry", attempts)
```

A `while` loop needs something that changes, or it runs forever. (This app stops code after 8 seconds.)

## break and continue

- `break` exits the loop now.
- `continue` skips to the next item.

```python
for line in lines:
    if line.startswith("#"):
        continue  # skip comments
    if line == "END":
        break  # stop reading
```

:::exercise Sum of even numbers
Write `sum_even(nums)` that returns the sum of the even numbers in the list. Use a `for` loop and the accumulator pattern (do not use `sum()` yet).
--- starter ---
def sum_even(nums):
    pass
--- tests ---
assert sum_even([1, 2, 3, 4]) == 6
assert sum_even([1, 3, 5]) == 0
assert sum_even([]) == 0
assert sum_even([-2, 10]) == 8
--- solution ---
def sum_even(nums):
    total = 0
    for n in nums:
        if n % 2 == 0:
            total += n
    return total
:::

:::exercise Find the maximum
Write `find_max(nums)` that returns the largest number. **Do not use `max()`.** If the list is empty, return `None`.

Hint: start with the first item as your "best so far".
--- starter ---
def find_max(nums):
    pass
--- tests ---
assert find_max([3, 9, 2]) == 9
assert find_max([-5, -1, -9]) == -1
assert find_max([7]) == 7
assert find_max([]) is None
--- solution ---
def find_max(nums):
    if not nums:
        return None
    best = nums[0]
    for n in nums[1:]:
        if n > best:
            best = n
    return best
:::

:::exercise Retry with backoff
A retry policy waits longer after each failure: 1 second, then 2, then 4, and so on (it doubles). There is a maximum wait.

Write `backoff_delays(retries, max_delay)` that returns a list of wait times.

`backoff_delays(5, 10)` → `[1, 2, 4, 8, 10]`
--- starter ---
def backoff_delays(retries, max_delay):
    pass
--- tests ---
assert backoff_delays(5, 10) == [1, 2, 4, 8, 10]
assert backoff_delays(3, 100) == [1, 2, 4]
assert backoff_delays(0, 10) == []
assert backoff_delays(4, 3) == [1, 2, 3, 3]
--- solution ---
def backoff_delays(retries, max_delay):
    delays = []
    delay = 1
    for _ in range(retries):
        delays.append(min(delay, max_delay))
        delay *= 2
    return delays
:::

:::exercise Count the vowels
Write `count_vowels(text)` that returns how many vowels (a, e, i, o, u, upper or lower case) are in the text.
--- starter ---
def count_vowels(text):
    pass
--- tests ---
assert count_vowels("hello") == 2
assert count_vowels("AWS") == 1
assert count_vowels("rhythm") == 0
assert count_vowels("Queue") == 4
--- solution ---
def count_vowels(text):
    count = 0
    for ch in text.lower():
        if ch in "aeiou":
            count += 1
    return count
:::

:::quiz
Q: What does `list(range(1, 4))` give?
- [ ] [1, 2, 3, 4]
- [x] [1, 2, 3]
- [ ] [0, 1, 2, 3]
> range stops before the stop value.
Q: What does `continue` do?
- [ ] Ends the loop
- [x] Skips the rest of this pass and goes to the next item
- [ ] Restarts the loop from the beginning
> break ends the loop; continue skips one pass.
:::
