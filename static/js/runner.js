// Code runs in Web Workers: Python (Pyodide), JavaScript, and SQL (sql.js / SQLite).
// A worker can be stopped if the code loops forever, so the page never freezes.

import { el } from "./dom.js";

class WorkerRunner {
  constructor(script, name) { this.script = script; this.name = name; this.worker = null; this.ready = null; this.pending = new Map(); this.extenders = new Map(); this.nextId = 1; this.onStatus = null; }

  start() {
    this.worker = new Worker(this.script);
    this.ready = new Promise((resolve) => {
      this.worker.onmessage = (e) => {
        if (e.data.type === "ready") return resolve();
        if (e.data.type === "loading-packages" || e.data.type === "packages-loaded") {
          const extend = this.extenders.get(e.data.id);
          if (extend) extend(e.data.type === "loading-packages" ? 90000 : null);
          if (e.data.type === "loading-packages") this.onStatus?.("Loading pandas (first time only, about 10 seconds)…");
          return;
        }
        const done = this.pending.get(e.data.id);
        if (done) { this.pending.delete(e.data.id); done(e.data.result); }
      };
    });
  }

  get loaded() { return !!this.worker; }

  async send(message, timeoutMs = 8000) {
    if (!this.worker) this.start();
    await this.ready;
    const id = this.nextId++;
    return new Promise((resolve) => {
      const expire = () => {
        this.pending.delete(id); this.extenders.delete(id);
        this.worker.terminate(); this.worker = null;   // kill the stuck code, start fresh next time
        resolve({ ok: false, error: `Time limit (${timeoutMs / 1000}s) reached. Do you have an infinite loop?`, tests: [], stdout: "" });
      };
      let timer = setTimeout(expire, timeoutMs);
      // Package loading gets a longer limit; the normal limit starts again after it.
      this.extenders.set(id, (ms) => { clearTimeout(timer); timer = setTimeout(expire, ms || timeoutMs); });
      this.pending.set(id, (r) => { clearTimeout(timer); this.extenders.delete(id); resolve(r); });
      this.worker.postMessage({ id, ...message });
    });
  }
}

const python = new WorkerRunner("/static/pyworker.js", "Python");
const javascript = new WorkerRunner("/static/jsworker.js", "JavaScript");
const sql = new WorkerRunner("/static/sqlworker.js", "SQL");

export function onPythonStatus(callback) { python.onStatus = callback; }

export const runner = {
  // opts.setup: code run quietly first (earlier examples in a lesson); opts.timeoutMs.
  python: (code, tests = "", opts = {}) => python.send({ code, tests, setup: opts.setup || "" }, opts.timeoutMs),
  js: (code, tests = "", opts = {}) => javascript.send({ code, tests }, opts.timeoutMs),
  sql: (query, schema = "", solution = "", opts = {}) => sql.send({ query, schema, solution }, opts.timeoutMs),
  loaded: (kind) => ({ exercise: python, python, js: javascript, sql }[kind] || python).loaded,
  // Back-compatible name used by most callers.
  run: (code, tests = "", opts = {}) => python.send({ code, tests, setup: opts.setup || "" }, opts.timeoutMs),
};

export function loadingText(kind) {
  if (runner.loaded(kind)) return "Running…";
  return kind === "sql" ? "Loading SQLite…" : kind === "js" ? "Running…" : "Loading Python (first run takes a few seconds)…";
}

function resultTable(table) {
  if (!table || !table.columns.length) return el("div", { class: "muted" }, "(no rows)");
  const shown = table.rows.slice(0, 50);
  return el("table", { class: "result-table" },
    el("thead", {}, el("tr", {}, table.columns.map((c) => el("th", {}, c)))),
    el("tbody", {}, shown.map((r) => el("tr", {}, r.map((v) => el("td", {}, v === null ? "NULL" : String(v)))))),
    table.rows.length > shown.length ? el("caption", {}, `${table.rows.length - shown.length} more rows not shown`) : "");
}

// While pandas loads, show it in every output that is waiting for a result.
python.onStatus = (message) => document.querySelectorAll("[data-running]").forEach((o) => { o.textContent = message; });

export function showResult(outputEl, result, hasTests) {
  delete outputEl.dataset.running;
  outputEl.innerHTML = "";
  outputEl.classList.add("show");
  if (result.table) outputEl.append(resultTable(result.table));
  if (result.stdout) outputEl.append(el("div", {}, result.stdout));
  if (result.error) outputEl.append(el("div", { class: "test bad" }, result.error));
  for (const t of result.tests) {
    outputEl.append(el("div", { class: `test ${t.ok ? "ok" : "bad"}` },
      `${t.ok ? "✓" : "✗"} ${t.src}${t.msg ? "\n    → " + t.msg : ""}`));
  }
  if (!result.table && !result.stdout && !result.error && !result.tests.length) outputEl.append(el("div", { class: "muted" }, "(no output)"));
  if (hasTests && !result.error && result.tests.length) {
    const passed = result.tests.filter((t) => t.ok).length;
    outputEl.append(el("div", {}, `\n${passed} / ${result.tests.length} checks passed`));
  }
}
