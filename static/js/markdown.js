// Markdown with maths. marked, DOMPurify, KaTeX and highlight.js are bundled in /static/vendor
// and loaded as classic scripts, so they are globals here.

import { el } from "./dom.js";

// Protect $...$ and $$...$$ from the Markdown parser, then render them with KaTeX.
// \$ is an escaped dollar sign (money), not maths. Code spans and fences are left alone.
export function renderMarkdown(md, target) {
  const stash = [];
  const parts = (md || "").split(/(```[\s\S]*?```|`[^`\n]*`)/g);
  const protectedMd = parts.map((part, i) => {
    if (i % 2 === 1) return part;
    return part
      .replace(/(?<!\\)\$\$([\s\S]+?)(?<!\\)\$\$/g, (_, tex) => `@@MATH${stash.push({ tex, display: true }) - 1}@@`)
      .replace(/(?<!\\)\$([^\s$](?:[^$\n]*?[^\s$\\])?)\$/g, (_, tex) => `@@MATH${stash.push({ tex, display: false }) - 1}@@`);
  }).join("");
  let html = marked.parse(protectedMd);
  html = DOMPurify.sanitize(html, { ADD_ATTR: ["data-block"] });
  html = html.replace(/@@MATH(\d+)@@/g, (_, n) => {
    const { tex, display } = stash[+n];
    try { return katex.renderToString(tex, { displayMode: display, throwOnError: false }); }
    catch (e) { return tex.replace(/&/g, "&amp;").replace(/</g, "&lt;"); }
  });
  target.innerHTML = html;
  target.querySelectorAll("pre code").forEach((c) => { try { hljs.highlightElement(c); } catch (e) { /* unknown language */ } });
}

// Short text (quiz questions/options) with inline Markdown such as `code`.
export function inlineMd(text) {
  const span = el("span");
  span.innerHTML = DOMPurify.sanitize(marked.parseInline(text || ""));
  return span;
}
