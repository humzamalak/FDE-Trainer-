// Live examples in lessons, and the "Practise this lesson" panel at the end of every lesson.

import { el, perFrame } from "./dom.js";
import { api, authFetch, saveProgress, streamTutor } from "./api.js";
import { makeEditor, refreshEditors } from "./editor.js";
import { renderMarkdown } from "./markdown.js";
import { loadingText, runner, showResult } from "./runner.js";
import { state } from "./state.js";
import { askTutor } from "./tutor.js";
import { exerciseWidget } from "./widgets.js";

// Examples that need packages the browser does not have stay read-only.
const NEEDS_MACHINE = /^\s*(?:import|from)\s+(anthropic|openai|requests|httpx|fastapi|pydantic|uvicorn|pytest|mcp|numpy|pandas)\b/m;
const LANGS = { "language-python": "python", "language-javascript": "js", "language-js": "js", "language-sql": "sql" };

// Every Python, JavaScript and SQL example becomes an editor with a Run button.
// Earlier examples of the same language run first (notebook style), so later ones can use them.
export function makeExamplesRunnable(article) {
  const earlier = { python: [], js: [], sql: [] };
  const blocks = [...article.querySelectorAll("pre > code")].filter((c) => [...c.classList].some((k) => k in LANGS));
  blocks.forEach((codeEl) => {
    const lang = LANGS[[...codeEl.classList].find((k) => k in LANGS)];
    const original = codeEl.textContent.replace(/\n$/, "");
    const pre = codeEl.parentElement;
    const needs = lang === "python" && original.match(NEEDS_MACHINE);
    if (needs) {
      pre.before(el("div", { class: "muted small", style: "margin-top:12px" },
        `Read-only example: it uses "${needs[1]}", which runs on your own machine, not in the browser.`));
      return;
    }
    const setup = earlier[lang].join(lang === "sql" ? ";\n" : "\n\n");
    earlier[lang].push(original);
    const host = el("div");
    const output = el("div", { class: "output", "aria-live": "polite" });
    const label = { python: "Try it (Python)", js: "Try it (JavaScript)", sql: "Try it (SQL)" }[lang];
    const card = el("div", { class: "try-card" },
      el("div", { class: "try-head" }, el("span", { class: "tag" }, label),
        el("span", { class: "muted small" }, "Edit the code and run it. Earlier examples on this page run first.")),
      host);
    pre.replaceWith(card);
    const run = async () => {
      output.classList.add("show");
      output.textContent = loadingText(lang); output.dataset.running = "1";
      const code = editor.getValue();
      const result = lang === "python" ? await runner.python(code, "", { setup })
        : lang === "js" ? await runner.js(setup ? setup + "\n" + code : code, "")
        : await runner.sql(code, setup, "");
      showResult(output, result, false);
    };
    const editor = makeEditor(host, original, { kind: lang, onRun: run });
    card.append(el("div", { class: "toolbar" },
      el("button", { class: "btn primary", onclick: run }, "Run"),
      el("button", { class: "btn", onclick: () => editor.setValue(original) }, "Reset"),
      el("button", { class: "btn", onclick: () => askTutor("Explain this example line by line, in simple words. Then ask me one question to check I understood.", { context: editor.getValue() }) }, "Explain this"),
      el("button", { class: "btn", onclick: () => askTutor("Give me a small change to make to this example, and tell me what output to expect. Do not show the changed code.", { context: editor.getValue() }) }, "Give me a challenge")),
      output);
  });
}

export function generatedWidget(ex) {
  return exerciseWidget(ex, {
    onDelete: async (card) => {
      await authFetch(`/api/generated?id=${encodeURIComponent(ex.id)}`, { method: "DELETE" });
      card.remove();
    },
  });
}

// Ask the server for an exercise, check it in the browser sandbox, retry with the error, then save it.
async function generateFor(lesson, level, status, list, buttons) {
  buttons.forEach((b) => (b.disabled = true));
  let feedback = null;
  try {
    for (let attempt = 1; attempt <= 3; attempt++) {
      status.textContent = attempt === 1 ? "Writing a new exercise… (about 10–20 seconds)" : `Fixing the exercise (attempt ${attempt})…`;
      const res = await api("/api/generate", { method: "POST", body: JSON.stringify({ lesson_id: lesson.id, level, feedback }) });
      if (res.error) { status.textContent = res.error; return; }
      const ex = res.exercise;
      status.textContent = "Checking the exercise in Python…";
      const good = await runner.python(ex.solution, ex.tests);
      if (!good.ok) {
        const firstFail = good.error || (good.tests.find((t) => !t.ok) || {}).src || "unknown";
        feedback = `the solution does not pass the tests (${String(firstFail).slice(0, 300)})`;
        continue;
      }
      const bad = await runner.python(ex.starter, ex.tests);
      if (bad.ok) { feedback = "the starter code already passes the tests; the starter must fail"; continue; }
      const saved = await api("/api/generated", { method: "POST", body: JSON.stringify({ lesson_id: lesson.id, exercise: ex, verified: true }) });
      const widget = generatedWidget(saved);
      list.prepend(widget);
      refreshEditors(widget);
      status.textContent = `New exercise ready: "${saved.title}". It passed the checks.`;
      return;
    }
    status.textContent = "Could not make a working exercise this time. Try again, or try Easier.";
  } catch (e) {
    status.textContent = e.message;
  } finally {
    buttons.forEach((b) => (b.disabled = !state.tutorReady));
  }
}

