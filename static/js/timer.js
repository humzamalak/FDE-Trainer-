// Study-time tracking. Counts time only while this tab is visible and you used the
// mouse or keyboard in the last 2 minutes. Reports to the server once a minute.

import { authFetch } from "./api.js";
import { state } from "./state.js";

const IDLE_MS = 2 * 60 * 1000;
const TICK_MS = 15 * 1000;
let lastInput = Date.now();
let pending = 0;
let pendingLesson = null;

function flush() {
  if (pending < 1) return;
  const body = JSON.stringify({ lesson_id: pendingLesson, seconds: Math.round(pending) });
  pending = 0;
  authFetch("/api/time", { method: "POST", body, keepalive: true }).catch(() => {});
}

export function startStudyTimer() {
  for (const evt of ["keydown", "mousedown", "mousemove", "scroll", "touchstart"]) {
    window.addEventListener(evt, () => { lastInput = Date.now(); }, { passive: true });
  }
  setInterval(() => {
    const active = document.visibilityState === "visible" && Date.now() - lastInput < IDLE_MS;
    const lesson = state.lesson?.id || null;
    if (lesson !== pendingLesson) { flush(); pendingLesson = lesson; }
    if (active) pending += TICK_MS / 1000;
    if (pending >= 60) flush();
  }, TICK_MS);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(); });
  window.addEventListener("pagehide", flush);
}
