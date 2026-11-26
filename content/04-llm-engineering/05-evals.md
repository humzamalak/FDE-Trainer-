# Evals: proving the system works
<!-- minutes: 60 -->

**"How do you know it works?"** is the most important question in an FDE interview about AI. The answer is an **eval**: a test set plus a scoring method, run every time you change the prompt, model, chunking or data.

## Build an eval set

1. Collect **real** questions from the customer (tickets, emails, search logs). 50 is a start; 200+ is better.
2. Write the expected answer or the facts it must contain, and which documents contain it.
3. Include hard cases: questions with no answer, ambiguous questions, old vs new policy, adversarial inputs.
4. Keep it in version control. It is a product asset.

## Ways to score

| Method | Good for | Weakness |
|---|---|---|
| Exact match / code checks | classification, extraction, JSON fields | brittle for free text |
| Keyword / must-contain facts | factual answers | misses paraphrase |
| **LLM-as-judge** with a rubric | free text: correctness, groundedness, tone | must be checked against humans; can be biased |
| Human review | ground truth, final sign-off | slow, expensive |

## Evaluate RAG in two parts

- **Retrieval**: is the right chunk in the top-k? Measure **recall@k** = fraction of questions where at least one correct chunk is retrieved. Also MRR (how high it ranks).
- **Generation**: given the right context, is the answer correct and **grounded** (no claims outside the context)?

If retrieval is bad, no prompt change will fix generation. Measure them separately.

## Use evals like CI

- Run the eval on every change. Track the score over time.
- Compare versions **on the same questions**. Look at which questions changed, not only the total (track 2, lesson 3: small samples are noisy).
- Look at the failures by hand. Group them (retrieval miss, wrong reasoning, format error). Fix the biggest group first.

## Production monitoring

Log inputs, outputs, retrieved chunks, latency, cost, and user feedback (thumbs up/down). Sample real traffic into the eval set. This is the same as observability for infrastructure: you cannot fix what you cannot see.

:::exercise Recall at k
Write `recall_at_k(results, gold, k)`. `results` is a dict question_id → ranked list of retrieved chunk ids. `gold` is a dict question_id → set of correct chunk ids. Return the fraction of questions (in `gold`) where at least one gold chunk is in the first `k` results. Round to 3 decimals. Questions missing from `results` count as misses.
--- starter ---
def recall_at_k(results, gold, k):
    pass
--- tests ---
results = {"q1": ["c1", "c2", "c3"], "q2": ["c9", "c8", "c4"], "q3": ["c5"]}
gold = {"q1": {"c2"}, "q2": {"c4"}, "q3": {"c7"}, "q4": {"c1"}}
assert recall_at_k(results, gold, 1) == 0.0
assert recall_at_k(results, gold, 2) == 0.25
assert recall_at_k(results, gold, 3) == 0.5
--- solution ---
def recall_at_k(results, gold, k):
    if not gold:
        return 0.0
    hits = 0
    for qid, correct in gold.items():
        if set(results.get(qid, [])[:k]) & correct:
            hits += 1
    return round(hits / len(gold), 3)
:::

:::exercise Must-contain fact checker
Write `fact_score(answer, facts)`. `facts` is a list of required facts; each fact is a list of acceptable phrasings (synonyms). A fact is present if **any** phrasing appears in the answer (case-insensitive). Return the fraction of facts present, rounded to 2 decimals. If `facts` is empty, return 1.0.
--- starter ---
def fact_score(answer, facts):
    pass
--- tests ---
facts = [["sbatch"], ["gpu partition", "--partition=gpu", "-p gpu"], ["8 gpus", "eight gpus"]]
assert fact_score("Use sbatch with -p gpu. You can ask for eight GPUs.", facts) == 1.0
assert fact_score("Use sbatch.", facts) == 0.33
assert fact_score("anything", []) == 1.0
--- solution ---
def fact_score(answer, facts):
    if not facts:
        return 1.0
    text = answer.lower()
    present = sum(1 for options in facts if any(o.lower() in text for o in options))
    return round(present / len(facts), 2)
:::

:::exercise Compare two versions
Write `compare(old, new)`. Both are dicts question_id → bool (passed). Return a dict with `"old_score"` and `"new_score"` (fractions, 2 decimals), `"fixed"` (sorted ids that failed before and pass now) and `"broken"` (sorted ids that passed before and fail now). Use only questions in both.
--- starter ---
def compare(old, new):
    pass
--- tests ---
old = {"q1": True, "q2": False, "q3": True, "q4": False}
new = {"q1": True, "q2": True, "q3": False, "q4": False, "q5": True}
assert compare(old, new) == {"old_score": 0.5, "new_score": 0.5, "fixed": ["q2"], "broken": ["q3"]}
--- solution ---
def compare(old, new):
    common = sorted(set(old) & set(new))
    n = len(common) or 1
    return {
        "old_score": round(sum(old[q] for q in common) / n, 2),
        "new_score": round(sum(new[q] for q in common) / n, 2),
        "fixed": [q for q in common if not old[q] and new[q]],
        "broken": [q for q in common if old[q] and not new[q]],
    }
:::

:::written Write an LLM-as-judge rubric
Write the judge prompt you would use to grade answers from a hospital policy assistant. Define the scoring scale, the criteria (at least: correctness, groundedness, safety), the output format, and how you would check that the judge agrees with humans.
--- rubric ---
- A clear scale (e.g. 1–5 or pass/fail per criterion) with definitions for each level
- Criteria include correctness vs reference, groundedness in provided context, safety/escalation for clinical risk, and refusing when unsure
- Judge gets question, context, reference answer and candidate answer in separate tags
- Structured output (JSON with per-criterion scores and a short reason)
- Calibration: compare with human labels on a sample, measure agreement, iterate the rubric; watch for bias (length, position)
:::

:::quiz
Q: Your RAG answers got worse after a change. First thing to check?
- [ ] Switch to a bigger model
- [x] Measure retrieval (recall@k) separately from generation, then look at the failed questions
- [ ] Increase temperature
Q: v1 scores 80%, v2 scores 80% on the same 50 questions. Are they equivalent?
- [ ] Yes
- [x] Not necessarily: check which questions were fixed and which broke
:::

:::cards Evals
Why evals first :: Without a score you cannot tell whether a change made things better or worse.
LLM-as-judge risk :: The judge can be biased or wrong; check it against human labels on a sample.
Good eval set :: Real questions, expected answers, hard and unanswerable cases, kept fixed between runs.
:::