export function practicePanel(lesson) {
  const panel = el("section", { class: "practice" }, el("h2", {}, "Practise this lesson"));
  const needKey = !state.tutorReady
    ? el("div", { class: "notice" }, "The AI practice tools need your API key in .env (then restart the app). The examples and exercises above work without it.")
    : "";
  const ai = (label, prompt, primary = false) =>
    el("button", { class: primary ? "btn primary" : "btn", disabled: !state.tutorReady, onclick: () => askTutor(prompt) }, label);

  const isPythonLesson = lesson.blocks.some((b) => b.kind === "exercise") || /```python/.test(lesson.raw);
  const isOtherCode = lesson.blocks.some((b) => b.kind === "sql" || b.kind === "js");
  if (isPythonLesson) {
    const genStatus = el("div", { class: "muted small", role: "status" });
    const genList = el("div");
    const genButtons = ["easier", "same", "harder"].map((level) =>
      el("button", { class: level === "same" ? "btn primary" : "btn", disabled: !state.tutorReady,
        onclick: () => generateFor(lesson, level, genStatus, genList, genButtons) },
      level === "same" ? "New exercise" : level === "easier" ? "Easier exercise" : "Harder exercise"));
    panel.append(el("div", { class: "card" },
      el("strong", {}, "1. Unlimited exercises"),
      el("p", { class: "muted small" }, "The tutor writes a new exercise for this lesson. The app runs the solution against the tests first, so every exercise you get works. Your exercises are saved here and appear in Drill."),
      needKey, el("div", { class: "toolbar" }, ...genButtons), genStatus, genList));
    api(`/api/generated?lesson_id=${encodeURIComponent(lesson.id)}`).then(({ items }) => {
      items.slice().reverse().forEach((ex) => genList.append(generatedWidget(ex)));
      refreshEditors(genList);
    }).catch(() => {});
  } else if (isOtherCode) {
    const lang = lesson.blocks.some((b) => b.kind === "sql") ? "SQL" : "JavaScript";
    panel.append(el("div", { class: "card" },
      el("strong", {}, `1. More ${lang} practice`),
      el("p", { class: "muted small" }, `The tutor sets a new ${lang} problem in the tutor panel. Write your answer in the editor of any exercise above, run it, then paste it into the chat for feedback.`),
      needKey,
      el("div", { class: "toolbar" },
        ai("New problem", `Give me ONE new ${lang} practice problem for this lesson, with the data or input I need. Do not show the answer. Wait for my attempt, then review it.`, true),
        ai("Harder problem", `Give me ONE harder, interview-style ${lang} problem for this lesson. Do not show the answer. Wait for my attempt, then review it like an interviewer.`))));
  } else {
    panel.append(el("div", { class: "card" },
      el("strong", {}, "1. New scenario"),
      el("p", { class: "muted small" }, "This lesson is about thinking and communication, not code. The tutor gives you a fresh realistic scenario in the tutor panel. Answer it there; it gives feedback and a model answer."),
      needKey,
      el("div", { class: "toolbar" },
        ai("New scenario", "Give me ONE new realistic practice scenario for this lesson, like an interviewer would. Wait for my answer. Then grade it against what this lesson teaches, list what I missed, and show a strong model answer.", true),
        ai("Harder scenario", "Give me ONE harder, more ambiguous scenario for this lesson, with a difficult customer or stakeholder. Push back on my answer twice before you grade it."))));
  }

  panel.append(el("div", { class: "card" },
    el("strong", {}, "2. Quiz me"),
    el("p", { class: "muted small" }, "Five questions, one at a time, in the tutor panel: predict the output, spot the bug, explain why. Answer in the chat."),
    el("div", { class: "toolbar" },
      ai("Start quiz", "Quiz me on this lesson. Ask 5 questions, ONE at a time, and wait for my answer each time. Mix: predict the output of a short code snippet, find the bug, explain a concept, and a small interview-style question. After each answer, say if I am right and why. After question 5, give my score and what to review.", true),
      ai("Make flashcards", "Make 6 flashcards for this lesson. Format: **Q:** … then **A:** … Keep each answer to one or two lines."))));

  // Explain it back (Feynman technique)
  const key = `${lesson.id}#explain`;
  const saved = state.progress.written[key];
  const answer = el("textarea", { class: "answer", "aria-label": "Explain this lesson in your own words", placeholder: "In your own words: what is the main idea of this lesson, when would you use it, and what is one mistake to avoid?" });
  answer.value = saved?.answer || "";
  const feedback = el("div", { class: "feedback", "aria-live": "polite" });
  if (saved?.feedback) { feedback.classList.add("show"); renderMarkdown(saved.feedback, feedback); }
  const submit = el("button", { class: "btn primary", disabled: !state.tutorReady }, "Check my explanation");
  submit.onclick = async () => {
    if (!answer.value.trim()) return;
    submit.disabled = true;
    feedback.classList.add("show");
    feedback.textContent = "Checking…";
    const draw = perFrame((t) => renderMarkdown(t, feedback));
    const text = await streamTutor({
      mode: "review", lessonId: lesson.id,
      context: "Task: the learner explains the lesson in their own words (Feynman technique).",
      messages: [{ role: "user", content: `Grade my explanation of this lesson. Start with a line "Score: N/10" for accuracy, completeness of the key points, and clarity. List what I got wrong or missed. Then give a model explanation in 4 sentences.\n\nMy explanation:\n${answer.value}` }],
    }, draw);
    draw.flush();
    submit.disabled = false;
    saveProgress("written", key, { answer: answer.value, feedback: text });
  };
  panel.append(el("div", { class: "card" },
    el("strong", {}, "3. Explain it back"),
    el("p", { class: "muted small" }, "If you can explain it simply, you understand it. The tutor grades your explanation."),
    answer, el("div", { class: "toolbar" }, submit), feedback));
  return panel;
}
