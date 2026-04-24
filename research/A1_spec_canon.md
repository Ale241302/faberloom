# A1 — SPEC Canonical Inventory (FaberLoom v1 Beta Blueprint)

**Source:** `C:\Users\alvar\OneDrive\Documentos\Claude\Projects\MWT KB\docs\SPEC_FABERLOOM_ARCHITECTURE_v1_BLUEPRINT.md`
**File size:** 46,463 bytes · **Line count:** 968 lines · **SPEC status:** DRAFT v1.0 · **Date:** 2026-04-19

---

## 1. Canonical objects

The three canonical objects (AgentSpec / AgentRuntime / AgentMemory) are **referenced** in the front-matter input list (line 13) and cross-reference §16 (line 957 → `ARCH_AGENT_PRINCIPLES.md`), but this blueprint does NOT enumerate their object-level field schemas. It only exposes DB-table projections.

**AgentSpec** → table `agent_spec` (#10, S2): "def estática del agente". Writer `api`, readers `runtime_worker, ingestion_worker`. Migration `0003_agents.sql`. Field columns **[NOT IN SPEC]**. Audit verbs: `agent_spec.created | agent_spec.published | agent_spec.retired`.

**AgentRuntime** → projected via `agent_binding` (#11: "vínculo spec↔scope↔user/dept") and `agent_run` (#12: "ejecución", append-only, reader `audit_worker`). Jaeger tracing "entra desde S2 con agent_run + LLM traces" (§8). Runtime phase enum **[NOT IN SPEC]**.

**AgentMemory** → 4 tables (S2): `memory_source`, `memory_chunk` (full DDL in §4.1), `memory_chunk_vector`, `overlay_policy`. `memory_chunk` columns: `id`, `tenant_id`, `scope` (enum global/org/dept/user), `owner_department_id`, `owner_user_id`, `business_entity_id` (metadata NOT scope), `content`, `source_id`, `status` (active/superseded/revoked), `supersedes_chunk_id`, `classification` (public/partner_b2b/internal/ceo_only), `language` (default `es-ES`), `created_by`, `created_at`, `revoked_at`, `CONSTRAINT chk_scope_owner`. Verbatim (§4.1): "`created_by` = auditoría... `owner_user_id` = filter de scope... columnas distintas con semántica distinta."

## 2. State machine

The SPEC does NOT present a single unified 9-state machine. Status enums are scattered:

- `memory_chunk.status`: `active | superseded | revoked` (3) — §4.1
- `tenant.status`: `active | suspended` (2) — §3
- `job_execution.status`: `claimed | running | success | failure | skipped` (5) — §11
- draft lifecycle (via audit verbs): `generated | approved | rejected | expired | sent` plus implicit `pending` — §11/§12
- `connector_account`: `active | revoked | needs_reauth` — §9/§11

Aggregated unique non-draft status values = 9 (`active, superseded, revoked, suspended, claimed, running, success, failure, skipped`), but NOT presented as one state machine.

**Explicit transitions:** `memory_chunk` UPDATE restricted to `active → superseded | revoked` only; content never changes; DELETE prohibited (§4.3).
**Dead-ends:** revoked connector (must create new UUID — §9 line 789); revoked memory_chunk (no unrevoke path); deleted audit_event (RLS denies).

## 3. Autonomy Ladder L0–L4

**[NOT IN SPEC]** — no L0–L4 section, no "autonomy level" vocabulary. Only adjacent concept is RBAC (`owner|admin|operator`), which is not a ladder. Likely lives in `ARCH_AGENT_PRINCIPLES.md` (P1–P13, referenced §16).

## 4. Skill 3-layer model

**[NOT IN SPEC]** — the word "skill" never appears. Only adjacents: `overlay_policy` table (§2 row 16: "policies scope-override") and cross-reference in §16 line 956 — "4 scopes + 3 roles + TTL 90d learned overlays + leakage CI gate" (references `SPEC_USER_ADMIN_KNOWLEDGE_FLOW_v1_BETA.md`). No writer/approver/mutability/TTL per layer given. Human-gate phrase for skills **[NOT IN SPEC]**; closest phrase used for workflow gating is **"draft-first absoluto"** (§7.1).

## 5. Draft-first workflow

Verbatim phrase: **"draft-first absoluto; 72h expiry default"** (§7.1 line 610).
Phases (per `audit_event.action` enum, §12): `draft.generated | draft.approved | draft.rejected | draft.expired | draft.sent`. Implicit `pending` status in `expire_drafts` job (§11). Literal tokens "drafting / awaiting_approval" do NOT appear.
`expire_drafts` job runs every 5 minutes (§11).
Reversible vs irreversible distinction is **not** explicitly tabulated. Related rules:

- Append-only (irreversible): `audit_event`, `agent_run`, `draft_decision`, `connector_send_log`.
- Soft-delete only: `memory_chunk` (DELETE prohibido, §4.3 line 240).
- Connector revocation is terminal — re-connection = new UUID row (§9 line 789).

## 6. Provenance schema

**[NOT IN SPEC]** — no `claim → evidence_span → source_version → retrieval_run_id` chain is declared. Closest adjacents:

- `memory_chunk.source_id` (logical ref to `memory_source`, no physical FK)
- `memory_chunk.supersedes_chunk_id` (lineage to prior version)
- Retrieval query (§4.4) returns `mc.id, mc.content, mc.scope, mc.business_entity_id, distance` — no `retrieval_run_id`.

All four requested field names are **[NOT IN SPEC]**.

## 7. Action-risk registry

**[NOT IN SPEC]** as a 6-field registry. Present instead:

- `audit_event.action` enum (§12 lines 851-861), format `{entity}.{verb}`: full list reproduced verbatim includes `user.*`, `session.*`, `agent_spec.*`, `draft.*`, `memory_chunk.*`, `connector.*`, `policy.violation`, `secret.rotated`, `kek.access`, `backup.*`, `job.*`.
- Severity enum (§12 line 863): `INFO` (purge 730d) · `WARN` · `ERROR` · `POLICY` (never purged).

Per requested field: `action_id` ≈ the action enum · `reversibility` **[NOT IN SPEC]** · `side_effects` **[NOT IN SPEC]** · `min_autonomy` **[NOT IN SPEC]** · `required_role` — only surfaces in §4.3 memory_chunk INSERT policy (`owner|admin` for global/org scopes) · `audit_class` ≈ the severity enum.

## 8. Workflow state ledger

Two ledgers:

**`audit_event`** (#8, strict append-only via RLS, §2 line 99): writer `audit_worker`, reader `api (admin UI)`. Retention: INFO = 730d (weekly purge, §11 line 819); WARN/ERROR/POLICY = infinite (§12 line 863). Covered by `pg_dump` (§10).

**`job_execution`** (#9, DDL in §11 lines 829-840): fields `id, name, scheduled_for, started_at, finished_at, status, host, UNIQUE(name, scheduled_for)`. Lock: `INSERT ... ON CONFLICT (name, scheduled_for) DO NOTHING RETURNING id`. Retention **[NOT IN SPEC]**.

Other append-only ledgers: `agent_run`, `draft_decision`, `connector_send_log`, `event_outbox` (soft-published).

## 9. Knowledge scopes

Enum (§4.1 line 130): `scope ∈ {global, org, dept, user}`. Integrity enforced by `chk_scope_owner`:

- `global|org`: both `owner_*` NULL
- `dept`: `owner_department_id NOT NULL`, `owner_user_id NULL`
- `user`: `owner_user_id NOT NULL`, `owner_department_id NULL`

**`business_entity_id` is metadata, NOT a 5th scope** — verbatim "Metadata ortogonal (NO scope)" (§4.1). Passed as retrieval filter param, not RLS dimension (§4.4).

**Promotion / supersede:** `memory_chunk.promoted`, `memory_chunk.revoked`, `memory_chunk.superseded` exist as audit verbs (§12); `supersedes_chunk_id` implements lineage; UPDATE limited to status `active → superseded|revoked`. **Cross-scope promotion mechanics [NOT IN SPEC]** in this blueprint (lives in `SPEC_USER_ADMIN_KNOWLEDGE_FLOW_v1_BETA.md`).

## 10. Roles & RLS

**Roles** (`user_account.role` enum, §3 line 109): `owner | admin | operator`.

- **Owner**: only role that reads `classification='ceo_only'` (§4.3 line 215). Implicit writer of `tenant` row.
- **Owner + Admin**: only they can INSERT `memory_chunk` at `scope IN ('global','org')` (§4.3 line 225).
- **Operator**: may insert at `scope='dept'` (if `owner_department_id ∈ app.dept_ids`) or `scope='user'` (self only).

**RLS session variables** (§1 lines 51-57, verbatim):

```sql
SET LOCAL app.tenant_id   = '<uuid>';
SET LOCAL app.user_id     = '<uuid>';
SET LOCAL app.role        = 'operator';
SET LOCAL app.dept_ids    = '<uuid>,<uuid>,...';
SET LOCAL app.break_glass = 'false';
```

Casts: `::uuid`, `string_to_array(...)::uuid[]`, `::boolean`, and TEXT for role.

**Break-glass**: session flag `app.break_glass = 'true'` bypasses memory_chunk scope filter (§4.3 line 211); ceo_only filter still enforced by role. Comment: "break-glass auditado" (§4.3 line 198). **Duration, MFA, specific audit_event action name for break-glass — [NOT IN SPEC]**. No `break_glass.activated` verb in §12 enum.

**DB roles** (not human): `faber_app` (no BYPASSRLS, minimal grants), `faber_admin` (migrations + backup only).

## 11. Consolidation pipeline

**[NOT IN SPEC]** as Candidate/Active/Archived/Reverted. Closest is `memory_chunk.status` 3-state `active|superseded|revoked`, plus `agent_spec.created|published|retired` audit verbs implying a publish pipeline whose DDL is not shown. `Candidate` and `Archived` tokens do not appear in the SPEC; `Reverted` **[NOT IN SPEC]** (closest is `revoked`, which is terminal, not a revert).

## 12. Feedback taxonomy

**[NOT IN SPEC]** — no "5 typed feedback reasons" section. Closest audit verbs: `draft.approved`, `draft.rejected`, `policy.violation`. All 5 reason slots **[NOT IN SPEC]**.

## 13. Learning Thermometer

**[NOT IN SPEC]** — no thresholds or color codes for learning. The only thresholds in the document are Prometheus operational alerts (§8.4): OutboxBacklogHigh (>500/5m), ExpireDraftsStalled (no tick/20m), BackupMissing (26h), API5xxBurst (rate >0.05/5m), RLSDenySpike (>1/10m) — these are system-health, not learning gauges.

## 14. i18n scope

**[NOT IN SPEC]** as a language matrix. The only language artifact is `memory_chunk.language text NOT NULL DEFAULT 'es-ES'` (§4.1 line 145) — free-text field, no enum of supported UI locales. **No "332+" key count appears anywhere in the SPEC.** The brief's figure cannot be confirmed or refuted from this document. EN and PT-BR as UI locales: [NOT IN SPEC] (only indirect LatAm signal via `TZ: America/Costa_Rica` in §6 line 385 and "Marluvas/Tecmater LatAm" design partners in §17 line 968).

## 15. Tables FROZEN

§2 titled "Lista FROZEN v1 — 20 tablas". Full list with sprint tags:

- **S1 (9):** `tenant, user_account, department, user_department, session, event_outbox, inbox_message, audit_event, job_execution`.
- **S2 (7):** `agent_spec, agent_binding, agent_run, memory_source, memory_chunk, memory_chunk_vector, overlay_policy`.
- **S3 (4):** `draft, draft_decision, connector_account, connector_send_log`.

Transversal FROZEN rules (§2 lines 95-100): PK = uuid (UUIDv7); no physical FKs; composite index `(tenant_id, <filter>)`; strict append-only (UPDATE/DELETE denied to `faber_app`) on `audit_event, agent_run, draft_decision, connector_send_log`; soft versioning `active|superseded|revoked` + `supersedes_*_id`.

UUIDv7 itself also marked FROZEN (§1 title). Tables explicitly NOT in the 20: `user_sync_state`, `workspace_config` — deferred to v1.5 (§3 lines 113-114).

## 16. Gaps / open questions

**SPEC overall status = DRAFT.** Promotion to APPROVED blocked on "validación de los 3 design partners del wedge (cotización B2B calzado seguridad Marluvas/Tecmater LatAm) antes de corte S4 (2026-06-14)" (§0 + §17).

**12 items explicitly deferred to v1.5** (§15 lines 937-951): SCIM + user_sync_state; workspace_config table; KMS for KEY_ENCRYPTION_KEY; PITR WAL archiving; S3 document storage; OPA/Cedar pivot; whatsapp_worker separation; distributed rate limiter; ingestion+gmail worker separation; Postgres warm standby + RMQ HA; off-site geo backup; Jaeger persistent storage.

**Not in scope** (§0 line 28): billing, advanced connectors, SOC2/ISO, v1.5+.

**Major concepts the orchestrator's brief references that are NOT in this SPEC** (biggest gap category — must be sourced from sister docs):

1. Autonomy Ladder L0–L4 → expected in `ARCH_AGENT_PRINCIPLES.md`
2. Skill 3-layer (base/manual/learned) model → expected in `SPEC_USER_ADMIN_KNOWLEDGE_FLOW_v1_BETA.md`
3. Provenance chain (claim/evidence_span/source_version/retrieval_run_id)
4. Action-risk registry (6 fields)
5. Consolidation pipeline (Candidate/Active/Archived/Reverted)
6. 5 typed feedback reasons
7. Learning Thermometer
8. i18n ES/EN/PT-BR with 332+ keys
9. Unified 9-state document state machine
10. Break-glass duration/MFA/audit-action specifics

**Internal contradictions:** none. Minor tension between §14 checklist (#9 = "11 containers") and §7.2 ("8 containers operables in S1") — reconciled in §6.1 by noting S1 colapses some workers into api threads; "Conteo honesto: dev = 4 · staging = 11 · prod = 11" (§6 line 591).

**Mixed maturity:** SPEC is DRAFT but contains sub-elements already marked FROZEN (UUIDv7 §1; 20-table list §2; Prometheus+Grafana obligatoriedad §8).

---

**A1 delivered by chat-paste (sandbox write denied originally; captured by orchestrator).**
