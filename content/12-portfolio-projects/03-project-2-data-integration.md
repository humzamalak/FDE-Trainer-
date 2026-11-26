# Project 2: a data integration service
<!-- minutes: 30 -->

**The user:** an operations team that copies data between two systems by hand every week.
**The product:** a small service that pulls records from one API (or CSV export), cleans and validates them, loads them into a database, and exposes a clean API and a daily report. It must survive bad data and a flaky upstream API.

Lessons this uses: 1.9 (files), 1.13 (HTTP, retries, idempotency), 1.15 (messy data), 1.17 (pandas), 8 (SQL), 5c (Docker, CI).

Use a free public API with real messy data (for example a public transport, weather, or open-government data API), or generate fake data with deliberate problems: missing fields, duplicates, bad dates, different encodings.

:::checklist Milestones: minimum version
- [ ] M1. A script that fetches one page of data and saves the raw JSON/CSV, with retries and backoff
- [ ] M2. A cleaning step with validation (pydantic or plain checks); bad rows go to a "rejected" file with the reason
- [ ] M3. Load into SQLite or Postgres with a clear schema; running the load twice creates no duplicates (idempotent upsert)
- [ ] M4. A FastAPI endpoint that serves the clean data with filters and pagination
- [ ] M5. A daily summary (SQL with GROUP BY and a window function) as a CSV or HTML page
- [ ] M6. Tests with recorded API responses (no network in tests), a Dockerfile, CI, and a README with an architecture diagram
:::

## Acceptance criteria

- Running the pipeline twice gives the same database (prove it with a test).
- When the upstream API fails 3 times in a row, the job stops cleanly and logs a clear error.
- The README shows how many rows were rejected and why, from a real run.

:::checklist Stretch goals (pick two)
- [ ] Incremental loads: only fetch records changed since the last run
- [ ] An LLM step that classifies or extracts a field from free text, with an eval and a cost per 1,000 rows
- [ ] Scheduling (cron, GitHub Actions schedule, or a small worker) with alerting on failure
- [ ] Structured logging and a metrics endpoint
- [ ] Deploy with docker compose (app + Postgres)
:::
