// Left sidebar with all tracks and lessons. On narrow screens it opens from the ☰ button.

import { $, el } from "./dom.js";
import { lessonDone, state } from "./state.js";

export function renderSidebar() {
  const side = $("#sidebar");
  side.innerHTML = "";
  // The main pages; shown here only on narrow screens, where the top bar has no room.
  side.append(el("nav", { class: "side-nav", "aria-label": "Pages" },
    [["#/", "Dashboard"], ["#/drill", "Drill"], ["#/review", "Review"], ["#/playground", "Playground"], ["#/mock", "Mock interviews"], ["#/settings", "Settings"]]
      .map(([href, label]) => el("a", { href }, label))));
  for (const track of state.curriculum) {
    const done = track.lessons.filter((l) => lessonDone(l.id)).length;
    const open = state.lesson ? state.lesson.track_id === track.id : false;
    const list = el("ul", { style: open ? "" : "display:none" },
      track.lessons.map((l) => el("li", {},
        el("a", { href: `#/lesson/${l.id}`, class: state.lesson?.id === l.id ? "active" : "" },
          el("span", { class: "tick" }, lessonDone(l.id) ? "✓" : ""), l.title))));
    const title = el("button", { class: "track-title", "aria-expanded": String(open),
      onclick: () => {
        const show = list.style.display === "none";
        list.style.display = show ? "" : "none";
        title.setAttribute("aria-expanded", String(show));
      } },
    el("span", {}, track.title), el("span", { class: "muted" }, `${done}/${track.lessons.length}`));
    side.append(el("div", { class: "track" }, title, list));
  }
}

export function wireMenu() {
  const side = $("#sidebar");
  const button = $("#menuToggle");
  const close = () => { side.classList.remove("open"); button.setAttribute("aria-expanded", "false"); };
  button.onclick = () => {
    const open = !side.classList.contains("open");
    side.classList.toggle("open", open);
    button.setAttribute("aria-expanded", String(open));
  };
  side.addEventListener("click", (e) => { if (e.target.closest("a")) close(); });
  window.addEventListener("hashchange", close);
  document.addEventListener("progress-changed", renderSidebar);
}
