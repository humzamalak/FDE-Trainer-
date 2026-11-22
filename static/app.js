// FDE Trainer frontend. Plain JavaScript, no build step.
"use strict";

const state = {
  curriculum: [],
  tutorReady: false,
  progress: { lessons: {}, exercises: {}, quizzes: {}, written: {}, last_lesson: null },
  lesson: null,          // the open lesson
  chats: {},             // chat history per context key
  chatKey: "general",
};

const $ = (sel, root = document) => root.querySelector(sel);
const el = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) node.setAttribute(k, v);
  }
  for (const c of children.flat()) node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return node;
};

// ---------- API ----------
async function api(path, options = {}) {
  const res = await fetch(path, { headers: { "Content-Type": "application/json" }, ...options });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}
async function saveProgress(section, key, value) {
  state.progress = await api("/api/progress", { method: "POST", body: JSON.stringify({ section, key, value }) });
  renderSidebar();
}
async function streamTutor({ mode = "tutor", messages, lessonId = null, context = null }, onText) {
  const res = await fetch("/api/tutor", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode, messages, lesson_id: lessonId, context }),
  });
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    full += decoder.decode(value, { stream: true });
    onText(full);
  }
  return full;
}

// ---------- Markdown + maths ----------
// Protect $...$ and $$...$$ from the Markdown parser, then let KaTeX render them.
function renderMarkdown(md, target) {
  const stash = [];
  const parts = md.split(/(```[\s\S]*?```|`[^`\n]*`)/g);
  const protectedMd = parts.map((part, i) => {
    if (i % 2 === 1) return part; // code: leave alone
    // \$ is an escaped dollar sign (money), not maths.
    return part
      .replace(/(?<!\\)\$\$([\s\S]+?)(?<!\\)\$\$/g, (_, tex) => `@@MATH${stash.push({ tex, display: true }) - 1}@@`)
      .replace(/(?<!\\)\$([^\s$](?:[^$\n]*?[^\s$\\])?)\$/g, (_, tex) => `@@MATH${stash.push({ tex, display: false }) - 1}@@`);
  }).join("");
  let html = marked.parse(protectedMd);
  html = DOMPurify.sanitize(html, { ADD_ATTR: ["data-block"] });
  html = html.replace(/@@MATH(\d+)@@/g, (_, n) => {
    const { tex, display } = stash[+n];
    try { return katex.renderToString(tex, { displayMode: display, throwOnError: false }); }
    catch (e) { return tex.replace(/&/g, "&amp;").replace(/</g, "&lt;"); }
  });
  target.innerHTML = html;
  target.querySelectorAll("pre code").forEach((c) => { try { hljs.highlightElement(c); } catch (e) {} });
}

// Short text (quiz questions/options) with inline Markdown such as `code`.
function inlineMd(text) {
  const span = el("span");
  span.innerHTML = DOMPurify.sanitize(marked.parseInline(text || ""));
  return span;
}

// ---------- Python runner (Pyodide in a worker) ----------
const runner = {
  worker: null, ready: null, pending: new Map(), nextId: 1,
  start() {
    this.worker = new Worker("/static/pyworker.js");
    this.ready = new Promise((resolve) => {
      this.worker.onmessage = (e) => {
        if (e.data.type === "ready") return resolve();
        const done = this.pending.get(e.data.id);
        if (done) { this.pending.delete(e.data.id); done(e.data.result); }
      };
    });
  },
  async run(code, tests = "", timeoutMs = 8000) {
    if (!this.worker) this.start();
    await this.ready;
    const id = this.nextId++;
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        this.worker.terminate(); this.worker = null; // kill the stuck code, start fresh next time
        resolve({ ok: false, error: `Time limit (${timeoutMs / 1000}s) reached. Do you have an infinite loop?`, tests: [], stdout: "" });
      }, timeoutMs);
      this.pending.set(id, (r) => { clearTimeout(timer); resolve(r); });
      this.worker.postMessage({ id, code, tests });
    });
  },
};

function showResult(outputEl, result, hasTests) {
  outputEl.innerHTML = "";
  outputEl.classList.add("show");
  if (result.stdout) outputEl.append(el("div", {}, result.stdout));
  if (result.error) outputEl.append(el("div", { class: "test bad" }, result.error));
  for (const t of result.tests) {
    outputEl.append(el("div", { class: `test ${t.ok ? "ok" : "bad"}` },
      `${t.ok ? "✓" : "✗"} ${t.src}${t.msg ? "\n    → " + t.msg : ""}`));
  }
  if (!result.stdout && !result.error && !result.tests.length) outputEl.append(el("div", { class: "muted" }, "(no output)"));
  if (hasTests && !result.error) {
    const passed = result.tests.filter((t) => t.ok).length;
    outputEl.append(el("div", {}, `\n${passed} / ${result.tests.length} tests passed`));
  }
}

function makeEditor(parent, value) {
  return CodeMirror(parent, {
    value, mode: "python", lineNumbers: true, indentUnit: 4, tabSize: 4,
    viewportMargin: Infinity,
    extraKeys: { Tab: (cm) => cm.replaceSelection("    "), "Ctrl-Enter": () => {}, "Cmd-Enter": () => {} },
  });
}

// ---------- Tutor drawer ----------
function chat(key) { return (state.chats[key] ||= []); }

// Chats are saved in data/chats.json, so they survive a restart.
async function setChatKey(key) {
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
  fetch(`/api/chats/${encodeURIComponent(key)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: chat(key) }),
  }).catch(() => {});
}

