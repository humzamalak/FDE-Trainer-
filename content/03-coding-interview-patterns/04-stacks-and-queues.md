# Pattern: stacks and queues
<!-- minutes: 45 -->

- **Stack**: last in, first out (LIFO). Like a pile of plates, or the call stack. In Python: a list with `append()` and `pop()`.
- **Queue**: first in, first out (FIFO). Like a Slurm queue. In Python: `collections.deque` with `append()` and `popleft()` (both $O(1)$). Do not use `list.pop(0)`: it is $O(n)$.

```python
from collections import deque

q = deque()
q.append("job1")
q.append("job2")
q.popleft()  # "job1"
```

## When to use a stack

- Matching brackets: `( [ { } ] )`, or HTML/XML tags.
- "Undo" history.
- Evaluating expressions.
- **Monotonic stack**: "next greater element", "days until warmer". Keep a stack of items still waiting for an answer.

```python
def next_greater(nums):
    result = [-1] * len(nums)
    stack = []  # indexes still waiting
    for i, x in enumerate(nums):
        while stack and nums[stack[-1]] < x:
            result[stack.pop()] = x
        stack.append(i)
    return result
```

:::exercise Valid brackets
Return `True` if every bracket is closed in the right order. Brackets: `()`, `[]`, `{}`. Ignore other characters.
--- starter ---
def is_valid(s):
    pass
--- tests ---
assert is_valid("()[]{}") is True
assert is_valid("([{}])") is True
assert is_valid("(]") is False
assert is_valid("([)]") is False
assert is_valid("((") is False
assert is_valid("f(x[0]) + {a: 1}") is True
assert is_valid(")") is False
--- solution ---
def is_valid(s):
    pairs = {")": "(", "]": "[", "}": "{"}
    stack = []
    for ch in s:
        if ch in "([{":
            stack.append(ch)
        elif ch in pairs:
            if not stack or stack.pop() != pairs[ch]:
                return False
    return not stack
:::

:::exercise Simplify a path
Simplify a Unix path. `.` means this folder, `..` means the parent, repeated `/` count as one. The result starts with `/` and has no trailing `/`.
--- starter ---
def simplify_path(path):
    pass
--- tests ---
assert simplify_path("/home/") == "/home"
assert simplify_path("/a/./b/../../c/") == "/c"
assert simplify_path("/../") == "/"
assert simplify_path("/home//humza/./code") == "/home/humza/code"
--- solution ---
def simplify_path(path):
    stack = []
    for part in path.split("/"):
        if part in ("", "."):
            continue
        if part == "..":
            if stack:
                stack.pop()
        else:
            stack.append(part)
    return "/" + "/".join(stack)
:::

:::exercise Days until warmer
For each day, return how many days you wait for a warmer temperature, or 0 if none. Use a monotonic stack for $O(n)$.
--- starter ---
def daily_temperatures(temps):
    pass
--- tests ---
assert daily_temperatures([73, 74, 75, 71, 69, 72, 76, 73]) == [1, 1, 4, 2, 1, 1, 0, 0]
assert daily_temperatures([30, 60, 90]) == [1, 1, 0]
assert daily_temperatures([90, 80]) == [0, 0]
--- solution ---
def daily_temperatures(temps):
    result = [0] * len(temps)
    stack = []
    for i, t in enumerate(temps):
        while stack and temps[stack[-1]] < t:
            j = stack.pop()
            result[j] = i - j
        stack.append(i)
    return result
:::

:::quiz
Q: Which is the correct O(1) way to take from the front of a queue in Python?
- [ ] list.pop(0)
- [x] collections.deque().popleft()
- [ ] list.remove(list[0])
:::
