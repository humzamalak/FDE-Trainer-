# AI system design for regulated customers
<!-- minutes: 60 -->

Put everything together. Practise these designs out loud with the **Mock interviews → System design** mode.

## Reference architecture: enterprise RAG assistant

```
Users (browser / Teams)
   │  SSO (OIDC, customer IdP)
   ▼
API gateway ── rate limits, auth, audit log
   │
Assistant service (stateless, containers)
   ├── Retrieval: hybrid search (pgvector + keyword) with permission filters
   ├── LLM gateway: model routing, retries, cost tracking, PII redaction
   │      └── LLM API (UK/EU region)  or  self-hosted vLLM on GPUs
   ├── Tools (read-only first; writes need approval)
   └── Telemetry: logs, traces, tokens, feedback → eval pipeline
Ingestion pipeline (async, queue + workers)
   └── connectors (SharePoint, ServiceNow, S3) → parse → chunk → embed → index
```

## Deployment options (state the trade-offs)

| Option | Data control | Effort | Model quality |
|---|---|---|---|
| SaaS (vendor cloud) | Lowest | Lowest | Best models |
| Customer's cloud account (BYOC), API model in region | High | Medium | Best models |
| Customer's cloud, self-hosted model | Very high | High | Open-weight models |
| On-prem / air-gapped | Maximum | Highest | Open-weight models, limited by local GPUs |

**Air-gapped extras:** internal package and container mirrors, model weights transferred through an approved process (with checksums), no telemetry leaving the site, offline licence checks, documented update procedure. You did this kind of thing for the TRE.

## Deep-dive topics to prepare

1. **Permissions in RAG**: sync ACLs with documents; filter at query time; test with a user who must NOT see a document.
2. **Freshness**: incremental ingestion with watermarks; delete handling (a deleted document must leave the index).
3. **Quality**: eval set, recall@k, groundedness, regression checks in CI, human feedback loop.
4. **Cost control**: caching, smaller models for simple steps (routing), batch for offline work, budgets per team.
5. **Safety**: injection tests, PII redaction, human approval for actions, clinical/legal escalation rules.
6. **Scale**: stateless services scale out; GPU capacity planning (tokens/s, concurrency, KV cache).

## Practice scenarios

- An NHS trust wants staff to ask questions about 20,000 clinical policies. Patient data must not leave the UK.
- A bank wants an agent that drafts responses to customer complaints using its CRM, with mandatory human approval.
- A defence supplier wants a coding assistant on an air-gapped network with 16 GPUs.
- A university wants researchers to query a 2 TB research dataset in natural language inside its TRE.

:::written Design: air-gapped LLM deployment
Design the third scenario: an air-gapped coding assistant for 300 engineers at a defence supplier with 16 H100 GPUs (80 GB each). Cover: model choice and sizing, serving, IDE integration, auth, updates into the air gap, monitoring, evaluation, and risks. Use numbers.
--- rubric ---
- Model choice with sizing maths (weights memory, tensor parallelism, KV cache headroom) and a plan for multiple replicas
- Serving stack (e.g. vLLM with OpenAI-compatible API) behind a gateway with auth (internal IdP/LDAP), rate limits, logging
- IDE integration via an OpenAI-compatible endpoint (e.g. Continue or similar), completion vs chat models
- Throughput estimate for 300 users (concurrency, tokens/s) and whether 16 GPUs suffice
- Update process into the air gap: mirrored weights/containers/packages, checksums, approval, rollback
- Evaluation on the customer's own code tasks; monitoring (GPU utilisation, latency); risks (licence of weights, code leakage between projects, quality expectations)
:::

:::written Design: NHS policy assistant
Design the first scenario end to end in under 400 words: requirements you would confirm, architecture, data flow, permissions, deployment choice with reasons, evaluation, and a phased rollout.
--- rubric ---
- Confirms requirements (users, volume, document sources, update rate, success metrics, IG/DSPT constraints)
- Architecture with ingestion pipeline, hybrid retrieval with permission filtering, LLM in UK region or self-hosted, citations
- Explicit data flow and where data is stored; no patient data in scope initially
- Deployment choice justified (e.g. customer's Azure/AWS UK tenancy) with trade-offs
- Evaluation plan (clinician-reviewed eval set, groundedness, refusal when unsure) and monitoring
- Phased rollout: pilot ward/department, feedback, expand; clinical safety officer involvement (DCB0129/0160) as a bonus
:::

:::quiz
Q: A customer says "data must never leave our network". Which option fits?
- [ ] SaaS with a UK region
- [x] Self-hosted model in their own environment (on-prem or their private cloud with no external egress)
- [ ] Any API with a signed contract
Q: A document is deleted in SharePoint. What must your RAG system do?
- [x] Remove its chunks from the index in the next sync (and test this)
- [ ] Nothing: old answers are fine
:::
