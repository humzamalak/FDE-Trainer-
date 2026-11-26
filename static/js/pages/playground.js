import { $, el, safeStorage } from "../dom.js";
import { makeEditor } from "../editor.js";
import { loadingText, runner, showResult } from "../runner.js";
import { state } from "../state.js";
import { renderSidebar } from "../sidebar.js";
import { askTutor, setChatKey } from "../tutor.js";

const START = {
  python: `# Playground: write any Python here and press Run (or Ctrl+Enter).
nums = [5, 3, 8, 1]
print("sorted:", sorted(nums))
print("total:", sum(nums))
`,
  js: `// Playground: JavaScript. console.log shows output.
const nums = [5, 3, 8, 1];
console.log("sorted:", [...nums].sort((a, b) => a - b));
`,
  sql: `-- Playground: SQLite. Create tables, insert rows, query them.
CREATE TABLE jobs (id INTEGER, user TEXT, gpus INTEGER);
INSERT INTO jobs VALUES (1, 'ana', 2), (2, 'bo', 8), (3, 'ana', 1);
SELECT user, SUM(gpus) AS gpus FROM jobs GROUP BY user ORDER BY gpus DESC;
`,
};

export function renderPlayground() {
  state.lesson = null; renderSidebar(); setChatKey("playground");
  const storage = safeStorage();
  let lang = storage?.getItem("playground-lang") || "python";
  if (!START[lang]) lang = "python";
  const main = $("#main");
  main.innerHTML = "";
  const host = el("div");
  const output = el("div", { class: "output show", "aria-live": "polite" }, "Output appears here.");
  const picker = el("select", { class: "select", "aria-label": "Language" },
    ["python", "js", "sql"].map((l) => el("option", { value: l }, { python: "Python", js: "JavaScript", sql: "SQL (SQLite)" }[l])));
  picker.value = lang;
  const inner = el("div", { class: "inner" }, el("h1", {}, "Playground"),
    el("p", { class: "muted" }, "Try ideas safely. Nothing here is graded. Your code is kept in this browser."),
    el("div", { class: "toolbar" }, el("label", { class: "muted small" }, "Language: "), picker), host);
  main.append(inner);
  const key = () => `playground:${lang}`;
  const load = () => storage?.getItem(key()) || START[lang];
  const run = async () => {
    try { storage?.setItem(key(), editor.getValue()); } catch (e) { /* ignore */ }
    output.textContent = loadingText(lang);
    const code = editor.getValue();
    const result = lang === "sql" ? await runner.sql(code) : lang === "js" ? await runner.js(code) : await runner.python(code);
    showResult(output, result, false);
  };
  let editor = makeEditor(host, load(), { kind: lang, onRun: run });
  editor.setSize(null, 360);
  picker.onchange = () => {
    try { storage?.setItem(key(), editor.getValue()); storage?.setItem("playground-lang", picker.value); } catch (e) { /* ignore */ }
    lang = picker.value;
    host.innerHTML = "";
    editor = makeEditor(host, load(), { kind: lang, onRun: run });
    editor.setSize(null, 360);
  };
  inner.append(el("div", { class: "toolbar" },
    el("button", { class: "btn primary", onclick: run }, "Run (Ctrl+Enter)"),
    el("button", { class: "btn", onclick: () => askTutor("Explain what this code does, line by line, in simple words.", { context: editor.getValue() }) }, "Explain this code"),
    el("button", { class: "btn", onclick: () => askTutor("Review this code and suggest improvements.", { context: editor.getValue(), mode: "review" }) }, "Review")), output);
}
