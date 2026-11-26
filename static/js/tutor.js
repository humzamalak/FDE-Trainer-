// The tutor drawer. Each lesson (and page) has its own chat, saved in data/chats.json.

import { $, el, perFrame } from "./dom.js";
import { api, authFetch, streamTutor } from "./api.js";
import { renderMarkdown } from "./markdown.js";
import { state } from "./state.js";

const chat = (key) => (state.chats[key] ||= []);

export async function setChatKey(key) {
  state.chatKey = key;
  if (!(key in state.chats)) {
    try {
      const saved = await api(`/api/chats/${encodeURIComponent(key)}`);
      if (!(key in state.chats)) state.chats[key] = saved.messages;
    } catch (e) { state.chats[key] = []; }
  }
  if (!$("#tutor").classList.contains("hidden")) renderTutor();
}

function persistChat(key) {
  authFetch(`/api/chats/${encodeURIComponent(key)}`, { method: "PUT", body: JSON.stringify({ messages: chat(key) }) }).catch(() => {});
}

export function openTutor(prefill) {
  $("#tutor").classList.remove("hidden");
  renderTutor();
  refreshUsage();
  if (prefill) { $("#tutorInput").value = prefill; $("#tutorInput").focus(); }
}

export function renderTutor() {
  const log = $("#tutorLog");
  log.innerHTML = "";
  $("#tutorLesson").textContent = state.lesson ? state.lesson.title : "General questions";
  if (!state.tutorReady) {
    log.append(el("div", { class: "notice" }, "Tutor not set up: add ANTHROPIC_API_KEY to the .env file and restart the app."));
  }
  const messages = chat(state.chatKey);
  if (!messages.length) {
    log.append(el("div", { class: "muted small" },
      "Ask anything about this lesson. Examples: \"Explain this again with an AWS example.\" \"Give me 3 more practice problems.\" \"Quiz me.\""));
  }
  for (const m of messages) {
    const box = el("div", { class: `msg ${m.role}` });
    renderMarkdown(m.content || "…", box);
    log.append(box);
  }
  log.scrollTop = log.scrollHeight;
}

export async function askTutor(text, { context = null, mode = "tutor" } = {}) {
  openTutor();
  const key = state.chatKey;
  const messages = chat(key);
  messages.push({ role: "user", content: text });
  const reply = { role: "assistant", content: "" };
  messages.push(reply);
  renderTutor();
  const box = $("#tutorLog").lastElementChild;
  const draw = perFrame((t) => {
    if (state.chatKey !== key) return;
    renderMarkdown(t, box);
    $("#tutorLog").scrollTop = $("#tutorLog").scrollHeight;
  });
  await streamTutor({ mode, messages: messages.slice(0, -1), lessonId: state.lesson?.id, context }, (t) => {
    reply.content = t;
    draw(t);
  });
  draw.flush();
  persistChat(key);
}

export async function refreshUsage() {
  const target = $("#tutorUsage");
  if (!target || !state.tutorReady) return;
  try {
    const u = await api("/api/usage");
    const budget = u.budget > 0 ? ` of $${u.budget.toFixed(2)}` : "";
    target.textContent = `This month: $${u.cost.toFixed(2)}${budget} · last reply $${(u.last_call_cost || 0).toFixed(4)}`;
    target.classList.toggle("over", !!u.over_budget);
  } catch (e) { target.textContent = ""; }
}

export function wireTutor() {
  $("#tutorToggle").onclick = () => ($("#tutor").classList.contains("hidden") ? openTutor() : $("#tutor").classList.add("hidden"));
  $("#tutorClose").onclick = () => $("#tutor").classList.add("hidden");
  $("#tutorClear").onclick = () => { state.chats[state.chatKey] = []; persistChat(state.chatKey); renderTutor(); };
  $("#tutorForm").onsubmit = (e) => {
    e.preventDefault();
    const text = $("#tutorInput").value.trim();
    if (!text) return;
    $("#tutorInput").value = "";
    askTutor(text);
  };
  $("#tutorInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("#tutorForm").requestSubmit(); }
  });
  document.addEventListener("usage-changed", refreshUsage);
}
