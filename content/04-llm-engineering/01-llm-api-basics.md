# How LLM APIs work
<!-- minutes: 50 -->

## The mental model

An LLM predicts the next **token** (a piece of a word, ~4 characters) again and again. It has no memory between calls. **Every call sends the whole conversation.** The model has a **context window** (current Claude models: 1M tokens): the maximum input + output size.

## The Messages API (Claude)

```python
import anthropic

client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY from the environment
response = client.messages.create(
    model="claude-sonnet-5-5",
    max_tokens=4000,  # maximum OUTPUT tokens, thinking included
    system="You are a support assistant for an HPC cluster. Answer briefly.",
    messages=[
        {"role": "user", "content": "How do I check my Slurm jobs?"},
    ],
)
# The reply is a list of blocks. Current models think first, so the first block
# can be a "thinking" block, not text: always check the type.
for block in response.content:
    if block.type == "text":
        print(block.text)
print(response.usage.input_tokens, response.usage.output_tokens)
print(response.stop_reason)  # "end_turn", "max_tokens", "tool_use", ...
```

- `system`: instructions that apply to the whole conversation.
- `messages`: alternating `user` and `assistant` turns. To continue a chat, append the assistant reply and the next user message, then call again.
- OpenAI's Chat Completions / Responses API is very similar. Learn one well; the others are easy.

## Parameters

- `max_tokens`: if the reply hits it, `stop_reason` is `"max_tokens"` and the text is cut. Check this.
- **Thinking and `effort`**: current Claude models think before they answer. Thinking tokens are billed as **output** and count toward `max_tokens`, so do not set `max_tokens` too low. You control how much the model thinks with `output_config={"effort": "low"}` (`low`, `medium`, `high`, `xhigh`, `max`). Use `low` for simple extraction and classification, higher for hard reasoning. Lower effort is faster and cheaper.
- `temperature`: older models and other providers let you set randomness (low for extraction, higher for creative text). Current Claude models do not accept it (the API returns an error), so use `effort` and clear instructions instead. You will still see `temperature` in older code and in interviews.
- **Streaming**: get tokens as they are made (`client.messages.stream(...)`). Users see progress. This app's tutor uses streaming — read `server/tutor.py`.

## Cost and speed

- You pay per input token and per output token. Output is usually ~5× more expensive.
- Long conversations get expensive because the whole history is sent each time.
- **Prompt caching**: mark a long, repeated prefix (system prompt, documents) as cacheable. Repeat calls are cheaper and faster.
- **Batch API**: about half price for jobs that can wait (hours).
- Latency = time to first token + output tokens ÷ tokens per second. Smaller models are faster and cheaper.

## Choosing a model

Start with a capable mid-size model. Measure quality with evals (lesson 5). Then try a smaller model to cut cost. Use the biggest model only where evals show it is needed.

## Errors to handle

`429` rate limit and `529`/`5xx` overload → retry with backoff (the SDK retries some automatically). `400` → your request is wrong. Always set timeouts.

:::exercise Build a conversation
Write `add_turn(history, user_text, assistant_text=None)` that returns a **new** list (do not change `history`) with the user message appended, and the assistant message too if given. Messages are dicts `{"role": ..., "content": ...}`.
--- starter ---
def add_turn(history, user_text, assistant_text=None):
    pass
--- tests ---
h0 = []
h1 = add_turn(h0, "hi", "hello")
assert h0 == []
assert h1 == [{"role": "user", "content": "hi"}, {"role": "assistant", "content": "hello"}]
h2 = add_turn(h1, "and now?")
assert h2[-1] == {"role": "user", "content": "and now?"}
assert len(h2) == 3
--- solution ---
def add_turn(history, user_text, assistant_text=None):
    new = list(history)
    new.append({"role": "user", "content": user_text})
    if assistant_text is not None:
        new.append({"role": "assistant", "content": assistant_text})
    return new
:::

:::exercise Trim history to a token budget
Long chats exceed the budget. Write `trim(history, max_tokens)`. Estimate tokens as `len(content) // 4 + 1` per message. Remove the **oldest** messages until the total is within budget, but always keep the last message. The result must start with a `"user"` message: if the first kept message is from the assistant, drop it too (unless it is the last message).
--- starter ---
def estimate(message):
    return len(message["content"]) // 4 + 1

def trim(history, max_tokens):
    pass
--- tests ---
h = [
    {"role": "user", "content": "a" * 40},
    {"role": "assistant", "content": "b" * 40},
    {"role": "user", "content": "c" * 40},
    {"role": "assistant", "content": "d" * 40},
    {"role": "user", "content": "e" * 40},
]
assert trim(h, 1000) == h
assert trim(h, 33) == h[2:]
assert trim(h, 22) == h[4:]
assert trim(h, 1) == h[4:]
--- solution ---
def estimate(message):
    return len(message["content"]) // 4 + 1

def trim(history, max_tokens):
    kept = list(history)
    while len(kept) > 1 and sum(estimate(m) for m in kept) > max_tokens:
        kept.pop(0)
    while len(kept) > 1 and kept[0]["role"] != "user":
        kept.pop(0)
    return kept
:::

:::exercise Estimate the cost of a call
Write `call_cost(usage, prices)`. `usage` is `{"input_tokens": int, "output_tokens": int, "cache_read_tokens": int}` (the last may be missing). `prices` is per million tokens: `{"input": float, "output": float, "cache_read": float}`. Cached tokens are charged at the cache price **instead of** the input price, and `input_tokens` does not include them. Return the cost rounded to 6 decimals.
--- starter ---
def call_cost(usage, prices):
    pass
--- tests ---
p = {"input": 3.0, "output": 15.0, "cache_read": 0.3}
assert call_cost({"input_tokens": 1000, "output_tokens": 200}, p) == 0.006
assert call_cost({"input_tokens": 100, "output_tokens": 100, "cache_read_tokens": 10000}, p) == 0.0048
--- solution ---
def call_cost(usage, prices):
    cost = (
        usage.get("input_tokens", 0) * prices["input"]
        + usage.get("output_tokens", 0) * prices["output"]
        + usage.get("cache_read_tokens", 0) * prices["cache_read"]
    ) / 1_000_000
    return round(cost, 6)
:::

:::written Do it for real: your first API call
On your own machine: create a venv, `pip install anthropic`, set `ANTHROPIC_API_KEY`, and write a script that asks the model to explain Slurm's `sbatch` in 3 sentences. Print the text, the token usage and the stop reason. Then make it a 3-turn conversation. Paste your code and output here.
--- rubric ---
- Uses the official SDK and reads the key from the environment (not hard-coded)
- Sets max_tokens and a system prompt
- Prints usage and stop_reason
- Multi-turn: appends the assistant reply to messages before the next user turn
- Mentions or handles errors/timeouts
:::

:::quiz
Q: Why does a long chat get more expensive per message?
- [ ] The API charges a time fee
- [x] Each call sends the whole conversation history as input tokens
- [ ] The model gets slower
Q: The reply stops mid-sentence and stop_reason is "max_tokens". What do you do?
- [x] Increase max_tokens or ask for a shorter answer
- [ ] Retry the same call
- [ ] Lower the temperature
Q: Your call to a current Claude model fails at `response.content[0].text`. Why?
- [x] The first block can be a thinking block, which has no text; loop over the blocks and use the ones whose type is "text"
- [ ] The API key is wrong
- [ ] `content` is a string, not a list
:::
