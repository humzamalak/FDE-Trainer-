// Mock interviews. Every mock is saved (data/mocks.json) with its verdict, so you can see progress.

import { $, el, perFrame, safeStorage } from "../dom.js";
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
  { mode: "decomposition", title: "Decomposition", minutes: 45, editor: false,
    desc: "A big, vague real-world problem. Clarify the goal, break it down, choose what to do first, name the data, propose a first version. Track 5b teaches the method.",
    start: "Hello. I am ready for the decomposition round. Please give me the problem." },
  { mode: "client-roleplay", title: "Hard client conversation", minutes: 25, editor: false,
    desc: "The tutor plays a difficult stakeholder: an angry sponsor, scope creep, an impossible deadline, a blocked rollout. Stay calm, be honest, offer options. Type FEEDBACK to finish.",
    start: "Hello, you wanted to talk to me?" },
  { mode: "deep-dive", title: "Project deep dive", minutes: 45, editor: false,
    desc: "Present one project you built. The interviewer asks why, what broke, what you did yourself, and what you would change. Prepare with track 7's deep-dive lesson.",
    start: "Hello. I am ready for the project deep dive." },
  { mode: "debugging", title: "Debugging round", minutes: 40, editor: true,
    desc: "The interviewer gives you a short broken program and a bug report. Paste it into the editor, find the bug with tests, fix it, and explain. Track 3d teaches the method.",
    start: "Hello. I am ready for the debugging round. Please give me the code and the bug report." },
];

// A typical FDE onsite loop. A loop day runs these back to back, like the real thing.
export const LOOP = ["coding-interviewer", "decomposition", "customer-case", "deep-dive", "behavioural"];
const VERDICT_SCORE = { "strong hire": 4, hire: 4, "lean hire": 3, "lean no": 2, "lean no hire": 2, "no hire": 1 };
const passed = (verdict) => (VERDICT_SCORE[verdict] || 0) >= 3;
const LOOP_KEY = "fde-loop-day";
const titleOf = (mode) => MOCKS.find((m) => m.mode === mode)?.title || mode;

