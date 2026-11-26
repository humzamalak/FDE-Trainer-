# Async JavaScript, fetch and JSON
<!-- minutes: 50 -->

JavaScript does network work **asynchronously**: it starts a request and continues; the result arrives later as a **Promise**. `async`/`await` makes this read like normal code — the same idea as Python's `asyncio`.

```javascript
// A fake API so this runs offline. Real code uses fetch(url).
const fakeFetch = (url) => new Promise((resolve) =>
  setTimeout(() => resolve({ ok: true, json: async () => ({ url, jobs: 3 }) }), 50));

async function getJobs() {
  const res = await fakeFetch("/api/jobs");
  if (!res.ok) throw new Error("request failed");
  const data = await res.json();
  return data.jobs;
}

const jobs = await getJobs();
console.log("jobs:", jobs);
```

## Real fetch

```text
const res = await fetch("https://api.example.com/v1/jobs", {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  body: JSON.stringify({ name: "train", gpus: 2 }),
});
if (!res.ok) throw new Error(`HTTP ${res.status}`);   // fetch does NOT throw on 404/500!
const job = await res.json();
```

**Trap:** `fetch` only rejects on network failure. A 500 response is "successful" — always check `res.ok`.

## Many requests at once

```javascript
const wait = (ms, value) => new Promise((r) => setTimeout(() => r(value), ms));
const results = await Promise.all([wait(30, "a"), wait(10, "b"), wait(20, "c")]);
console.log(results);   // order of the input, not of finishing
```

`Promise.all` fails if any one fails. `Promise.allSettled` gives every result with its status.

## Errors

```javascript
async function safe() {
  try {
    throw new Error("boom");
  } catch (e) {
    return `caught: ${e.message}`;
  }
}
console.log(await safe());
```

:::js Retry an async call
Write `async function withRetry(fn, attempts)` that calls `await fn()` and returns its result. If it throws, try again, up to `attempts` calls in total. If every call fails, throw the last error.
--- starter ---
async function withRetry(fn, attempts) {
  return await fn();
}
--- tests ---
let n = 0; const flaky = async () => { n++; if (n < 3) throw new Error("fail " + n); return "ok"; }; assertEqual(await withRetry(flaky, 3), "ok")
let m = 0; const bad = async () => { m++; throw new Error("down"); }; let msg = ""; try { await withRetry(bad, 2); } catch (e) { msg = e.message; } assertEqual([msg, m], ["down", 2])
--- solution ---
async function withRetry(fn, attempts) {
  let lastError;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}
:::

:::js Fetch all pages
`getPage(token)` returns a Promise of `{ items, next }`; `next` is `null` on the last page. Write `async function fetchAll(getPage)` that returns every item from every page, starting with `token = null`.
--- starter ---
async function fetchAll(getPage) {
  const first = await getPage(null);
  return first.items;
}
--- tests ---
const pages = { null: { items: [1, 2], next: "p2" }, p2: { items: [3], next: "p3" }, p3: { items: [4], next: null } }; assertEqual(await fetchAll(async (t) => pages[t]), [1, 2, 3, 4])
assertEqual(await fetchAll(async () => ({ items: [], next: null })), [])
--- solution ---
async function fetchAll(getPage) {
  const all = [];
  let token = null;
  do {
    const page = await getPage(token);
    all.push(...page.items);
    token = page.next;
  } while (token !== null);
  return all;
}
:::

:::js Check the response status
Write `async function getJson(fetchFn, url)` that calls `await fetchFn(url)`. If `res.ok` is false, throw an `Error` with the message `HTTP <status>`. Otherwise return `await res.json()`.
--- starter ---
async function getJson(fetchFn, url) {
  const res = await fetchFn(url);
  return await res.json();
}
--- tests ---
const okFetch = async () => ({ ok: true, status: 200, json: async () => ({ a: 1 }) }); assertEqual(await getJson(okFetch, "/x"), { a: 1 })
const errFetch = async () => ({ ok: false, status: 503, json: async () => ({}) }); let e1 = ""; try { await getJson(errFetch, "/x"); } catch (e) { e1 = e.message; } assertEqual(e1, "HTTP 503")
--- solution ---
async function getJson(fetchFn, url) {
  const res = await fetchFn(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}
:::

:::quiz
Q: A fetch call returns status 500. What happens?
- [x] The promise resolves; you must check res.ok yourself
- [ ] The promise rejects with an error
- [ ] fetch retries automatically
Q: Promise.all with three promises, one rejects. What happens?
- [ ] You get two results
- [x] Promise.all rejects with that error
- [ ] It waits forever
:::
