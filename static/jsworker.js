// Runs JavaScript exercises in a Web Worker (no access to the page), with simple test helpers.
const fmt = (v) => { try { return typeof v === "string" ? JSON.stringify(v) : JSON.stringify(v) ?? String(v); } catch (e) { return String(v); } };
const deepEqual = (a, b) => fmt(a) === fmt(b);

onmessage = async (event) => {
  const { id, code, tests } = event.data;
  const logs = [];
  const log = (...args) => logs.push(args.map((a) => (typeof a === "string" ? a : fmt(a))).join(" "));
  const res = { ok: false, error: null, tests: [], stdout: "" };
  const lines = (tests || "").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("//"));
  // assert(condition, message) and assertEqual(actual, expected) are available in tests.
  const body = `
    ${code}
    ;return [${lines.map((l) => `async () => { ${l} }`).join(",\n")}];`;
  try {
    const console = { log, info: log, warn: log, error: log };
    const assert = (cond, msg) => { if (!cond) throw new Error(msg || "assertion failed"); };
    const assertEqual = (actual, expected) => {
      if (!deepEqual(actual, expected)) throw new Error(`expected ${fmt(expected)}, got ${fmt(actual)}`);
    };
    // An async function body, so examples and exercises can use top-level await.
    const AsyncFunction = (async () => {}).constructor;
    const factory = new AsyncFunction("console", "assert", "assertEqual", body);
    let checks;
    try {
      checks = await factory(console, assert, assertEqual);
    } catch (e) {
      res.error = `${e.name}: ${e.message}`;
    }
    if (!res.error) {
      for (let i = 0; i < lines.length; i++) {
        try { await checks[i](); res.tests.push({ src: lines[i], ok: true }); }
        catch (e) { res.tests.push({ src: lines[i], ok: false, msg: e.message }); }
      }
      res.ok = lines.length > 0 && res.tests.every((t) => t.ok);
    }
  } catch (e) {
    res.error = `${e.name}: ${e.message}`;
  }
  res.stdout = logs.join("\n").slice(0, 20000);
  postMessage({ type: "result", id, result: res });
};
postMessage({ type: "ready" });
