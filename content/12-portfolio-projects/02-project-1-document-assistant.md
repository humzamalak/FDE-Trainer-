# Project 1: a document assistant with citations and evals
<!-- minutes: 30 -->

**The user:** someone who must answer questions from a large set of documents (for example a support team that answers researchers' questions from public HPC documentation).
**The product:** a small web app. The user asks a question; the app answers **only from the documents**, shows the **sources**, and says "I do not know" when the documents do not answer it.

Lessons this uses: 4.1–4.5 (API, prompting, RAG, evals), 1.13 (HTTP), 8 (SQL, optional).

## Architecture (minimum version)

```text
documents (Markdown/HTML/PDF) → loader → chunker → embeddings → vector store (SQLite + numpy, or Chroma)
question → embed → top-k search → prompt with chunks → Claude → answer + citations → web page
                                   eval set (30 Q&A) → eval script → score per run
```

Use FastAPI for the backend (you know this app's code now) and a simple HTML page.

:::checklist Milestones: minimum version
- [ ] M1. Load 50–200 public documents and split them into chunks; print chunk count and an example
- [ ] M2. Embed the chunks and store them; a command-line search returns the top 5 chunks for a question
- [ ] M3. Answer with Claude using only the retrieved chunks, with numbered citations; refuse when the answer is not in them
- [ ] M4. Write an eval set of 30 questions with expected answers (include 5 that the documents cannot answer)
- [ ] M5. An eval script that reports answer accuracy, citation accuracy and refusal accuracy; record the first score in the README
- [ ] M6. A web page, a README with a screenshot, tests for the chunker and the retrieval, and CI on GitHub Actions
:::

## Acceptance criteria

- The eval script runs with one command and prints a table.
- At least **one experiment** in the README: "Chunk size 500 → 1,000 tokens changed accuracy from 71% to 78%" (your real numbers).
- Unanswerable questions are refused at least 80% of the time.
- Cost per question is measured and written down.

:::checklist Stretch goals (pick two)
- [ ] Hybrid search (keyword BM25 + vectors) and an eval showing whether it helps
- [ ] Re-ranking the top 20 chunks before the top 5 go to the model
- [ ] Prompt caching for the system prompt, with the measured cost saving
- [ ] Streaming answers in the web page
- [ ] A Dockerfile and a deploy to a cheap host, with a live link
- [ ] Access control: different users see different document sets (the TRE problem in small)
:::

:::written Design decisions draft
Write the "Design decisions" section of the README for your project 1 (or your plan, if you have not built it yet): chunking, embedding model, vector store, prompt design, how you handle "I do not know", and what you measured.
--- rubric ---
- Each decision says what was chosen, the alternatives, and why (cost, quality, simplicity)
- Evidence from evals where possible, or a plan for how it will be measured
- Honest about limits (for example scanned PDFs, tables, stale documents)
- Concise: a reader understands each decision in 2–4 sentences
:::
