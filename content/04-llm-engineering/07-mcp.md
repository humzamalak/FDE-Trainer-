# Model Context Protocol (MCP)
<!-- minutes: 45 -->

**MCP** is an open protocol that connects AI applications (clients like Claude, IDEs, agents) to tools and data (servers). Write a tool server once; any MCP client can use it. Think of it like a standard driver interface, or like the Kubernetes CSI for storage.

## The parts

- **Host / client**: the AI application.
- **Server**: exposes capabilities:
  - **Tools**: functions the model can call (`get_budget`, `submit_job`).
  - **Resources**: data the client can read (files, records).
  - **Prompts**: reusable prompt templates.
- **Transport**: `stdio` (local process) or streamable HTTP (remote).
- **Messages**: JSON-RPC 2.0. Requests have `jsonrpc`, `id`, `method`, `params`. Responses have `result` or `error`.

## A minimal server (Python SDK, FastMCP)

```python
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("ronin-budgets")

@mcp.tool()
def project_budget(project: str) -> dict:
    """Return the monthly budget and spend for a RONIN project."""
    return {"project": project, "budget": 500, "spent": 312.4}

if __name__ == "__main__":
    mcp.run()          # stdio transport by default
```

The function name, type hints and docstring become the tool's schema and description.

## FDE relevance

Customers will ask you to connect the AI to their systems: ServiceNow, SharePoint, Jira, internal APIs, databases. MCP servers are a clean way to do it. **Security still applies**: authentication (OAuth for remote servers), least privilege, approval for write actions, and only install servers you trust.

:::exercise Handle a JSON-RPC request
Write `handle(request, tools)`. `request` is a dict. `tools` is a dict name → function.

- If `method` is `"tools/list"`: return `{"jsonrpc": "2.0", "id": ID, "result": {"tools": [sorted tool names]}}`.
- If `method` is `"tools/call"`: `params` has `name` and `arguments`. Return `{"jsonrpc": "2.0", "id": ID, "result": {"content": RESULT}}`.
- Unknown method: return `{"jsonrpc": "2.0", "id": ID, "error": {"code": -32601, "message": "Method not found"}}`.
- Unknown tool: `error` with code `-32602` and message `"Unknown tool: NAME"`.
--- starter ---
def handle(request, tools):
    pass
--- tests ---
tools = {"budget": lambda project: 500 if project == "clear" else 0, "echo": lambda text: text}
assert handle({"jsonrpc": "2.0", "id": 1, "method": "tools/list"}, tools) == {"jsonrpc": "2.0", "id": 1, "result": {"tools": ["budget", "echo"]}}
assert handle({"jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": {"name": "budget", "arguments": {"project": "clear"}}}, tools) == {"jsonrpc": "2.0", "id": 2, "result": {"content": 500}}
assert handle({"jsonrpc": "2.0", "id": 3, "method": "nope"}, tools)["error"]["code"] == -32601
r = handle({"jsonrpc": "2.0", "id": 4, "method": "tools/call", "params": {"name": "rm", "arguments": {}}}, tools)
assert r["error"] == {"code": -32602, "message": "Unknown tool: rm"}
--- solution ---
def handle(request, tools):
    base = {"jsonrpc": "2.0", "id": request.get("id")}
    method = request.get("method")
    if method == "tools/list":
        return {**base, "result": {"tools": sorted(tools)}}
    if method == "tools/call":
        params = request.get("params", {})
        name = params.get("name")
        if name not in tools:
            return {**base, "error": {"code": -32602, "message": f"Unknown tool: {name}"}}
        return {**base, "result": {"content": tools[name](**params.get("arguments", {}))}}
    return {**base, "error": {"code": -32601, "message": "Method not found"}}
:::

:::written Do it for real: build an MCP server
On your machine: `pip install mcp`. Build an MCP server with 2 tools that are useful in your job (for example: read Slurm queue status from a sample file, and look up a RONIN project budget from a CSV). Connect it to Claude Desktop. Paste the code and describe one conversation where the model used both tools.
--- rubric ---
- Working FastMCP (or SDK) server with two tools that have clear names, types and docstrings
- Tools are read-only or have approval for writes; inputs validated
- Explains how it is registered in the client config
- Shows an example conversation using the tools
- Mentions what would change for a remote/production server (auth, logging, least privilege)
:::

:::quiz
Q: What message format does MCP use?
- [ ] gRPC
- [x] JSON-RPC 2.0
- [ ] SOAP
Q: An MCP "tool" is…
- [x] a function the model can ask the client to call
- [ ] a prompt template
- [ ] a vector database
:::
