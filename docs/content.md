# Writing lessons


1. Create a Markdown file in a track folder. The number at the start sets the order, for example `content/03-coding-interview-patterns/10-my-topic.md`.
2. The first `# ` heading is the lesson title. Add `<!-- minutes: 30 -->` to set the estimated time.
3. Use these blocks:

````markdown
:::exercise Title of the exercise
Explain the task in Markdown.
--- starter ---
def f(x):
    pass
--- tests ---
assert f(1) == 2
assert f(0) == 1
--- solution ---
def f(x):
    return x + 1
:::

:::quiz
Q: The question?
- [ ] a wrong answer
- [x] the right answer
> Why it is right.
:::

:::written Title of the written task
The prompt for a free-text answer.
--- rubric ---
- What a good answer must contain
:::
````

4. Maths: `$inline$` and `$$display$$` (LaTeX). Money: write `\$5` so it is not read as maths.
5. Run the tests (next section). They check that your solution passes and your starter fails.
6. To add a new track, create a folder like `08-my-track/` with a `_track.md` file (first line `# Title`, then a description).

## SQL and JavaScript blocks

````markdown
:::sql Title
The task.
--- schema ---
CREATE TABLE t (id INTEGER, v TEXT);
INSERT INTO t VALUES (1, 'a'), (2, 'b');
--- starter ---
SELECT * FROM t;
--- solution ---
SELECT id FROM t WHERE v = 'b';
:::

:::js Title
The task.
--- starter ---
function f(x) {}
--- tests ---
assertEqual(f(1), 2)
assert(f(0) === 1, "f(0) must be 1")
--- solution ---
function f(x) { return x + 1; }
:::
````

- A SQL exercise passes when the query returns the same columns and rows as the solution. Order matters only if the solution has `ORDER BY`.
- JavaScript tests are one statement per line; `assert(condition, message)` and `assertEqual(actual, expected)` are available, and `await` works.
- Python exercises and examples may use `await` at the top level (asyncio lessons).

## Block IDs (do not lose progress)

Progress is saved by block ID, which comes from the title: `:::exercise Two Sum` → `lesson#ex-two-sum`. **If you rename an exercise, its progress is lost** — keep the old ID with `:::exercise New title {#two-sum}`. After adding blocks, run `python scripts/snapshot_ids.py`; the tests fail if an ID disappears.

## Track order

Folders sort by their number. To put a new track between existing ones without renaming folders (which would change IDs), add `<!-- order: 3.5 -->` to its `_track.md`.
