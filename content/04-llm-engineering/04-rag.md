# Retrieval-augmented generation (RAG)
<!-- minutes: 70 -->

The model does not know the customer's private documents. **RAG** finds the relevant pieces and puts them in the prompt.

## The pipeline

**Indexing (offline):**
1. **Load** documents (PDF, HTML, SharePoint, Confluence, tickets). Keep metadata: title, URL, date, access group.
2. **Chunk** them (e.g. 300–800 tokens, with overlap). Split on headings and paragraphs where possible.
3. **Embed** each chunk with an embedding model.
4. **Store** vectors + text + metadata (pgvector, OpenSearch, a managed vector DB).

**Query (online):**
1. Embed the question.
2. **Retrieve** the top-k chunks (vector search, often combined with keyword search = **hybrid**).
3. **Rerank** the candidates with a reranker model (optional, improves precision).
4. **Generate**: prompt = instructions + retrieved chunks + question. Ask for **citations**.

## Design choices and trade-offs

| Choice | Trade-off |
|---|---|
| Chunk size | Small: precise but loses context. Large: more context, more noise and cost |
| Top-k | More chunks: better recall, more tokens, more distraction |
| Hybrid search | Keyword search finds exact names, codes and error messages that embeddings miss |
| Metadata filters | Filter by date, department, **access rights** before retrieval |

## Common failures

- **Retrieval failure**: the right chunk is not in the top-k. → Check retrieval separately from generation (lesson 5).
- **Answer not grounded**: the model ignores the context. → "Answer only from the documents. If not found, say so."
- **Stale data**: documents changed. → Re-index on change; store dates.
- **Permission leak**: user sees chunks from documents they cannot access. → Filter by the user's groups at query time. **This matters a lot in TREs and regulated customers.**

## When not to use RAG

If all the data fits in the context window (and caching makes it cheap), just put it all in. If the question needs data from a database, use a tool that runs a query (text-to-SQL with guardrails) instead of embedding rows.

:::exercise Keyword retrieval with BM25-lite
Before vectors, build simple keyword search. Write `score(query, doc)`: the number of query words (lower case, split on spaces) that appear in the document's words, counting each query word once. Then write `retrieve(query, docs, k)` that returns the ids of the top-k docs by score, highest first, ties by id ascending, and **skips docs with score 0**. `docs` is a dict id → text.
--- starter ---
def score(query, doc):
    pass

def retrieve(query, docs, k):
    pass
--- tests ---
docs = {
    "d1": "How to submit a Slurm job with sbatch",
    "d2": "Reset your VPN password",
    "d3": "GPU jobs on Slurm need the gpu partition",
    "d4": "Storage quotas for home directories",
}
assert score("slurm gpu job", docs["d3"]) == 2
assert retrieve("slurm gpu", docs, 2) == ["d3", "d1"]
assert retrieve("vpn", docs, 5) == ["d2"]
assert retrieve("pizza", docs, 3) == []
--- solution ---
def score(query, doc):
    doc_words = set(doc.lower().split())
    return sum(1 for w in set(query.lower().split()) if w in doc_words)

def retrieve(query, docs, k):
    scored = [(score(query, text), doc_id) for doc_id, text in docs.items()]
    scored = [s for s in scored if s[0] > 0]
    scored.sort(key=lambda s: (-s[0], s[1]))
    return [doc_id for _, doc_id in scored[:k]]
:::

:::exercise Permission-aware retrieval
Each chunk is a dict `{"id", "text", "groups"}` where `groups` is the set of groups allowed to read it. Write `allowed_chunks(chunks, user_groups)` returning only the chunks the user may read (at least one group in common). Then write `build_context(chunks)` that returns the text `"[id] text"` for each chunk, joined by `"\n\n"`.
--- starter ---
def allowed_chunks(chunks, user_groups):
    pass

def build_context(chunks):
    pass
--- tests ---
chunks = [
    {"id": "c1", "text": "Public FAQ", "groups": {"all"}},
    {"id": "c2", "text": "Patient data handling", "groups": {"tre-users"}},
    {"id": "c3", "text": "Admin runbook", "groups": {"admins", "tre-admins"}},
]
assert [c["id"] for c in allowed_chunks(chunks, {"all"})] == ["c1"]
assert [c["id"] for c in allowed_chunks(chunks, {"all", "tre-users"})] == ["c1", "c2"]
assert allowed_chunks(chunks, set()) == []
assert build_context(chunks[:2]) == "[c1] Public FAQ\n\n[c2] Patient data handling"
--- solution ---
def allowed_chunks(chunks, user_groups):
    return [c for c in chunks if c["groups"] & set(user_groups)]

def build_context(chunks):
    return "\n\n".join(f"[{c['id']}] {c['text']}" for c in chunks)
:::

:::exercise Check the citations
The model must cite chunks like `[c2]`. Write `check_citations(answer, context_ids)` that returns a dict: `"cited"` (sorted list of cited ids that exist in `context_ids`), `"invalid"` (sorted list of cited ids that do not exist — possible hallucinations), and `"has_citation"` (bool). Use the regex `r"\[([a-zA-Z0-9_-]+)\]"`.
--- starter ---
import re

def check_citations(answer, context_ids):
    pass
--- tests ---
r = check_citations("Use the gpu partition [c3]. Quotas are 50GB [c9]. See also [c3].", ["c1", "c3"])
assert r == {"cited": ["c3"], "invalid": ["c9"], "has_citation": True}
assert check_citations("No idea.", ["c1"]) == {"cited": [], "invalid": [], "has_citation": False}
--- solution ---
import re

def check_citations(answer, context_ids):
    found = set(re.findall(r"\[([a-zA-Z0-9_-]+)\]", answer))
    valid = set(context_ids)
    return {"cited": sorted(found & valid), "invalid": sorted(found - valid), "has_citation": bool(found)}
:::

:::written Do it for real: build the governed RAG assistant
This is portfolio project 1. On your machine: index 30–100 public research computing pages (LSE or any university). Use an embedding model and pgvector (Docker) or a simple local vector store. Build a FastAPI endpoint `/ask` that returns an answer with citations. Paste your design here: chunking, embedding model, store, retrieval settings, prompt, and how you handle "not found".
--- rubric ---
- Clear chunking strategy with size/overlap and why
- Named embedding model and vector store; metadata stored (source URL, title, date)
- Retrieval settings (top-k, hybrid or not, reranking or not) with a reason
- Prompt grounds answers in context, requires citations, handles "not found"
- Mentions access control/metadata filters, re-indexing, and an evaluation plan
:::

:::quiz
Q: Users search for an error code like "ERR_GPU_0x1F" and RAG fails to find the page. What helps most?
- [ ] A bigger LLM
- [x] Hybrid search: add keyword (BM25) search alongside vectors
- [ ] Larger chunks
Q: Where should access control happen in RAG?
- [ ] In the prompt: "do not show secret documents"
- [x] In retrieval: filter chunks by the user's permissions before they reach the model
- [ ] After the answer is generated
> Never rely on the model to keep secrets. If it is in the context, it can leak.
:::
