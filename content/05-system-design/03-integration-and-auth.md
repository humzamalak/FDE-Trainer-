# Enterprise integration and identity
<!-- minutes: 50 -->

FDEs spend much of their time connecting a product to messy customer systems. Know these patterns well.

## Integration patterns

| Pattern | When | Watch out for |
|---|---|---|
| **REST/GraphQL API pull** | You fetch data on a schedule or on demand | Rate limits, pagination, auth expiry |
| **Webhooks (push)** | The other system tells you when something changes | Verify signatures, retries, duplicates (idempotency), ordering |
| **Batch file / ETL (SFTP, S3 drops, CSV exports)** | Legacy systems, large nightly loads | Schema changes, partial files, validation |
| **Change data capture (CDC)** | Stream database changes (Debezium, DMS) | Complexity, ordering |
| **Event bus / streaming** | Many consumers of the same events (Kafka, EventBridge) | Schema versioning |
| **Connectors / iPaaS** | Standard SaaS (ServiceNow, Salesforce) | Licence cost, limits |

**Sync vs incremental:** first a full sync, then incremental updates using `updated_since` timestamps or change events. Store a **cursor/watermark** so a crash restarts from the right place.

## Identity and access

- **SSO with OIDC** (modern) or **SAML** (older enterprise). The customer's identity provider (Entra ID, Okta) proves who the user is. Your app receives an ID token / assertion.
- **OAuth 2.0** for API access: *authorization code* flow for users, *client credentials* for service-to-service. Tokens expire: refresh them.
- **SCIM** to sync users and groups automatically (create/disable accounts).
- **Authorisation**: RBAC (roles) or ABAC (attributes). Map the customer's groups to your roles. For RAG, map groups to document permissions.
- **Secrets**: never in code. Use a secrets manager (Vault, AWS Secrets Manager). Rotate them.

## Network patterns for enterprise customers

- Private connectivity: VPN, AWS PrivateLink, VPC peering. Customers may forbid public endpoints.
- Egress control: allow-lists of outbound domains (the customer firewall must allow the LLM API domain).
- **Deploy in the customer's account** (BYOC) or on-prem when data cannot leave.

You have done this with RONIN and the TRE. Use those stories.

:::exercise Incremental sync with a watermark
Write `incremental_sync(fetch_changes, state)`. `state` is a dict that may contain `"watermark"` (a number). `fetch_changes(since)` returns a list of records `{"id", "updated_at"}` changed after `since` (use 0 if there is no watermark). Return a tuple `(records, new_state)`, where `new_state["watermark"]` is the largest `updated_at` seen, or the old watermark if there were no records. Do not change the input `state`.
--- starter ---
def incremental_sync(fetch_changes, state):
    pass
--- tests ---
db = [{"id": 1, "updated_at": 10}, {"id": 2, "updated_at": 25}, {"id": 3, "updated_at": 40}]
fetch = lambda since: [r for r in db if r["updated_at"] > since]
records, s1 = incremental_sync(fetch, {})
assert [r["id"] for r in records] == [1, 2, 3] and s1 == {"watermark": 40}
records, s2 = incremental_sync(fetch, s1)
assert records == [] and s2 == {"watermark": 40}
db.append({"id": 4, "updated_at": 55})
records, s3 = incremental_sync(fetch, s2)
assert [r["id"] for r in records] == [4] and s3["watermark"] == 55
original = {"watermark": 0}
incremental_sync(fetch, original)
assert original == {"watermark": 0}
--- solution ---
def incremental_sync(fetch_changes, state):
    since = state.get("watermark", 0)
    records = fetch_changes(since)
    new_state = dict(state)
    new_state["watermark"] = max((r["updated_at"] for r in records), default=since)
    return records, new_state
:::

:::exercise Map groups to roles
Write `roles_for(user_groups, mapping)`. `mapping` is a dict of IdP group → app role. Return the sorted list of roles. If the user has no mapped group, return `["viewer"]`.
--- starter ---
def roles_for(user_groups, mapping):
    pass
--- tests ---
m = {"sg-rc-admins": "admin", "sg-researchers": "user", "sg-tre-approved": "tre-user"}
assert roles_for(["sg-researchers", "sg-tre-approved", "sg-other"], m) == ["tre-user", "user"]
assert roles_for(["sg-other"], m) == ["viewer"]
assert roles_for([], m) == ["viewer"]
--- solution ---
def roles_for(user_groups, mapping):
    roles = sorted({mapping[g] for g in user_groups if g in mapping})
    return roles or ["viewer"]
:::

:::written Integrate with ServiceNow
A customer wants your AI assistant to read and summarise their ServiceNow incident tickets and suggest fixes from their knowledge base. Describe the integration: how you get the data (initial and ongoing), auth, permissions, failure handling, and what you write back (if anything).
--- rubric ---
- Uses ServiceNow REST (Table API) or a connector; initial bulk sync then incremental via updated timestamp or webhooks/business rules
- Auth: OAuth client credentials with a least-privilege integration user; secrets in a vault
- Permissions: respect ticket/KB visibility (ACLs, assignment groups) when retrieving
- Failure handling: rate limits, retries with backoff, idempotent processing, watermark, monitoring
- Write-back is limited and approved (e.g. a work note marked as AI-generated), with audit logging
:::

:::quiz
Q: Which OAuth flow fits a background service calling an API with no user present?
- [ ] Authorization code
- [x] Client credentials
- [ ] Implicit
Q: What does SCIM do?
- [x] Automatically creates, updates and disables users and groups from the identity provider
- [ ] Encrypts traffic
- [ ] Logs users in
:::
