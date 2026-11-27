import { $, el, routeGuard } from "../dom.js";
import { api, saveProgress } from "../api.js";
import { refreshEditors } from "../editor.js";
import { renderMarkdown } from "../markdown.js";
import { makeExamplesRunnable, practicePanel } from "../practice.js";
import { allLessons, lessonDone, state } from "../state.js";
import { renderSidebar } from "../sidebar.js";
import { setChatKey } from "../tutor.js";
import { blockWidget } from "../widgets.js";

export async function renderLesson(id) {
  const stale = routeGuard();
  const lesson = await api(`/api/lesson/${id}`);
  if (stale()) return;
  state.lesson = lesson;
  saveProgress("last_lesson", null, id).catch(() => {});
  renderSidebar();
  setChatKey(id);

  const main = $("#main");
  main.innerHTML = "";
  main.scrollTop = 0;
  const article = el("article", { class: "inner lesson" });
  renderMarkdown(lesson.markdown, article);
  makeExamplesRunnable(article);
  article.querySelectorAll("[data-block]").forEach((slot) => slot.replaceWith(blockWidget(lesson.blocks[+slot.dataset.block])));
  article.append(practicePanel(lesson));

  const lessons = allLessons();
  const i = lessons.findIndex((l) => l.id === id);
  const label = () => (lessonDone(id) ? "✓ Completed (click to undo)" : "Mark lesson complete");
  const doneBtn = el("button", { class: "btn primary" }, label());
  doneBtn.onclick = async () => {
    await saveProgress("lessons", id, lessonDone(id) ? null : new Date().toISOString());
    doneBtn.textContent = label();
  };
  article.append(el("div", { class: "lesson-nav" },
    i > 0 ? el("a", { class: "btn", href: `#/lesson/${lessons[i - 1].id}` }, "← " + lessons[i - 1].title) : el("span"),
    doneBtn,
    i < lessons.length - 1 ? el("a", { class: "btn", href: `#/lesson/${lessons[i + 1].id}` }, lessons[i + 1].title + " →") : el("span")));
  main.append(article);
  refreshEditors(article);
}
