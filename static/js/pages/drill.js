// Timed drill with spaced repetition (SM-2, computed on the server).
// "Due today" brings back exercises at growing intervals: 1 day, 6 days, then longer
// for exercises you solve easily, and back to 1 day for those you could not solve.

import { $, el, plural, safeStorage } from "../dom.js";
import { api, reviewItem } from "../api.js";
import { refreshEditors } from "../editor.js";
import { allLessons, state, studiedLessons } from "../state.js";
import { renderSidebar } from "../sidebar.js";
import { setChatKey } from "../tutor.js";
import { exerciseWidget } from "../widgets.js";

const LIMIT = 20 * 60;
const lessonCache = {};
const getLesson = async (id) => (lessonCache[id] ||= await api(`/api/lesson/${id}`));
let lastDrillId = null;
const CODE_KINDS = new Set(["exercise", "sql", "js"]);

// Quality for SM-2 from the time taken: fast = easy, inside the limit = good, over = hard.
const qualityFor = (secs) => (secs <= LIMIT / 2 ? 5 : secs <= LIMIT ? 4 : 3);

export async function renderDrill(initialScope = null) {
  state.lesson = null; renderSidebar(); setChatKey("drill");
  const main = $("#main");
  main.innerHTML = "";
  const inner = el("div", { class: "inner" }, el("h1", {}, "Timed drill"),
    el("p", { class: "muted" }, "Solve an exercise from memory in 20 minutes, talking aloud. \"Due today\" uses spaced repetition: exercises come back after 1 day, then 6 days, then longer each time you solve them, and sooner when you cannot."));
  main.append(inner);

  const { items: dueIds } = await api("/api/srs/due");
  const studied = studiedLessons();
  const scope = el("select", { class: "select", "aria-label": "Where the exercises come from" });
  if (dueIds.length) scope.append(el("option", { value: "due" }, `Due today (${dueIds.length})`));
  if (studied.length) scope.append(el("option", { value: "studied" }, `Lessons I studied (${studied.length})`));
  state.curriculum.forEach((t) => { if (t.lessons.length) scope.append(el("option", { value: `track:${t.id}` }, t.title)); });
  scope.append(el("option", { value: "all" }, "All tracks"));
  const storage = safeStorage();
  let saved = null;
  try { saved = storage?.getItem("drillScope"); } catch (e) { /* ignore */ }
  const options = [...scope.options].map((o) => o.value);
  const wanted = initialScope || (dueIds.length ? "due" : saved);
  scope.value = options.includes(wanted) ? wanted : (studied.length ? "studied" : `track:${state.curriculum[1]?.id || state.curriculum[0].id}`);
  const area = el("div");
  scope.onchange = () => { try { storage?.setItem("drillScope", scope.value); } catch (e) { /* ignore */ } drawDrill(scope.value, area, dueIds); };
  inner.append(el("div", { class: "toolbar" }, el("label", { class: "muted small" }, "Exercises from: "), scope), area);
  await drawDrill(scope.value, area, dueIds);
}

async function buildPool(scopeValue, dueIds) {
  const generated = (await api("/api/generated")).items;
  const pool = [];
  if (scopeValue === "due") {
    for (const id of dueIds) {
      const lessonId = id.split("#")[0];
      const lessonInfo = allLessons().find((l) => l.id === lessonId);
      if (!lessonInfo) continue;
      const data = await getLesson(lessonId);
      const block = data.blocks.find((b) => b.id === id) || generated.find((g) => g.id === id);
      if (block) pool.push({ lesson: data, block });
    }
    return pool;
  }
  const lessons = scopeValue === "studied" ? studiedLessons()
    : scopeValue.startsWith("track:") ? (state.curriculum.find((t) => t.id === scopeValue.slice(6))?.lessons || [])
      : allLessons();
  for (const l of lessons) {
    const data = await getLesson(l.id);
    data.blocks.filter((b) => CODE_KINDS.has(b.kind)).forEach((b) => pool.push({ lesson: data, block: b }));
    generated.filter((g) => g.id.startsWith(l.id + "#")).forEach((g) => pool.push({ lesson: data, block: g }));
  }
  return pool;
}

async function drawDrill(scopeValue, area, dueIds) {
  area.innerHTML = "";
  area.append(el("p", { class: "muted small" }, "Loading exercises…"));
  const pool = await buildPool(scopeValue, dueIds);
  area.innerHTML = "";
  if (!pool.length) {
    area.append(el("div", { class: "card" }, scopeValue === "due"
      ? "Nothing is due today. Well done. Choose a track to practise more."
      : "This choice has no coding exercises. Choose another track, or use \"New exercise\" at the end of a lesson."));
    return;
  }
  // Due items in order (most overdue first); otherwise random, not the same as last time.
  const choices = pool.length > 1 ? pool.filter((p) => p.block.id !== lastDrillId) : pool;
  const pick = scopeValue === "due" ? choices[0] : choices[Math.floor(Math.random() * choices.length)];
  lastDrillId = pick.block.id;

  const startedAt = Date.now();
  const timer = el("span", { class: "timer", role: "timer" }, "20:00");
  let finished = false;
  const tick = setInterval(() => {
    if (!document.body.contains(timer) || finished) return clearInterval(tick);
    const left = LIMIT - Math.floor((Date.now() - startedAt) / 1000);
    timer.textContent = left > 0 ? `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}` : "Time up";
  }, 1000);
  const result = el("div", { role: "status" });
  const next = el("button", { class: "btn primary", style: "display:none", onclick: () => renderDrill(scopeValue) }, "Next exercise");

  const finish = async (quality, message, good) => {
    if (finished) return;
    finished = true;
    result.className = `pass-banner ${good ? "ok" : "bad"}`;
    result.textContent = message;
    next.style.display = "";
    await reviewItem(pick.block.id, quality);
    const s = state.progress.srs?.[pick.block.id];
    if (s) result.textContent += ` Next review: in ${plural(s.interval, "day")} (${s.due}).`;
  };
  const giveUp = el("button", { class: "btn", onclick: () => finish(1, "Marked as not solved. Read the solution, then try again from memory tomorrow.", false) }, "I could not solve it");

  const widget = exerciseWidget(pick.block, {
    fresh: true,
    onShowSolution: () => finish(1, "You opened the solution, so this counts as not solved. It comes back tomorrow.", false),
    onCheck: (r) => {
      if (!r.ok) return;
      const secs = Math.floor((Date.now() - startedAt) / 1000);
      const quality = qualityFor(secs);
      const label = quality === 5 ? "easy" : quality === 4 ? "good" : "hard (over the limit)";
      finish(quality, `Solved in ${Math.floor(secs / 60)} min ${secs % 60} s — ${label}.`, quality >= 4);
    },
  });
  area.append(
    el("div", { style: "display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin:8px 0" },
      timer,
      el("span", { class: "muted small", style: "flex:1" }, `${plural(pool.length, "exercise")} in this choice · From: `, el("a", { href: `#/lesson/${pick.lesson.id}` }, pick.lesson.title)),
      giveUp,
      el("button", { class: "btn", onclick: () => drawDrill(scopeValue, area, dueIds) }, "Skip")),
    widget, result, el("div", { class: "toolbar" }, next));
  refreshEditors(area);
}
