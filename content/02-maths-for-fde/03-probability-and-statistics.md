# Probability and statistics for evals and operations
<!-- minutes: 60 -->

FDEs must answer: **"Does the AI system work? How do you know?"** That needs basic statistics.

## Averages and spread

- **Mean**: $\bar{x} = \frac{1}{n}\sum x_i$. Sensitive to outliers.
- **Median**: the middle value when sorted. Robust to outliers.
- **Standard deviation** $\sigma$: typical distance from the mean.

$$\sigma = \sqrt{\frac{1}{n}\sum_{i=1}^{n}(x_i - \bar{x})^2}$$

## Percentiles: use them for latency

"p95 latency = 800 ms" means 95% of requests were faster than 800 ms. **Never report only the mean latency.** One slow request in 20 is what users complain about.

Simple method (nearest-rank): sort the values, take position $\lceil p \cdot n \rceil$ (counting from 1).

## Probability basics

- $P(A)$ is between 0 and 1.
- **Not**: $P(\text{not } A) = 1 - P(A)$
- **And** (independent): $P(A \text{ and } B) = P(A)\,P(B)$
- **At least one** in $n$ tries: $1 - (1-p)^n$

Example: each of 3 services has 99.9% uptime. If a request needs all 3: $0.999^3 \approx 0.997$. **Chains of dependencies reduce availability.**

Example: an agent step succeeds 95% of the time. A 10-step agent succeeds $0.95^{10} \approx 0.60$. This is why long agent chains fail, and why you add checks and retries.

## Conditional probability and Bayes

$$P(A \mid B) = \frac{P(B \mid A)\,P(A)}{P(B)}$$

Classic trap: a PII detector catches 99% of documents with PII and wrongly flags 5% of clean ones. Only 1% of documents have PII. If a document is flagged, the chance it really has PII is:

$$\frac{0.99 \times 0.01}{0.99 \times 0.01 + 0.05 \times 0.99} \approx 0.17$$

Only 17%. **Base rates matter.**

## Classification metrics (used in every LLM eval)

|  | Predicted yes | Predicted no |
|---|---|---|
| **Actually yes** | TP (true positive) | FN (false negative) |
| **Actually no** | FP (false positive) | TN (true negative) |

$$\text{Precision} = \frac{TP}{TP+FP} \quad \text{Recall} = \frac{TP}{TP+FN} \quad F_1 = \frac{2PR}{P+R} \quad \text{Accuracy} = \frac{TP+TN}{\text{all}}$$

- **Precision**: when it says yes, how often is it right? (Important when false alarms are costly.)
- **Recall**: of the real yeses, how many did it find? (Important when misses are dangerous, e.g. sensitive data detection.)
- Accuracy misleads on imbalanced data: a model that always says "no PII" is 99% accurate above and useless.

## How sure is your eval? (confidence intervals)

If your RAG system answers 42 of 50 questions correctly, accuracy is $\hat{p} = 0.84$. But 50 is a small sample. The 95% interval is roughly:

$$\hat{p} \pm 1.96\sqrt{\frac{\hat{p}(1-\hat{p})}{n}} = 0.84 \pm 0.10$$

So the truth is probably between 74% and 94%. **If version B scores 86% on the same 50 questions, you cannot claim it is better.** Use more questions, or compare on the same questions and count which ones changed.

The error shrinks with $\sqrt{n}$: 4× more questions → half the error.

:::exercise Percentile
Write `percentile(values, p)` using the nearest-rank method: sort, then return the item at position $\lceil p \cdot n \rceil$ counting from 1. `p` is between 0 and 1 (0.95 for p95). Return `None` for an empty list. For `p = 0`, return the smallest value.
--- starter ---
import math

def percentile(values, p):
    pass
--- tests ---
lat = [120, 80, 95, 400, 110, 105, 90, 2000, 100, 85]
assert percentile(lat, 0.5) == 100
assert percentile(lat, 0.9) == 400
assert percentile(lat, 0.95) == 2000
assert percentile(lat, 0) == 80
assert percentile([], 0.5) is None
--- solution ---
import math

