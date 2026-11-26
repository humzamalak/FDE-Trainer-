# JavaScript for Python people
<!-- minutes: 50 -->

Many FDE roles ask you to fix a customer's web page, a Node.js script or a TypeScript integration. You do not need to be a front-end expert. You need to read and change JavaScript confidently.

## Python → JavaScript

| Python | JavaScript |
|---|---|
| `x = 5` | `const x = 5;` (cannot reassign) / `let x = 5;` (can) |
| `None` | `null` (and `undefined`: "never set") |
| `True`, `and`, `or`, `not` | `true`, `&&`, `\|\|`, `!` |
| `==` | `===` (always use three; `==` converts types: `"1" == 1` is true) |
| `f"Hi {name}"` | `` `Hi ${name}` `` (backticks) |
| `list`, `len(xs)` | array, `xs.length` |
| `dict` | object `{ key: value }` or `Map` |
| `def f(a, b=2):` | `function f(a, b = 2) {}` or `const f = (a, b = 2) => {}` |
| `for x in xs:` | `for (const x of xs) {}` (`of`, not `in`!) |
| `[x * 2 for x in xs if x > 0]` | `xs.filter(x => x > 0).map(x => x * 2)` |
| `print(x)` | `console.log(x)` |

Try it: edit and run.

```javascript
const nodes = [
  { name: "gpu-01", cpu: 92 },
  { name: "gpu-02", cpu: 40 },
  { name: "gpu-03", cpu: 75 },
];
const busy = nodes.filter((n) => n.cpu > 70).map((n) => n.name);
console.log(busy);
console.log(`Busiest: ${[...nodes].sort((a, b) => b.cpu - a.cpu)[0].name}`);
```

## Traps

- **`sort()` sorts as text by default**: `[10, 9, 1].sort()` gives `[1, 10, 9]`. Always pass a compare function: `.sort((a, b) => a - b)`.
- **Objects are compared by reference**: `{a: 1} === {a: 1}` is `false`.
- `const` stops reassignment, not change: you can still `push` to a `const` array.
- Missing keys give `undefined`, not an error. Use optional chaining: `user?.address?.city`.

## Useful array methods

`map`, `filter`, `reduce`, `find`, `some`, `every`, `includes`, `slice`, `join`, `Object.entries(obj)`, `Object.keys(obj)`.

```javascript
const costs = { ec2: 900, s3: 120, rds: 400 };
const total = Object.values(costs).reduce((sum, v) => sum + v, 0);
const top = Object.entries(costs).sort((a, b) => b[1] - a[1])[0][0];
console.log(total, top);
```

:::js Sum of even numbers
Write `sumEven(nums)` that returns the sum of the even numbers. Use `filter` and `reduce`.
--- starter ---
function sumEven(nums) {
}
--- tests ---
assertEqual(sumEven([1, 2, 3, 4]), 6)
assertEqual(sumEven([]), 0)
assertEqual(sumEven([-2, 5]), -2)
--- solution ---
function sumEven(nums) {
  return nums.filter((n) => n % 2 === 0).reduce((sum, n) => sum + n, 0);
}
:::

:::js Sort numbers correctly
Write `sortDesc(nums)` that returns a **new** array of the numbers from largest to smallest. Do not change the input array.
--- starter ---
function sortDesc(nums) {
  return nums.sort();
}
--- tests ---
assertEqual(sortDesc([10, 9, 1, 100]), [100, 10, 9, 1])
const original = [3, 1, 2]; sortDesc(original); assertEqual(original, [3, 1, 2])
assertEqual(sortDesc([]), [])
--- solution ---
function sortDesc(nums) {
  return [...nums].sort((a, b) => b - a);
}
:::

:::js Group by key
Write `countBy(items, key)` that returns an object of value → count. `countBy([{s: "ok"}, {s: "err"}, {s: "ok"}], "s")` returns `{ ok: 2, err: 1 }`.
--- starter ---
function countBy(items, key) {
  return {};
}
--- tests ---
assertEqual(countBy([{ s: "ok" }, { s: "err" }, { s: "ok" }], "s"), { ok: 2, err: 1 })
assertEqual(countBy([], "s"), {})
--- solution ---
function countBy(items, key) {
  const counts = {};
  for (const item of items) {
    counts[item[key]] = (counts[item[key]] || 0) + 1;
  }
  return counts;
}
:::

:::js Safe nested read
API responses are often missing fields. Write `cityOf(user)` that returns `user.address.city`, or `"unknown"` if any part is missing. Use `?.` and `??`.
--- starter ---
function cityOf(user) {
  return user.address.city;
}
--- tests ---
assertEqual(cityOf({ address: { city: "London" } }), "London")
assertEqual(cityOf({}), "unknown")
assertEqual(cityOf(null), "unknown")
assertEqual(cityOf({ address: {} }), "unknown")
--- solution ---
function cityOf(user) {
  return user?.address?.city ?? "unknown";
}
:::

:::quiz
Q: What does `[10, 9, 1].sort()` return in JavaScript?
- [ ] [1, 9, 10]
- [x] [1, 10, 9]
- [ ] [10, 9, 1]
> The default sort compares as text. Pass (a, b) => a - b for numbers.
Q: Which comparison should you use?
- [ ] ==
- [x] ===
> === does not convert types, so "1" === 1 is false.
:::
