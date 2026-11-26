# Worked examples
<!-- minutes: 45 -->

Read each example once, then close the page and do it again out loud with a timer. The words matter less than the order: **goal → workflow → split → data → priority → first version → risks**.

## Example 1: "A supermarket chain loses 4% of its fresh food to waste"

**Goal.** "Is the target waste as a share of fresh sales? Over what time, and which stores?" They say: from 4% to 3% in 12 months, all 300 stores. 1 point of fresh sales is a large amount of money, so a small first win matters.

**Workflow.** Forecast demand → order from suppliers → deliver → store → put on shelf → mark down near the date → sell or throw away.

**Split (where waste happens).**
- Over-ordering (forecast too high)
- Damage in transport and storage
- Expiry on the shelf (no markdown, or markdown too late)
- Returns and recalls

**Data.** Orders and sales per product per store per day (the ordering system), waste logs (often paper or a handheld scanner: check the quality!), markdown history, delivery records.

**Priority.** Ask which part is biggest. If they do not know, the **first task is measurement**: a waste breakdown by cause for 20 stores. Then, if over-ordering is the biggest, the first product is better forecasts for the top 50 waste items in 20 pilot stores. Markdown timing is often the quickest win: lower effort, high confidence.

**First version.** A daily list for store staff: "these 30 items will probably expire; mark them down now by X%". Measure waste and margin against 20 matched control stores for 6 weeks.

**Risks.** Bad waste data; staff do not use the list (adoption: design it with them); markdowns cut margin (measure margin, not only waste).

## Example 2: "An insurer has a backlog of 50,000 claims"

**Goal.** Backlog size, or time to pay? "If we halved the time from claim to payment, would that be success?" Also: is fraud the concern, or speed?

**Split by claim journey:** intake (missing documents) → triage (which team) → assessment → fraud check → approval → payment. Then **split the backlog by claim type**: simple claims may be 70% of volume.

**Data.** Claims system events with timestamps (this lets you measure each stage), document store, fraud rules, team capacity.

**First version.** Find the stage where claims wait longest. A common answer: claims wait for missing documents. Ship an automatic check at intake that tells the customer what is missing on day 1, plus a "simple claim" fast lane with human approval. Measure days to payment.

**Risks.** Regulators and fair treatment (explain decisions; keep a human in the loop for rejections), fraud getting through the fast lane (sample audits).

## Phrases that help

- "Let me pause and summarise where we are."
- "I am going to make an assumption here so we can move on: … Tell me if that is wrong."
- "I would not build anything until I have checked this data with the people who enter it."
- "If you only let me do one thing in the first month, it is …, because …"

:::written Your turn: the police force
"A police force says officers spend too much time on paperwork." Write your full decomposition in about 300 words: goal and metric, workflow, an issue tree with 3–5 parts, the data you need, your first version, and three risks.
--- rubric ---
- Asks or states a measurable goal (for example hours of admin per shift, or time from incident to completed report) and a scope
- Describes the workflow (incident, notes, report, evidence, case file, handover to prosecutors)
- An issue tree whose parts do not overlap (for example duplicate data entry across systems, report writing, evidence handling, searching for information)
- Names data and systems, owners, and that the data is highly sensitive (governance, vetting, audit)
- A small first version (for example pre-filling a report from data already entered, for one report type at one station) with a measurable pilot
- Risks include accuracy of AI drafting in legal documents, officer adoption, security and legal disclosure rules
:::

:::quiz
Q: In the supermarket example, why measure the waste breakdown before building anything?
- [x] Because the best first product depends on which cause is largest, and nobody knows that yet
- [ ] Because measuring is easier than building
- [ ] Because the interviewer always expects a dashboard
Q: The interviewer changes a constraint halfway: "The budget is cut by half." What is the best reaction?
- [ ] Start again from the beginning
- [x] Say what changes in your priority (for example drop the high-effort option) and keep the rest of the structure
- [ ] Argue that the budget should not change
:::
