# Compliance architecture
<!-- minutes: 50 -->

In regulated customers (health, government, finance, research with sensitive data) the design round often turns into a compliance round: *"How do we know patient data never leaves the UK? Who can see the prompts? Can we prove it to an auditor?"* Your TRE and DSPT experience is a real advantage here. This lesson turns it into a design checklist you can use in any interview.

This is not legal advice: in real projects, the customer's data protection officer and legal team decide. Your job is to design a system that makes their answers easy and true.

## The questions behind every framework

UK GDPR, the NHS Data Security and Protection Toolkit, ISO 27001, SOC 2 and Cyber Essentials ask overlapping questions. Design for the questions:

1. **What data, and how sensitive?** Classify it (for example public / internal / personal / special category such as health). Use the least sensitive data that does the job (**data minimisation**); pseudonymise where you can.
2. **Who is responsible?** The customer is usually the **controller**; you (or your company) are a **processor** under a contract. Every sub-processor (cloud provider, LLM API) must be listed and covered.
3. **Where is it?** Data residency: which regions store and process it, including backups, logs and the LLM provider.
4. **Who can access it?** Least privilege, role-based access, single sign-on with MFA, regular access reviews, break-glass access that is logged.
5. **How is it protected?** Encryption in transit (TLS) and at rest; who holds the keys (customer-managed keys if required); network isolation; patching.
6. **Can you prove what happened?** Audit logs of access and changes, kept safe from tampering, kept for the agreed time.
7. **How long is it kept, and how is it deleted?** Retention rules, deletion that includes backups and derived data (embeddings are derived data!).
8. **What if it goes wrong?** Incident response, breach notification duties (under UK GDPR, notifiable breaches go to the ICO within 72 hours of becoming aware), backups and recovery tests.
9. **Was the risk assessed before starting?** A **DPIA** (data protection impact assessment) is required for high-risk processing; new AI on health data almost always needs one.

## Extra questions for LLM systems

- Does the LLM provider **store or train on** prompts and outputs? Get it in the contract; use zero-data-retention options where offered.
- Prompts, retrieved chunks, outputs and traces **are personal data** if the inputs are. Protect logs like the source data.
- **Redact** identifiers before they reach a model when the task does not need them.
- **Access control in retrieval**: filter by the user's permissions before ranking, never after.
- **Human oversight** for decisions about people; explainability (citations, reasons).
- **Model and prompt versioning**, so you can say which version produced an output.
- AI regulation is changing (for example the EU AI Act applies in stages and puts duties on "high-risk" uses such as some medical and employment uses). Ask the customer which rules they work under.

## Patterns

- **Bring the model to the data**: deploy inside the customer's cloud account or on-premises (self-hosted open-weight models, lesson 4.8), so data never leaves their boundary. Costs more to run.
- **Private connectivity** to a cloud LLM endpoint in the right region, with no public internet path.
- **Trusted Research Environment pattern ("Five Safes")**: safe people, safe projects, safe settings, safe data, safe outputs. Output checking before anything leaves.
- **Tamper-evident audit log**: each record includes a hash of the previous one, so a deleted or changed record breaks the chain.

:::exercise A tamper-evident audit log
Write `append(log, event)` that adds a record `{"event": event, "prev": <hash of previous record or "0"*64>, "hash": <sha256>}` where `hash` is the SHA-256 hex of `prev + event`. Then write `verify(log)` that returns `True` only if every record's `prev` matches the previous record's `hash` and every `hash` is correct.
--- starter ---
import hashlib

def append(log, event):
    log.append({"event": event})
    return log

def verify(log):
    return True
--- tests ---
import hashlib
log = []
append(log, "alice viewed record 17")
append(log, "bob exported cohort A")
append(log, "alice deleted draft 3")
assert log[0]["prev"] == "0" * 64
assert log[1]["prev"] == log[0]["hash"]
assert log[0]["hash"] == hashlib.sha256(("0" * 64 + "alice viewed record 17").encode()).hexdigest()
assert verify(log) is True
assert verify([]) is True
tampered = [dict(r) for r in log]
tampered[1]["event"] = "bob viewed cohort A"
assert verify(tampered) is False
deleted = [log[0], log[2]]
assert verify(deleted) is False
--- solution ---
import hashlib

