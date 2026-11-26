# Linked lists
<!-- order: 4.5 -->
<!-- minutes: 40 -->

A linked list is a chain of nodes. Each node holds a value and a pointer to the next node. Python has no built-in linked list (a `list` is an array), so interviewers use them to test **pointer thinking**: keeping track of several references while you change the structure.

```python
class Node:
    def __init__(self, val, next=None):
        self.val = val
        self.next = next

# 1 -> 2 -> 3
head = Node(1, Node(2, Node(3)))
node = head
while node:            # the standard loop
    print(node.val)
    node = node.next
```

## The patterns

- **Dummy head.** Create `dummy = Node(0, head)` so that removing the first node is not a special case. Return `dummy.next`.
- **Two pointers, slow and fast.** `slow` moves 1 step, `fast` moves 2. When `fast` reaches the end, `slow` is in the middle. If there is a cycle, they meet.
- **Reverse in place** with three variables: `prev`, `node`, `next`.

| Operation | Array (Python list) | Linked list |
|---|---|---|
| Read item *i* | $O(1)$ | $O(i)$ |
| Insert at the front | $O(n)$ | $O(1)$ |
| Insert after a node you have | $O(n)$ | $O(1)$ |

Real-world use: LRU caches (a hash map plus a doubly linked list), queues, undo history.

Helpers for the exercises (already included in each starter): `build([1, 2, 3])` makes a list, `to_list(head)` turns it back into a Python list.

:::exercise Reverse a linked list
Write `reverse(head)` that reverses the list in place and returns the new head. Use $O(1)$ extra memory.
--- starter ---
class Node:
    def __init__(self, val, next=None):
        self.val, self.next = val, next

def build(values):
    head = None
    for v in reversed(values):
        head = Node(v, head)
    return head

def to_list(head):
    out = []
    while head:
        out.append(head.val)
        head = head.next
    return out

def reverse(head):
    pass
--- tests ---
assert to_list(reverse(build([1, 2, 3, 4]))) == [4, 3, 2, 1]
assert to_list(reverse(build([7]))) == [7]
assert reverse(None) is None
--- solution ---
class Node:
    def __init__(self, val, next=None):
        self.val, self.next = val, next

def build(values):
    head = None
    for v in reversed(values):
        head = Node(v, head)
    return head

def to_list(head):
    out = []
    while head:
        out.append(head.val)
        head = head.next
    return out

def reverse(head):
    prev = None
    node = head
    while node:
        nxt = node.next   # remember the rest of the list
        node.next = prev  # turn this pointer around
        prev, node = node, nxt
    return prev
:::

:::exercise Middle node and cycle check
Write `middle(head)` that returns the value of the middle node (for an even length, the second of the two middle nodes), and `has_cycle(head)` that returns `True` if following `next` ever comes back to an earlier node. Use slow and fast pointers.
--- starter ---
class Node:
    def __init__(self, val, next=None):
        self.val, self.next = val, next

def build(values):
    head = None
    for v in reversed(values):
        head = Node(v, head)
    return head

def middle(head):
    pass

def has_cycle(head):
    pass
--- tests ---
assert middle(build([1, 2, 3, 4, 5])) == 3
assert middle(build([1, 2, 3, 4])) == 3
assert middle(build([9])) == 9
h = build([1, 2, 3, 4])
assert has_cycle(h) is False
h.next.next.next.next = h.next  # 4 points back to 2
assert has_cycle(h) is True
assert has_cycle(None) is False
--- solution ---
class Node:
    def __init__(self, val, next=None):
        self.val, self.next = val, next

def build(values):
    head = None
    for v in reversed(values):
        head = Node(v, head)
    return head

def middle(head):
    slow = fast = head
    while fast and fast.next:
        slow, fast = slow.next, fast.next.next
    return slow.val

def has_cycle(head):
    slow = fast = head
    while fast and fast.next:
        slow, fast = slow.next, fast.next.next
        if slow is fast:
            return True
    return False
:::

:::exercise Merge two sorted lists
Write `merge(a, b)` that merges two sorted linked lists into one sorted list and returns its head. Reuse the nodes; use a dummy head.
--- starter ---
class Node:
    def __init__(self, val, next=None):
        self.val, self.next = val, next

def build(values):
    head = None
    for v in reversed(values):
        head = Node(v, head)
    return head

def to_list(head):
    out = []
    while head:
        out.append(head.val)
        head = head.next
    return out

def merge(a, b):
    pass
--- tests ---
assert to_list(merge(build([1, 3, 5]), build([2, 4, 6, 8]))) == [1, 2, 3, 4, 5, 6, 8]
assert to_list(merge(None, build([1]))) == [1]
assert to_list(merge(build([1, 1]), build([1]))) == [1, 1, 1]
assert merge(None, None) is None
--- solution ---
class Node:
    def __init__(self, val, next=None):
        self.val, self.next = val, next

def build(values):
    head = None
    for v in reversed(values):
        head = Node(v, head)
    return head

def to_list(head):
    out = []
    while head:
        out.append(head.val)
        head = head.next
    return out

def merge(a, b):
    dummy = tail = Node(0)
    while a and b:
        if a.val <= b.val:
            tail.next, a = a, a.next
        else:
            tail.next, b = b, b.next
        tail = tail.next
    tail.next = a or b  # one list is empty; attach the rest of the other
    return dummy.next
:::

:::quiz
Q: Why use a dummy head node?
- [x] So that changing the first node is not a special case
- [ ] To make the list faster
Q: What is the time to read the 1,000th item of a linked list?
- [ ] O(1)
- [x] O(n): you must follow 1,000 pointers
:::

:::cards Linked lists
Reverse a linked list :: prev = None; loop: nxt = node.next; node.next = prev; prev, node = node, nxt. Return prev.
Find the middle :: slow moves 1, fast moves 2; when fast ends, slow is in the middle.
Detect a cycle :: Slow and fast pointers meet if and only if there is a cycle (Floyd's algorithm).
LRU cache structure :: A hash map from key to node, plus a doubly linked list in order of use.
:::
