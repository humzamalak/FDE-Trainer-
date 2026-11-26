// Job search tracker: every application, its stage and the next step. Saved with your progress
// (section "applications"), so it is in Export and survives a lost browser.

import { $, el } from "../dom.js";
import { saveProgress } from "../api.js";
import { state } from "../state.js";
import { renderSidebar } from "../sidebar.js";

export const STAGES = ["To apply", "Applied", "Recruiter call", "Technical rounds", "Onsite / loop", "Offer", "Rejected", "Withdrawn"];
const FIELDS = [
  ["company", "Company"], ["role", "Role"], ["source", "Source (referral, LinkedIn…)"], ["stage", "Stage"],
  ["applied", "Date applied"], ["next", "Next step and date"], ["notes", "Notes (salary range, contacts, feedback)"],
];

export function renderJobs() {
  state.lesson = null; renderSidebar();
  const rows = (state.progress.applications || []).map((r) => ({ ...r }));
  const main = $("#main");
  main.innerHTML = "";
  const status = el("span", { class: "muted small", role: "status" });
  const save = async () => { status.textContent = "Saving…"; await saveProgress("applications", null, rows); status.textContent = "Saved."; };
  const counts = STAGES.map((s) => [s, rows.filter((r) => r.stage === s).length]).filter(([, n]) => n);
  const table = el("table", { class: "result-table jobs" },
    el("thead", {}, el("tr", {}, [...FIELDS.map(([, label]) => el("th", {}, label)), el("th", {}, "")])),
    el("tbody", {}, rows.map((row, i) => el("tr", {},
      ...FIELDS.map(([key, label]) => el("td", {}, key === "stage"
        ? el("select", { "aria-label": label, onchange: (e) => { row.stage = e.target.value; save(); } },
          STAGES.map((s) => el("option", { value: s, selected: (row.stage || STAGES[0]) === s }, s)))
        : el("input", { "aria-label": label, type: key === "applied" ? "date" : "text", value: row[key] || "", onchange: (e) => { row[key] = e.target.value; save(); } }))),
      el("td", {}, el("button", { class: "btn small", onclick: () => { rows.splice(i, 1); save().then(renderJobs); } }, "Delete"))))));
  main.append(el("div", { class: "inner" },
    el("h1", {}, "Job search tracker"),
    el("p", { class: "muted" }, "Track every application. Aim for most applications through a referral or a direct message to the hiring manager: cold applications have a low reply rate. The lessons in track 7 explain the method."),
    counts.length ? el("p", {}, counts.map(([s, n]) => `${s}: ${n}`).join(" · ")) : "",
    el("div", { class: "toolbar" }, el("button", { class: "btn primary", onclick: () => { rows.push({ stage: STAGES[0] }); save().then(renderJobs); } }, "Add application"), status),
    el("div", { class: "table-scroll" }, table)));
}
