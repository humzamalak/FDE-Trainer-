# Explaining technical ideas to non-technical people
<!-- minutes: 30 -->

FDEs talk to executives, researchers, clinicians and lawyers. If they do not understand you, they do not buy, adopt or approve.

## The method

1. **Start with why it matters to them.** Outcome first, mechanism second.
2. **One idea at a time.** Short sentences. No jargon, or explain it once.
3. **Use an analogy from their world.**
4. **Check understanding**: "Does that make sense for your team?" — then let them say it back.
5. **Be honest about limits.** "It will be right most of the time, not always. That is why staff review the answer."

## Examples

**RAG, for a hospital manager:**
> "The assistant does not memorise your policies. When someone asks a question, it first looks up the 5 most relevant policy pages, like a librarian, and then writes an answer from only those pages. It shows which pages it used, so staff can check."

**GPU scheduling, for a researcher:**
> "The cluster is like a shared lab with 18 expensive machines. Slurm is the booking system. You ask for a machine and a time; it gives you one when it is free, and keeps things fair between groups."

**Hallucination, for an executive:**
> "The model can sound confident and still be wrong. We reduce that by making it answer only from your documents and show its sources, and we measure the error rate every week."

:::written Explain three things
Explain each of these in 2–3 sentences for the audience given: (1) embeddings, for a finance director; (2) prompt injection, for a head of HR; (3) why an eval set matters, for a project sponsor who wants to launch next week.
--- rubric ---
- Each explanation is 2–3 short sentences with no unexplained jargon
- Uses an analogy or example relevant to the audience
- States why it matters to that person (risk, cost, decision)
- Honest about limits; the eval explanation gives a clear reason not to skip testing and offers a fast option
:::