function openTutor(prefill) {
  $("#tutor").classList.remove("hidden");
  renderTutor();
  if (prefill) { $("#tutorInput").value = prefill; $("#tutorInput").focus(); }
}

function renderTutor() {
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

async function askTutor(text, { context = null, mode = "tutor" } = {}) {
  openTutor();
  const messages = chat(state.chatKey);
  messages.push({ role: "user", content: text });
  const reply = { role: "assistant", content: "" };
  messages.push(reply);
  renderTutor();
  const box = $("#tutorLog").lastElementChild;
  const key = state.chatKey;
  await streamTutor({ mode, messages: messages.slice(0, -1), lessonId: state.lesson?.id, context }, (t) => {
    reply.content = t;
    if (state.chatKey === key) {
      renderMarkdown(t, box);
      $("#tutorLog").scrollTop = $("#tutorLog").scrollHeight;
    }
  });
  persistChat(key);
}

function wireTutor() {
  $("#tutorToggle").onclick = () => $("#tutor").classList.contains("hidden") ? openTutor() : $("#tutor").classList.add("hidden");
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
}

// ---------- Sidebar ----------
function lessonDone(id) { return !!state.progress.lessons[id]; }

function renderSidebar() {
  const side = $("#sidebar");
  side.innerHTML = "";
  for (const track of state.curriculum) {
    const done = track.lessons.filter((l) => lessonDone(l.id)).length;
    const open = state.lesson ? state.lesson.track_id === track.id : false;
    const list = el("ul", { style: open ? "" : "display:none" },
      track.lessons.map((l) => el("li", {},
        el("a", { href: `#/lesson/${l.id}`, class: state.lesson?.id === l.id ? "active" : "" },
          el("span", { class: "tick" }, lessonDone(l.id) ? "✓" : ""), l.title))));
    const title = el("div", { class: "track-title", onclick: () => { list.style.display = list.style.display ? "" : "none"; } },
      el("span", {}, track.title), el("span", { class: "muted" }, `${done}/${track.lessons.length}`));
    side.append(el("div", { class: "track" }, title, list));
  }
}

// ---------- Dashboard ----------
function allLessons() { return state.curriculum.flatMap((t) => t.lessons); }

async function renderDashboard() {
  state.lesson = null; renderSidebar();
  setChatKey("general");
  let stats = null;
  try { stats = await api("/api/stats"); } catch (e) { /* show the page without stats */ }
  const lessons = allLessons();
  const done = lessons.filter((l) => lessonDone(l.id)).length;
  const next = lessons.find((l) => !lessonDone(l.id));
  const last = state.progress.last_lesson && lessons.find((l) => l.id === state.progress.last_lesson);
  const target = last && !lessonDone(last.id) ? last : next;
  const pct = lessons.length ? Math.round((done / lessons.length) * 100) : 0;
  const t = stats?.totals;
  const quizPct = t && t.quiz_answered ? Math.round((t.quiz_correct / t.quiz_answered) * 100) : null;
  const wrong = t ? t.quiz_answered - t.quiz_correct : 0;

  const tile = (label, value, extra) => el("div", {}, el("div", { class: "muted small" }, label), el("div", { class: "stat" }, value), extra || "");
  const main = $("#main");
  main.innerHTML = "";
  const inner = el("div", { class: "inner" });
  inner.append(
    el("h1", {}, "Zero to interview-ready"),
    el("p", { class: "muted" }, "Work through the tracks in order. Each lesson has exercises that run Python in your browser. Use the tutor when you are stuck. Do the mock interviews when you finish track 7."),
    !state.tutorReady ? el("div", { class: "notice" }, "The AI tutor is off. Add your ANTHROPIC_API_KEY to the .env file, then restart the app.") : "",
    el("div", { class: "card" },
      el("div", { class: "grid" },
        tile("LESSONS DONE", `${done} / ${lessons.length}`, el("div", { class: "bar" }, el("i", { style: `width:${pct}%` }))),
        tile("EXERCISES PASSED", t ? `${t.exercises_passed} / ${t.exercises}` : "–"),
        tile("STUDY STREAK", stats ? `${stats.streak} day${stats.streak === 1 ? "" : "s"}` : "–",
          el("div", { class: "muted small" }, stats ? `${stats.active_days} study days in total` : "")),
        tile("QUIZ ACCURACY", quizPct === null ? "–" : `${quizPct}%`,
          wrong > 0 ? el("a", { href: "#/review", class: "small" }, `Review ${wrong} wrong answer${wrong === 1 ? "" : "s"} →`) : "")),
      el("div", { class: "toolbar", style: "margin-top:16px" },
        target ? el("a", { class: "btn primary", href: `#/lesson/${target.id}` }, `Continue: ${target.title}`)
               : el("span", { class: "muted" }, "All lessons done. Do mock interviews."),
        el("a", { class: "btn", href: "#/drill" }, "Timed drill (20 min)"),
        el("a", { class: "btn", href: "#/review" }, "Review queue"))),
  );
  for (const track of state.curriculum) {
    const d = track.lessons.filter((l) => lessonDone(l.id)).length;
    const ts = stats?.tracks.find((x) => x.id === track.id);
    const mins = track.lessons.reduce((a, l) => a + l.minutes, 0);
    const meta = `${d}/${track.lessons.length} lessons` + (ts && ts.exercises ? ` · ${ts.exercises_passed}/${ts.exercises} exercises` : "") + ` · about ${Math.round(mins / 60)}h`;
    const card = el("div", { class: "card" },
      el("div", { style: "display:flex;justify-content:space-between;gap:12px" },
        el("strong", {}, track.title), el("span", { class: "muted small" }, meta)),
      el("div", { class: "bar", style: "margin:8px 0" }, el("i", { style: `width:${Math.round((d / track.lessons.length) * 100)}%` })));
    const desc = el("div", { class: "muted small" });
    renderMarkdown(track.description, desc);
    card.append(desc);
    inner.append(card);
  }
  main.append(inner);
}

// ---------- Lesson ----------
async function renderLesson(id) {
  const lesson = await api(`/api/lesson/${id}`);
  state.lesson = lesson;
  saveProgress("last_lesson", null, id);
  renderSidebar();
  setChatKey(id);

  const main = $("#main");
  main.innerHTML = "";
  main.scrollTop = 0;
  const article = el("article", { class: "inner lesson" });
  renderMarkdown(lesson.markdown, article);
  article.querySelectorAll("[data-block]").forEach((slot) => {
    const block = lesson.blocks[+slot.dataset.block];
    const widget = block.kind === "exercise" ? exerciseWidget(block)
      : block.kind === "quiz" ? quizWidget(block) : writtenWidget(block);
    slot.replaceWith(widget);
  });

  const lessons = allLessons();
  const i = lessons.findIndex((l) => l.id === id);
  const doneBtn = el("button", { class: "btn primary" }, lessonDone(id) ? "✓ Completed (click to undo)" : "Mark lesson complete");
  doneBtn.onclick = async () => {
    await saveProgress("lessons", id, lessonDone(id) ? null : new Date().toISOString());
    doneBtn.textContent = lessonDone(id) ? "✓ Completed (click to undo)" : "Mark lesson complete";
  };
  article.append(el("div", { class: "lesson-nav" },
    i > 0 ? el("a", { class: "btn", href: `#/lesson/${lessons[i - 1].id}` }, "← " + lessons[i - 1].title) : el("span"),
    doneBtn,
    i < lessons.length - 1 ? el("a", { class: "btn", href: `#/lesson/${lessons[i + 1].id}` }, lessons[i + 1].title + " →") : el("span")));
  main.append(article);
  article.querySelectorAll(".CodeMirror").forEach((cm) => cm.CodeMirror.refresh());
}

// opts.fresh: start from the starter code (drill mode), not the saved code.
// opts.onCheck(result): called after each test run.
function exerciseWidget(block, opts = {}) {
  const saved = state.progress.exercises[block.id];
  const status = el("span", { class: "state" }, saved?.passed ? "✓ passed" : "");
  const prompt = el("div");
  renderMarkdown(block.prompt, prompt);
  const editorHost = el("div");
  const output = el("div", { class: "output" });
  const banner = el("div");
  const body = el("div", { class: "block-body" }, prompt, editorHost);
  const card = el("div", { class: "block-card" },
    el("div", { class: "block-head" }, el("span", { class: "tag" }, "Exercise"), block.title, status), body);
  const editor = makeEditor(editorHost, (!opts.fresh && saved?.code) || block.starter || "");
  let lastResult = null;

  const run = async (withTests) => {
    output.classList.add("show");
    output.textContent = runner.worker ? "Running…" : "Loading Python (first run takes a few seconds)…";
    const result = await runner.run(editor.getValue(), withTests ? block.tests : "");
    lastResult = result;
    showResult(output, result, withTests);
    if (withTests) {
      banner.className = `pass-banner ${result.ok ? "ok" : "bad"}`;
      banner.textContent = result.ok ? "All tests pass. Well done." : "Not yet. Read the first ✗ line, fix it, and try again.";
      if (result.ok) status.textContent = "✓ passed";
      const before = state.progress.exercises[block.id];
      await saveProgress("exercises", block.id, { passed: result.ok || !!before?.passed, code: editor.getValue() });
      if (opts.onCheck) opts.onCheck(result);
    }
  };
  const context = () => `Exercise: ${block.title}\n${block.prompt}\n\nTests:\n${block.tests}\n\nMy code:\n${editor.getValue()}\n\nLast result:\n${lastResult ? JSON.stringify(lastResult, null, 1) : "not run yet"}`;
  const solution = el("div", { style: "display:none" });
  if (block.solution) renderMarkdown("```python\n" + block.solution + "\n```", solution);

  body.append(
    el("div", { class: "toolbar" },
      el("button", { class: "btn", onclick: () => run(false) }, "Run"),
      el("button", { class: "btn primary", onclick: () => run(true) }, "Check (run tests)"),
      el("button", { class: "btn", onclick: () => askTutor("Give me one small hint for this exercise. Do not give the solution.", { context: context() }) }, "Hint"),
      el("button", { class: "btn", onclick: () => askTutor("Explain my error in simple words and tell me where to look.", { context: context() }) }, "Explain my error"),
      el("button", { class: "btn", onclick: () => askTutor("Review my code. Is it correct, readable and efficient? What would an interviewer say?", { context: context(), mode: "review" }) }, "Review my code"),
      el("button", { class: "btn", onclick: () => { editor.setValue(block.starter || ""); } }, "Reset"),
      block.solution ? el("button", { class: "btn", onclick: (e) => {
        const show = solution.style.display === "none";
        solution.style.display = show ? "" : "none";
        e.target.textContent = show ? "Hide solution" : "Show solution";
      } }, "Show solution") : ""),
    output, banner, solution);
  return card;
}

function quizWidget(block) {
  const body = el("div", { class: "block-body" });
  block.questions.forEach((q, qi) => {
    const key = `${block.id}/${qi}`;
    const prev = state.progress.quizzes[key];
    const explain = el("div", { class: "explain" });
    const box = el("div", { class: "quiz-q" }, el("div", {}, el("strong", {}, `${qi + 1}. `), inlineMd(q.question)));
    const buttons = q.options.map((opt) => el("button", { class: "btn opt" }, inlineMd(opt)));
    const reveal = (choice) => {
      buttons.forEach((b, bi) => {
        b.classList.toggle("right", bi === q.answer);
        b.classList.toggle("wrong", bi === choice && choice !== q.answer);
      });
      explain.textContent = (choice === q.answer ? "Correct. " : "Not correct. ") + (q.explanation || "");
    };
    buttons.forEach((b, oi) => b.onclick = () => { reveal(oi); saveProgress("quizzes", key, oi === q.answer); });
    if (prev !== undefined) explain.textContent = prev ? "You answered this correctly before." : "You got this wrong before. Try again.";
    box.append(...buttons, explain);
    body.append(box);
  });
  return el("div", { class: "block-card" }, el("div", { class: "block-head" }, el("span", { class: "tag" }, "Quiz"), "Check your understanding"), body);
}

function writtenWidget(block) {
  const saved = state.progress.written[block.id];
  const prompt = el("div");
  renderMarkdown(block.prompt, prompt);
  const answer = el("textarea", { class: "answer", placeholder: "Write your answer here. The tutor grades it against a rubric." });
  answer.value = saved?.answer || "";
  const feedback = el("div", { class: "feedback" });
  if (saved?.feedback) { feedback.classList.add("show"); renderMarkdown(saved.feedback, feedback); }
  const submit = el("button", { class: "btn primary" }, "Submit for grading");
  submit.onclick = async () => {
    if (!answer.value.trim()) return;
    submit.disabled = true;
    feedback.classList.add("show");
    feedback.textContent = "Grading…";
    const text = await streamTutor({
      mode: "review",
      lessonId: state.lesson?.id,
      context: `Task: ${block.title}\n${block.prompt}\n\nRubric:\n${block.rubric || "Use your judgement."}`,
      messages: [{ role: "user", content: `Grade my answer:\n\n${answer.value}` }],
    }, (t) => renderMarkdown(t, feedback));
    submit.disabled = false;
    saveProgress("written", block.id, { answer: answer.value, feedback: text });
  };
  return el("div", { class: "block-card" },
    el("div", { class: "block-head" }, el("span", { class: "tag" }, "Written task"), block.title),
    el("div", { class: "block-body" }, prompt, answer, el("div", { class: "toolbar" }, submit), feedback));
}

// ---------- Playground ----------
const PLAYGROUND_START = `# Playground: write any Python here and press Run (or Ctrl+Enter).
nums = [5, 3, 8, 1]
print("sorted:", sorted(nums))
print("total:", sum(nums))
`;
function renderPlayground() {
  state.lesson = null; renderSidebar(); setChatKey("playground");
  const main = $("#main");
  main.innerHTML = "";
  const host = el("div");
  const output = el("div", { class: "output show" }, "Output appears here.");
  let code;
  try { code = localStorage.getItem("playground") || PLAYGROUND_START; } catch (e) { code = PLAYGROUND_START; }
  const inner = el("div", { class: "inner" }, el("h1", {}, "Playground"),
    el("p", { class: "muted" }, "Try ideas safely. Nothing here is graded. Your code is kept in this browser."), host);
  main.append(inner);
  const editor = makeEditor(host, code);
  editor.setSize(null, 360);
  const run = async () => {
    try { localStorage.setItem("playground", editor.getValue()); } catch (e) {}
    output.textContent = "Running…";
    showResult(output, await runner.run(editor.getValue(), ""), false);
  };
  editor.setOption("extraKeys", { Tab: (cm) => cm.replaceSelection("    "), "Ctrl-Enter": run, "Cmd-Enter": run });
  inner.append(el("div", { class: "toolbar" },
    el("button", { class: "btn primary", onclick: run }, "Run (Ctrl+Enter)"),
    el("button", { class: "btn", onclick: () => askTutor("Explain what this code does, line by line, in simple words.", { context: editor.getValue() }) }, "Explain this code"),
    el("button", { class: "btn", onclick: () => askTutor("Review this code and suggest improvements.", { context: editor.getValue(), mode: "review" }) }, "Review")), output);
}

// ---------- Review queue: quiz questions you got wrong ----------
async function renderReview() {
  state.lesson = null; renderSidebar(); setChatKey("review");
  const { items } = await api("/api/review");
  const main = $("#main");
  main.innerHTML = "";
  const inner = el("div", { class: "inner" }, el("h1", {}, "Review queue"),
    el("p", { class: "muted" }, "Quiz questions you answered wrongly. Answer them again. A correct answer removes the question from the queue. If you get one wrong twice, reread the lesson."));
  if (!items.length) inner.append(el("div", { class: "card" }, "Nothing to review. Well done. Answer more quizzes in the lessons."));
  const count = el("p", { class: "muted small" }, `${items.length} question${items.length === 1 ? "" : "s"} to review`);
  if (items.length) inner.append(count);
  let left = items.length;
  for (const item of items) {
    const explain = el("div", { class: "explain" });
    const card = el("div", { class: "card quiz-q" },
      el("div", { class: "muted small" }, "From: ", el("a", { href: `#/lesson/${item.lesson_id}` }, item.lesson_title)),
      el("div", { style: "margin:6px 0" }, el("strong", {}, inlineMd(item.question))));
    const buttons = item.options.map((opt) => el("button", { class: "btn opt" }, inlineMd(opt)));
    buttons.forEach((b, oi) => b.onclick = async () => {
      const right = oi === item.answer;
      buttons.forEach((x, xi) => {
        x.classList.toggle("right", xi === item.answer);
        x.classList.toggle("wrong", xi === oi && !right);
        x.disabled = true;
      });
      explain.textContent = (right ? "Correct. Removed from the queue. " : "Not correct. It stays in the queue. ") + (item.explanation || "");
      await saveProgress("quizzes", item.key, right);
      if (right) { left -= 1; count.textContent = `${left} question${left === 1 ? "" : "s"} to review`; }
    });
    card.append(...buttons, explain);
    inner.append(card);
  }
  main.append(inner);
}

// ---------- Timed drill: a random exercise from lessons you have studied ----------
const lessonCache = {};
async function getLesson(id) { return (lessonCache[id] ||= await api(`/api/lesson/${id}`)); }
let lastDrillId = null;

async function renderDrill() {
  state.lesson = null; renderSidebar(); setChatKey("drill");
  const main = $("#main");
  main.innerHTML = "";
  const inner = el("div", { class: "inner" }, el("h1", {}, "Timed drill"),
    el("p", { class: "muted" }, "A random exercise from lessons you have completed or practised, with an empty editor. Solve it from memory in 20 minutes, talking aloud. This is spaced repetition plus interview pressure."));
  main.append(inner);

  const studied = allLessons().filter((l) =>
    lessonDone(l.id) || Object.entries(state.progress.exercises).some(([k, v]) => k.startsWith(l.id + "#") && v?.passed));
  if (!studied.length) {
    inner.append(el("div", { class: "card" }, "Complete a lesson or pass an exercise first. Then come back for drills."));
    return;
  }
  const pool = [];
  for (const l of studied) {
    const data = await getLesson(l.id);
    data.blocks.filter((b) => b.kind === "exercise").forEach((b) => pool.push({ lesson: data, block: b }));
  }
  if (!pool.length) {
    inner.append(el("div", { class: "card" }, "Your completed lessons have no coding exercises yet. Complete a track 1 lesson."));
    return;
  }
  const choices = pool.length > 1 ? pool.filter((p) => p.block.id !== lastDrillId) : pool;
  const pick = choices[Math.floor(Math.random() * choices.length)];
  lastDrillId = pick.block.id;

  const LIMIT = 20 * 60;
  const startedAt = Date.now();
  const timer = el("span", { class: "timer" }, "20:00");
  let finished = false;
  const tick = setInterval(() => {
    if (!document.body.contains(timer) || finished) return clearInterval(tick);
    const left = LIMIT - Math.floor((Date.now() - startedAt) / 1000);
    timer.textContent = left > 0 ? `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}` : "Time up";
  }, 1000);
  const result = el("div");
  inner.append(
    el("div", { style: "display:flex;gap:12px;align-items:center;flex-wrap:wrap" },
      timer,
      el("span", { class: "muted small", style: "flex:1" }, "From: ", el("a", { href: `#/lesson/${pick.lesson.id}` }, pick.lesson.title)),
      el("button", { class: "btn", onclick: () => renderDrill() }, "New drill")),
    exerciseWidget(pick.block, {
      fresh: true,
      onCheck: (r) => {
        if (!r.ok || finished) return;
        finished = true;
        const secs = Math.floor((Date.now() - startedAt) / 1000);
        const inTime = secs <= LIMIT;
        result.className = `pass-banner ${inTime ? "ok" : "bad"}`;
        result.textContent = `Solved in ${Math.floor(secs / 60)} min ${secs % 60} s` + (inTime ? " — inside the 20-minute limit." : " — over the limit. Drill this pattern again.");
      },
    }),
    result);
  inner.querySelectorAll(".CodeMirror").forEach((cm) => cm.CodeMirror.refresh());
}

// ---------- Mock interviews ----------
const MOCKS = [
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

function renderMockMenu() {
  state.lesson = null; renderSidebar();
  const main = $("#main");
  main.innerHTML = "";
  const inner = el("div", { class: "inner" }, el("h1", {}, "Mock interviews"),
    el("p", { class: "muted" }, "Do these from track 7 onwards. Do each type at least 3 times. Save the feedback and fix the top gap before the next mock."));
  if (!state.tutorReady) inner.append(el("div", { class: "notice" }, "Mock interviews need the AI tutor. Add ANTHROPIC_API_KEY to .env and restart."));
  const grid = el("div", { class: "grid" });
  MOCKS.forEach((m) => grid.append(el("a", { class: "card mode-card", href: `#/mock/${m.mode}`, style: "text-decoration:none;color:inherit" },
    el("strong", {}, m.title), el("div", { class: "muted small" }, `${m.minutes} minutes`), el("p", { class: "small" }, m.desc))));
  inner.append(grid);
  main.append(inner);
}

function renderMock(mode) {
  const m = MOCKS.find((x) => x.mode === mode);
  if (!m) return renderMockMenu();
  state.lesson = null; state.chatKey = `mock:${mode}`; renderSidebar();
  $("#tutor").classList.add("hidden");
  const messages = [];
  const main = $("#main");
  main.innerHTML = "";
  const log = el("div", { class: "chat-log" });
  const input = el("textarea", { rows: 3, placeholder: "Type your answer. Enter to send, Shift+Enter for a new line." });
  const timer = el("span", { class: "timer" }, `${m.minutes}:00`);
  let editor = null, interval = null;

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
    await streamTutor({ mode, messages: messages.slice(0, -1), context: withCode && editor ? `Candidate's current code:\n${editor.getValue()}` : null }, (t) => {
      reply.content = t; renderMarkdown(t, box); log.scrollTop = log.scrollHeight;
    });
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
    el("button", { class: "btn primary", onclick: (e) => { e.target.disabled = true; startTimer(); send(m.start); } }, "Start"),
    el("button", { class: "btn", onclick: () => send("FEEDBACK: please stop the interview now and give me full, honest feedback with a verdict.", true) }, "Get feedback"));

  const chatCol = el("div", { class: "col" }, log, form);
  if (m.editor) {
    const host = el("div", { style: "flex:1;min-height:0" });
    const out = el("div", { class: "output" });
    const codeCol = el("div", { class: "col" }, host,
      el("div", { class: "toolbar" },
        el("button", { class: "btn", onclick: async () => { out.textContent = "Running…"; showResult(out, await runner.run(editor.getValue(), ""), false); } }, "Run"),
        el("button", { class: "btn", onclick: () => send("Here is my current code. Please look at it.", true) }, "Share code with interviewer")),
      out);
    main.append(header, el("div", { class: "split" }, chatCol, codeCol));
    editor = makeEditor(host, "# Write your solution here\n");
    editor.setSize(null, "100%");
  } else {
    main.append(header, el("div", { class: "split", style: "grid-template-columns:1fr" }, chatCol));
  }
  log.append(el("div", { class: "muted small" }, m.desc + " Press Start when ready."));
}

// ---------- Router ----------
async function route() {
  const hash = location.hash.replace(/^#\/?/, "");
  $("#main").scrollTop = 0;
  try {
    if (hash.startsWith("lesson/")) await renderLesson(decodeURIComponent(hash.slice(7)));
    else if (hash === "playground") renderPlayground();
    else if (hash === "review") await renderReview();
    else if (hash === "drill") await renderDrill();
    else if (hash.startsWith("mock/")) renderMock(hash.slice(5));
    else if (hash === "mock") renderMockMenu();
    else await renderDashboard();
  } catch (err) {
    $("#main").innerHTML = "";
    $("#main").append(el("div", { class: "inner" }, el("div", { class: "notice" }, `Error: ${err.message}`)));
  }
}

async function init() {
  wireTutor();
  const [cur, progress] = await Promise.all([api("/api/curriculum"), api("/api/progress")]);
  state.curriculum = cur.tracks;
  state.tutorReady = cur.tutor_ready;
  state.progress = progress;
  window.addEventListener("hashchange", route);
  route();
}
init();
