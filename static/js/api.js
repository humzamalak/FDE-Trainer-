// Talking to the local server. Every /api call sends the per-start token from index.html.

import { safeStorage } from "./dom.js";
import { state } from "./state.js";

const TOKEN = document.querySelector('meta[name="fde-token"]')?.content || "";

export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const STATUS_HELP = {
  400: "The app sent a request the server did not accept",
  403: "The page is out of date or the app restarted. Reload the page (F5)",
  404: "Not found",
  422: "The request had missing or wrong fields",
  500: "The server had an error. Look at the black terminal window for details",
  502: "The server could not be reached",
  503: "The server is busy or stopping",
};

export function authFetch(path, options = {}) {
  const headers = { "X-FDE-Token": TOKEN, ...(options.body ? { "Content-Type": "application/json" } : {}), ...(options.headers || {}) };
  return fetch(path, { ...options, headers });
}

export async function api(path, options = {}) {
  let res;
  try {
    res = await authFetch(path, options);
  } catch (e) {
    throw new ApiError(0, "Cannot reach the app server. Is the black terminal window still open? If not, double-click start.cmd.");
  }
  if (!res.ok) {
    let detail = "";
    try { const body = await res.json(); detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail || body); }
    catch (e) { detail = (await res.text().catch(() => "")).slice(0, 200); }
    throw new ApiError(res.status, `${STATUS_HELP[res.status] || `Error ${res.status}`}${detail ? `: ${detail}` : ""}`);
  }
  try { return await res.json(); }
  catch (e) { throw new ApiError(res.status, "The server sent a reply that is not JSON."); }
}

// ---------- progress: data/progress.json AND this browser's localStorage ----------
// On start-up the two are merged, so progress survives a lost file or a fresh clone.
const LOCAL_PROGRESS_KEY = "fde-trainer-progress";

export function saveLocalProgress(progress) {
  try { safeStorage()?.setItem(LOCAL_PROGRESS_KEY, JSON.stringify(progress)); } catch (e) { /* storage full */ }
}
export function readLocalProgress() {
  try { return JSON.parse(safeStorage()?.getItem(LOCAL_PROGRESS_KEY) || "null"); } catch (e) { return null; }
}

export function setProgress(progress) {
  state.progress = progress;
  saveLocalProgress(progress);
  document.dispatchEvent(new CustomEvent("progress-changed"));
}

export async function saveProgress(section, key, value) {
  setProgress(await api("/api/progress", { method: "POST", body: JSON.stringify({ section, key, value }) }));
}

// Spaced repetition: quality 5 easy, 4 good, 3 hard, 0-2 failed.
export async function reviewItem(itemId, quality) {
  setProgress(await api("/api/srs", { method: "POST", body: JSON.stringify({ item_id: itemId, quality }) }));
}

// ---------- tutor (streamed text) ----------
export async function streamTutor({ mode = "tutor", messages, lessonId = null, context = null }, onText) {
  let res;
  try {
    res = await authFetch("/api/tutor", { method: "POST", body: JSON.stringify({ mode, messages, lesson_id: lessonId, context }) });
  } catch (e) {
    const text = "**Cannot reach the app server.** Is the terminal window still open?";
    onText(text);
    return text;
  }
  if (!res.ok) {
    const text = `**Error ${res.status}.** ${STATUS_HELP[res.status] || ""}`;
    onText(text);
    return text;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    full += decoder.decode(value, { stream: true });
    onText(full);
  }
  document.dispatchEvent(new CustomEvent("usage-changed"));
  return full;
}
