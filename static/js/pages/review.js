// Review queue: wrong quiz answers, exercises you tried but did not pass, low-scored written tasks.

import { $, el, plural } from "../dom.js";
import { api, reviewItem, saveProgress } from "../api.js";
import { refreshEditors } from "../editor.js";
import { inlineMd } from "../markdown.js";
import { state } from "../state.js";
import { renderSidebar } from "../sidebar.js";
import { setChatKey } from "../tutor.js";
import { exerciseWidget, flashcard } from "../widgets.js";

export async function renderReview() {
  state.lesson = null; renderSidebar(); setChatKey("review");
  const { quizzes, exercises, written, due_quizzes: dueQuizzes = [], due_cards: dueCards = [] } = await api("/api/review");
  const main = $("#main");
  main.innerHTML = "";
  const inner = el("div", { class: "inner" }, el("h1", {}, "Review queue"),
    el("p", { class: "muted" }, "Everything that needs another look: quiz questions and flashcards that are due (spaced repetition), quiz questions you got wrong, exercises you tried but did not pass, and written tasks that scored below 7/10. Due coding exercises are in Drill → Due today."));
  main.append(inner);
  if (!quizzes.length && !exercises.length && !written.length && !dueQuizzes.length && !dueCards.length) {
    inner.append(el("div", { class: "card" }, "Nothing to review. Well done. Do a Drill, or answer more quizzes in the lessons."));
    return;
  }
  const from = (item) => el("div", { class: "muted small" }, "From: ", el("a", { href: `#/lesson/${item.lesson_id}` }, item.lesson_title));

  const quizCard = (item, onAnswer) => {
    const explain = el("div", { class: "explain", role: "status" });
    const card = el("div", { class: "card quiz-q" }, from(item), el("div", { style: "margin:6px 0" }, el("strong", {}, inlineMd(item.question))));
    const buttons = item.options.map((opt) => el("button", { class: "btn opt" }, inlineMd(opt)));
    buttons.forEach((b, oi) => (b.onclick = async () => {
      const right = oi === item.answer;
      buttons.forEach((x, xi) => {
        x.classList.toggle("right", xi === item.answer);
        x.classList.toggle("wrong", xi === oi && !right);
        x.disabled = true;
      });
      explain.textContent = (right ? "✓ Correct. " : "✗ Not correct. ") + (item.explanation || "");
      await saveProgress("quizzes", item.key, right);
      await reviewItem(item.key, right ? 4 : 1);
      onAnswer?.(right);
    }));
    card.append(...buttons, explain);
    return card;
  };
  if (dueCards.length || dueQuizzes.length) {
    inner.append(el("h2", {}, "Due for spaced repetition", el("span", { class: "muted small" }, ` (${dueCards.length + dueQuizzes.length})`)));
    for (const item of dueCards) inner.append(el("div", { class: "card" }, from(item), flashcard(item, item.key)));
    for (const item of dueQuizzes) inner.append(quizCard(item));
  }
  if (quizzes.length) {
    const count = el("span", { class: "muted small" }, ` (${quizzes.length})`);
    inner.append(el("h2", {}, "Quiz questions", count));
    let left = quizzes.length;
    for (const item of quizzes) {
      const explain = el("div", { class: "explain", role: "status" });
      const card = el("div", { class: "card quiz-q" }, from(item), el("div", { style: "margin:6px 0" }, el("strong", {}, inlineMd(item.question))));
      const buttons = item.options.map((opt) => el("button", { class: "btn opt" }, inlineMd(opt)));
      buttons.forEach((b, oi) => (b.onclick = async () => {
        const right = oi === item.answer;
        buttons.forEach((x, xi) => {
          x.classList.toggle("right", xi === item.answer);
          x.classList.toggle("wrong", xi === oi && !right);
          x.disabled = true;
        });
        explain.textContent = (right ? "✓ Correct. Removed from the queue. " : "✗ Not correct. It stays in the queue. ") + (item.explanation || "");
        await saveProgress("quizzes", item.key, right);
        if (right) { left -= 1; count.textContent = ` (${left})`; }
      }));
      card.append(...buttons, explain);
      inner.append(card);
    }
  }
  if (exercises.length) {
    inner.append(el("h2", {}, "Exercises to finish", el("span", { class: "muted small" }, ` (${exercises.length})`)));
    for (const item of exercises) {
      inner.append(from(item), exerciseWidget(item.block));
    }
  }
  if (written.length) {
    inner.append(el("h2", {}, "Written tasks below 7/10", el("span", { class: "muted small" }, ` (${written.length})`)));
    inner.append(el("div", { class: "card" }, el("ul", {}, written.map((w) =>
      el("li", {}, el("a", { href: `#/lesson/${w.lesson_id}` }, `${w.title}`), ` — ${w.score}/10 in "${w.lesson_title}". Improve it and submit again.`)))));
  }
  inner.append(el("p", { class: "muted small" }, `${plural(quizzes.length + exercises.length + written.length, "item")} in total.`));
  refreshEditors(inner);
}
