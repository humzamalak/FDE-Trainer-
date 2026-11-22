# Back-of-envelope estimation
<!-- minutes: 50 -->

In system design and customer conversations you must estimate fast: "How many GPUs? How much will this cost per month? Will it fit?" Exact numbers do not matter. **Being within 2–3× and showing your method matters.**

## The method

1. Write your **assumptions** down and say them aloud.
2. Round to easy numbers (powers of 10).
3. Multiply step by step. Keep the units.
4. Sanity check: "Does this look reasonable?"

## Numbers to know

| Quantity | Value |
|---|---|
| Seconds per day | $86{,}400 \approx 10^5$ |
| Seconds per month | $\approx 2.6 \times 10^6$ |
| Hours per month | $\approx 730$ |
| 1 million requests/day | $\approx 12$ requests/second on average |
| Peak vs average | peak ≈ 2–5× average |
| 1 English word | ≈ 1.3 tokens (1 token ≈ 4 characters) |
| 1 page of text | ≈ 500 words ≈ 650 tokens |
| Memory read | ~100 ns; SSD read ~100 µs; same-region network round trip ~0.5–1 ms; cross-Atlantic ~70–80 ms |

## Example 1: LLM API cost

A customer wants to summarise 20,000 support tickets per day. Each ticket ≈ 800 tokens in, summary ≈ 150 tokens out. Assume a price of \$3 per million input tokens and \$15 per million output tokens (always check current prices).

- Input: $20{,}000 \times 800 = 1.6 \times 10^7$ tokens/day → $16 \times \$3 = \$48$/day
- Output: $20{,}000 \times 150 = 3 \times 10^6$ → $3 \times \$15 = \$45$/day
- Total ≈ \$93/day ≈ **\$2,800/month**. Prompt caching and batch APIs can reduce it.

## Example 2: GPU memory for a self-hosted model

Model weights: parameters × bytes per parameter.

$$70 \times 10^9 \text{ params} \times 2 \text{ bytes (fp16)} = 140 \text{ GB}$$

An H200 has 141 GB of memory, but you also need room for the **KV cache** (memory per active request). So a 70B model in fp16 needs **at least 2 H200s** in practice. With 8-bit quantisation (1 byte per param) → 70 GB, it fits on one with room for the cache.

## Example 3: throughput

A self-hosted model generates ~2,000 output tokens/second per GPU with batching (it depends a lot on the model and settings — measure it). 100 researchers each send 50 requests/day of 500 output tokens:

$100 \times 50 \times 500 = 2.5 \times 10^6$ tokens/day. Over an 8-hour working day: $\frac{2.5 \times 10^6}{28{,}800\text{ s}} \approx 87$ tokens/s average. One GPU is plenty, even at a 5× peak.

:::exercise Requests per second
Write `avg_rps(requests_per_day)` returning the average requests per second (round to 1 decimal), and `peak_rps(requests_per_day, factor=3)` returning average × factor (round to 1 decimal).
--- starter ---
def avg_rps(requests_per_day):
    pass

def peak_rps(requests_per_day, factor=3):
    pass
--- tests ---
assert avg_rps(1_000_000) == 11.6
assert avg_rps(86_400) == 1.0
assert peak_rps(1_000_000) == 34.7
assert peak_rps(86_400, factor=5) == 5.0
--- solution ---
def avg_rps(requests_per_day):
    return round(requests_per_day / 86_400, 1)

def peak_rps(requests_per_day, factor=3):
    return round(requests_per_day / 86_400 * factor, 1)
:::

:::exercise Monthly LLM cost
Write `monthly_llm_cost(items_per_day, in_tokens, out_tokens, in_price, out_price, days=30)`. Prices are per **million** tokens. Return the monthly cost rounded to 2 decimals.
--- starter ---
def monthly_llm_cost(items_per_day, in_tokens, out_tokens, in_price, out_price, days=30):
    pass
--- tests ---
assert monthly_llm_cost(20_000, 800, 150, 3, 15) == 2790.0
assert monthly_llm_cost(100, 1000, 1000, 1, 1, days=1) == 0.2
--- solution ---
def monthly_llm_cost(items_per_day, in_tokens, out_tokens, in_price, out_price, days=30):
    per_day = items_per_day * (in_tokens * in_price + out_tokens * out_price) / 1_000_000
    return round(per_day * days, 2)
:::

:::exercise GPUs needed for model weights
Write `gpus_for_weights(params_billion, bytes_per_param, gpu_mem_gb, headroom=0.3)`. The weights need `params × bytes` GB. Keep `headroom` (30%) of each GPU free for the KV cache. Return the minimum number of GPUs (an `int`, rounded up).
--- starter ---
import math

def gpus_for_weights(params_billion, bytes_per_param, gpu_mem_gb, headroom=0.3):
    pass
--- tests ---
assert gpus_for_weights(70, 2, 141) == 2
assert gpus_for_weights(8, 2, 80) == 1
assert gpus_for_weights(405, 2, 141) == 9
assert gpus_for_weights(70, 1, 141) == 1
--- solution ---
import math

def gpus_for_weights(params_billion, bytes_per_param, gpu_mem_gb, headroom=0.3):
    needed = params_billion * bytes_per_param
    usable = gpu_mem_gb * (1 - headroom)
    return math.ceil(needed / usable)
:::

:::written Estimate a deployment
A hospital wants an internal assistant that answers staff questions from 50,000 policy documents (average 4 pages each). 2,000 staff will use it, about 5 questions each per working day. Estimate: (1) the number of chunks and vector storage size, (2) the peak queries per second, (3) the monthly LLM cost with an API you choose. State every assumption.
--- rubric ---
- States assumptions explicitly (chunk size, tokens per page, embedding dimension, price, peak factor)
- Chunks: ~50k docs × 4 pages × ~650 tokens ≈ 130M tokens; at ~500-token chunks ≈ 260k chunks (order of magnitude correct)
- Storage: chunks × dims × 4 bytes (e.g. 260k × 1536 × 4 ≈ 1.6 GB) — small, fits in Postgres/pgvector
- Queries: 2,000 × 5 = 10,000/day; over an 8-hour day ≈ 0.35 qps average, a few qps at peak
- Cost: tokens per query (context of k chunks + question + answer) × queries × price, with a monthly figure
- Sanity check and a note on data residency / on-prem option for patient data
:::

:::quiz
Q: How many requests per second is 10 million requests per day, on average?
- [ ] 10
- [x] about 116
- [ ] about 1,160
> 10⁷ / 86,400 ≈ 116.
Q: A 13B model in fp16 needs about how much memory for weights?
- [ ] 13 GB
- [x] 26 GB
- [ ] 52 GB
> 13 × 10⁹ × 2 bytes = 26 GB.
:::
