# Pattern: recursion and trees
<!-- minutes: 60 -->

## Recursion

A recursive function calls itself on a **smaller** problem. It needs:

1. A **base case** that stops (e.g. empty input).
2. A **recursive case** that moves towards the base case.

```python
def total_size(folder):
    """folder = {"files": [sizes...], "subfolders": [folders...]}"""
    size = sum(folder["files"])
    for sub in folder["subfolders"]:
        size += total_size(sub)  # same problem, smaller input
    return size
```

Like `du -s`: the size of a folder is its files plus the size of each subfolder.

## Trees

A tree is nodes with children and no cycles: folder trees, org charts, JSON documents, the DOM. A **binary tree** has at most 2 children (`left`, `right`).

```python
class Node:
    def __init__(self, val, left=None, right=None):
        self.val, self.left, self.right = val, left, right


def max_depth(node):
    if node is None:
        return 0
    return 1 + max(max_depth(node.left), max_depth(node.right))
```

**Depth-first search (DFS)** goes down one branch fully first (recursion or a stack). **Breadth-first search (BFS)** goes level by level (a queue).

A **binary search tree (BST)**: everything left is smaller, everything right is bigger. Lookup is $O(\log n)$ if balanced.

## Backtracking

To generate all combinations: choose, recurse, un-choose.

```python
def subsets(items):
    result = []

    def go(i, current):
        if i == len(items):
            result.append(current[:])
            return
        go(i + 1, current)  # skip items[i]
        current.append(items[i])
        go(i + 1, current)  # take items[i]
        current.pop()  # undo

    go(0, [])
    return result
```

Python's default recursion limit is about 1000. For very deep data, use an explicit stack.

:::exercise Total size of a folder tree
Write `total_size(folder)`. A folder is a dict with `"files"` (a list of sizes) and `"subfolders"` (a list of folders).
--- starter ---
def total_size(folder):
    pass
--- tests ---
tree = {"files": [10, 20], "subfolders": [{"files": [5], "subfolders": []}, {"files": [], "subfolders": [{"files": [1, 1], "subfolders": []}]}]}
assert total_size(tree) == 37
assert total_size({"files": [], "subfolders": []}) == 0
--- solution ---
def total_size(folder):
    return sum(folder["files"]) + sum(total_size(sub) for sub in folder["subfolders"])
:::

:::exercise Maximum depth of a binary tree
Write `max_depth(node)` using the `Node` class. An empty tree (`None`) has depth 0.
--- starter ---
class Node:
    def __init__(self, val, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def max_depth(node):
    pass
--- tests ---
t = Node(3, Node(9), Node(20, Node(15), Node(7, Node(1))))
assert max_depth(t) == 4
assert max_depth(None) == 0
assert max_depth(Node(1)) == 1
--- solution ---
class Node:
    def __init__(self, val, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def max_depth(node):
    if node is None:
        return 0
    return 1 + max(max_depth(node.left), max_depth(node.right))
:::

:::exercise Level order traversal (BFS)
Return the values level by level: a list of lists. Use `collections.deque`.
--- starter ---
from collections import deque

class Node:
    def __init__(self, val, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def levels(root):
    pass
--- tests ---
t = Node(3, Node(9), Node(20, Node(15), Node(7)))
assert levels(t) == [[3], [9, 20], [15, 7]]
assert levels(None) == []
--- solution ---
from collections import deque

class Node:
    def __init__(self, val, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def levels(root):
    if root is None:
        return []
    result = []
    queue = deque([root])
    while queue:
        level = []
        for _ in range(len(queue)):
            node = queue.popleft()
            level.append(node.val)
            if node.left:
                queue.append(node.left)
            if node.right:
                queue.append(node.right)
        result.append(level)
    return result
:::

:::exercise Validate a binary search tree
Return `True` if the tree is a valid BST: every value in the left subtree is smaller than the node, and every value in the right subtree is bigger. Hint: pass down the allowed `(low, high)` range.
--- starter ---
class Node:
    def __init__(self, val, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def is_bst(node, low=float("-inf"), high=float("inf")):
    pass
--- tests ---
assert is_bst(Node(2, Node(1), Node(3))) is True
assert is_bst(Node(5, Node(1), Node(4, Node(3), Node(6)))) is False
assert is_bst(Node(5, Node(4), Node(6, Node(3), Node(7)))) is False
assert is_bst(None) is True
--- solution ---
class Node:
    def __init__(self, val, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def is_bst(node, low=float("-inf"), high=float("inf")):
    if node is None:
        return True
    if not (low < node.val < high):
        return False
    return is_bst(node.left, low, node.val) and is_bst(node.right, node.val, high)
:::

:::exercise All subsets
Return all subsets of `items`. Sort each subset and sort the result list so the answer is predictable.
--- starter ---
def subsets(items):
    pass
--- tests ---
assert subsets([1, 2, 3]) == [[], [1], [1, 2], [1, 2, 3], [1, 3], [2], [2, 3], [3]]
assert subsets([]) == [[]]
--- solution ---
def subsets(items):
    result = []
    def go(i, current):
        if i == len(items):
            result.append(sorted(current))
            return
        go(i + 1, current)
        current.append(items[i])
        go(i + 1, current)
        current.pop()
    go(0, [])
    return sorted(result)
:::

:::quiz
Q: What happens if a recursive function has no base case?
- [ ] It returns None
- [x] It recurses until Python raises RecursionError
- [ ] It runs once
:::
