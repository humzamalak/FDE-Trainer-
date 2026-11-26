// Interactive blocks inside lessons: exercises (Python, SQL, JavaScript), quizzes, written tasks,
// checklists (project milestones) and flashcards.

import { el, perFrame } from "./dom.js";
import { reviewItem, saveProgress, streamTutor } from "./api.js";
import { makeEditor } from "./editor.js";
import { inlineMd, renderMarkdown } from "./markdown.js";
import { loadingText, runner, showResult } from "./runner.js";
import { state } from "./state.js";
import { askTutor } from "./tutor.js";

const LANG = { exercise: "python", sql: "sql", js: "javascript" };
const TAG = { exercise: "Exercise", sql: "SQL exercise", js: "JavaScript exercise" };

async function check(block, code, withTests) {
  if (block.kind === "sql") return runner.sql(code, block.schema || "", withTests ? block.solution : "");
  if (block.kind === "js") return runner.js(code, withTests ? block.tests : "");
  return runner.python(code, withTests ? block.tests : "");
}

// opts.fresh: start from the starter code (drill mode), not the saved code.
// opts.onCheck(result): called after each test run.  opts.onDelete(card): show a Delete button.
export function exerciseWidget(block, opts = {}) {
  const kind = block.kind === "sql" || block.kind === "js" ? block.kind : "exercise";
  const saved = state.progress.exercises[block.id];
  const status = el("span", { class: "state" }, saved?.passed ? "✓ passed" : "");
  const prompt = el("div");
  renderMarkdown(block.prompt, prompt);
  const editorHost = el("div");
  const output = el("div", { class: "output", "aria-live": "polite" });
  const banner = el("div", { role: "status" });
  const body = el("div", { class: "block-body" }, prompt);
  if (kind === "sql" && block.schema) {
    const schema = el("details", { class: "schema" }, el("summary", {}, "Tables and data for this exercise"));
    const pre = el("div");
    renderMarkdown("```sql\n" + block.schema + "\n```", pre);
    schema.append(pre);
    body.append(schema);
  }
  body.append(editorHost);
  const card = el("div", { class: "block-card" },
    el("div", { class: "block-head" }, el("span", { class: "tag" }, block.generated ? "AI exercise" : TAG[kind]), block.title, status,
      opts.onDelete ? el("button", { class: "btn small", title: "Delete this exercise", onclick: () => opts.onDelete(card) }, "Delete") : ""), body);
  let lastResult = null;

  const run = async (withTests) => {
    output.classList.add("show");
    output.textContent = loadingText(kind); output.dataset.running = "1";
    const result = await check(block, editor.getValue(), withTests);
    lastResult = result;
    showResult(output, result, withTests);
    if (!withTests) return;
    banner.className = `pass-banner ${result.ok ? "ok" : "bad"}`;
    banner.textContent = result.ok ? "All checks pass. Well done." : "Not yet. Read the first ✗ line, fix it, and try again.";
    const before = state.progress.exercises[block.id];
    if (result.ok) status.textContent = "✓ passed";
    await saveProgress("exercises", block.id, { passed: result.ok || !!before?.passed, code: editor.getValue() });
    // First pass outside a drill: schedule it for spaced repetition (due tomorrow).
    if (result.ok && !opts.fresh && !state.progress.srs?.[block.id]) await reviewItem(block.id, 4);
    if (opts.onCheck) opts.onCheck(result);
  };
  const editor = makeEditor(editorHost, (!opts.fresh && saved?.code) || block.starter || "", { kind, onRun: () => run(false) });

  const context = () => `${TAG[kind]}: ${block.title}\n${block.prompt}\n\n${kind === "sql" ? `Schema:\n${block.schema}` : `Tests:\n${block.tests}`}\n\nMy code:\n${editor.getValue()}\n\nLast result:\n${lastResult ? JSON.stringify(lastResult, null, 1).slice(0, 4000) : "not run yet"}`;
  const hintBox = el("div", { class: "explain", style: "display:none" });
  const solution = el("div", { style: "display:none" });
  if (block.solution) renderMarkdown("```" + LANG[kind] + "\n" + block.solution + "\n```", solution);

  body.append(
    el("div", { class: "toolbar" },
      el("button", { class: "btn", onclick: () => run(false) }, "Run"),
      el("button", { class: "btn primary", onclick: () => run(true) }, "Check"),
      el("button", { class: "btn", onclick: () => {
        if (block.hint && !hintBox.textContent) { hintBox.textContent = "Hint: " + block.hint; hintBox.style.display = ""; return; }
        askTutor("Give me one small hint for this exercise. Do not give the solution.", { context: context() });
      } }, "Hint"),
      el("button", { class: "btn", onclick: () => askTutor("Explain my error in simple words and tell me where to look.", { context: context() }) }, "Explain my error"),
      el("button", { class: "btn", onclick: () => askTutor("Review my code. Is it correct, readable and efficient? What would an interviewer say?", { context: context(), mode: "review" }) }, "Review my code"),
      el("button", { class: "btn", onclick: () => editor.setValue(block.starter || "") }, "Reset"),
      block.solution ? el("button", { class: "btn", onclick: (e) => {
        const show = solution.style.display === "none";
        solution.style.display = show ? "" : "none";
        e.target.textContent = show ? "Hide solution" : "Show solution";
        if (show && opts.onShowSolution) opts.onShowSolution();
      } }, "Show solution") : ""),
    hintBox, output, banner, solution);
  card.editor = editor;
  return card;
}

