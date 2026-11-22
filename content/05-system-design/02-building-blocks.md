# Building blocks
<!-- minutes: 60 -->

You know most of these from infrastructure. Here is how to talk about them in a design round.

## Compute and traffic

- **Load balancer**: spreads requests across instances; health checks. L4 (TCP) vs L7 (HTTP, path routing).
- **Stateless services**: keep state in databases or caches, so any instance can serve any request. Then you can scale horizontally.
- **Autoscaling**: on CPU, queue depth, or requests. GPU workloads: scale on queue depth.

## Data stores

| Store | Use | Example |
|---|---|---|
| Relational (SQL) | structured data, transactions, joins | PostgreSQL |
| Key-value / document | simple lookups by key, flexible schema | DynamoDB, Redis, MongoDB |
| Object storage | files, documents, model weights, backups | S3 |
| Search | full-text, keyword, logs | OpenSearch |
| Vector | similarity search | pgvector, OpenSearch k-NN |
| Data warehouse | analytics over large data | Redshift, Snowflake, BigQuery |

**Default choice: PostgreSQL** (with pgvector for small/medium RAG). Change only with a reason.

## Caching

Cache results that are read often and change rarely. Patterns: cache-aside (read cache → miss → read DB → write cache). Always set a **TTL**. Hard part: invalidation. For LLMs: cache identical prompts, and use the provider's prompt caching.

## Asynchronous work: queues

Long tasks (document ingestion, batch LLM jobs, report generation) go into a **queue** (SQS, RabbitMQ, Kafka, or Slurm). Workers take jobs. Benefits: smooth spikes, retries, the API responds fast with a job ID. Handle failures with retries and a **dead-letter queue**. Make workers **idempotent**: processing the same message twice must not cause harm.

## Reliability

- **Timeouts** on every network call. **Retries** with exponential backoff and jitter, only for safe operations.
- **Circuit breaker**: stop calling a failing dependency for a while.
- **Rate limiting**: protect your service and the LLM budget.
- **Graceful degradation**: if the LLM is down, show search results without a generated answer.
- Availability maths: dependencies in series multiply (track 2).

## Observability

Logs (what happened), metrics (how much, how fast: RED = rate, errors, duration), traces (where the time went). For LLMs add: tokens, cost, retrieved chunks, eval scores, user feedback.

## Consistency (recognise the terms)

**CAP**: during a network partition, choose consistency or availability. **Eventual consistency**: replicas catch up later; fine for search indexes, not for payments.

:::exercise Idempotent consumer
A queue can deliver the same message twice. Write `process_all(messages, handler)` where each message is a dict with an `"id"`. Call `handler(message)` only once per id, even if the id appears again. Return the number of messages actually handled.
--- starter ---
def process_all(messages, handler):
    pass
--- tests ---
handled = []
msgs = [{"id": "m1", "v": 1}, {"id": "m2", "v": 2}, {"id": "m1", "v": 1}, {"id": "m3", "v": 3}, {"id": "m2", "v": 2}]
assert process_all(msgs, handled.append) == 3
assert [m["id"] for m in handled] == ["m1", "m2", "m3"]
assert process_all([], handled.append) == 0
--- solution ---
def process_all(messages, handler):
    seen = set()
    for m in messages:
        if m["id"] in seen:
            continue
        seen.add(m["id"])
        handler(m)
    return len(seen)
:::

:::exercise Cache with TTL
Write `TTLCache(ttl)` with `get(key, now)` and `set(key, value, now)`. `get` returns the value if it was set less than `ttl` seconds ago, otherwise `None` (and removes it).
--- starter ---
class TTLCache:
    def __init__(self, ttl):
        pass

    def get(self, key, now):
        pass

    def set(self, key, value, now):
        pass
--- tests ---
c = TTLCache(10)
c.set("a", 1, now=0)
assert c.get("a", now=5) == 1
assert c.get("a", now=10) is None
assert c.get("missing", now=0) is None
c.set("a", 2, now=20)
assert c.get("a", now=29) == 2
--- solution ---
class TTLCache:
    def __init__(self, ttl):
        self.ttl = ttl
        self.data = {}

    def get(self, key, now):
        item = self.data.get(key)
        if item is None:
            return None
        value, stored = item
        if now - stored >= self.ttl:
            del self.data[key]
            return None
        return value

    def set(self, key, value, now):
        self.data[key] = (value, now)
:::

:::exercise Circuit breaker
Write `CircuitBreaker(threshold, cooldown)` with `call(fn, now)`.
- If the circuit is **open** and `now` is less than `opened_at + cooldown`, raise `RuntimeError("circuit open")` without calling `fn`.
- Otherwise call `fn()`. On success, reset the failure count and close the circuit, and return the result.
- On an exception, add 1 to the failure count. If it reaches `threshold`, open the circuit (`opened_at = now`). Re-raise the exception.
--- starter ---
class CircuitBreaker:
    def __init__(self, threshold, cooldown):
        pass

    def call(self, fn, now):
        pass
--- tests ---
def fail():
    raise ValueError("down")
cb = CircuitBreaker(threshold=2, cooldown=30)
for t in (0, 1):
    try:
        cb.call(fail, now=t)
    except ValueError:
        pass
calls = []
try:
    cb.call(lambda: calls.append(1), now=5)
    state = "closed"
except RuntimeError:
    state = "open"
assert state == "open" and calls == []
assert cb.call(lambda: "ok", now=31) == "ok"
assert cb.call(lambda: "ok again", now=32) == "ok again"
--- solution ---
class CircuitBreaker:
    def __init__(self, threshold, cooldown):
        self.threshold = threshold
        self.cooldown = cooldown
        self.failures = 0
        self.opened_at = None

    def call(self, fn, now):
        if self.opened_at is not None and now < self.opened_at + self.cooldown:
            raise RuntimeError("circuit open")
        try:
            result = fn()
        except Exception:
            self.failures += 1
            if self.failures >= self.threshold:
                self.opened_at = now
            raise
        self.failures = 0
        self.opened_at = None
        return result
:::

:::quiz
Q: Document ingestion takes 10 minutes per batch. How should the API handle an upload?
- [ ] Keep the HTTP request open for 10 minutes
- [x] Put a job on a queue, return a job ID at once, let the client poll or get a webhook
- [ ] Reject large uploads
Q: Why must queue workers be idempotent?
- [x] Most queues deliver at least once, so a message can arrive twice
- [ ] It makes them faster
:::