def percentile(values, p):
    if not values:
        return None
    ordered = sorted(values)
    rank = max(1, math.ceil(p * len(ordered)))
    return ordered[rank - 1]
:::

:::exercise Precision, recall and F1
Write `metrics(actual, predicted)`. Both are lists of booleans (True = "has PII"). Return a dict with `precision`, `recall` and `f1`, each rounded to 3 decimals. If a denominator is 0, use 0.0 for that metric.
--- starter ---
def metrics(actual, predicted):
    pass
--- tests ---
a = [True, True, True, False, False, False, False, True]
p = [True, False, True, True, False, False, False, True]
assert metrics(a, p) == {"precision": 0.75, "recall": 0.75, "f1": 0.75}
assert metrics([True, False], [False, False]) == {"precision": 0.0, "recall": 0.0, "f1": 0.0}
assert metrics([True, True, False], [True, True, True]) == {"precision": 0.667, "recall": 1.0, "f1": 0.8}
--- solution ---
def metrics(actual, predicted):
    tp = sum(1 for a, p in zip(actual, predicted) if a and p)
    fp = sum(1 for a, p in zip(actual, predicted) if not a and p)
    fn = sum(1 for a, p in zip(actual, predicted) if a and not p)
    precision = tp / (tp + fp) if tp + fp else 0.0
    recall = tp / (tp + fn) if tp + fn else 0.0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
    return {"precision": round(precision, 3), "recall": round(recall, 3), "f1": round(f1, 3)}
:::

:::exercise Confidence interval for an eval
Write `accuracy_interval(correct, total)` that returns `(low, high)` using $\hat{p} \pm 1.96\sqrt{\hat{p}(1-\hat{p})/n}$. Clip to the range 0–1 and round both to 3 decimals.
--- starter ---
import math

def accuracy_interval(correct, total):
    pass
--- tests ---
assert accuracy_interval(42, 50) == (0.738, 0.942)
assert accuracy_interval(50, 50) == (1.0, 1.0)
assert accuracy_interval(840, 1000) == (0.817, 0.863)
--- solution ---
import math

def accuracy_interval(correct, total):
    p = correct / total
    margin = 1.96 * math.sqrt(p * (1 - p) / total)
    return (round(max(0.0, p - margin), 3), round(min(1.0, p + margin), 3))
:::

:::exercise Chain reliability
Write `chain_success(step_probs)` that returns the probability that **all** steps succeed (independent), and `at_least_one(p, n)` that returns the probability of at least one success in `n` independent tries with success probability `p`. Round to 4 decimals.
--- starter ---
def chain_success(step_probs):
    pass

def at_least_one(p, n):
    pass
--- tests ---
assert chain_success([0.999, 0.999, 0.999]) == 0.997
assert chain_success([0.95] * 10) == 0.5987
assert chain_success([]) == 1.0
assert at_least_one(0.5, 3) == 0.875
assert at_least_one(0.9, 1) == 0.9
--- solution ---
def chain_success(step_probs):
    result = 1.0
    for p in step_probs:
        result *= p
    return round(result, 4)

def at_least_one(p, n):
    return round(1 - (1 - p) ** n, 4)
:::

:::quiz
Q: Model A gets 41/50, model B gets 43/50 on the same eval. What can you conclude?
- [ ] B is clearly better
- [x] The difference is within noise; you need more data or a paired comparison
- [ ] A is better
> Each interval is about ±10 points at n = 50. A 2-question gap is not significant.
Q: For a sensitive-data detector, missing real PII is very bad. Which metric matters most?
- [ ] Precision
- [x] Recall
- [ ] Accuracy
> Recall measures how many real positives you catch.
Q: Why report p95 latency instead of the mean?
- [x] The mean hides the slow requests users actually notice
- [ ] p95 is always lower
- [ ] The mean cannot be calculated for latency
:::

:::cards Probability and statistics
Precision :: Of the items you flagged, the share that were really positive: TP / (TP + FP).
Recall :: Of the real positives, the share you found: TP / (TP + FN).
Standard error of a proportion :: √(p(1−p)/n). With n = 100 and p = 0.8, about 0.04.
Why bigger eval sets :: The uncertainty shrinks with √n: 4× the questions halves the error bar.
:::
