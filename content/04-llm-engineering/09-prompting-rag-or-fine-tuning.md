# Prompting, RAG or fine-tuning?
<!-- minutes: 40 -->

A customer will ask: "Should we fine-tune a model on our data?" Usually the honest answer is "not first". This lesson gives you a way to decide, and the words to explain it.

## What each one changes

| Approach | What it changes | Good for | Weak at |
|---|---|---|---|
| **Prompting** (instructions, examples, structured output) | How the model behaves on this request | Format, tone, task rules, a few examples | Knowledge the model does not have |
| **RAG** (retrieve documents, put them in the prompt) | What the model **knows** for this request | Private, changing or large knowledge; citations; access control | Teaching a new skill or style; very long reasoning over everything at once |
| **Fine-tuning** (train the model further on examples) | The model's **default behaviour** | A consistent format or style at high volume; a narrow classification task; making a smaller, cheaper model do one job well | Adding facts that change (it is stale the day after training); explaining where an answer came from |

## The decision order

1. **Start with prompting** and an eval set. It is cheap and fast to change. Many "we need fine-tuning" problems disappear with a clear prompt, a few examples and structured output.
2. **Add RAG** when the problem is **knowledge**: the answer is in the customer's documents, data changes, or users must see sources. RAG also respects **permissions**: each user retrieves only what they may see. A fine-tuned model cannot "forget" a document for one user.
3. **Consider fine-tuning** only when the eval shows a **behaviour** gap that prompting cannot close, **and** you have hundreds to thousands of good examples, **and** the volume or latency makes it worth it (for example a small fine-tuned model replaces an expensive large one for a high-volume classification).

Also consider: a **bigger or better model**, **tool use** (call a calculator, a database, a search API instead of making the model remember), and **workflow changes** (a human checks the hard 10%).

## Costs people forget with fine-tuning

- Collecting, cleaning and labelling training data, and keeping it free of personal data that should not be in a model.
- Re-training when the base model or the task changes.
- Evals for every version, and a way to roll back.
- On a hosted service: possible lock-in to one model version. Self-hosted (open-weight models with LoRA adapters): GPUs and the team to run them.

## The sentence to say

> "Fine-tuning teaches the model *how* to respond; RAG gives it *what* to respond with. Your problem is that answers depend on your policies, which change monthly and differ by department, so RAG with access control fits. If the eval later shows the format is still inconsistent at high volume, we can fine-tune a small model for that step."

:::quiz
Q: A bank wants the assistant to answer from 20,000 internal policies that change every month, with sources. What fits best?
- [ ] Fine-tune a model on the policies every month
- [x] RAG with citations and access control, evaluated on real questions
- [ ] A longer system prompt with all the policies
Q: A support team needs every reply in a strict format, at 2 million requests a month, and wants lower cost. Prompting gets 93% format compliance. What could fine-tuning help with?
- [x] Making a smaller, cheaper model follow the format consistently, if there are enough good examples
- [ ] Adding knowledge of new products each week
Q: Why is RAG better than fine-tuning when different users may see different documents?
- [x] Retrieval can filter by each user's permissions at query time; a trained model cannot hide what it learned from one user
- [ ] Fine-tuned models cannot read documents
Q: What should exist before any fine-tuning project starts?
- [x] An eval set that shows the gap, and a baseline score from prompting (and RAG if relevant)
- [ ] A GPU cluster
:::

:::written Answer the customer
The customer's CTO says: "We want to fine-tune an LLM on our 10 years of support tickets so it knows our products." Write your reply (about 150 words): ask the right questions, give your recommendation and what you would measure.
--- rubric ---
- Asks what the goal is (draft replies? answer customers? classify tickets?) and how success is measured
- Explains that knowledge which changes (products, prices, policies) is better served by RAG over current docs and resolved tickets, and that old tickets contain outdated and personal data
- Recommends a prompt + RAG baseline with an eval set first, and fine-tuning only if a measured behaviour gap remains and volume justifies it
- Mentions data protection (personal data in tickets) and the cost of maintaining a fine-tuned model
:::

:::cards Prompting, RAG, fine-tuning
Fine-tuning vs RAG :: Fine-tuning changes how the model responds; RAG changes what it knows for this request.
Decision order :: Prompting + evals → RAG → fine-tuning only for a measured behaviour gap with enough data and volume.
Why RAG for permissions :: Retrieval can filter per user at query time; a model cannot forget for one user.
Hidden cost of fine-tuning :: Data preparation, re-training, evals per version, lock-in or GPU operations.
:::
