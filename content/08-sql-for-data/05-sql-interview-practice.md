# SQL interview practice
<!-- minutes: 60 -->

Do each problem in **15 minutes**, talking aloud. Method:

1. Read the tables. Say what one row means.
2. Write the answer shape: which columns, one row per what?
3. Build it in steps (CTEs). Run each step.
4. Check edge cases: NULLs, ties, empty groups, duplicates after joins.

:::sql Daily active users
Return `day` and `active_users` (number of **distinct** users who logged in that day), in day order.
--- schema ---
CREATE TABLE logins (user TEXT, at TEXT);
INSERT INTO logins VALUES ('ana','2026-11-01 09:00'),('ana','2026-11-01 13:00'),('bo','2026-11-01 10:00'),('ana','2026-11-02 08:00'),('cy','2026-11-02 09:00'),('cy','2026-11-02 18:00'),('bo','2026-11-03 07:00');
--- starter ---
SELECT DATE(at) AS day, COUNT(*) AS active_users FROM logins GROUP BY DATE(at) ORDER BY day;
--- solution ---
SELECT DATE(at) AS day, COUNT(DISTINCT user) AS active_users
FROM logins GROUP BY DATE(at) ORDER BY day;
:::

:::sql Second most expensive service
Return the `service` with the **second highest** total cost. Ties do not matter here.
--- schema ---
CREATE TABLE costs (service TEXT, usd REAL);
INSERT INTO costs VALUES ('ec2',40),('s3',5),('rds',30),('ec2',30),('lambda',2),('rds',35),('s3',1);
--- starter ---
SELECT service FROM costs ORDER BY usd DESC LIMIT 1;
--- solution ---
WITH totals AS (SELECT service, SUM(usd) AS total FROM costs GROUP BY service)
SELECT service FROM totals ORDER BY total DESC LIMIT 1 OFFSET 1;
:::

:::sql Budget alerts
Each project has a monthly budget. Return `project`, `spent` and `pct` (spent ÷ budget × 100, rounded to 1 decimal) for projects that spent **80% or more** of their budget. Projects with no costs are not over budget.
--- schema ---
CREATE TABLE budgets (project TEXT PRIMARY KEY, monthly_usd REAL);
CREATE TABLE costs (project TEXT, usd REAL);
INSERT INTO budgets VALUES ('clear',100),('geo',50),('econ',200),('stats',10);
INSERT INTO costs VALUES ('clear',60),('clear',25),('geo',20),('econ',190),('econ',15);
--- starter ---
SELECT b.project, SUM(c.usd) AS spent FROM budgets b JOIN costs c ON c.project = b.project GROUP BY b.project;
--- solution ---
WITH spent AS (SELECT project, SUM(usd) AS spent FROM costs GROUP BY project)
SELECT b.project, s.spent, ROUND(s.spent * 100.0 / b.monthly_usd, 1) AS pct
FROM budgets b JOIN spent s ON s.project = b.project
WHERE s.spent >= 0.8 * b.monthly_usd;
:::

:::sql Users who used GPUs on two days in a row
Return the distinct `user` who ran GPU jobs on two consecutive days. Hint: `LAG(day)` per user, then compare with `DATE(day, '-1 day')`.
--- schema ---
CREATE TABLE gpu_days (user TEXT, day TEXT);
INSERT INTO gpu_days VALUES ('ana','2026-11-01'),('ana','2026-11-02'),('bo','2026-11-01'),('bo','2026-11-03'),('cy','2026-11-05'),('cy','2026-11-06'),('cy','2026-11-07'),('di','2026-11-02');
--- starter ---
SELECT DISTINCT user FROM gpu_days;
--- solution ---
WITH ordered AS (
  SELECT user, day, LAG(day) OVER (PARTITION BY user ORDER BY day) AS prev
  FROM (SELECT DISTINCT user, day FROM gpu_days)
)
SELECT DISTINCT user FROM ordered WHERE prev = DATE(day, '-1 day');
:::
