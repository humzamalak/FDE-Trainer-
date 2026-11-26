// Mock interviews. Every mock is saved (data/mocks.json) with its verdict, so you can see progress.

import { $, el, perFrame } from "../dom.js";
import { api, authFetch, streamTutor } from "../api.js";
import { makeEditor } from "../editor.js";
import { renderMarkdown } from "../markdown.js";
import { runner, showResult } from "../runner.js";
import { state } from "../state.js";
import { renderSidebar } from "../sidebar.js";

export const MOCKS = [
  { mode: "coding-interviewer", title: "Live coding", minutes: 35, editor: true,
    desc: "A 35-minute Python round. Talk through your approach in the chat, write code on the right, share it, then ask for feedback.",
    start: "Hello. I am ready for the coding round. Please give me the problem." },
  { mode: "design-interviewer", title: "System design", minutes: 45, editor: false,
    desc: "A 45-minute customer-focused design round, for example deploying an LLM system into a regulated organisation.",
    start: "Hello. I am ready for the system design round. Please give me the scenario." },
  { mode: "customer-case", title: "Customer case", minutes: 40, editor: false,
    desc: "The tutor plays a customer with a vague problem. Run discovery, scope it, propose a solution. Type FEEDBACK to finish.",
    start: "Hello, thank you for meeting me. Can you tell me about the problem you want to solve?" },
  { mode: "behavioural", title: "Behavioural", minutes: 30, editor: false,
    desc: "A hiring manager asks ownership, conflict, failure and ambiguity questions, with follow-ups. Use STAR.",
    start: "Hello. I am ready for the behavioural interview." },
];
const titleOf = (mode) => MOCKS.find((m) => m.mode === mode)?.title || mode;

export async function renderMockMenu() {
  state.lesson = null; renderSidebar();
  const main = $("#main");
  main.innerHTML = "";
  const inner = el("div", { class: "inner" }, el("h1", {}, "Mock interviews"),
    el("p", { class: "muted" }, "Do these from track 7 onwards. Do each type at least 3 times. Read the feedback and fix the top gap before the next mock."));
  if (!state.tutorReady) inner.append(el("div", { class: "notice" }, "Mock interviews need the AI tutor. Add ANTHROPIC_API_KEY to .env and restart."));
  const grid = el("div", { class: "grid" });
  MOCKS.forEach((m) => grid.append(el("a", { class: "card mode-card", href: `#/mock/${m.mode}` },
    el("strong", {}, m.title), el("div", { class: "muted small" }, `${m.minutes} minutes`), el("p", { class: "small" }, m.desc))));
  inner.append(grid, el("h2", {}, "Your past mocks"));
  main.append(inner);
  const { items } = await api("/api/mocks");
  if (!items.length) { inner.append(el("p", { class: "muted" }, "No mocks yet.")); return; }
  inner.append(el("table", { class: "result-table history" },
    el("thead", {}, el("tr", {}, ["Date", "Type", "Turns", "Verdict", ""].map((h) => el("th", {}, h)))),
    el("tbody", {}, items.map((m) => el("tr", {},
      el("td", {}, m.started.replace("T", " ").slice(0, 16)), el("td", {}, titleOf(m.mode)), el("td", {}, String(m.turns)),
      el("td", { class: `verdict ${String(m.verdict || "").replace(/\s+/g, "-")}` }, m.verdict || "no verdict yet"),
      el("td", {}, el("a", { href: `#/mock-view/${m.id}` }, "Open")))))));
}

export async function renderMockView(id) {
  state.lesson = null; renderSidebar();
  const mock = await api(`/api/mocks/${encodeURIComponent(id)}`);
  const main = $("#main");
  main.innerHTML = "";
  const log = el("div", { class: "chat-log transcript" });
  mock.messages.forEach((m, i) => {
    if (i === 0) return;
    const box = el("div", { class: `msg ${m.role}` });
    renderMarkdown(m.content, box);
    log.append(box);
  });
  main.append(el("div", { class: "inner" },
    el("a", { href: "#/mock", class: "btn small" }, "← All mocks"),
    el("h1", {}, `${titleOf(mock.mode)} — ${mock.started.replace("T", " ").slice(0, 16)}`),
    el("p", {}, "Verdict: ", el("strong", {}, mock.verdict || "none")), log));
}

