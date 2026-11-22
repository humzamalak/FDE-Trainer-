# Tool use and agents
<!-- minutes: 60 -->

## Tool use (function calling)

You describe tools with a name, a description and a JSON schema. The model does **not** run tools. It replies with a request: "call `get_job_status` with `{"job_id": "123"}`". **Your code** runs the tool and sends back the result. Then the model continues.

```python
tools = [{
    "name": "get_job_status",
    "description": "Get the status of a Slurm job by its ID.",
    "input_schema": {
        "type": "object",
        "properties": {"job_id": {"type": "string"}},
        "required": ["job_id"],
    },
}]

resp = client.messages.create(model=MODEL, max_tokens=1000, tools=tools, messages=messages)
if resp.stop_reason == "tool_use":
    for block in resp.content:
        if block.type == "tool_use":
            result = run_tool(block.name, block.input)          # YOUR code
            messages.append({"role": "assistant", "content": resp.content})
            messages.append({"role": "user", "content": [
                {"type": "tool_result", "tool_use_id": block.id, "content": str(result)}
            ]})
```

**Tool descriptions are prompts.** Write them well: what the tool does, when to use it, what each parameter means.

## The agent loop

An **agent** is a model that calls tools in a loop until the task is done:

```
while True:
    response = model(messages, tools)
    if response wants tools:
        run them, append results
    else:
        return response text
```

Always add a **maximum number of steps**, a cost limit, and logging of every step.

## Workflows vs agents

- **Workflow**: your code fixes the steps (classify → retrieve → draft → check). Predictable, cheap, easy to test.
- **Agent**: the model chooses the steps. Flexible, but harder to test and control.

**Start with the simplest thing that works.** Many customer problems need a single well-prompted call or a fixed workflow, not an agent. Saying this in an interview is a sign of seniority.

## Safety for tools

- Read-only tools first. Tools that change things (delete, send, pay) need **human approval**.
- Validate tool inputs as untrusted (the model could be tricked by prompt injection).
- Least privilege: the tool's credentials allow only what it needs — like an IAM role.

:::exercise Dispatch a tool call
Write `run_tool(name, args, registry)`. `registry` is a dict of name → Python function. Call the function with `**args` and return `{"ok": True, "result": ...}`. If the tool is unknown, return `{"ok": False, "error": "unknown tool: NAME"}`. If the function raises any `Exception`, return `{"ok": False, "error": str(exc)}`. Never raise.
--- starter ---
def run_tool(name, args, registry):
    pass
--- tests ---
def add(a, b):
    return a + b
def boom():
    raise RuntimeError("disk full")
reg = {"add": add, "boom": boom}
assert run_tool("add", {"a": 2, "b": 3}, reg) == {"ok": True, "result": 5}
assert run_tool("nope", {}, reg) == {"ok": False, "error": "unknown tool: nope"}
assert run_tool("boom", {}, reg) == {"ok": False, "error": "disk full"}
assert run_tool("add", {"a": 1}, reg)["ok"] is False
--- solution ---
def run_tool(name, args, registry):
    fn = registry.get(name)
    if fn is None:
        return {"ok": False, "error": f"unknown tool: {name}"}
    try:
        return {"ok": True, "result": fn(**args)}
    except Exception as exc:
        return {"ok": False, "error": str(exc)}
:::

:::exercise Write the agent loop
Write `run_agent(model, tools, question, max_steps=5)`.

`model(messages)` is a fake LLM. It returns either `{"type": "tool", "name": ..., "args": {...}}` or `{"type": "final", "text": ...}`.

Loop:
1. Start with `messages = [{"role": "user", "content": question}]`.
2. Call `model(messages)`. If it is `final`, return its text.
3. If it is `tool`, run `tools[name](**args)`, then append `{"role": "assistant", "content": reply}` and `{"role": "tool", "name": name, "content": result}`.
4. If you reach `max_steps` model calls without a final answer, return `"Stopped: too many steps"`.
--- starter ---
def run_agent(model, tools, question, max_steps=5):
    pass
--- tests ---
def fake_model(messages):
    tool_msgs = [m for m in messages if m["role"] == "tool"]
    if not tool_msgs:
        return {"type": "tool", "name": "job_status", "args": {"job_id": "42"}}
    return {"type": "final", "text": f"Job 42 is {tool_msgs[-1]['content']}."}
tools = {"job_status": lambda job_id: "RUNNING" if job_id == "42" else "UNKNOWN"}
assert run_agent(fake_model, tools, "Is job 42 done?") == "Job 42 is RUNNING."
looping = lambda messages: {"type": "tool", "name": "job_status", "args": {"job_id": "1"}}
assert run_agent(looping, tools, "x", max_steps=3) == "Stopped: too many steps"
calls = []
def counting(messages):
    calls.append(1)
    return looping(messages)
run_agent(counting, tools, "x", max_steps=4)
assert len(calls) == 4
--- solution ---
def run_agent(model, tools, question, max_steps=5):
    messages = [{"role": "user", "content": question}]
    for _ in range(max_steps):
        reply = model(messages)
        if reply["type"] == "final":
            return reply["text"]
        result = tools[reply["name"]](**reply["args"])
        messages.append({"role": "assistant", "content": reply})
        messages.append({"role": "tool", "name": reply["name"], "content": result})
    return "Stopped: too many steps"
:::

:::exercise Human approval for risky tools
Write `guarded(tool_name, args, tools, risky, approve)`. If `tool_name` is in the set `risky`, call `approve(tool_name, args)`. If it returns `False`, return `"DENIED"` without running the tool. Otherwise run the tool and return its result.
--- starter ---
def guarded(tool_name, args, tools, risky, approve):
    pass
--- tests ---
ran = []
tools = {"delete_vm": lambda vm: ran.append(vm) or "deleted", "list_vms": lambda: ["a", "b"]}
assert guarded("list_vms", {}, tools, {"delete_vm"}, lambda n, a: False) == ["a", "b"]
assert guarded("delete_vm", {"vm": "a"}, tools, {"delete_vm"}, lambda n, a: False) == "DENIED"
assert ran == []
assert guarded("delete_vm", {"vm": "a"}, tools, {"delete_vm"}, lambda n, a: True) == "deleted"
assert ran == ["a"]
--- solution ---
def guarded(tool_name, args, tools, risky, approve):
    if tool_name in risky and not approve(tool_name, args):
        return "DENIED"
    return tools[tool_name](**args)
:::

:::written Agent or workflow?
A customer wants to "use an AI agent" to process 3,000 grant applications: extract the applicant, amount and topic, check eligibility rules, and draft a decision letter for a human to approve. Would you build an agent or a workflow? Describe the steps, where humans are involved, and how you would test it.
--- rubric ---
- Chooses a fixed workflow (or mostly workflow) and explains why: predictable, testable, auditable steps
- Clear steps: extraction with structured output → rule checks in normal code where rules are deterministic → LLM only for judgement/drafting → human approval
- Human-in-the-loop for decisions; audit log
- Testing: labelled sample set, field-level accuracy, eligibility precision/recall, spot checks
- Mentions cost/throughput (batch API) and data protection
:::

:::quiz
Q: Who runs the tool when a model "calls" it?
- [ ] The model provider's servers
- [x] Your application code
- [ ] The user
Q: What must every agent loop have?
- [x] A maximum number of steps (and ideally cost limits and logging)
- [ ] At least 10 tools
- [ ] Temperature 0
:::
