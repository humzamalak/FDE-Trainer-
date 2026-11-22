# Prompting and structured output
<!-- minutes: 50 -->

## A good prompt has

1. **Role and goal**: who the model is and what success looks like.
2. **Context**: the data it needs, clearly separated with XML-style tags: `<document>...</document>`.
3. **Instructions**: specific steps. Say what to do, not only what to avoid.
4. **Examples** (few-shot): 2–5 input → output pairs. The strongest way to control format and style.
5. **Output format**: exactly what to return.

```text
You classify IT support tickets for a university research computing team.

Categories: access, storage, software, gpu, billing, other.

<ticket>
{ticket_text}
</ticket>

Return only JSON: {"category": "...", "urgent": true|false, "summary": "max 15 words"}
A ticket is urgent if a deadline within 48 hours or a production outage is mentioned.
```

## Techniques

- **Be explicit.** "Summarise" → "Summarise in 3 bullet points for a non-technical manager."
- **Let it think** for hard tasks: ask for reasoning first, then the answer (or use the model's extended thinking feature).
- **Break big tasks into steps** (prompt chaining): extract → check → write. Each step is easier to test.
- **Give it a way out**: "If the document does not contain the answer, say 'not found'." This reduces made-up answers (hallucinations).
- **Put long documents first**, the question last.

## Structured output

Code needs JSON, not prose. Options, from best to worst:

1. **Tool use / structured outputs with a JSON schema** — the API forces the shape.
2. A clear format instruction + examples, then **validate** with Pydantic or `json.loads`.
3. If validation fails, **retry** and include the error message in the next prompt.

```python
from pydantic import BaseModel, ValidationError

class Ticket(BaseModel):
    category: str
    urgent: bool
    summary: str

try:
    t = Ticket.model_validate_json(model_text)
except ValidationError as e:
    ...  # retry with: f"Your last output was invalid: {e}. Return only valid JSON."
```

**Never trust model output.** Validate it like user input.

:::exercise Build a prompt from a template
Write `build_prompt(ticket, examples)`. `examples` is a list of `(ticket_text, json_answer)`. Return a string that contains:
1. The line `Classify the ticket.`
2. For each example: `<example>\n<ticket>TEXT</ticket>\n<answer>JSON</answer>\n</example>`
3. Then `<ticket>TICKET</ticket>` and finally the line `Return only JSON.`

Join all the parts with `"\n"`.
--- starter ---
def build_prompt(ticket, examples):
    pass
--- tests ---
p = build_prompt("GPU node down", [("Cannot log in", '{"category": "access"}')])
assert p == 'Classify the ticket.\n<example>\n<ticket>Cannot log in</ticket>\n<answer>{"category": "access"}</answer>\n</example>\n<ticket>GPU node down</ticket>\nReturn only JSON.'
assert build_prompt("x", []) == "Classify the ticket.\n<ticket>x</ticket>\nReturn only JSON."
--- solution ---
def build_prompt(ticket, examples):
    parts = ["Classify the ticket."]
    for text, answer in examples:
        parts.append(f"<example>\n<ticket>{text}</ticket>\n<answer>{answer}</answer>\n</example>")
    parts.append(f"<ticket>{ticket}</ticket>")
    parts.append("Return only JSON.")
    return "\n".join(parts)
:::

:::exercise Parse model JSON safely
Models sometimes wrap JSON in text or a code fence. Write `extract_json(text)`:
- Find the first `{` and the last `}` and parse what is between them (inclusive) with `json.loads`.
- Check that the result has `category` (one of `ALLOWED`) and `urgent` (a bool).
- Return the dict, or raise `ValueError` with a helpful message if anything is wrong.
--- starter ---
import json

ALLOWED = {"access", "storage", "software", "gpu", "billing", "other"}

def extract_json(text):
    pass
--- tests ---
assert extract_json('{"category": "gpu", "urgent": true}') == {"category": "gpu", "urgent": True}
assert extract_json('Sure! ```json\n{"category": "access", "urgent": false}\n```') == {"category": "access", "urgent": False}
for bad in ['no json here', '{"category": "pizza", "urgent": true}', '{"category": "gpu", "urgent": "yes"}', '{"category": "gpu"']:
    try:
        extract_json(bad)
        raised = False
    except ValueError:
        raised = True
    assert raised, bad
--- solution ---
import json

ALLOWED = {"access", "storage", "software", "gpu", "billing", "other"}

def extract_json(text):
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end < start:
        raise ValueError("no JSON object found")
    try:
        data = json.loads(text[start:end + 1])
    except json.JSONDecodeError as e:
        raise ValueError(f"invalid JSON: {e}") from e
    if data.get("category") not in ALLOWED:
        raise ValueError(f"category must be one of {sorted(ALLOWED)}")
    if not isinstance(data.get("urgent"), bool):
        raise ValueError("urgent must be true or false")
    return data
:::

:::exercise Retry until valid
Write `classify_with_retry(call_model, prompt, parse, max_attempts=3)`. Call `call_model(prompt)`, then `parse(text)`. If `parse` raises `ValueError`, call the model again with `prompt + "\n\nYour previous answer was invalid: " + str(error) + ". Try again."`. Return the parsed result, or raise the last `ValueError` after `max_attempts`.
--- starter ---
def classify_with_retry(call_model, prompt, parse, max_attempts=3):
    pass
--- tests ---
import json
def parse(t):
    try:
        return json.loads(t)
    except json.JSONDecodeError as e:
        raise ValueError("bad json") from e
replies = iter(["oops", '{"ok": 1}'])
seen = []
def model(p):
    seen.append(p)
    return next(replies)
assert classify_with_retry(model, "P", parse) == {"ok": 1}
assert seen[1] == "P\n\nYour previous answer was invalid: bad json. Try again."
try:
    classify_with_retry(lambda p: "never json", "P", parse, max_attempts=2)
    raised = False
except ValueError:
    raised = True
assert raised
--- solution ---
def classify_with_retry(call_model, prompt, parse, max_attempts=3):
    current = prompt
    last_error = None
    for _ in range(max_attempts):
        text = call_model(current)
        try:
            return parse(text)
        except ValueError as e:
            last_error = e
            current = prompt + "\n\nYour previous answer was invalid: " + str(e) + ". Try again."
    raise last_error
:::

:::written Improve a bad prompt
A customer's prompt is: `"Read this contract and tell me if its ok"`. Rewrite it as a production prompt for a legal-review assistant used by a university procurement team. Include role, context tags, specific checks, output format, and what to do when unsure.
--- rubric ---
- Clear role and audience (procurement team, not lawyers)
- Contract placed inside tags, instructions separate from data
- Specific checks listed (e.g. liability cap, data protection/GDPR, termination, payment terms, IP, governing law)
- Structured output format (e.g. JSON or a table with clause, risk level, quote, recommendation)
- Instruction to quote the clause and to say "not found"/flag uncertainty instead of guessing; note that it is not legal advice
:::

:::quiz
Q: What is the most reliable way to get a fixed JSON shape?
- [ ] Ask nicely in the prompt
- [x] Use tool use / structured outputs with a schema, and still validate
- [ ] Set temperature to 1
Q: Why put the document inside <document> tags?
- [x] It separates data from instructions, which helps the model and reduces prompt injection risk
- [ ] Tags are required by the API
- [ ] It makes the output shorter
:::
