# TypeScript essentials
<!-- minutes: 40 -->

**TypeScript** is JavaScript plus types. The compiler checks the types and removes them, so the result is plain JavaScript. Most company codebases and SDKs (including Anthropic's and OpenAI's) use it. It is like Python type hints, but **checked** before the code runs.

The examples here are read-only: the browser runs JavaScript, not TypeScript. To try them, use the TypeScript playground on your own machine (`npx tsc --init`, or Node 22+ with `--experimental-strip-types`).

## Basic types

```text
let name: string = "gpu-01";
let gpus: number = 8;
let ready: boolean = true;
let tags: string[] = ["h200", "prod"];
let maybe: string | null = null;         // union type: one OR the other
```

## Describe objects with interfaces (or type aliases)

```text
interface Job {
  id: string;
  gpus: number;
  state: "PENDING" | "RUNNING" | "DONE";  // only these three strings are allowed
  owner?: string;                         // optional
}

function totalGpus(jobs: Job[]): number {
  return jobs.reduce((sum, j) => sum + j.gpus, 0);
}
```

If code calls `totalGpus([{ id: "1", gpu: 2 }])` (typo `gpu`), the compiler stops it **before** it runs. This is why customers' teams like TypeScript.

## Generics

```text
function first<T>(items: T[]): T | undefined {
  return items[0];
}
const n = first([1, 2, 3]);      // TypeScript knows n is number | undefined
```

## Typing API responses

```text
type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function getJob(id: string): Promise<ApiResult<Job>> {
  const res = await fetch(`/api/jobs/${id}`);
  if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
  return { ok: true, data: (await res.json()) as Job };
}
```

**Important:** `as Job` is a promise to the compiler, not a check at run time. Real data from an API can still be wrong. Validate it (for example with the `zod` library) — the same lesson as validating LLM output with Pydantic.

## The same function in JavaScript with JSDoc

Without a build step, you can still get type checking in VS Code with JSDoc comments:

```javascript
/**
 * @param {{gpus: number}[]} jobs
 * @returns {number}
 */
function totalGpus(jobs) {
  return jobs.reduce((sum, j) => sum + j.gpus, 0);
}
console.log(totalGpus([{ gpus: 2 }, { gpus: 6 }]));
```

:::js Narrow a union
An API returns either `{ ok: true, data: [...] }` or `{ ok: false, error: "..." }`. Write `describe(result)`: for success, return `"3 jobs"` (the number of items in `data`, with "job" singular for 1); for failure, return `"error: <message>"`.
--- starter ---
function describe(result) {
  return `${result.data.length} jobs`;
}
--- tests ---
assertEqual(describe({ ok: true, data: [1, 2, 3] }), "3 jobs")
assertEqual(describe({ ok: true, data: [1] }), "1 job")
assertEqual(describe({ ok: false, error: "timeout" }), "error: timeout")
--- solution ---
function describe(result) {
  if (!result.ok) return `error: ${result.error}`;
  const n = result.data.length;
  return `${n} job${n === 1 ? "" : "s"}`;
}
:::

:::js Validate at run time
Types disappear at run time, so validate API data. Write `isJob(x)` that returns `true` only if `x` is an object with a string `id`, a number `gpus` (0 or more), and `state` equal to `"PENDING"`, `"RUNNING"` or `"DONE"`.
--- starter ---
function isJob(x) {
  return true;
}
--- tests ---
assertEqual(isJob({ id: "1", gpus: 2, state: "RUNNING" }), true)
assertEqual(isJob({ id: 1, gpus: 2, state: "RUNNING" }), false)
assertEqual(isJob({ id: "1", gpus: -1, state: "DONE" }), false)
assertEqual(isJob({ id: "1", gpus: 0, state: "LOST" }), false)
assertEqual(isJob(null), false)
--- solution ---
function isJob(x) {
  return typeof x === "object" && x !== null
    && typeof x.id === "string"
    && typeof x.gpus === "number" && x.gpus >= 0
    && ["PENDING", "RUNNING", "DONE"].includes(x.state);
}
:::

:::quiz
Q: What does `const job = data as Job` do at run time?
- [ ] Checks that data is a Job
- [x] Nothing: types are removed; it only tells the compiler to trust you
- [ ] Converts data to a Job
:::
