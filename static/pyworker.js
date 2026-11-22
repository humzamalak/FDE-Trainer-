// Runs Python in the browser with Pyodide, inside a Web Worker.
// A worker can be stopped if your code loops forever, so the page never freezes.
importScripts("/static/vendor/pyodide/pyodide.js");  // bundled locally: no internet needed

const HARNESS = `
import ast, io, json, sys, traceback

def _user_trace(exc):
    frames = [f for f in traceback.extract_tb(exc.__traceback__) if f.filename in ("your_code.py", "tests.py")]
    lines = [f'  {f.filename}, line {f.lineno}: {f.line}' for f in frames]
    head = "Traceback (your code):\\n" + "\\n".join(lines) + "\\n" if lines else ""
    return head + f"{type(exc).__name__}: {exc}"

def _describe_failure(node, ns):
    # For "assert a == b" show what a really was.
    t = node.test
    if isinstance(t, ast.Compare) and len(t.ops) == 1 and isinstance(t.ops[0], ast.Eq):
        try:
            got = eval(compile(ast.Expression(t.left), "tests.py", "eval"), ns)
            want = eval(compile(ast.Expression(t.comparators[0]), "tests.py", "eval"), ns)
            return f"expected {want!r}, got {got!r}"
        except BaseException:
            pass
    return ""

def _run_setup(setup, ns):
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
                exec(compile(ast.Module([node], []), "setup.py", "exec"), ns)
            except BaseException:
                pass
    finally:
        sys.stdout, sys.stderr = old

def _run(code, tests, setup=""):
    out = io.StringIO()
    old = sys.stdout, sys.stderr
    sys.stdout = sys.stderr = out
    res = {"ok": False, "error": None, "tests": [], "stdout": ""}
    ns = {"__name__": "__main__"}
    _run_setup(setup, ns)
    try:
        try:
            exec(compile(code, "your_code.py", "exec"), ns)
        except SyntaxError as e:
            res["error"] = f"SyntaxError on line {e.lineno}: {e.msg}\\n  {(e.text or '').rstrip()}"
        except BaseException as e:
            res["error"] = _user_trace(e)
        if res["error"] is None and tests.strip():
            for node in ast.parse(tests).body:
                src = ast.get_source_segment(tests, node)
                try:
                    exec(compile(ast.Module([node], []), "tests.py", "exec"), ns)
                    if isinstance(node, ast.Assert):
                        res["tests"].append({"src": src, "ok": True})
                except AssertionError as e:
                    msg = str(e) or _describe_failure(node, ns)
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
    pyodide.globals.set("_code", code);
    pyodide.globals.set("_tests", tests || "");
    pyodide.globals.set("_setup", setup || "");
    const result = JSON.parse(pyodide.runPython("_run(_code, _tests, _setup)"));
    postMessage({ type: "result", id, result });
  } catch (err) {
    postMessage({ type: "result", id, result: { ok: false, error: String(err), tests: [], stdout: "" } });
  }
};