export function renderMock(mode) {
  const m = MOCKS.find((x) => x.mode === mode);
  if (!m) return renderMockMenu();
  state.lesson = null; state.chatKey = `mock:${mode}`; renderSidebar();
  $("#tutor").classList.add("hidden");
  const started = new Date().toISOString().slice(0, 19);
  const mockId = `${started.replace(/[^0-9]/g, "")}-${mode}`;
  const messages = [];
  const main = $("#main");
  main.innerHTML = "";
  const log = el("div", { class: "chat-log", "aria-live": "polite" });
  const input = el("textarea", { rows: 3, "aria-label": "Your answer", placeholder: "Type your answer. Enter to send, Shift+Enter for a new line." });
  const timer = el("span", { class: "timer", role: "timer" }, `${m.minutes}:00`);
  let editor = null;
  let interval = null;

  const save = () => authFetch(`/api/mocks/${mockId}`, { method: "PUT", body: JSON.stringify({ mode, started, messages }) }).catch(() => {});
  const draw = () => {
    log.innerHTML = "";
    messages.forEach((msg, i) => {
      if (i === 0) return; // hide the opening line we send for the candidate
      const box = el("div", { class: `msg ${msg.role}` });
      renderMarkdown(msg.content || "…", box);
      log.append(box);
    });
    log.scrollTop = log.scrollHeight;
  };
  const send = async (text, withCode = false) => {
    messages.push({ role: "user", content: text });
    const reply = { role: "assistant", content: "" };
    messages.push(reply);
    draw();
    const box = log.lastElementChild;
    const paint = perFrame((t) => { renderMarkdown(t, box); log.scrollTop = log.scrollHeight; });
    await streamTutor({ mode, messages: messages.slice(0, -1), context: withCode && editor ? `Candidate's current code:\n${editor.getValue()}` : null }, (t) => {
      reply.content = t; paint(t);
    });
    paint.flush();
    save();
  };
  const startTimer = () => {
    let left = m.minutes * 60;
    clearInterval(interval);
    interval = setInterval(() => {
      left -= 1;
      timer.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
      if (left <= 0) { clearInterval(interval); timer.textContent = "Time up"; }
      if (!document.body.contains(timer)) clearInterval(interval);
    }, 1000);
  };
  const form = el("form", { class: "chat-form", onsubmit: (e) => { e.preventDefault(); const t = input.value.trim(); if (t) { input.value = ""; send(t, true); } } },
    input, el("button", { class: "btn primary" }, "Send"));
  input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); } });

  const header = el("div", { style: "display:flex;gap:12px;align-items:center;margin-bottom:12px;flex-wrap:wrap" },
    el("a", { href: "#/mock", class: "btn small" }, "← All mocks"), el("h2", { style: "margin:0;flex:1" }, m.title), timer,
    el("button", { class: "btn primary", disabled: !state.tutorReady, onclick: (e) => { e.target.disabled = true; startTimer(); send(m.start); } }, "Start"),
    el("button", { class: "btn", disabled: !state.tutorReady, onclick: () => send("FEEDBACK: please stop the interview now and give me full, honest feedback, ending with a verdict: hire, lean hire, lean no or no hire.", true) }, "Get feedback"));

  const chatCol = el("div", { class: "col" }, log, form);
  if (m.editor) {
    const host = el("div", { style: "flex:1;min-height:0" });
    const out = el("div", { class: "output" });
    const runCode = async () => { out.textContent = "Running…"; showResult(out, await runner.python(editor.getValue(), ""), false); };
    const codeCol = el("div", { class: "col" }, host,
      el("div", { class: "toolbar" },
        el("button", { class: "btn", onclick: runCode }, "Run"),
        el("button", { class: "btn", onclick: () => send("Here is my current code. Please look at it.", true) }, "Share code with interviewer")),
      out);
    main.append(header, el("div", { class: "split" }, chatCol, codeCol));
    editor = makeEditor(host, "# Write your solution here\n", { kind: "python", onRun: runCode });
    editor.setSize(null, "100%");
  } else {
    main.append(header, el("div", { class: "split", style: "grid-template-columns:1fr" }, chatCol));
  }
  log.append(el("div", { class: "muted small" }, m.desc + " Press Start when ready. This mock is saved under Mock interviews → Your past mocks."));
}
