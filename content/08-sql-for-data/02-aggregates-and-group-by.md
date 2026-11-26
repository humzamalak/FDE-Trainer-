# Aggregates, GROUP BY and HAVING
<!-- minutes: 50 -->

Aggregates turn many rows into one number: `COUNT`, `SUM`, `AVG`, `MIN`, `MAX`.

```sql
CREATE TABLE costs (day TEXT, project TEXT, service TEXT, usd REAL);
INSERT INTO costs VALUES
  ('2026-11-01', 'clear', 'ec2', 40.0),
  ('2026-11-01', 'clear', 's3', 2.5),
  ('2026-11-01', 'geo',   'ec2', 12.0),
  ('2026-11-02', 'clear', 'ec2', 38.0),
  ('2026-11-02', 'geo',   's3', 1.0),
  ('2026-11-02', 'econ',  'ec2', 75.0);
```

```sql
SELECT COUNT(*) AS rows_, SUM(usd) AS total, AVG(usd) AS average FROM costs;
```

## GROUP BY: one result row per group

```sql
SELECT project, SUM(usd) AS total
FROM costs
GROUP BY project
ORDER BY total DESC;
```

**Rule:** every column in `SELECT` must be either in `GROUP BY` or inside an aggregate.

## HAVING: filter groups

`WHERE` filters rows **before** grouping. `HAVING` filters groups **after**.

```sql
SELECT project, SUM(usd) AS total
FROM costs
WHERE service = 'ec2'
GROUP BY project
HAVING SUM(usd) > 50;
```

## NULL in aggregates

`COUNT(*)` counts rows. `COUNT(col)` counts rows where `col` is not NULL. `SUM` and `AVG` ignore NULLs. Use `COALESCE(col, 0)` to treat NULL as 0.

## COUNT DISTINCT

```sql
SELECT COUNT(DISTINCT project) AS projects FROM costs;
```

:::sql Cost per project
Return `project` and `total` (sum of `usd`) for each project, highest total first.
--- schema ---
CREATE TABLE costs (day TEXT, project TEXT, service TEXT, usd REAL);
INSERT INTO costs VALUES ('2026-11-01','clear','ec2',40.0),('2026-11-01','clear','s3',2.5),('2026-11-01','geo','ec2',12.0),('2026-11-02','clear','ec2',38.0),('2026-11-02','geo','s3',1.0),('2026-11-02','econ','ec2',75.0);
--- starter ---
SELECT project, usd FROM costs;
--- solution ---
SELECT project, SUM(usd) AS total FROM costs
GROUP BY project
ORDER BY total DESC;
:::

:::sql Busy users
Return each `user` with more than 2 jobs, and their job count as `jobs`.
--- schema ---
CREATE TABLE jobs (id INTEGER PRIMARY KEY, user TEXT, state TEXT);
INSERT INTO jobs VALUES (1,'ana','COMPLETED'),(2,'ana','FAILED'),(3,'ana','COMPLETED'),(4,'bo','COMPLETED'),(5,'cy','FAILED'),(6,'cy','COMPLETED'),(7,'cy','RUNNING'),(8,'cy','COMPLETED');
--- starter ---
SELECT user, COUNT(*) AS jobs FROM jobs GROUP BY user;
--- solution ---
SELECT user, COUNT(*) AS jobs FROM jobs
GROUP BY user
HAVING COUNT(*) > 2;
:::

:::sql Failure rate per partition
For each `partition`, return `partition`, `total` jobs and `failed` jobs. Hint: `SUM(CASE WHEN state = 'FAILED' THEN 1 ELSE 0 END)`.
--- schema ---
CREATE TABLE jobs (id INTEGER PRIMARY KEY, partition TEXT, state TEXT);
INSERT INTO jobs VALUES (1,'gpu','FAILED'),(2,'gpu','COMPLETED'),(3,'gpu','FAILED'),(4,'cpu','COMPLETED'),(5,'cpu','COMPLETED'),(6,'cpu','FAILED'),(7,'debug','COMPLETED');
--- starter ---
SELECT partition, COUNT(*) AS total FROM jobs GROUP BY partition;
--- solution ---
SELECT partition,
       COUNT(*) AS total,
       SUM(CASE WHEN state = 'FAILED' THEN 1 ELSE 0 END) AS failed
FROM jobs
GROUP BY partition;
:::

:::sql Average with missing values
Some readings are NULL (sensor offline). Return `node` and `avg_temp` where missing readings count as **missing** (ignored), and `readings` as the number of non-NULL readings.
--- schema ---
CREATE TABLE temps (node TEXT, temp REAL);
INSERT INTO temps VALUES ('gpu-01',60),('gpu-01',NULL),('gpu-01',70),('gpu-02',NULL),('gpu-02',55),('gpu-03',80);
--- starter ---
SELECT node, AVG(COALESCE(temp, 0)) AS avg_temp, COUNT(*) AS readings FROM temps GROUP BY node;
--- solution ---
SELECT node, AVG(temp) AS avg_temp, COUNT(temp) AS readings FROM temps GROUP BY node;
:::

:::quiz
Q: You want projects whose total cost is over 100. Where does the condition go?
- [ ] WHERE SUM(usd) > 100
- [x] HAVING SUM(usd) > 100
- [ ] ORDER BY SUM(usd) > 100
> WHERE runs before grouping and cannot use aggregates. HAVING filters groups.
Q: A column has 10 rows, 3 of them NULL. What does COUNT(col) return?
- [ ] 10
- [x] 7
- [ ] 3
:::
