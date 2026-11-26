// Runs Python in the browser with Pyodide, inside a Web Worker.
// A worker can be stopped if your code loops forever, so the page never freezes.
importScripts("/static/vendor/pyodide/pyodide.js");  // bundled locally: no internet needed

const HARNESS = `
import ast, inspect, io, json, sys, traceback

# Allow "await" at the top level of exercises and tests (asyncio lessons).
_FLAGS = ast.PyCF_ALLOW_TOP_LEVEL_AWAIT

async def _exec(source_or_tree, filename, ns):
    code = compile(source_or_tree, filename, "exec", flags=_FLAGS)
    result = eval(code, ns)
    if inspect.iscoroutine(result):
        await result

def _user_trace(exc):
    frames = [f for f in traceback.extract_tb(exc.__traceback__) if f.filename in ("your_code.py", "tests.py")]
    lines = [f'  {f.filename}, line {f.lineno}: {f.line}' for f in frames]
    head = "Traceback (your code):\\n" + "\\n".join(lines) + "\\n" if lines else ""
    return head + f"{type(exc).__name__}: {exc}"

async def _describe_failure(node, ns):
    # For "assert a == b" show what a really was.
    t = node.test
    if isinstance(t, ast.Compare) and len(t.ops) == 1 and isinstance(t.ops[0], ast.Eq):
        try:
            got = eval(compile(ast.Expression(t.left), "tests.py", "eval", flags=_FLAGS), ns)
            want = eval(compile(ast.Expression(t.comparators[0]), "tests.py", "eval", flags=_FLAGS), ns)
            if inspect.iscoroutine(got):
                got = await got
            if inspect.iscoroutine(want):
                want = await want
            return f"expected {want!r}, got {got!r}"
        except BaseException:
            pass
    return ""

async def _run_setup(setup, ns):
    # Earlier examples in the lesson: run each statement quietly, ignore errors.
    if not setup.strip():
        return
    try:
        tree = ast.parse(setup)
    except SyntaxError:
        return
    sink = io.StringIO()
    old = sys.stdout, sys.stderr
    sys.stdout = sys.stderr = sink
    try:
        for node in tree.body:
            try:
                await _exec(ast.Module([node], []), "setup.py", ns)
            except BaseException:
                pass
    finally:
        sys.stdout, sys.stderr = old

async def _run(code, tests, setup=""):
    out = io.StringIO()
    old = sys.stdout, sys.stderr
    sys.stdout = sys.stderr = out
    res = {"ok": False, "error": None, "tests": [], "stdout": ""}
    ns = {"__name__": "__main__"}
    await _run_setup(setup, ns)
    try:
        try:
            await _exec(code, "your_code.py", ns)
        except SyntaxError as e:
            res["error"] = f"SyntaxError on line {e.lineno}: {e.msg}\\n  {(e.text or '').rstrip()}"
        except BaseException as e:
            res["error"] = _user_trace(e)
        if res["error"] is None and tests.strip():
            for node in ast.parse(tests).body:
                src = ast.get_source_segment(tests, node)
                try:
                    await _exec(ast.Module([node], []), "tests.py", ns)
                    if isinstance(node, ast.Assert):
                        res["tests"].append({"src": src, "ok": True})
                except AssertionError as e:
                    msg = str(e) or await _describe_failure(node, ns)
                    res["tests"].append({"src": src, "ok": False, "msg": msg})
                except BaseException as e:
                    res["tests"].append({"src": src, "ok": False, "msg": _user_trace(e)})
        res["ok"] = res["error"] is None and bool(tests.strip()) and all(t["ok"] for t in res["tests"])
    finally:
        sys.stdout, sys.stderr = old
        res["stdout"] = out.getvalue()[:20000]
    return json.dumps(res)
`;

let pyodide = null;
const ready = (async () => {
  pyodide = await loadPyodide({ indexURL: "/static/vendor/pyodide/" });
  pyodide.setStdin({ stdin: () => null });
  pyodide.runPython(HARNESS);
  postMessage({ type: "ready" });
})();

onmessage = async (event) => {
  await ready;
  const { id, code, tests, setup } = event.data;
  try {
    // pandas and numpy are bundled but large (about 36 MB), so they load only when code imports them.
    // Tell the page first, so it can extend the time limit while they load.
    const source = [setup, code, tests].join("\n");
    if (/^\s*(import|from)\s+(pandas|numpy)\b/m.test(source) && !self.packagesLoaded) {
      postMessage({ type: "loading-packages", id });
      await pyodide.loadPackagesFromImports(source);
      self.packagesLoaded = true;
      postMessage({ type: "packages-loaded", id });
    }
    pyodide.globals.set("_code", code);
    pyodide.globals.set("_tests", tests || "");
    pyodide.globals.set("_setup", setup || "");
    const result = JSON.parse(await pyodide.runPythonAsync("await _run(_code, _tests, _setup)"));
    postMessage({ type: "result", id, result });
  } catch (err) {
    postMessage({ type: "result", id, result: { ok: false, error: String(err), tests: [], stdout: "" } });
  }
};
