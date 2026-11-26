# Async Python: asyncio and concurrent API calls
<!-- minutes: 60 -->

Integration work often means calling an API **many times**: 500 tickets, 2,000 documents to embed. One by one, at 300 ms each, 2,000 calls take 10 minutes. Most of that time is **waiting for the network**. `asyncio` lets one program wait for many requests at the same time.

## The model

- `async def` makes a **coroutine function**. Calling it does not run it; it gives a coroutine.
- `await` runs a coroutine and **pauses this one** until the result is ready. While it waits, other coroutines run.
- The **event loop** switches between coroutines when they wait. It is like Slurm scheduling jobs, but inside one program, on one thread.

```python
import asyncio


async def fetch(name, seconds):
    await asyncio.sleep(seconds)  # stands in for a network call
    return f"{name} done"


# In this app you can use await at the top level.
# In a normal script you write:  asyncio.run(main())
result = await fetch("job-1", 0.1)
print(result)
```

## Run many at once: gather

```python
import asyncio, time


async def fetch(name, seconds):
    await asyncio.sleep(seconds)
    return name


start = time.perf_counter()
results = await asyncio.gather(fetch("a", 0.3), fetch("b", 0.2), fetch("c", 0.1))
print(results, f"{time.perf_counter() - start:.1f}s")  # about 0.3 s, not 0.6 s
```

`gather` returns results **in the order you passed them**, not the order they finished.

## Limit concurrency: Semaphore

APIs have rate limits. Do not start 2,000 requests at once. A **semaphore** lets at most N run at the same time.

```python
import asyncio

limit = asyncio.Semaphore(3)
running = 0
peak = 0


async def call(i):
    global running, peak
    async with limit:  # waits here if 3 are already running
        running += 1
        peak = max(peak, running)
        await asyncio.sleep(0.05)
        running -= 1
        return i * 2


print(await asyncio.gather(*(call(i) for i in range(10))), "peak:", peak)
```

## Timeouts and errors

```python
import asyncio


async def slow():
    await asyncio.sleep(1)


try:
    await asyncio.wait_for(slow(), timeout=0.1)
except asyncio.TimeoutError:
    print("timed out")


# return_exceptions=True: one failure does not cancel the others
async def bad():
    raise ValueError("boom")


print(await asyncio.gather(bad(), asyncio.sleep(0, result="ok"), return_exceptions=True))
```

## In real code

```python
import httpx, asyncio


async def main(urls):
    async with httpx.AsyncClient(timeout=10) as client:
        responses = await asyncio.gather(*(client.get(u) for u in urls))
    return [r.status_code for r in responses]


# asyncio.run(main(["https://example.com"]))
```

The Anthropic SDK has `AsyncAnthropic` for the same pattern. **Async helps with waiting (I/O). It does not make CPU work faster** — for that, use processes.

:::exercise Fetch all, in order
`fetch(id)` is an async function. Write `async def fetch_all(ids, fetch)` that calls `fetch` for every id **at the same time** and returns the results in the same order as `ids`. Use `asyncio.gather`.
--- starter ---
import asyncio

async def fetch_all(ids, fetch):
    pass
--- tests ---
import asyncio, time
async def fake(i):
    await asyncio.sleep(0.05)
    return i * 10
start = time.perf_counter()
assert await fetch_all([1, 2, 3, 4, 5], fake) == [10, 20, 30, 40, 50]
assert time.perf_counter() - start < 0.2, "the calls must run at the same time"
assert await fetch_all([], fake) == []
--- solution ---
import asyncio

async def fetch_all(ids, fetch):
    return list(await asyncio.gather(*(fetch(i) for i in ids)))
:::

:::exercise Respect a rate limit
Write `async def fetch_limited(ids, fetch, max_at_once)` that calls `fetch(id)` for every id, with **at most `max_at_once` calls running at the same time**, and returns the results in order. Use `asyncio.Semaphore`.
--- starter ---
import asyncio

async def fetch_limited(ids, fetch, max_at_once):
    return [await fetch(i) for i in ids]
--- tests ---
import asyncio, time
state = {"now": 0, "peak": 0}
async def fake(i):
    state["now"] += 1
    state["peak"] = max(state["peak"], state["now"])
    await asyncio.sleep(0.02)
    state["now"] -= 1
    return i
start = time.perf_counter()
assert await fetch_limited(list(range(12)), fake, 4) == list(range(12))
assert state["peak"] == 4, f"peak concurrency was {state['peak']}, expected 4"
assert time.perf_counter() - start < 0.2
--- solution ---
import asyncio

async def fetch_limited(ids, fetch, max_at_once):
    limit = asyncio.Semaphore(max_at_once)

    async def one(i):
        async with limit:
            return await fetch(i)

    return list(await asyncio.gather(*(one(i) for i in ids)))
:::

:::exercise Keep going when some fail
Write `async def fetch_report(ids, fetch)` that calls every fetch at the same time and returns a dict `{"ok": {id: result}, "failed": [ids that raised]}`. One failure must not stop the others. Hint: `gather(..., return_exceptions=True)`.
--- starter ---
import asyncio

async def fetch_report(ids, fetch):
    results = await asyncio.gather(*(fetch(i) for i in ids))
    return {"ok": dict(zip(ids, results)), "failed": []}
--- tests ---
import asyncio
async def flaky(i):
    await asyncio.sleep(0.01)
    if i % 3 == 0:
        raise RuntimeError(f"{i} failed")
    return i * 2
assert await fetch_report([1, 2, 3, 4, 6], flaky) == {"ok": {1: 2, 2: 4, 4: 8}, "failed": [3, 6]}
assert await fetch_report([], flaky) == {"ok": {}, "failed": []}
--- solution ---
import asyncio

async def fetch_report(ids, fetch):
    results = await asyncio.gather(*(fetch(i) for i in ids), return_exceptions=True)
    report = {"ok": {}, "failed": []}
    for i, result in zip(ids, results):
        if isinstance(result, Exception):
            report["failed"].append(i)
        else:
            report["ok"][i] = result
    return report
:::

:::exercise Timeout per call
Write `async def with_timeout(coro_fn, seconds)` that runs `await coro_fn()` and returns its result, or returns `None` if it takes longer than `seconds`. Use `asyncio.wait_for`.
--- starter ---
import asyncio

async def with_timeout(coro_fn, seconds):
    return await coro_fn()
--- tests ---
import asyncio
async def quick():
    await asyncio.sleep(0.01)
    return "fast"
async def slow():
    await asyncio.sleep(0.5)
    return "slow"
assert await with_timeout(quick, 0.2) == "fast"
assert await with_timeout(slow, 0.05) is None
--- solution ---
import asyncio

async def with_timeout(coro_fn, seconds):
    try:
        return await asyncio.wait_for(coro_fn(), timeout=seconds)
    except asyncio.TimeoutError:
        return None
:::

:::quiz
Q: You call `fetch(1)` where fetch is `async def`. What do you get?
- [ ] The result
- [x] A coroutine object; nothing runs until you await it
- [ ] An error
Q: Does asyncio make a CPU-heavy calculation faster?
- [ ] Yes, it uses all cores
- [x] No, it helps only while waiting for I/O such as network calls
:::
