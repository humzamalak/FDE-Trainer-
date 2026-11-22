# Classes and dataclasses
<!-- minutes: 50 -->

A **class** is a template that joins **data** and the **functions that work on that data** (methods). An **object** is one thing made from the template.

Analogy: a Terraform module is the class. Each `module "x" {}` block is an object.

```python
class Server:
    def __init__(self, name, cpus):
        self.name = name          # attributes: data on this object
        self.cpus = cpus
        self.jobs = []

    def submit(self, job):        # a method: self is "this object"
        self.jobs.append(job)

    def load(self):
        return len(self.jobs) / self.cpus

s = Server("gpu-01", 4)
s.submit("train")
s.load()      # 0.25
```

- `__init__` runs when you create the object.
- `self` is the object itself. Every method gets it first.

## Dataclasses

For classes that mostly hold data, use `@dataclass`. Python writes `__init__`, a readable print, and `==` for you.

```python
from dataclasses import dataclass, field

@dataclass
class Job:
    id: str
    gpus: int = 1
    tags: list[str] = field(default_factory=list)   # never use [] as a default directly

Job("j1") == Job("j1")   # True
```

## When to use a class

- Use a **function** when you transform input to output.
- Use a **class** when data and behaviour belong together and the object has **state** that changes (a queue, a client with a session, a rate limiter).

Do not make classes for everything. Interviewers like simple code.

## Special methods

`__repr__` controls how the object prints. `__len__` makes `len(obj)` work. `__eq__` controls `==`. Dataclasses make the common ones.

:::exercise A job queue
Write a class `JobQueue` with:
- `add(job_id, priority)` — add a job
- `next()` — remove and return the `job_id` with the **highest** priority. If two jobs have the same priority, return the one added first. Return `None` if empty.
- `__len__` — the number of jobs waiting

A simple list is fine. (Track 3 shows a faster way with a heap.)
--- starter ---
class JobQueue:
    def __init__(self):
        pass

    def add(self, job_id, priority):
        pass

    def next(self):
        pass

    def __len__(self):
        return 0
--- tests ---
q = JobQueue()
assert q.next() is None
q.add("a", 1)
q.add("b", 5)
q.add("c", 5)
assert len(q) == 3
assert q.next() == "b"
assert q.next() == "c"
assert q.next() == "a"
assert len(q) == 0
--- solution ---
class JobQueue:
    def __init__(self):
        self._jobs = []

    def add(self, job_id, priority):
        self._jobs.append((priority, job_id))

    def next(self):
        if not self._jobs:
            return None
        best = 0
        for i, (priority, _) in enumerate(self._jobs):
            if priority > self._jobs[best][0]:
                best = i
        return self._jobs.pop(best)[1]

    def __len__(self):
        return len(self._jobs)
:::

:::exercise A dataclass for budgets
Make a dataclass `Budget` with fields `project: str`, `limit: float` and `spent: float = 0.0`. Add:
- method `spend(amount)` that adds to `spent`
- method `remaining()` that returns `limit - spent`
- method `over()` that returns `True` if spent is more than limit
--- starter ---
from dataclasses import dataclass

class Budget:
    pass
--- tests ---
b = Budget("clear", 100)
assert b.spent == 0.0
b.spend(30)
b.spend(50)
assert b.remaining() == 20
assert b.over() is False
b.spend(25)
assert b.over() is True
assert Budget("x", 1) == Budget("x", 1)
--- solution ---
from dataclasses import dataclass

@dataclass
class Budget:
    project: str
    limit: float
    spent: float = 0.0

    def spend(self, amount):
        self.spent += amount

    def remaining(self):
        return self.limit - self.spent

    def over(self):
        return self.spent > self.limit
:::

:::exercise A token bucket rate limiter
APIs (including LLM APIs) limit how fast you call them. A **token bucket** has a `capacity`. Each call uses 1 token. Tokens refill at `rate` per second, up to `capacity`.

Write `TokenBucket(capacity, rate)` with `allow(now)` where `now` is the current time in seconds. It returns `True` and uses a token if one is available, otherwise `False`. The bucket starts full at time 0.
--- starter ---
class TokenBucket:
    def __init__(self, capacity, rate):
        pass

    def allow(self, now):
        pass
--- tests ---
b = TokenBucket(2, 1)
assert b.allow(0) is True
assert b.allow(0) is True
assert b.allow(0) is False
assert b.allow(0.5) is False
assert b.allow(1) is True
assert b.allow(10) is True
assert b.allow(10) is True
assert b.allow(10) is False
--- solution ---
class TokenBucket:
    def __init__(self, capacity, rate):
        self.capacity = capacity
        self.rate = rate
        self.tokens = capacity
        self.last = 0

    def allow(self, now):
        elapsed = now - self.last
        self.tokens = min(self.capacity, self.tokens + elapsed * self.rate)
        self.last = now
        if self.tokens >= 1:
            self.tokens -= 1
            return True
        return False
:::

:::quiz
Q: What is `self` in a method?
- [ ] The class
- [x] The object the method was called on
- [ ] A global variable
Q: Why `field(default_factory=list)` and not `tags: list = []`?
- [x] A [] default would be shared by every object
- [ ] [] is a syntax error
- [ ] It is faster
> Mutable defaults are created once and shared. This is a classic Python bug.
:::
