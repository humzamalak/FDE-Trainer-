// Small DOM helpers used everywhere.

export const $ = (sel, root = document) => root.querySelector(sel);

// Call at the start of an async page render; after each await, `if (stale()) return;`.
// If you moved to another page while the data loaded, the late render does not replace it.
export function routeGuard() {
  const hash = location.hash;
  return () => location.hash !== hash;
}

// el("div", { class: "card", onclick: fn }, child1, "text", [child2, child3])
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) node.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c === "" || c == null || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

// Call fn(value) at most once per animation frame, always with the latest value.
// Used for streaming tutor replies: re-rendering Markdown on every chunk gets slow.
export function perFrame(fn) {
  let pending = null;
  let scheduled = false;
  const flush = () => { scheduled = false; const v = pending; pending = null; fn(v); };
  const call = (value) => {
    pending = value;
    if (!scheduled) { scheduled = true; requestAnimationFrame(flush); }
  };
  call.flush = () => { if (scheduled) { scheduled = false; fn(pending); pending = null; } };
  return call;
}

export const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function formatDuration(seconds) {
  const m = Math.round((seconds || 0) / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}

export function safeStorage() {
  try { return window.localStorage; } catch (e) { return null; }
}
