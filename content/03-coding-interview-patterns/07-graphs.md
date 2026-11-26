# Pattern: graphs (BFS, DFS, topological sort)
<!-- minutes: 60 -->

A graph is **nodes** joined by **edges**. You already work with graphs: network topologies, service dependencies, Ansible role dependencies, Terraform's resource graph, Slurm job dependencies.

## Represent a graph as an adjacency list

```python
graph = {
    "vpc": ["subnet"],
    "subnet": ["ec2", "rds"],
    "ec2": [],
    "rds": [],
}
```

## BFS: shortest path in steps

```python
from collections import deque


def shortest_steps(graph, start, goal):
    queue = deque([(start, 0)])
    seen = {start}
    while queue:
        node, dist = queue.popleft()
        if node == goal:
            return dist
        for nxt in graph.get(node, []):
            if nxt not in seen:
                seen.add(nxt)
                queue.append((nxt, dist + 1))
    return -1
```

Always keep a `seen` set, or cycles make you loop forever.

## DFS: explore everything reachable

Use DFS to count connected parts ("islands"), to find whether a path exists, or to detect cycles.

## Grids are graphs

A 2D grid: each cell's neighbours are up, down, left, right.

```python
for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
    r2, c2 = r + dr, c + dc
    if 0 <= r2 < rows and 0 <= c2 < cols:
        ...
```

## Topological sort: an order that respects dependencies

"Install packages so that every dependency comes first." Kahn's algorithm:

1. Count incoming edges for each node.
2. Start with nodes that have 0 incoming.
3. Take one, add it to the order, reduce the count of its neighbours. When a neighbour reaches 0, add it.
4. If not every node is in the order, there is a **cycle**.

Complexity of BFS/DFS/topo sort: $O(V + E)$ (nodes + edges).

:::exercise Shortest path in hops
Return the fewest edges from `start` to `goal`, or `-1` if there is no path. The graph is a dict of node → list of neighbours.
--- starter ---
from collections import deque

def shortest_steps(graph, start, goal):
    pass
--- tests ---
g = {"a": ["b", "c"], "b": ["d"], "c": ["d"], "d": ["e"], "e": [], "x": []}
assert shortest_steps(g, "a", "e") == 3
assert shortest_steps(g, "a", "a") == 0
assert shortest_steps(g, "a", "x") == -1
cyc = {"a": ["b"], "b": ["a", "c"], "c": []}
assert shortest_steps(cyc, "a", "c") == 2
--- solution ---
from collections import deque

def shortest_steps(graph, start, goal):
    queue = deque([(start, 0)])
    seen = {start}
    while queue:
        node, dist = queue.popleft()
        if node == goal:
            return dist
        for nxt in graph.get(node, []):
            if nxt not in seen:
                seen.add(nxt)
                queue.append((nxt, dist + 1))
    return -1
:::

:::exercise Number of islands
`grid` is a list of strings of `"1"` (land) and `"0"` (water). Count the islands (land cells joined up/down/left/right).
--- starter ---
def num_islands(grid):
    pass
--- tests ---
assert num_islands(["11000", "11000", "00100", "00011"]) == 3
assert num_islands(["111", "010", "111"]) == 1
assert num_islands(["000"]) == 0
assert num_islands([]) == 0
--- solution ---
def num_islands(grid):
    if not grid:
        return 0
    rows, cols = len(grid), len(grid[0])
    seen = set()

    def flood(r, c):
        stack = [(r, c)]
        while stack:
            r, c = stack.pop()
            if (r, c) in seen or not (0 <= r < rows and 0 <= c < cols) or grid[r][c] != "1":
                continue
            seen.add((r, c))
            stack.extend([(r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)])

    count = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == "1" and (r, c) not in seen:
                flood(r, c)
                count += 1
    return count
:::

:::exercise Deployment order
`deps` is a dict of service → list of services it **depends on** (they must deploy first). Return a valid deploy order. When several services are ready at the same time, take them in alphabetical order. If there is a cycle, raise `ValueError`.
--- starter ---
def deploy_order(deps):
    pass
--- tests ---
deps = {"app": ["db", "cache"], "db": ["network"], "cache": ["network"], "network": []}
assert deploy_order(deps) == ["network", "cache", "db", "app"]
assert deploy_order({}) == []
try:
    deploy_order({"a": ["b"], "b": ["a"]})
    ok = False
except ValueError:
    ok = True
assert ok
--- solution ---
import heapq

def deploy_order(deps):
    nodes = set(deps)
    for ds in deps.values():
        nodes.update(ds)
    incoming = {n: 0 for n in nodes}
    users = {n: [] for n in nodes}
    for svc, ds in deps.items():
        for d in ds:
            incoming[svc] += 1
            users[d].append(svc)
    ready = [n for n in nodes if incoming[n] == 0]
    heapq.heapify(ready)
    order = []
    while ready:
        n = heapq.heappop(ready)
        order.append(n)
        for u in users[n]:
            incoming[u] -= 1
            if incoming[u] == 0:
                heapq.heappush(ready, u)
    if len(order) != len(nodes):
        raise ValueError("dependency cycle")
    return order
:::

:::quiz
Q: Which search finds the shortest path when every edge has the same cost?
- [x] BFS
- [ ] DFS
- [ ] Binary search
> BFS explores in order of distance, so the first time it reaches the goal is the shortest.
Q: Topological sort on a graph with a cycle…
- [ ] returns any order
- [x] cannot include every node, so you detect the cycle
- [ ] loops forever
:::
