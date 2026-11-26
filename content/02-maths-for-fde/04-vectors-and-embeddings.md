# Vectors, dot products and embeddings
<!-- minutes: 50 -->

RAG and semantic search use **embeddings**. An embedding is a list of numbers (a **vector**) that represents the meaning of a text. Texts with similar meaning have vectors that point in similar directions.

## Vectors

A vector is an ordered list of numbers: $\mathbf{a} = [a_1, a_2, \dots, a_d]$. $d$ is the **dimension**. Real embeddings have 384 to 3072 dimensions. In Python, a vector is just a list of floats (or a NumPy array).

## Dot product

$$\mathbf{a} \cdot \mathbf{b} = \sum_{i=1}^{d} a_i b_i$$

$[1, 2, 3] \cdot [4, 5, 6] = 4 + 10 + 18 = 32$

## Length (norm)

$$\|\mathbf{a}\| = \sqrt{\sum a_i^2} \qquad \|[3, 4]\| = \sqrt{9 + 16} = 5$$

## Cosine similarity

Cosine similarity measures the **angle** between two vectors, not their length:

$$\cos\theta = \frac{\mathbf{a}\cdot\mathbf{b}}{\|\mathbf{a}\|\,\|\mathbf{b}\|}$$

- $1$ → same direction (very similar meaning)
- $0$ → unrelated (90°)
- $-1$ → opposite

If vectors are **normalised** (length 1), cosine similarity equals the dot product. Many embedding APIs return normalised vectors, so vector databases often just use the dot product. It is cheaper.

**Euclidean distance** $\|\mathbf{a}-\mathbf{b}\| = \sqrt{\sum (a_i - b_i)^2}$ is another option. For normalised vectors it ranks results in the same order as cosine.

## How vector search works

1. Split documents into **chunks**. Embed each chunk. Store the vectors.
2. Embed the user's question.
3. Find the $k$ chunks with the highest similarity (**top-k**).
4. Give those chunks to the LLM as context.

Exact search compares the question with every chunk: $O(n \cdot d)$. With millions of chunks this is slow, so vector databases use **approximate nearest neighbour (ANN)** indexes such as HNSW (a graph) or IVF (clusters). They trade a little recall for a lot of speed. pgvector (a Postgres extension) supports both.

## Matrices (recognise them)

A matrix is a table of numbers. Neural networks are mostly matrix multiplications. You do not need to calculate them by hand for an FDE interview. Know that a GPU is fast because it does many multiplications in parallel.

## Storage maths

One float32 = 4 bytes. One million chunks × 1536 dimensions × 4 bytes ≈ **6.1 GB** of vectors. Halve it with float16; quantisation can reduce it more.

:::exercise Dot product and norm
Write `dot(a, b)` and `norm(a)`. Do not use NumPy. Use `zip` and `math.sqrt`.
--- starter ---
import math

def dot(a, b):
    pass

def norm(a):
    pass
--- tests ---
assert dot([1, 2, 3], [4, 5, 6]) == 32
assert dot([1, 0], [0, 1]) == 0
assert norm([3, 4]) == 5.0
assert norm([0, 0, 0]) == 0.0
--- solution ---
import math

def dot(a, b):
    return sum(x * y for x, y in zip(a, b))

def norm(a):
    return math.sqrt(sum(x * x for x in a))
:::

:::exercise Cosine similarity
Write `cosine(a, b)`. Round to 4 decimals. If either vector has length 0, return `0.0`.
--- starter ---
import math

def cosine(a, b):
    pass
--- tests ---
assert cosine([1, 0], [1, 0]) == 1.0
assert cosine([1, 0], [0, 1]) == 0.0
assert cosine([1, 0], [-1, 0]) == -1.0
assert cosine([1, 2, 3], [2, 4, 6]) == 1.0
assert cosine([1, 2], [2, 1]) == 0.8
assert cosine([0, 0], [1, 1]) == 0.0
--- solution ---
import math

def cosine(a, b):
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(x * x for x in b))
    if na == 0 or nb == 0:
        return 0.0
    return round(sum(x * y for x, y in zip(a, b)) / (na * nb), 4)
:::

:::exercise Top-k search
Write `top_k(query, docs, k)`. `docs` is a dict of doc_id → vector. Return a list of the `k` doc_ids most similar to `query` by cosine similarity, most similar first. (This is exact vector search: what a vector database does, without the index.)
--- starter ---
import math

def top_k(query, docs, k):
    pass
--- tests ---
docs = {"gpu": [0.9, 0.1, 0.0], "billing": [0.0, 0.2, 0.9], "slurm": [0.8, 0.3, 0.1], "vpn": [0.1, 0.9, 0.1]}
assert top_k([1.0, 0.2, 0.0], docs, 2) == ["gpu", "slurm"]
assert top_k([0.0, 0.0, 1.0], docs, 1) == ["billing"]
assert len(top_k([1, 1, 1], docs, 10)) == 4
--- solution ---
import math

def _cos(a, b):
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(x * x for x in b))
    if na == 0 or nb == 0:
        return 0.0
    return sum(x * y for x, y in zip(a, b)) / (na * nb)

def top_k(query, docs, k):
    ranked = sorted(docs, key=lambda d: _cos(query, docs[d]), reverse=True)
    return ranked[:k]
:::

:::quiz
Q: Two normalised embeddings have dot product 0.92. What is their cosine similarity?
- [x] 0.92
- [ ] 0.08
- [ ] Cannot tell
> For unit-length vectors, cosine similarity equals the dot product.
Q: Why do vector databases use ANN indexes like HNSW?
- [ ] They are more accurate than exact search
- [x] Exact search over millions of vectors is too slow; ANN trades a little recall for speed
- [ ] LLMs require them
:::

:::cards Vectors and embeddings
Cosine similarity :: a·b ÷ (|a| |b|): 1 means same direction, 0 unrelated.
Dot product of normalised vectors :: Equals their cosine similarity.
Embedding :: A vector that represents meaning, so similar texts are close together.
:::
