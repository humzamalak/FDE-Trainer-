# Tries, union-find and grids
<!-- order: 7.5 -->
<!-- minutes: 55 -->

Three structures that appear in Medium problems and in real work.

## Tries (prefix trees)

A trie stores words character by character. All words that start with the same prefix share a path. Use it for **autocomplete**, prefix search and word games. Looking up a word of length $k$ takes $O(k)$, whatever the number of words.

```python
trie = {}
for word in ["car", "cat"]:
    node = trie
    for ch in word:
        node = node.setdefault(ch, {})
    node["$"] = True        # marks the end of a word
# trie == {"c": {"a": {"r": {"$": True}, "t": {"$": True}}}}
```

## Union-find (disjoint set)

Union-find keeps track of **groups** that merge over time: "are these two records the same customer?", "are these two servers in the same network?". Two operations, both almost $O(1)$ with path compression:

- `find(x)`: the representative (root) of x's group.
- `union(a, b)`: merge the two groups.

```python
parent = {}
def find(x):
    parent.setdefault(x, x)
    if parent[x] != x:
        parent[x] = find(parent[x])   # path compression
    return parent[x]
def union(a, b):
    parent[find(a)] = find(b)
```

## Grids (matrices)

A grid is a graph: each cell is a node, and its neighbours are up, down, left and right. "Count the islands", "shortest path in a maze" and "flood fill" are BFS or DFS on a grid.

```python
DIRS = [(1, 0), (-1, 0), (0, 1), (0, -1)]
for dr, dc in DIRS:
    nr, nc = r + dr, c + dc
    if 0 <= nr < rows and 0 <= nc < cols:
        ...
```

:::exercise Autocomplete with a trie
Write a class `Trie` with `add(word)` and `complete(prefix)`. `complete` returns all added words that start with `prefix`, sorted alphabetically.
--- starter ---
class Trie:
    def __init__(self):
        self.words = []

    def add(self, word):
        self.words.append(word)

    def complete(self, prefix):
        return []
--- tests ---
t = Trie()
for w in ["cat", "car", "cart", "dog", "care"]:
    t.add(w)
assert t.complete("car") == ["car", "care", "cart"]
assert t.complete("c") == ["car", "care", "cart", "cat"]
assert t.complete("x") == []
assert t.complete("") == ["car", "care", "cart", "cat", "dog"]
--- solution ---
class Trie:
    def __init__(self):
        self.root = {}

    def add(self, word):
        node = self.root
        for ch in word:
            node = node.setdefault(ch, {})
        node["$"] = True

    def complete(self, prefix):
        node = self.root
        for ch in prefix:
            if ch not in node:
                return []
            node = node[ch]
        found = []

        def walk(n, path):
            for key in sorted(n):
                if key == "$":
                    found.append(prefix + path)
                else:
                    walk(n[key], path + key)

        walk(node, "")
        return sorted(found)
:::

:::exercise Merge duplicate customer records
A customer has records from three systems. Each pair in `links` says "these two record IDs are the same person" (for example they share an email). Write `groups(ids, links)` that returns the groups of IDs as a list of sorted lists, sorted by their first ID. Use union-find.
--- starter ---
def groups(ids, links):
    return [[i] for i in sorted(ids)]
--- tests ---
ids = ["a1", "a2", "b1", "b2", "c1"]
links = [("a1", "b1"), ("b1", "c1"), ("a2", "b2")]
assert groups(ids, links) == [["a1", "b1", "c1"], ["a2", "b2"]]
assert groups(["x"], []) == [["x"]]
assert groups(["p", "q", "r"], [("p", "q"), ("q", "p")]) == [["p", "q"], ["r"]]
--- solution ---
def groups(ids, links):
    parent = {i: i for i in ids}

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]  # path halving
            x = parent[x]
        return x

    for a, b in links:
        parent[find(a)] = find(b)
    by_root = {}
    for i in ids:
        by_root.setdefault(find(i), []).append(i)
    return sorted(sorted(g) for g in by_root.values())
:::

:::exercise Count the islands
`grid` is a list of strings; `"#"` is land and `"."` is water. Land cells that touch up, down, left or right are one island. Write `islands(grid)` that returns the number of islands.
--- starter ---
def islands(grid):
    return sum(row.count("#") for row in grid)
--- tests ---
g = [
    "##..#",
    "#...#",
    "..#..",
    ".....",
    "##.##",
]
assert islands(g) == 5
assert islands([]) == 0
assert islands(["...", "..."]) == 0
assert islands(["###", "#.#", "###"]) == 1
--- solution ---
def islands(grid):
    rows = len(grid)
    cols = len(grid[0]) if rows else 0
    seen = set()
    count = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == "#" and (r, c) not in seen:
                count += 1
                stack = [(r, c)]
                seen.add((r, c))
                while stack:  # DFS with a stack: no recursion limit on big grids
                    cr, cc = stack.pop()
                    for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        nr, nc = cr + dr, cc + dc
                        if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == "#" and (nr, nc) not in seen:
                            seen.add((nr, nc))
                            stack.append((nr, nc))
    return count
:::

:::quiz
Q: Which structure answers "are record A and record Z the same customer?" after many merges?
- [ ] A trie
- [x] Union-find
- [ ] A heap
Q: A trie lookup for a word of length k costs…
- [x] O(k), whatever the number of stored words
- [ ] O(number of words)
:::

:::cards Tries, union-find, grids
Trie use cases :: Autocomplete, prefix search, spell checking.
Union-find operations :: find(x) returns the group root; union(a, b) merges two groups. Path compression makes both almost O(1).
Grid as a graph :: Each cell is a node; neighbours are the 4 (or 8) adjacent cells. Use BFS or DFS.
:::
