# Choosing and scoping your projects
<!-- minutes: 30 -->

Coming from infrastructure, your CV shows you can run systems. Your projects must show the other half: **you can build software for a user, end to end, with AI in it, and explain your decisions.**

## What a hiring manager looks for in 2 minutes

1. A README that says **what problem it solves, for whom**, with a screenshot or a 2-minute video.
2. It **runs**: one command, or a live link.
3. **Tests** and a CI badge.
4. **Evals** for anything with an LLM: a number, and how it changed when you changed something.
5. **Decisions written down**: why this model, this chunk size, this database. A short "Design decisions" section.
6. Commits over weeks, not one big commit the night before.

## The three projects

| Project | Proves | FDE interview link |
|---|---|---|
| 1. Document assistant with citations and evals | RAG, prompting, evals, a web UI | AI system design, deep dive |
| 2. Data integration service | APIs, messy data, SQL, retries, tests, Docker | Practical coding, integration design |
| 3. Agent with tools and guardrails | Tool use, safety, cost and latency, observability | LLM engineering, security questions |

**Pick a real domain you know.** A domain you understand makes the project better and the story stronger. Research computing is a good one: for example an assistant over public HPC documentation, or a tool that turns a user's plain-English request into a checked job script. Use **public** documents and **fake** data only, never your employer's internal material or real user data.

## Scope it small, then grow it

Each project has a **minimum version** (2–3 weekends) and **stretch goals**. Ship the minimum version publicly before you start any stretch goal. A finished small project beats an unfinished big one every time.

:::checklist Before you start each project
Tick these for project 1 now; repeat them for each project.
- [ ] I can say the user and the problem in one sentence
- [ ] I chose public documents or fake data (no employer or personal data)
- [ ] I created a GitHub repo with a README stub, a licence and a .gitignore
- [ ] I wrote the minimum version as 3–6 milestones with a date for each
- [ ] I set a cost limit for API usage (for example \$10 per month in the Anthropic console)
:::

:::quiz
Q: Which project is the strongest signal to an FDE hiring manager?
- [ ] A clone of a popular app, following a video tutorial
- [x] A small tool for a real user problem, with tests, evals, a demo, and written design decisions
- [ ] A large unfinished platform with many features
Q: You want to build an assistant over documents from your current job. What is the right choice?
- [ ] Use the internal documents; the repo can be private
- [x] Use public documents in the same domain, so you can show it openly and break no rules
:::