export function quizWidget(block) {
  const body = el("div", { class: "block-body" });
  block.questions.forEach((q, qi) => {
    const key = `${block.id}/${qi}`;
    const prev = state.progress.quizzes[key];
    const explain = el("div", { class: "explain", role: "status" });
    const box = el("div", { class: "quiz-q" }, el("div", {}, el("strong", {}, `${qi + 1}. `), inlineMd(q.question)));
    const buttons = q.options.map((opt) => el("button", { class: "btn opt" }, inlineMd(opt)));
    const reveal = (choice) => {
      buttons.forEach((b, bi) => {
        b.classList.toggle("right", bi === q.answer);
        b.classList.toggle("wrong", bi === choice && choice !== q.answer);
        b.setAttribute("aria-label", bi === q.answer ? "correct answer" : bi === choice ? "your answer, not correct" : "");
      });
      explain.textContent = (choice === q.answer ? "✓ Correct. " : "✗ Not correct. ") + (q.explanation || "");
    };
    // Every answer is also a spaced-repetition review, so concepts come back in Review when they are due.
    buttons.forEach((b, oi) => (b.onclick = async () => {
      reveal(oi);
      await saveProgress("quizzes", key, oi === q.answer);
      await reviewItem(key, oi === q.answer ? 4 : 1);
    }));
    if (prev !== undefined) explain.textContent = prev ? "You answered this correctly before." : "You got this wrong before. Try again.";
    box.append(...buttons, explain);
    body.append(box);
  });
  return el("div", { class: "block-card" }, el("div", { class: "block-head" }, el("span", { class: "tag" }, "Quiz"), "Check your understanding"), body);
}

