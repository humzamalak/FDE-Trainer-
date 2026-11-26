# The system design framework
<!-- minutes: 40 -->

FDE design rounds are about a **customer's real problem**, not "design Twitter". The interviewer checks if you ask the right questions, make sensible trade-offs and can ship something safely.

## The 6 steps (45 minutes)

| Step | Time | What you do |
|---|---|---|
| 1. Requirements | 5–8 min | Users, use cases, what success means. Functional and non-functional (latency, scale, availability, security, compliance, budget, deadline) |
| 2. Constraints | 3 min | Existing systems, data location, identity provider, cloud/on-prem, team skills |
| 3. Estimates | 3 min | Users, requests/s, data size, tokens, cost (track 2) |
| 4. High-level design | 10 min | Boxes and arrows: clients → API → services → data stores → external systems |
| 5. Deep dive | 12 min | 1–2 hard parts: the data pipeline, retrieval, permissions, failure handling |
| 6. Risks and rollout | 5 min | Failure modes, monitoring, security, phased rollout, what you would do next |

## Good habits

- **Write things down** (requirements list, numbers, diagram) as you speak.
- **State trade-offs**: "Option A is simpler; option B scales better. Given 200 users, I choose A, and here is when I would switch."
- **Start simple**, then evolve. A monolith + Postgres is a valid first answer for many customers.
- **Ask about the deadline and the team**. A design the customer cannot operate is a bad design.
- **Talk about the rollout**: pilot with one team, measure, expand.

## Questions to always ask

1. Who are the users and how many?
2. What does success look like in 3 months? How is it measured?
3. What data is involved? How sensitive? Where must it stay?
4. What systems must we integrate with? Who owns them?
5. What is the identity provider? How are permissions managed today?
6. What is the budget and timeline?

:::quiz
Q: The interviewer gives a vague scenario. What do you do first?
- [ ] Draw the architecture
- [x] Ask questions to fix the requirements and constraints
- [ ] Pick a database
Q: Why talk about rollout in an FDE design round?
- [x] FDEs are judged on shipping safely to real customers, not only on architecture
- [ ] It fills time
:::

:::written Requirements for a vague request
Scenario: "A university wants AI to help researchers find the right datasets." Write the 10 clarifying questions you would ask, grouped into users, data, integration, security, and success.
--- rubric ---
- Questions cover users (who, how many, skill level) and the main use cases
- Data: catalogue location, formats, metadata quality, sensitivity (TRE/licensed data), update frequency
- Integration: existing catalogue/repository systems, identity provider, where it would live (portal, Teams, etc.)
- Security: access rights per dataset, licensing restrictions, logging
- Success: measurable outcome (time to find data, adoption, satisfaction), timeline and budget
:::

:::cards Design round framework
First 5 minutes :: Requirements: users, scale, data, constraints, success metric. Write them down.
Numbers to estimate :: Requests per second, storage size, latency target, cost.
Always cover :: Security, failure modes, monitoring, rollout.
:::
