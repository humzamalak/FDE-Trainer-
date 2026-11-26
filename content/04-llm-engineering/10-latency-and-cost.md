# LLM latency and cost
<!-- minutes: 45 -->

After "is it accurate?", the next two customer questions are "is it fast enough?" and "what will it cost?". You need numbers and levers for both.

## Where the time goes

$$\text{latency} \approx \text{time to first token} + \frac{\text{output tokens}}{\text{tokens per second}} + \text{your own steps}$$

- **Time to first token (TTFT)**: network, queueing, and reading the input. Longer inputs add some time; prompt caching can cut it.
- **Output generation** is usually the biggest part. Output is generated one token at a time, so **500 output tokens take roughly 10× longer than 50**. Ask for short outputs.
- **Your own steps**: retrieval, tool calls, re-ranking, and every extra model call in an agent loop.

Users feel **streaming** as much faster: the first words appear after the TTFT, not after the whole answer.

Measure **p50 and p95** (the median and the slow tail), not the average. The slow tail is what users complain about.

## Where the money goes

Cost = input tokens × input price + output tokens × output price, per million tokens. Output tokens usually cost several times more than input tokens. Check the provider's current price page; prices change.

## The levers

| Lever | Faster | Cheaper | Trade-off |
|---|---|---|---|
| Shorter outputs (ask for it; set `max_tokens`) | ✓✓ | ✓✓ | Less detail |
| Smaller model for easy steps (routing) | ✓ | ✓✓ | Check quality with evals |
| Prompt caching of the long, stable start of the prompt | ✓ | ✓✓ (cached reads are a fraction of the input price) | The cached part must be identical, at the start |
| Fewer retrieved chunks / shorter context | ✓ | ✓ | Recall may fall |
| Parallel calls for independent steps | ✓✓ | – | More concurrent load |
| Batch API for work that can wait (often about half price) | ✗ | ✓✓ | Results in minutes to hours |
| Cache whole answers for repeated questions | ✓✓ | ✓✓ | Staleness; per-user data must not leak |
| Streaming | feels ✓✓ | – | UI work |

## How to answer "what will it cost?"

1. Estimate tokens per request (system prompt + retrieved chunks + question; typical answer length).
2. Requests per day at launch and in a year.
3. Cost per request × volume, plus 20–30% for retries, evals and growth.
4. Compare to the value per request (lesson 2.6, business maths).
5. Name the two biggest levers if it is too expensive.

:::exercise Estimate latency
Write `latency(ttft, output_tokens, tokens_per_second, extra=0.0)` that returns the estimated seconds, rounded to 2 decimal places. Then write `fits(models, output_tokens, budget_seconds)` that returns the names of models (a list of dicts with `name`, `ttft`, `tps`) whose latency is within the budget, fastest first.
--- starter ---
def latency(ttft, output_tokens, tokens_per_second, extra=0.0):
    return ttft

def fits(models, output_tokens, budget_seconds):
    return [m["name"] for m in models]
--- tests ---
assert latency(0.6, 400, 80) == 5.6
assert latency(0.5, 0, 100, extra=0.3) == 0.8
models = [
    {"name": "large", "ttft": 1.2, "tps": 50},
    {"name": "medium", "ttft": 0.7, "tps": 80},
    {"name": "small", "ttft": 0.3, "tps": 150},
]
assert fits(models, 300, 5.0) == ["small", "medium"]
assert fits(models, 300, 1.0) == []
assert fits(models, 50, 10) == ["small", "medium", "large"]
--- solution ---
def latency(ttft, output_tokens, tokens_per_second, extra=0.0):
    return round(ttft + output_tokens / tokens_per_second + extra, 2)

def fits(models, output_tokens, budget_seconds):
    timed = [(latency(m["ttft"], output_tokens, m["tps"]), m["name"]) for m in models]
    return [name for t, name in sorted(timed) if t <= budget_seconds]
:::

:::exercise p50 and p95
Write `percentile(values, p)` using the **nearest-rank** method: sort the values; the rank is `ceil(p / 100 * n)`; return the value at that rank (1-based). Return `None` for an empty list. Then the tests check why p95 matters.
--- starter ---
def percentile(values, p):
    return sum(values) / len(values)
--- tests ---
times = [0.8, 0.9, 1.0, 1.1, 1.0, 0.9, 1.2, 0.8, 9.5, 1.0]
assert percentile(times, 50) == 1.0
assert percentile(times, 95) == 9.5
assert percentile([3], 95) == 3
assert percentile([], 50) is None
assert percentile(list(range(1, 101)), 95) == 95
--- solution ---
import math

def percentile(values, p):
    if not values:
        return None
    ordered = sorted(values)
    rank = max(1, math.ceil(p / 100 * len(ordered)))
    return ordered[rank - 1]
:::

:::exercise Savings from prompt caching
A request has a stable prefix (system prompt and documents) of `prefix` tokens and a changing part of `rest` tokens. Without caching, all input costs `price` per million. With caching, the first request writes the cache at `write_mult × price` for the prefix, and later requests read it at `read_mult × price`. Write `cached_cost(n, prefix, rest, price, write_mult=1.25, read_mult=0.1)` and `plain_cost(n, prefix, rest, price)` for `n` requests (assume the cache stays warm), each in pounds rounded to 4 decimal places.
--- starter ---
def plain_cost(n, prefix, rest, price):
    return 0

def cached_cost(n, prefix, rest, price, write_mult=1.25, read_mult=0.1):
    return 0
--- tests ---
assert plain_cost(100, 20000, 500, 3.0) == 6.15
assert cached_cost(100, 20000, 500, 3.0) == 0.819
assert cached_cost(1, 20000, 500, 3.0) == 0.0765
assert cached_cost(0, 20000, 500, 3.0) == 0
--- solution ---
def plain_cost(n, prefix, rest, price):
    return round(n * (prefix + rest) * price / 1_000_000, 4)

def cached_cost(n, prefix, rest, price, write_mult=1.25, read_mult=0.1):
    if n == 0:
        return 0
    first = prefix * write_mult + rest
    later = (n - 1) * (prefix * read_mult + rest)
    return round((first + later) * price / 1_000_000, 4)
:::

:::quiz
Q: Users say answers are slow. Answers are about 800 tokens. What is usually the biggest single improvement?
- [x] Ask for shorter answers (and stream them)
- [ ] Use a faster vector database
- [ ] Compress the question
Q: Why report p95 latency, not only the average?
- [x] A few very slow requests hide inside a good average, and users notice the slow ones
- [ ] The average is hard to compute
Q: Which work suits a batch API?
- [x] Classifying last month's 200,000 tickets overnight
- [ ] A chat reply to a user who is waiting
:::

:::cards Latency and cost
Latency formula :: Time to first token + output tokens ÷ tokens per second + your own steps.
Biggest latency driver :: Usually the number of output tokens.
p95 :: The value 95% of requests are faster than. Report p50 and p95.
Prompt caching :: Reuse an identical prompt prefix; cached reads cost a fraction of normal input.
Batch API :: Cheaper (often about half price) for work that can wait.
:::