export function writtenWidget(block) {
  const saved = state.progress.written[block.id];
  const prompt = el("div");
  renderMarkdown(block.prompt, prompt);
  const answer = el("textarea", { class: "answer", "aria-label": block.title, placeholder: "Write your answer here. The tutor grades it against a rubric." });
  answer.value = saved?.answer || "";
  const feedback = el("div", { class: "feedback", "aria-live": "polite" });
  if (saved?.feedback) { feedback.classList.add("show"); renderMarkdown(saved.feedback, feedback); }
  const submit = el("button", { class: "btn primary", disabled: !state.tutorReady }, "Submit for grading");
  submit.onclick = async () => {
    if (!answer.value.trim()) return;
    submit.disabled = true;
    feedback.classList.add("show");
    feedback.textContent = "Grading…";
    const draw = perFrame((t) => renderMarkdown(t, feedback));
    const text = await streamTutor({
      mode: "review",
      lessonId: state.lesson?.id,
      context: `Task: ${block.title}\n${block.prompt}\n\nRubric:\n${block.rubric || "Use your judgement."}`,
      messages: [{ role: "user", content: `Grade my answer. Start with a line "Score: N/10".\n\n${answer.value}` }],
    }, draw);
    draw.flush();
    submit.disabled = false;
    saveProgress("written", block.id, { answer: answer.value, feedback: text });
  };
  return el("div", { class: "block-card" },
    el("div", { class: "block-head" }, el("span", { class: "tag" }, "Written task"), block.title),
    el("div", { class: "block-body" }, prompt, answer, el("div", { class: "toolbar" }, submit), feedback));
}

export function checklistWidget(block) {
  const ticked = () => block.items.filter((_, i) => state.progress.checklists?.[`${block.id}/${i}`]).length;
  const count = el("span", { class: "state" });
  const update = () => { count.textContent = `${ticked()} / ${block.items.length}`; };
  const prompt = el("div");
  if (block.prompt) renderMarkdown(block.prompt, prompt);
  const list = el("ul", { class: "checklist" }, block.items.map((item, i) => {
    const key = `${block.id}/${i}`;
    const box = el("input", { type: "checkbox", id: `cl-${block.id}-${i}`.replace(/[^\w-]/g, "_") });
    box.checked = !!state.progress.checklists?.[key];
    box.onchange = async () => { await saveProgress("checklists", key, box.checked ? true : null); update(); };
    return el("li", {}, box, el("label", { for: box.id }, inlineMd(item)));
  }));
  update();
  return el("div", { class: "block-card" },
    el("div", { class: "block-head" }, el("span", { class: "tag" }, "Checklist"), block.title, count),
    el("div", { class: "block-body" }, prompt, list));
}

// One flashcard: show the front, reveal the back, then rate it. The rating schedules the next review.
export function flashcard(card, key, onRated) {
  const back = el("div", { class: "card-back", style: "display:none" });
  renderMarkdown(card.back, back);
  const rate = el("div", { class: "toolbar", style: "display:none" },
    ...[["Again", 1], ["Hard", 3], ["Good", 4], ["Easy", 5]].map(([label, q]) =>
      el("button", { class: "btn small", onclick: async () => {
        await reviewItem(key, q);
        rate.replaceChildren(el("span", { class: "muted small" }, q < 3 ? "It comes back tomorrow." : "Scheduled for review."));
        if (onRated) onRated(q);
      } }, label)));
  const show = el("button", { class: "btn", onclick: () => { back.style.display = ""; rate.style.display = ""; show.remove(); } }, "Show answer");
  return el("div", { class: "flashcard" }, el("div", { class: "card-front" }, inlineMd(card.front)), show, back, rate);
}

export function cardsWidget(block) {
  const body = el("div", { class: "block-body" },
    el("p", { class: "muted small" }, "Say the answer out loud first, then check. Your rating decides when the card comes back in Review."));
  block.cards.forEach((card, ci) => body.append(flashcard(card, `card:${block.id}/${ci}`)));
  return el("div", { class: "block-card" },
    el("div", { class: "block-head" }, el("span", { class: "tag" }, "Flashcards"), block.title, el("span", { class: "state" }, `${block.cards.length} cards`)), body);
}

export function blockWidget(block) {
  if (block.kind === "quiz") return quizWidget(block);
  if (block.kind === "written") return writtenWidget(block);
  if (block.kind === "checklist") return checklistWidget(block);
  if (block.kind === "cards") return cardsWidget(block);
  return exerciseWidget(block);
}
