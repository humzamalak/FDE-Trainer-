# CTEs and window functions
<!-- minutes: 60 -->

These two tools solve most "harder" SQL interview questions.

## CTEs: name a step

A **CTE** (`WITH name AS (...)`) is a named sub-query. It makes long queries readable, step by step — like variables in Python.

```sql
CREATE TABLE costs (day TEXT, project TEXT, usd REAL);
INSERT INTO costs VALUES
  ('2026-11-01','clear',40),('2026-11-02','clear',38),('2026-11-03','clear',60),
  ('2026-11-01','geo',12),('2026-11-02','geo',30),('2026-11-03','geo',5);
```

```sql
WITH totals AS (
  SELECT project, SUM(usd) AS total FROM costs GROUP BY project
)
SELECT project, total FROM totals WHERE total > 50;
```

## Window functions: calculate across rows, keep every row

`GROUP BY` collapses rows. A **window function** adds a value to each row, computed over a "window" of related rows.

```sql
SELECT day, project, usd,
       SUM(usd) OVER (PARTITION BY project ORDER BY day) AS running_total,
       ROW_NUMBER() OVER (PARTITION BY project ORDER BY usd DESC) AS rank_in_project,
       LAG(usd) OVER (PARTITION BY project ORDER BY day) AS previous_day
FROM costs
ORDER BY project, day;
```

- `PARTITION BY` = "restart for each group" (like GROUP BY, without collapsing).
- `ORDER BY` inside `OVER` = order within the group.
- `ROW_NUMBER()`, `RANK()`, `DENSE_RANK()` — numbering. Use them for **"top N per group"**.
- `LAG(x)` / `LEAD(x)` — the previous / next row's value. Use them for **day-over-day change**.
- `SUM(x) OVER (...)` — running total.

## Top N per group (very common question)

```sql
WITH ranked AS (
  SELECT project, day, usd,
         ROW_NUMBER() OVER (PARTITION BY project ORDER BY usd DESC) AS rn
  FROM costs
)
SELECT project, day, usd FROM ranked WHERE rn = 1;
```

:::sql Most expensive day per project
Return `project`, `day` and `usd` for the single most expensive day of each project.
--- schema ---
CREATE TABLE costs (day TEXT, project TEXT, usd REAL);
INSERT INTO costs VALUES ('2026-11-01','clear',40),('2026-11-02','clear',38),('2026-11-03','clear',60),('2026-11-01','geo',12),('2026-11-02','geo',30),('2026-11-03','geo',5),('2026-11-01','econ',7);
--- starter ---
SELECT project, MAX(day) AS day, usd FROM costs GROUP BY project;
--- solution ---
WITH ranked AS (
  SELECT project, day, usd,
         ROW_NUMBER() OVER (PARTITION BY project ORDER BY usd DESC) AS rn
  FROM costs
)
SELECT project, day, usd FROM ranked WHERE rn = 1;
:::

:::sql Day-over-day change
For project `clear` only, return `day`, `usd` and `change` (= today's usd minus the previous day's usd; NULL for the first day), in day order.
--- schema ---
CREATE TABLE costs (day TEXT, project TEXT, usd REAL);
INSERT INTO costs VALUES ('2026-11-01','clear',40),('2026-11-02','clear',38),('2026-11-03','clear',60),('2026-11-04','clear',61),('2026-11-01','geo',12);
--- starter ---
SELECT day, usd, 0 AS change FROM costs WHERE project = 'clear' ORDER BY day;
--- solution ---
SELECT day, usd, usd - LAG(usd) OVER (ORDER BY day) AS change
FROM costs WHERE project = 'clear'
ORDER BY day;
:::

:::sql Running total of spend
Return `day` and `running` (the total spend of all projects from the first day up to and including that day), in day order. First total per day in a CTE, then a window SUM.
--- schema ---
CREATE TABLE costs (day TEXT, project TEXT, usd REAL);
INSERT INTO costs VALUES ('2026-11-01','clear',40),('2026-11-01','geo',10),('2026-11-02','clear',38),('2026-11-03','geo',30),('2026-11-03','clear',2);
--- starter ---
SELECT day, SUM(usd) AS running FROM costs GROUP BY day ORDER BY day;
--- solution ---
WITH daily AS (SELECT day, SUM(usd) AS total FROM costs GROUP BY day)
SELECT day, SUM(total) OVER (ORDER BY day) AS running FROM daily ORDER BY day;
:::

:::quiz
Q: What is the difference between GROUP BY and a window function with PARTITION BY?
- [x] GROUP BY returns one row per group; a window function keeps every row and adds a value
- [ ] There is no difference
- [ ] Window functions only work on numbers
Q: Which function gives the previous row's value?
- [ ] LEAD
- [x] LAG
- [ ] ROW_NUMBER
:::
