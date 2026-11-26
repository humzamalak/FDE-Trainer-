# Practice problems
<!-- minutes: 60 -->

Do one problem per day for a week. Use a 30-minute timer and talk out loud (record yourself on your phone if you can). Then submit a written summary for grading, or do the **Decomposition** mock interview, which gives you a new problem each time and pushes back like an interviewer.

A good answer covers the six steps. A great answer also:

- states assumptions out loud and moves on,
- chooses one thing to do first and defends it,
- names the data owner and the sensitivity of the data,
- has a first version measured against a control group or a baseline.

:::written Problem 1: the energy company
"An energy company gets 30,000 customer complaints a month about bills." Decompose the problem.
--- rubric ---
- Clarifies the goal (complaints per 1,000 customers? time to resolve? regulator penalties?) and the target
- Splits complaints by cause (estimated readings, price changes, payment problems, errors, unclear bills) before choosing a solution
- Names data (billing system, meter reads, complaints log with categories, call transcripts) and data quality issues
- Prioritises by size of cause and effort; a first version such as fixing the top cause (for example prompting customers for meter readings before an estimate)
- Mentions regulation, vulnerable customers and measuring against a baseline
:::

:::written Problem 2: the city council
"A city council wants to use AI to improve services for residents." (This is deliberately vague.) Decompose it.
--- rubric ---
- Refuses to start with AI; first narrows down which service and which outcome, and suggests how to choose (volume, pain, data availability)
- Picks one service area with a clear metric (for example housing repair requests: time to fix)
- Workflow and issue tree for that service
- Data and governance (public sector, personal data, equality impact)
- A small, measurable first version and how it could expand
:::

:::written Problem 3: the bank's onboarding
"A bank loses 40% of business customers during account opening." Decompose it.
--- rubric ---
- Clarifies where in the funnel the 40% drop out and what "lost" means
- Splits by funnel step (application form, documents, identity and anti-money-laundering checks, waiting time, approval)
- Data: funnel events with timestamps, case notes, reasons for rejection
- First version targets the biggest drop-off step (for example document checklist and status updates, or faster review queue), measured with an A/B test or a pilot group
- Risks: regulatory checks cannot be skipped; fairness
:::

:::written Problem 4: the logistics firm
"Deliveries in our van fleet are late 15% of the time." Decompose it.
--- rubric ---
- Defines late (against the promised slot? by how much?) and the target
- Splits by cause along the journey (loading at depot, route planning, traffic, failed delivery attempts, driver availability)
- Data: telematics/GPS, delivery scans, route plans, customer availability
- Chooses a first part with evidence and a small pilot (one depot), with a control group
- Risks: driver adoption, data quality, safety (do not push drivers to drive faster)
:::
