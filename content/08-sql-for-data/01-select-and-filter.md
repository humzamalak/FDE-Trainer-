# SELECT, WHERE, ORDER BY
<!-- minutes: 45 -->

SQL asks questions about tables. A table has **columns** (fields) and **rows** (records). The examples on this page run in SQLite in your browser: edit and run them. Earlier examples run first, so the table below exists in every later example.

```sql
CREATE TABLE jobs (
  id INTEGER PRIMARY KEY,
  user TEXT,
  partition TEXT,
  gpus INTEGER,
  hours REAL,
  state TEXT
);
INSERT INTO jobs VALUES
  (1, 'ana', 'gpu', 2, 5.5, 'COMPLETED'),
  (2, 'bo',  'gpu', 8, 12.0, 'FAILED'),
  (3, 'ana', 'cpu', 0, 1.0, 'COMPLETED'),
  (4, 'cy',  'gpu', 4, 3.0, 'RUNNING'),
  (5, 'bo',  'cpu', 0, 0.5, 'COMPLETED');
```

## The shape of a query

```sql
SELECT user, gpus, hours          -- which columns
FROM jobs                         -- which table
WHERE partition = 'gpu'           -- which rows
ORDER BY hours DESC               -- sort (DESC = biggest first)
LIMIT 2;                          -- at most 2 rows
```

SQL runs in this order: `FROM` → `WHERE` → `SELECT` → `ORDER BY` → `LIMIT`. This is why standard SQL (and Postgres, the database most customers use) does not let you use a column alias from `SELECT` inside `WHERE`. **SQLite, which runs the exercises in this app, is more lenient and allows it** — so if you try it here and it works, do not rely on it in an interview or at a customer. Repeat the expression in `WHERE`, or use a subquery or CTE.

## Filters

| Operator | Example |
|---|---|
| `=`, `<>` (not equal), `<`, `>=` | `gpus >= 4` |
| `AND`, `OR`, `NOT` | `partition = 'gpu' AND state = 'FAILED'` |
| `IN` | `state IN ('FAILED', 'CANCELLED')` |
| `BETWEEN` | `hours BETWEEN 1 AND 6` (inclusive) |
| `LIKE` | `user LIKE 'a%'` (`%` = any text, `_` = one character) |
| `IS NULL` | `end_time IS NULL` (never `= NULL`) |

## Calculated columns

```sql
SELECT user, gpus * hours AS gpu_hours, UPPER(state) AS state
FROM jobs
WHERE gpus > 0;
```

`AS` gives a column a name. Strings use single quotes `'...'`.

:::sql Long GPU jobs
Return `user` and `hours` for jobs on the `gpu` partition that ran **more than 4 hours**, longest first.
--- schema ---
CREATE TABLE jobs (id INTEGER PRIMARY KEY, user TEXT, partition TEXT, gpus INTEGER, hours REAL, state TEXT);
INSERT INTO jobs VALUES (1,'ana','gpu',2,5.5,'COMPLETED'),(2,'bo','gpu',8,12.0,'FAILED'),(3,'ana','cpu',0,1.0,'COMPLETED'),(4,'cy','gpu',4,3.0,'RUNNING'),(5,'bo','cpu',0,0.5,'COMPLETED'),(6,'di','gpu',1,4.5,'COMPLETED');
--- starter ---
SELECT user, hours FROM jobs;
--- solution ---
SELECT user, hours FROM jobs
WHERE partition = 'gpu' AND hours > 4
ORDER BY hours DESC;
:::

:::sql Failed or cancelled
Return the `id` and `user` of every job whose state is `FAILED` or `CANCELLED`. Use `IN`.
--- schema ---
CREATE TABLE jobs (id INTEGER PRIMARY KEY, user TEXT, state TEXT);
INSERT INTO jobs VALUES (1,'ana','COMPLETED'),(2,'bo','FAILED'),(3,'cy','CANCELLED'),(4,'di','RUNNING'),(5,'ana','FAILED');
--- starter ---
SELECT id, user FROM jobs WHERE state = 'FAILED';
--- solution ---
SELECT id, user FROM jobs WHERE state IN ('FAILED', 'CANCELLED');
:::

:::sql GPU hours
For every job that used at least one GPU, return `id` and `gpu_hours` (= `gpus * hours`), biggest first. Show only the top 3.
--- schema ---
CREATE TABLE jobs (id INTEGER PRIMARY KEY, user TEXT, gpus INTEGER, hours REAL);
INSERT INTO jobs VALUES (1,'ana',2,5.5),(2,'bo',8,12.0),(3,'ana',0,1.0),(4,'cy',4,3.0),(5,'bo',1,0.5),(6,'di',2,10.0);
--- starter ---
SELECT id, gpus, hours FROM jobs;
--- solution ---
SELECT id, gpus * hours AS gpu_hours FROM jobs
WHERE gpus >= 1
ORDER BY gpu_hours DESC
LIMIT 3;
:::

:::sql Missing end time
Some jobs have no `ended` time yet (NULL). Return the `id` of those jobs. Remember: `= NULL` never matches.
--- schema ---
CREATE TABLE jobs (id INTEGER PRIMARY KEY, started TEXT, ended TEXT);
INSERT INTO jobs VALUES (1,'2026-11-01 09:00','2026-11-01 10:00'),(2,'2026-11-01 09:30',NULL),(3,'2026-11-02 08:00','2026-11-02 09:15'),(4,'2026-11-02 11:00',NULL);
--- starter ---
SELECT id FROM jobs WHERE ended = NULL;
--- solution ---
SELECT id FROM jobs WHERE ended IS NULL;
:::

:::quiz
Q: Which runs first inside the database?
- [ ] SELECT
- [x] WHERE
- [ ] ORDER BY
> FROM, then WHERE, then SELECT, then ORDER BY, then LIMIT.
Q: How do you find rows where a column has no value?
- [ ] `col = NULL`
- [x] `col IS NULL`
- [ ] `col = ''`
> NULL means "unknown", and any comparison with = gives unknown, not true.
:::
