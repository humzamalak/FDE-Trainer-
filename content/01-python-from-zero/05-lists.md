# Lists and tuples
<!-- minutes: 45 -->

A **list** is an ordered collection that can change.

```python
nodes = ["gpu-01", "gpu-02"]
nodes.append("gpu-03")        # add at the end
nodes.insert(0, "login-01")   # add at a position
nodes.remove("gpu-02")        # remove by value
last = nodes.pop()            # remove and return the last item
len(nodes)                    # how many items
"gpu-01" in nodes             # True
nodes[0], nodes[-1]           # first, last
nodes[1:3]                    # slice: a new list
```

## Sorting

```python
nums = [5, 2, 9]
sorted(nums)                  # [2, 5, 9]  new list, nums is unchanged
nums.sort()                   # changes nums itself
sorted(nums, reverse=True)    # [9, 5, 2]
sorted(["b", "C", "a"], key=str.lower)  # sort by a rule
```

## List comprehensions

A short way to build a list. Read it as: "x times 2, for each x in nums, if x is positive".

```python
doubled = [x * 2 for x in nums if x > 0]

# Same as:
doubled = []
for x in nums:
    if x > 0:
        doubled.append(x * 2)
```

Use comprehensions for simple transforms. Use a normal loop when the logic is long.

## Tuples

A tuple is like a list but **cannot change**. Use it for fixed groups of values.

```python
point = (51.5, -0.12)
lat, lon = point        # unpacking
```

## A trap: lists are shared

```python
a = [1, 2]
b = a          # b is the SAME list, not a copy
b.append(3)
print(a)       # [1, 2, 3]
c = a.copy()   # a real copy
```

This is like two DNS names for one server: change the server and both names see the change.

:::exercise Filter healthy nodes
Each node is a tuple `(name, cpu_percent)`. Write `healthy(nodes, limit)` that returns a list of **names** where cpu is below `limit`. Keep the original order. Try a list comprehension.
--- starter ---
def healthy(nodes, limit):
    pass
--- tests ---
assert healthy([("a", 10), ("b", 95), ("c", 50)], 80) == ["a", "c"]
assert healthy([], 50) == []
assert healthy([("x", 80)], 80) == []
--- solution ---
def healthy(nodes, limit):
    return [name for name, cpu in nodes if cpu < limit]
:::

:::exercise Remove duplicates, keep order
Write `dedupe(items)` that removes duplicates but keeps the first appearance order.

`dedupe([3, 1, 3, 2, 1])` → `[3, 1, 2]`
--- starter ---
def dedupe(items):
    pass
--- tests ---
assert dedupe([3, 1, 3, 2, 1]) == [3, 1, 2]
assert dedupe([]) == []
assert dedupe(["a", "a"]) == ["a"]
--- solution ---
def dedupe(items):
    seen = set()
    result = []
    for item in items:
        if item not in seen:
            seen.add(item)
            result.append(item)
    return result
:::

:::exercise Chunk a list
Batch APIs often accept at most N items per call. Write `chunk(items, size)` that splits a list into smaller lists of `size` items. The last chunk can be smaller.

`chunk([1, 2, 3, 4, 5], 2)` → `[[1, 2], [3, 4], [5]]`

Hint: `range(0, len(items), size)` gives the start of each chunk.
--- starter ---
def chunk(items, size):
    pass
--- tests ---
assert chunk([1, 2, 3, 4, 5], 2) == [[1, 2], [3, 4], [5]]
assert chunk([1, 2, 3], 3) == [[1, 2, 3]]
assert chunk([], 4) == []
--- solution ---
def chunk(items, size):
    return [items[i:i + size] for i in range(0, len(items), size)]
:::

:::exercise Top three costs
Each item is `(service, cost)`. Write `top_three(items)` that returns the 3 most expensive service **names**, most expensive first.

Hint: `sorted(items, key=lambda pair: pair[1], reverse=True)`. A `lambda` is a small function without a name.
--- starter ---
def top_three(items):
    pass
--- tests ---
assert top_three([("ec2", 900), ("s3", 120), ("rds", 400), ("lambda", 15)]) == ["ec2", "rds", "s3"]
assert top_three([("a", 1)]) == ["a"]
--- solution ---
def top_three(items):
    ranked = sorted(items, key=lambda pair: pair[1], reverse=True)
    return [name for name, _ in ranked[:3]]
:::

:::quiz
Q: `a = [1]; b = a; b.append(2)`. What is `a`?
- [ ] [1]
- [x] [1, 2]
- [ ] Error
> b and a name the same list. Use a.copy() for a separate list.
Q: What is the difference between `sorted(x)` and `x.sort()`?
- [x] sorted returns a new list; x.sort() changes x and returns None
- [ ] They are identical
- [ ] sorted only works on numbers
> A common bug: y = x.sort() makes y equal to None.
:::
