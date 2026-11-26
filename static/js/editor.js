// Code editor (CodeMirror 5, bundled). Tab inserts spaces; press Esc to leave the editor,
// so keyboard users are never trapped (the next button gets focus).

import { el } from "./dom.js";

const MODES = { python: "python", exercise: "python", js: "javascript", sql: "text/x-sql" };

export function makeEditor(parent, value, { kind = "python", onRun = null } = {}) {
  const editor = CodeMirror(parent, {
    value, mode: MODES[kind] || "python", lineNumbers: true, indentUnit: 4, tabSize: 4,
    viewportMargin: Infinity,
  });
  const leave = () => {
    const card = parent.closest(".block-card, .try-card, .inner, main") || document.body;
    const next = card.querySelector(".toolbar button, .toolbar a");
    editor.getInputField().blur();
    if (next) next.focus();
  };
  const run = () => { if (onRun) onRun(); };
  editor.setOption("extraKeys", {
    Tab: (cm) => (cm.somethingSelected() ? cm.indentSelection("add") : cm.replaceSelection("    ")),
    "Shift-Tab": (cm) => cm.indentSelection("subtract"),
    Esc: leave,
    "Ctrl-Enter": run,
    "Cmd-Enter": run,
  });
  parent.append(el("div", { class: "editor-hint" }, onRun ? "Ctrl+Enter runs · Esc leaves the editor" : "Esc leaves the editor"));
  return editor;
}

export const refreshEditors = (root) => root.querySelectorAll(".CodeMirror").forEach((cm) => cm.CodeMirror.refresh());