export async function renderMockMenu() {
  state.lesson = null; renderSidebar();
  const main = $("#main");
  main.innerHTML = "";
  const inner = el("div", { class: "inner" }, el("h1", {}, "Mock interviews"),
    el("p", { class: "muted" }, "Do these from track 7 onwards. Do each type at least 3 times. Read the feedback and fix the top gap before the next mock. When each type passes, run a full loop day."),
    el("div", { class: "toolbar" }, el("a", { class: "btn primary", href: "#/loop" }, "Full loop day (about 3.5 hours)")));
  if (!state.tutorReady) inner.append(el("div", { class: "notice" }, "Mock interviews need the AI tutor. Add ANTHROPIC_API_KEY to .env and restart."));
  const grid = el("div", { class: "grid" });
  MOCKS.forEach((m) => grid.append(el("a", { class: "card mode-card", href: `#/mock/${m.mode}` },
    el("strong", {}, m.title), el("div", { class: "muted small" }, `${m.minutes} minutes`), el("p", { class: "small" }, m.desc))));
  inner.append(grid, el("h2", {}, "Your past mocks"));
  main.append(inner);
  const { items } = await api("/api/mocks");
  inner.insertBefore(readinessCard(items), grid);
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

// Readiness: for each loop round, how many of your last 3 mocks of that type passed (hire or lean hire).
export function readiness(items) {
  const rows = LOOP.map((mode) => {
    const last = items.filter((m) => m.mode === mode).sort((a, b) => b.started.localeCompare(a.started)).slice(0, 3);
    return { mode, title: titleOf(mode), done: last.length, passes: last.filter((m) => passed(m.verdict)).length };
  });
  const score = Math.round((100 * rows.reduce((a, r) => a + r.passes, 0)) / (rows.length * 3));
  return { rows, score };
}

function readinessCard(items) {
  const { rows, score } = readiness(items);
  const label = score >= 80 ? "Ready: start applying, and keep one mock per week." : score >= 50 ? "Close: fix the weakest round first." : "Not ready yet: do more mocks of each type.";
  return el("div", { class: "card" },
    el("div", { class: "muted small" }, "INTERVIEW READINESS (passes in your last 3 mocks of each loop round)"),
    el("div", { class: "stat" }, `${score}%`), el("div", { class: "bar" }, el("i", { style: `width:${score}%` })),
    el("p", { class: "small" }, label),
    el("ul", { class: "small" }, rows.map((r) => el("li", {}, `${r.title}: ${r.passes} / 3 passed`, r.done < 3 ? el("span", { class: "muted" }, ` (${r.done} done)`) : ""))));
}

export async function renderLoopDay() {
  state.lesson = null; renderSidebar();
  const storage = safeStorage();
  let loop = null;
  try { loop = JSON.parse(storage?.getItem(LOOP_KEY) || "null"); } catch (e) { /* ignore */ }
  const { items } = await api("/api/mocks");
  const main = $("#main");
  main.innerHTML = "";
  const inner = el("div", { class: "inner" }, el("a", { href: "#/mock", class: "btn small" }, "← All mocks"),
    el("h1", {}, "Full loop day"),
    el("p", {}, "Real FDE onsites are 4–6 interviews in one day. Tiredness changes how you perform, so practise the whole day at least twice before a real loop. Do the rounds in order with a 10-minute break between them. Ask for feedback at the end of each round so it gets a verdict."));
  main.append(inner);
  const start = () => { try { storage?.setItem(LOOP_KEY, JSON.stringify({ started: new Date().toISOString().slice(0, 19) })); } catch (e) { /* ignore */ } renderLoopDay(); };
  if (!loop) {
    inner.append(el("ol", {}, LOOP.map((mode) => el("li", {}, `${titleOf(mode)} (${MOCKS.find((m) => m.mode === mode).minutes} min)`))),
      el("button", { class: "btn primary", disabled: !state.tutorReady, onclick: start }, "Start a loop day"));
    return;
  }
  const rounds = LOOP.map((mode) => {
    const mock = items.filter((m) => m.mode === mode && m.started >= loop.started).sort((a, b) => b.started.localeCompare(a.started))[0];
    return { mode, mock };
  });
  const scored = rounds.filter((r) => r.mock?.verdict);
  const total = rounds.reduce((a, r) => a + (VERDICT_SCORE[r.mock?.verdict] || 0), 0);
  const pct = Math.round((100 * total) / (4 * rounds.length));
  inner.append(el("p", { class: "muted small" }, `Started ${loop.started.replace("T", " ")}.`),
    el("table", { class: "result-table history" },
      el("thead", {}, el("tr", {}, ["Round", "Status", "Verdict", ""].map((h) => el("th", {}, h)))),
      el("tbody", {}, rounds.map((r) => el("tr", {},
        el("td", {}, titleOf(r.mode)),
        el("td", {}, r.mock ? `${r.mock.turns} turns` : "not started"),
        el("td", { class: "verdict" }, r.mock?.verdict || "–"),
        el("td", {}, r.mock?.verdict ? el("a", { href: `#/mock-view/${r.mock.id}` }, "Open") : el("a", { class: "btn small primary", href: `#/mock/${r.mode}` }, r.mock ? "Continue (new attempt)" : "Start")))))));
  if (scored.length === rounds.length) {
    const fails = rounds.filter((r) => !passed(r.mock.verdict)).map((r) => titleOf(r.mode));
    const hires = rounds.filter((r) => (VERDICT_SCORE[r.mock.verdict] || 0) === 4).length;
    // Real hiring committees usually need no clear "no" and at least one strong signal.
    const outcome = !fails.length && hires >= 1 ? "Likely offer." : fails.length === 1 ? `Borderline: one weak round (${fails[0]}).` : `Likely no offer. Weak rounds: ${fails.join(", ")}.`;
    inner.append(el("div", { class: "card" }, el("div", { class: "muted small" }, "LOOP RESULT"), el("div", { class: "stat" }, `${pct}%`),
      el("p", {}, outcome), el("p", { class: "small muted" }, "Next: write down the top gap from each round, fix the weakest round first, and run another loop day in 2–3 weeks.")));
  } else {
    inner.append(el("p", { class: "muted small" }, `${scored.length} of ${rounds.length} rounds have a verdict.`));
  }
  inner.append(el("div", { class: "toolbar" }, el("button", { class: "btn", onclick: () => { try { storage?.removeItem(LOOP_KEY); } catch (e) { /* ignore */ } renderLoopDay(); } }, "End this loop day")));
}
