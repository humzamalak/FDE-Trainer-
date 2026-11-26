# Project 3: an agent with tools and guardrails
<!-- minutes: 30 -->

**The user:** a team that does a repetitive multi-step task with several systems (for example: a researcher asks for compute resources; someone checks the request, looks up quotas, and drafts a reply).
**The product:** an agent that uses 3–5 tools to do the task, **asks a human before any action that changes something**, logs every step, and has evals.

Lessons this uses: 4.3 (tools and agents), 4.5 (evals), 4.6 (security), 4.7 (MCP), 4.10 (latency and cost).

## Rules for a safe agent

- Read-only tools can run freely; **write tools need a human approval step**.
- Tool inputs are validated with a schema; tool errors go back to the model as text, not as crashes.
- A maximum number of steps and a maximum cost per task.
- Prompt injection test: a document or tool result that says "ignore your instructions" must not change what the agent does.

:::checklist Milestones: minimum version
- [ ] M1. Define 3–5 tools with JSON schemas, backed by fake systems (in-memory or SQLite)
- [ ] M2. The agent loop with Claude tool use, a step limit, and a log of every model call and tool call
- [ ] M3. A human approval step for write actions (a command-line prompt or a button in a web page)
- [ ] M4. 20 eval tasks with expected outcomes; an eval script that reports task success, steps used and cost
- [ ] M5. Three prompt-injection tests that pass
- [ ] M6. README with a sequence diagram, a demo video, tests, and CI
:::

:::checklist Stretch goals (pick two)
- [ ] Expose the tools as an MCP server and use it from Claude Desktop
- [ ] Trace view: a web page that shows each step of a run
- [ ] Use a cheaper model for simple steps and compare cost and success rate
- [ ] Parallel tool calls where steps do not depend on each other
:::
