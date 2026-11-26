// FDE Trainer frontend entry point: router and start-up. Plain ES modules, no build step.

import { $, el } from "./dom.js";
import { api, readLocalProgress, setProgress } from "./api.js";
import { state } from "./state.js";
import { wireMenu } from "./sidebar.js";
import { startStudyTimer } from "./timer.js";
import { wireTutor } from "./tutor.js";
import { renderDashboard } from "./pages/dashboard.js";
import { renderDrill } from "./pages/drill.js";
import { renderLesson } from "./pages/lesson.js";
import { renderMock, renderMockMenu, renderMockView } from "./pages/mock.js";
import { renderPlayground } from "./pages/playground.js";
import { renderReview } from "./pages/review.js";
import { renderSettings } from "./pages/settings.js";

async function route() {
  const hash = location.hash.replace(/^#\/?/, "");
  $("#main").scrollTop = 0;
  try {
    if (hash.startsWith("lesson/")) await renderLesson(decodeURIComponent(hash.slice(7)));
    else if (hash === "playground") renderPlayground();
    else if (hash === "review") await renderReview();
    else if (hash === "drill") await renderDrill();
    else if (hash === "drill/due") await renderDrill("due");
    else if (hash.startsWith("mock-view/")) await renderMockView(hash.slice(10));
    else if (hash.startsWith("mock/")) renderMock(hash.slice(5));
    else if (hash === "mock") await renderMockMenu();
    else if (hash === "settings") await renderSettings();
    else await renderDashboard();
  } catch (err) {
    $("#main").innerHTML = "";
    $("#main").append(el("div", { class: "inner" }, el("div", { class: "notice" }, err.message),
      el("button", { class: "btn", onclick: route }, "Try again")));
  }
}

function showStartupError(err, attempt) {
  const wait = Math.min(10, 2 + attempt * 2);
  $("#main").innerHTML = "";
  $("#main").append(el("div", { class: "inner" },
    el("h1", {}, "The app server is not answering"),
    el("div", { class: "notice" }, err.message),
    el("ol", {},
      el("li", {}, "Check that the black terminal window from start.cmd is still open."),
      el("li", {}, "If you closed it, double-click start.cmd in the fde-trainer folder."),
      el("li", {}, "If it shows an error, read the last lines: they say what went wrong.")),
    el("p", { class: "muted" }, `Trying again in ${wait} seconds…`),
    el("button", { class: "btn primary", onclick: () => init(0) }, "Try now")));
  return wait;
}

async function init(attempt = 0) {
  if (init.ok) return;  // a retry timer can fire after a manual "Try now" succeeded
  try {
    const [cur, progress] = await Promise.all([api("/api/curriculum"), api("/api/progress")]);
    state.curriculum = cur.tracks;
    state.tutorReady = cur.tutor_ready;
    state.progress = progress;
    const local = readLocalProgress();
    if (local) {
      try { state.progress = await api("/api/progress/merge", { method: "POST", body: JSON.stringify({ progress: local }) }); }
      catch (e) { /* keep the server copy */ }
    }
    setProgress(state.progress);
    init.ok = true;
  } catch (err) {
    const wait = showStartupError(err, attempt);
    setTimeout(() => init(attempt + 1), wait * 1000);
    return;
  }
  if (!init.started) {
    init.started = true;
    wireTutor();
    wireMenu();
    startStudyTimer();
    window.addEventListener("hashchange", route);
  }
  route();
}

init();
