# JOINs
<!-- minutes: 50 -->

Real data lives in several tables. A **JOIN** combines rows that match on a key.

```sql
CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, team TEXT);
CREATE TABLE jobs (id INTEGER PRIMARY KEY, user_id INTEGER, gpus INTEGER);
INSERT INTO users VALUES (1, 'ana', 'econ'), (2, 'bo', 'geo'), (3, 'cy', 'econ');
INSERT INTO jobs VALUES (10, 1, 2), (11, 1, 4), (12, 2, 8), (13, 9, 1);
```

## INNER JOIN: only rows that match on both sides

```sql
SELECT users.name, jobs.id AS job, jobs.gpus
FROM jobs
JOIN users ON users.id = jobs.user_id;
```

Job 13 (user 9 does not exist) and cy (no jobs) are not in the result.

## LEFT JOIN: keep every row from the left table

```sql
SELECT u.name, COUNT(j.id) AS jobs
FROM users u
LEFT JOIN jobs j ON j.user_id = u.id
GROUP BY u.name;
```

cy appears with 0 jobs. `u` and `j` are **aliases** (short names). `COUNT(j.id)` counts only matched rows.

## Anti-join: rows with NO match

"Users who never ran a job":

```sql
SELECT u.name
FROM users u
LEFT JOIN jobs j ON j.user_id = u.id
WHERE j.id IS NULL;
```

Same idea for data quality: "jobs whose user does not exist" (orphans) — a classic integration check.

## Watch out

- **Duplicates**: if the right table has several matches, the left row repeats. Check row counts before and after a join.
- Always say which table a column comes from (`u.name`) when names repeat.

:::sql Jobs with user names
Return `name` and `gpus` for every job that has a known user.
--- schema ---
CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, team TEXT);
CREATE TABLE jobs (id INTEGER PRIMARY KEY, user_id INTEGER, gpus INTEGER);
INSERT INTO users VALUES (1,'ana','econ'),(2,'bo','geo'),(3,'cy','econ');
INSERT INTO jobs VALUES (10,1,2),(11,1,4),(12,2,8),(13,9,1);
--- starter ---
SELECT user_id, gpus FROM jobs;
--- solution ---
SELECT u.name, j.gpus FROM jobs j JOIN users u ON u.id = j.user_id;
:::

:::sql GPUs per team
Return `team` and `gpus` (total GPUs requested by that team's users). Teams with no jobs must show `0`. Hint: `LEFT JOIN` and `COALESCE(SUM(...), 0)`.
--- schema ---
CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, team TEXT);
CREATE TABLE jobs (id INTEGER PRIMARY KEY, user_id INTEGER, gpus INTEGER);
INSERT INTO users VALUES (1,'ana','econ'),(2,'bo','geo'),(3,'cy','econ'),(4,'di','stats');
INSERT INTO jobs VALUES (10,1,2),(11,1,4),(12,2,8),(13,3,1);
--- starter ---
SELECT u.team, SUM(j.gpus) AS gpus FROM users u JOIN jobs j ON j.user_id = u.id GROUP BY u.team;
--- solution ---
SELECT u.team, COALESCE(SUM(j.gpus), 0) AS gpus
FROM users u LEFT JOIN jobs j ON j.user_id = u.id
GROUP BY u.team;
:::

:::sql Orphan jobs
Data quality check: return the `id` of every job whose `user_id` is not in `users`.
--- schema ---
CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT);
CREATE TABLE jobs (id INTEGER PRIMARY KEY, user_id INTEGER);
INSERT INTO users VALUES (1,'ana'),(2,'bo');
INSERT INTO jobs VALUES (10,1),(11,7),(12,2),(13,9),(14,1);
--- starter ---
SELECT j.id FROM jobs j JOIN users u ON u.id = j.user_id;
--- solution ---
SELECT j.id FROM jobs j LEFT JOIN users u ON u.id = j.user_id WHERE u.id IS NULL;
:::

:::quiz
Q: You LEFT JOIN users to jobs. A user has no jobs. What do the job columns contain?
- [ ] The user is removed
- [x] NULL
- [ ] 0
Q: After a join, the row count is much bigger than expected. Most likely cause?
- [x] The join key is not unique on one side, so rows are duplicated
- [ ] SQLite is broken
- [ ] You used LIMIT
:::

:::cards Joins
INNER JOIN :: Only rows with a match in both tables.
LEFT JOIN :: Every row from the left table; NULLs where the right has no match.
Row count grows after a join :: The join key is not unique in one of the tables.
:::
