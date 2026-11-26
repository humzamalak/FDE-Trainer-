// Settings: AI usage and budget, export / import all data, reset progress.

import { $, el } from "../dom.js";
import { api, readLocalProgress, setProgress } from "../api.js";
import { state } from "../state.js";
import { renderSidebar } from "../sidebar.js";

export async function renderSettings() {
  state.lesson = null; renderSidebar();
  const main = $("#main");
  main.innerHTML = "";
  const inner = el("div", { class: "inner" }, el("h1", {}, "Settings and data"));
  main.append(inner);

  // AI usage
  const usageCard = el("div", { class: "card" }, el("h2", {}, "AI usage this month"));
  inner.append(usageCard);
  try {
    const u = await api("/api/usage");
    const rows = Object.entries(u.by_feature || {}).sort((a, b) => b[1] - a[1]);
    usageCard.append(
      el("p", { class: "stat" }, `$${u.cost.toFixed(2)}`, el("span", { class: "muted small" }, u.budget > 0 ? ` of $${u.budget.toFixed(2)} budget` : " (no budget set)")),
      u.budget > 0 ? el("div", { class: "bar" }, el("i", { style: `width:${Math.min(100, (u.cost / u.budget) * 100)}%` })) : "",
      el("p", { class: "muted small" }, `${u.calls} API calls in ${u.month}. These are estimates from token counts and the prices in .env. Change MONTHLY_BUDGET_USD in .env to change the limit.`),
      rows.length ? el("table", { class: "result-table" }, el("tbody", {}, rows.map(([k, v]) => el("tr", {}, el("td", {}, k), el("td", {}, `$${v.toFixed(4)}`))))) : "");
  } catch (e) { usageCard.append(el("p", { class: "muted" }, e.message)); }

  // Export / import
  const status = el("p", { class: "muted small", role: "status" });
  const file = el("input", { type: "file", accept: "application/json,.json", "aria-label": "Choose an export file" });
  const exportBtn = el("button", { class: "btn primary" }, "Export all my data");
  exportBtn.onclick = async () => {
    const data = await api("/api/export");
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = el("a", { href: URL.createObjectURL(blob), download: `fde-trainer-export-${data.exported}.json` });
    document.body.append(a); a.click(); a.remove();
    status.textContent = "Export saved to your Downloads folder.";
  };
  const importBtn = el("button", { class: "btn" }, "Import");
  importBtn.onclick = async () => {
    const f = file.files[0];
    if (!f) { status.textContent = "Choose an export file first."; return; }
    try {
      const data = JSON.parse(await f.text());
      const res = await api("/api/import", { method: "POST", body: JSON.stringify({ data }) });
      setProgress(res.progress);
      status.textContent = `Imported. Added ${res.added.chats} chats, ${res.added.generated} exercises and ${res.added.mocks} mocks. Progress was merged: nothing was overwritten.`;
    } catch (e) { status.textContent = `Import failed: ${e.message}`; }
  };
  inner.append(el("div", { class: "card" }, el("h2", {}, "Back up or move your data"),
    el("p", { class: "muted small" }, "One JSON file with your progress, tutor chats, generated exercises and mock interviews. Import merges it into this app."),
    el("div", { class: "toolbar" }, exportBtn), el("div", { class: "toolbar" }, file, importBtn), status));

  // Reset (two-step confirmation inside the page)
  const confirmBox = el("div", { style: "display:none" },
    el("p", {}, el("strong", {}, "Are you sure? "), "This removes all progress (lessons, exercises, quizzes, streak, reviews). A backup is kept as data/progress.backup.json. Chats, generated exercises and mocks are kept."),
    el("div", { class: "toolbar" },
      el("button", { class: "btn danger", onclick: async () => {
        const fresh = await api("/api/reset", { method: "POST" });
        setProgress(fresh);
        confirmBox.style.display = "none";
        resetStatus.textContent = "Progress reset. Your browser copy was cleared too.";
      } }, "Yes, reset my progress"),
      el("button", { class: "btn", onclick: () => (confirmBox.style.display = "none") }, "Cancel")));
  const resetStatus = el("p", { class: "muted small", role: "status" });
  inner.append(el("div", { class: "card" }, el("h2", {}, "Start again"),
    el("p", { class: "muted small" }, `Progress is saved in data/progress.json and in this browser${readLocalProgress() ? "" : " (browser copy: none)"}.`),
    el("div", { class: "toolbar" }, el("button", { class: "btn", onclick: () => (confirmBox.style.display = "") }, "Reset progress…")),
    confirmBox, resetStatus));
}
