// Placement test: a short quiz across every skill. The result fills the skill map and says
// where to start, so you do not repeat what you already know.

import { $, el } from "../dom.js";
import { api, reviewItem, saveProgress } from "../api.js";
import { inlineMd } from "../markdown.js";
import { state } from "../state.js";
import { renderSidebar } from "../sidebar.js";

const PASS = 75; // percent per skill to skip its first track

export async function renderPlacement() {
  state.lesson = null; renderSidebar();
  const { skills } = await api("/api/placement");
  const main = $("#main");
  main.innerHTML = "";
  const total = skills.reduce((a, s) => a + s.questions.length, 0);
  const inner = el("div", { class: "inner" }, el("h1", {}, "Placement test"),
    el("p", {}, `${total} questions, about 15 minutes. Answer honestly: if you do not know, pick "skip" instead of guessing. The result shows your skill map and the first track to study.`));
  main.append(inner);
  const answers = {};
  for (const skill of skills) {
    inner.append(el("h2", {}, skill.name));
    for (const q of skill.questions) {
      const box = el("div", { class: "card quiz-q" }, el("div", { class: "muted small" }, q.track_title), el("div", { style: "margin:6px 0" }, el("strong", {}, inlineMd(q.question))));
      const buttons = [...q.options, "I do not know (skip)"].map((opt, oi) => el("button", { class: "btn opt", onclick: () => {
        answers[q.key] = { skill: skill.skill, track: q.track_id, correct: oi === q.answer };
        buttons.forEach((b, bi) => b.classList.toggle("chosen", bi === oi));
      } }, inlineMd(opt)));
      box.append(...buttons);
      inner.append(box);
    }
  }
  const result = el("div", { "aria-live": "polite" });
  inner.append(el("div", { class: "toolbar" }, el("button", { class: "btn primary", onclick: async () => {
    const perSkill = {};
    for (const s of skills) perSkill[s.skill] = { ok: 0, n: s.questions.length };
    for (const a of Object.values(answers)) if (a.correct) perSkill[a.skill].ok += 1;
    const scores = Object.fromEntries(Object.entries(perSkill).map(([k, v]) => [k, Math.round((100 * v.ok) / v.n)]));
    // Start at the first track (in study order) whose skill you have not shown yet.
    const start = state.curriculum.find((t) => !t.id.startsWith("00-") && (scores[t.skill] ?? 0) < PASS) || state.curriculum[0];
    await saveProgress("placement", null, { date: new Date().toISOString().slice(0, 10), skills: scores, start_track: start.id });
    // Wrong answers go into spaced repetition, so they come back in Review.
    for (const [key, a] of Object.entries(answers)) if (!a.correct) await reviewItem(key, 1);
    result.replaceChildren(el("div", { class: "card" },
      el("h2", {}, "Your result"),
      el("ul", {}, skills.map((s) => el("li", {}, `${s.name}: ${scores[s.skill]}%`, scores[s.skill] >= PASS ? " — you can move faster here" : " — study this from the start"))),
      el("p", {}, "Start with: ", el("strong", {}, start.title), "."),
      el("p", { class: "muted small" }, "A placement test only samples a few questions. If a lesson feels easy, do its exercises quickly and mark it done; do not skip the exercises."),
      el("a", { class: "btn primary", href: `#/lesson/${start.lessons[0].id}` }, "Open the first lesson")));
  } }, "See my result")), result);
}