GENESIS = "0" * 64

def _hash(prev, event):
    return hashlib.sha256((prev + event).encode()).hexdigest()

def append(log, event):
    prev = log[-1]["hash"] if log else GENESIS
    log.append({"event": event, "prev": prev, "hash": _hash(prev, event)})
    return log

def verify(log):
    prev = GENESIS
    for record in log:
        if record["prev"] != prev or record["hash"] != _hash(prev, record["event"]):
            return False
        prev = record["hash"]
    return True
:::

:::exercise Where may this data go?
Write `allowed(data_class, destination)` for this policy. Data classes, from least to most sensitive: `public`, `internal`, `personal`, `special` (for example health). Each destination has a maximum class: `public_api` → `public`; `vendor_llm_zdr` (a contracted LLM with zero data retention in a UK region) → `personal`; `customer_vpc` (inside the customer's cloud account) → `special`; `tre` → `special`. Unknown destinations or classes are never allowed.
--- starter ---
def allowed(data_class, destination):
    return destination != "public_api"
--- tests ---
assert allowed("public", "public_api") is True
assert allowed("internal", "public_api") is False
assert allowed("personal", "vendor_llm_zdr") is True
assert allowed("special", "vendor_llm_zdr") is False
assert allowed("special", "customer_vpc") is True
assert allowed("special", "tre") is True
assert allowed("special", "laptop") is False
assert allowed("secret", "tre") is False
--- solution ---
LEVEL = {"public": 0, "internal": 1, "personal": 2, "special": 3}
MAX_CLASS = {"public_api": "public", "vendor_llm_zdr": "personal", "customer_vpc": "special", "tre": "special"}

def allowed(data_class, destination):
    if data_class not in LEVEL or destination not in MAX_CLASS:
        return False  # deny by default
    return LEVEL[data_class] <= LEVEL[MAX_CLASS[destination]]
:::

:::written Design round: the NHS discharge assistant
An NHS trust wants an assistant that drafts discharge letters from clinical notes. Describe the compliance architecture in about 300 words: data flow, where the model runs, access control, logging, retention, DPIA and human oversight.
--- rubric ---
- Classifies the data as special category health data and applies minimisation (only the notes needed)
- A clear model-hosting choice with reasons: in the trust's own cloud/on-prem, or a contracted UK-region provider with no retention or training; mentions the processor contract and sub-processors
- Access through the trust's SSO with role-based access; retrieval and drafting only for patients the clinician may see
- Audit logs of who generated and approved which letter, protected and retained per policy; prompts and outputs treated as patient data
- A clinician reviews and signs every letter (human oversight); model and prompt versions recorded
- DPIA before go-live, DSPT alignment, incident response and breach notification process
- Mentions evals for safety (hallucinated medications or doses) and a pilot
:::

:::quiz
Q: Embeddings of patient notes are stored in a vector database. Are they personal data?
- [x] Treat them as personal data: they are derived from it, can leak content, and must follow the same retention and deletion rules
- [ ] No, they are just numbers
Q: Where should permission filtering happen in a RAG system over sensitive documents?
- [x] In retrieval, before ranking, so unauthorised chunks never reach the model
- [ ] In the final answer, by asking the model to hide what the user may not see
Q: What makes an audit log tamper-evident?
- [ ] Storing it in a database
- [x] Each record includes a hash of the previous record, so a change or deletion breaks the chain
:::

:::cards Compliance
Controller vs processor :: The controller decides why and how data is processed (usually the customer); the processor acts on its instructions under a contract.
DPIA :: Data protection impact assessment: a risk assessment required before high-risk processing.
Data minimisation :: Use only the data the task needs; pseudonymise where you can.
Five Safes :: Safe people, projects, settings, data, outputs (the TRE model).
UK GDPR breach notification :: Notifiable breaches go to the ICO within 72 hours of becoming aware.
LLM logs :: Prompts, retrieved chunks and outputs are as sensitive as the data in them.
:::
