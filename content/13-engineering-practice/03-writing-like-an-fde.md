# Writing like an FDE
<!-- minutes: 45 -->

FDEs write all day: design docs, decision records, status updates, handover notes, emails to executives, messages in the customer's chat. Good writing is how a small team keeps a large customer aligned. Many FDE loops include a written exercise or a take-home with a write-up, and some companies are famous for a strong writing culture.

## Bottom line up front (BLUF)

Put the conclusion or the request in the **first sentence**. Busy readers stop early.

> **Bad:** "Following our meeting on Tuesday, the team looked into several options for the data migration, considering cost and risk…"
> **Good:** "**Decision needed by Friday:** migrate the archive in one weekend (cheaper, 6 hours of downtime) or over 4 weeks (no downtime, £8k more). I recommend the weekend. Details below."

## Plain words

- Short sentences. One idea per sentence.
- Concrete numbers instead of adjectives: "p95 latency 2.1 s" not "fast".
- Name the owner and the date for every action.
- Write for the reader: an executive needs impact and the decision; an engineer needs the details.

## The design doc (one to three pages)

1. **Context and problem** — why now, who is affected.
2. **Goals and non-goals** — non-goals stop scope creep.
3. **Proposal** — the design, with one diagram.
4. **Alternatives considered** — and why not.
5. **Risks, security and compliance**.
6. **Rollout and how we measure success**.
7. **Open questions**.

## The decision record (ADR)

A short note per important decision, kept in the repo (`docs/decisions/0007-use-postgres.md`): **context, decision, consequences**. Six months later, when someone asks "why Postgres?", the answer is there.

## The handover note

When you leave a customer, they must be able to run what you built. Include: what it does, how to run and deploy it, where the secrets live (not the secrets!), the dashboards and alerts, known issues, and who to call.

:::written Rewrite for the executive
Rewrite this message for the customer's COO, who has 30 seconds. Keep all the facts that matter.

"Hi, so we've been working on the integration with the warehouse system and there were some issues with the API they gave us because it turned out the rate limit was much lower than what was in the documentation (10 requests per minute rather than 100) and so the nightly sync now takes about 9 hours instead of 1 which means the stock numbers are not ready when the stores open at 7. We could ask the vendor to raise the limit, which they said might take 2-3 weeks, or we could change the sync to only fetch changed items which would take us about 4 days of work, or both. Let me know what you think."
--- rubric ---
- Starts with the impact and the decision needed (stock numbers not ready at store opening; choose an option)
- Gives the options with time and trade-offs in a scannable form, and a clear recommendation (for example do both: start the vendor request now and build incremental sync in 4 days)
- Keeps the key numbers (10 vs 100 requests per minute, 9 hours vs 1 hour, 4 days, 2–3 weeks)
- Under about 100 words, no jargon
:::

:::written Write a decision record
Write an ADR (context, decision, consequences) for this decision: your RAG assistant will use the customer's existing PostgreSQL with the pgvector extension instead of a separate vector database.
--- rubric ---
- Context: scale (number of documents/chunks), the customer already runs and backs up Postgres, security review cost of a new system, team skills
- Decision stated in one sentence
- Consequences include positives (one system to secure and back up, SQL filters for permissions, transactions) and negatives (performance limits at very large scale, index tuning, possible later migration), and when to revisit
- Short and specific
:::

:::quiz
Q: What goes in the first sentence of a status email to an executive?
- [x] The impact and any decision you need from them
- [ ] The history of the project
Q: Why write "non-goals" in a design doc?
- [x] To make clear what the project will not do, which prevents scope creep and false expectations
- [ ] Because templates have that section
:::

:::cards Writing
BLUF :: Bottom line up front: the conclusion or request in the first sentence.
Design doc sections :: Context, goals and non-goals, proposal, alternatives, risks, rollout and success, open questions.
ADR :: Architecture decision record: context, decision, consequences — one per important decision, in the repo.
Handover note :: What it does, how to run and deploy, where secrets live, dashboards, known issues, contacts.
:::
