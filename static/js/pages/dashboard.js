import { $, el, formatDuration, plural, safeStorage } from "../dom.js";
import { api } from "../api.js";
import { renderMarkdown } from "../markdown.js";
import { allLessons, lessonDone, state } from "../state.js";
import { renderSidebar } from "../sidebar.js";
import { setChatKey } from "../tutor.js";

const WEEKLY_TARGET_HOURS = 10;

export async function renderDashboard() {
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
  const due = stats?.due_today || 0;
  const weekPct = stats ? Math.min(100, Math.round((stats.seconds_week / (WEEKLY_TARGET_HOURS * 3600)) * 100)) : 0;

  const tile = (label, value, extra, href) => el(href ? "a" : "div", { class: href ? "tile link-tile" : "tile", href: href || false },
    el("div", { class: "muted small" }, label), el("div", { class: "stat" }, value), extra || "");
  const main = $("#main");
  main.innerHTML = "";
  const inner = el("div", { class: "inner" });
  inner.append(
    el("h1", {}, "Zero to interview-ready"),
    el("p", { class: "muted" }, "Work through the tracks in order. Each lesson has live examples and exercises that run in your browser. Use the tutor when you are stuck. Do the mock interviews when you finish track 7."),
    !state.tutorReady ? el("div", { class: "notice" }, "The AI tutor is off. Add your ANTHROPIC_API_KEY to the .env file, then restart the app.") : "",
    el("div", { class: "card" },
      el("div", { class: "grid" },
        tile("LESSONS DONE", `${done} / ${lessons.length}`, el("div", { class: "bar" }, el("i", { style: `width:${pct}%` })), target ? `#/lesson/${target.id}` : null),
        tile("DUE FOR REVIEW TODAY", String(due), el("div", { class: "muted small" }, due ? "Start a spaced-repetition drill →" : "Nothing due. Pass exercises to add them."), "#/drill/due"),
        tile("EXERCISES PASSED", t ? `${t.exercises_passed} / ${t.exercises}` : "–", el("div", { class: "muted small" }, "Practise in Drill →"), "#/drill"),
        tile("STUDY STREAK", stats ? plural(stats.streak, "day") : "–",
          el("div", { class: "muted small" }, stats ? `${stats.active_days} study days in total` : "")),
        tile("STUDY TIME THIS WEEK", stats ? formatDuration(stats.seconds_week) : "–",
          el("div", {}, el("div", { class: "bar" }, el("i", { style: `width:${weekPct}%` })),
            el("div", { class: "muted small" }, `Plan: ${WEEKLY_TARGET_HOURS} h per week · today ${formatDuration(stats?.seconds_today || 0)}`))),
        tile("QUIZ ACCURACY", quizPct === null ? "–" : `${quizPct}%`,
          el("div", { class: "muted small" }, wrong > 0 ? `Review ${plural(wrong, "wrong answer")} →` : "Review queue →"), "#/review")),
      el("div", { class: "toolbar", style: "margin-top:16px" },
        target ? el("a", { class: "btn primary", href: `#/lesson/${target.id}` }, `Continue: ${target.title}`)
          : el("span", { class: "muted" }, "All lessons done. Do mock interviews."),
        el("a", { class: "btn", href: due ? "#/drill/due" : "#/drill" }, due ? `Review ${due} due` : "Timed drill (20 min)"),
        el("a", { class: "btn", href: "#/review" }, "Review queue"))),
  );

  const storage = safeStorage();
  let openTracks = [];
  try { openTracks = JSON.parse(storage?.getItem("fde-open-tracks") || "[]"); } catch (e) { /* ignore */ }
  const toggleTrack = (id) => {
    openTracks = openTracks.includes(id) ? openTracks.filter((x) => x !== id) : [...openTracks, id];
    try { storage?.setItem("fde-open-tracks", JSON.stringify(openTracks)); } catch (e) { /* ignore */ }
  };
  for (const track of state.curriculum) {
    const d = track.lessons.filter((l) => lessonDone(l.id)).length;
    const ts = stats?.tracks.find((x) => x.id === track.id);
    const mins = track.lessons.reduce((a, l) => a + l.minutes, 0);
    const meta = `${d}/${track.lessons.length} lessons` + (ts && ts.exercises ? ` · ${ts.exercises_passed}/${ts.exercises} exercises` : "") + ` · about ${Math.max(1, Math.round(mins / 60))} h`;
    const nextInTrack = track.lessons.find((l) => !lessonDone(l.id)) || track.lessons[0];
    const exercisesPassedIn = (lessonId) => Object.entries(state.progress.exercises)
      .filter(([k, v]) => k.startsWith(lessonId + "#") && v?.passed).length;
    const lessonTime = (lessonId) => state.progress.time?.lessons?.[lessonId] || 0;
    const list = el("ol", { class: "lesson-list" }, track.lessons.map((l) =>
      el("li", {}, el("a", { href: `#/lesson/${l.id}`, class: lessonDone(l.id) ? "done" : "" },
        el("span", { class: "tick" }, lessonDone(l.id) ? "✓" : ""),
        el("span", { class: "title" }, l.title),
        el("span", { class: "muted small" },
          [exercisesPassedIn(l.id) ? `${exercisesPassedIn(l.id)} passed` : "", lessonTime(l.id) ? `${formatDuration(lessonTime(l.id))} studied` : "", `${l.minutes} min`]
            .filter(Boolean).join(" · "))))));
    const open = openTracks.includes(track.id);
    list.style.display = open ? "" : "none";
    const arrow = el("span", { class: "arrow" }, open ? "▾" : "▸");
    const showBtn = el("button", { class: "btn", "aria-expanded": String(open) }, open ? "Hide lessons" : "Show lessons");
    const head = el("div", { class: "track-head", role: "button", tabindex: "0", "aria-expanded": String(open) },
      arrow, el("strong", { style: "flex:1" }, track.title), el("span", { class: "muted small" }, meta));
    const flip = () => {
      toggleTrack(track.id);
      const nowOpen = list.style.display === "none";
      list.style.display = nowOpen ? "" : "none";
      arrow.textContent = nowOpen ? "▾" : "▸";
      showBtn.textContent = nowOpen ? "Hide lessons" : "Show lessons";
      head.setAttribute("aria-expanded", String(nowOpen));
      showBtn.setAttribute("aria-expanded", String(nowOpen));
    };
    showBtn.onclick = flip;
    head.onclick = flip;
    head.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); } };
    const desc = el("div", { class: "muted small" });
    renderMarkdown(track.description, desc);
    inner.append(el("div", { class: "card track-card" }, head,
      el("div", { class: "bar", style: "margin:8px 0" }, el("i", { style: `width:${Math.round((d / track.lessons.length) * 100)}%` })),
      desc,
      el("div", { class: "toolbar" },
        el("a", { class: "btn primary", href: `#/lesson/${nextInTrack.id}` }, d === 0 ? "Start track" : d === track.lessons.length ? "Review track" : `Continue: ${nextInTrack.title}`),
        showBtn),
      list));
  }
  main.append(inner);
}
