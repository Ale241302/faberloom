# A6 — Reconciliation: canon decisions for the mockup

The user's build prompt references decisions as "closed in SPEC", but A1+A4+A5 show many live in sister docs or are prompt-level inventions. This doc records what's canonical for the build.

---

## Rule of precedence

1. SPEC (A1 blueprint + A4 principles + A5 knowledge flow) — where it speaks concretely
2. User's build prompt — where SPECs are silent (prompt-authoritative for UI labels, action-risk registry, provenance chain)
3. Existing code (A2 inventory) — shape of the schema when nothing else specifies

When SPEC and prompt disagree on wording, prompt wins for UI copy, SPEC wins for data-layer IDs.

---

## Decision log

### D1 · Autonomy Ladder

- **Internal IDs** (A4 canonical): `L0_SHADOW` · `L1_PROPONE` · `L2_EJECUTA_INTERNO` · `L3_AUTO_NOTIFICA` · `L4_AUTO_EXCEPCIONES`
- **Display labels** (prompt): "Shadow" · "Propone" · "Auto-bajo" · "Auto+notif" · "Auto+excepciones"
- **Unlock criterion text** (A4 verbatim, global thresholds):
  - Generic: "≥10 runs nivel actual · ≥80% approval · ≥60% edit-light · ≤10% rejection · ≥14 días estables · Memory activa · Aprobación CEO"
  - L0→L1 exception: "≥3 runs · >70% approval"
- **Automatic degradation:** "rejection >30% en últimas 5 runs · error grave en acción alto-impacto · dependencia KB rota"
- **Who unlocks:** CEO in SPEC (A4). In the mockup we'll render it as "Tenant Owner" since CEO ≈ owner in the product.

### D2 · State machine (9 states)

Prompt canon; A4 matches core:
`drafting · awaiting_approval · approved · executing · waiting_external_signal · blocked · completed · failed · escalated`

A4 ASCII state machine covers `drafting → awaiting_approval → approved → executing → completed` + branches `rejected`, `escalated`. Extended with `waiting_external_signal`, `blocked`, `failed` per prompt.

### D3 · Skill 3-layer

A5 canonical storage tables:
- `agent_spec_base` — sealed, provided by FaberLoom
- `agent_spec_overlay_manual` — org-level manual rules (Tenant Owner / Admin write; require no gate)
- `agent_spec_overlay_learned` — system-proposed patterns; require **human gate** before promotion

UI labels (ES): "Base sellada" · "Overlay manual" · "Overlay aprendido".

### D4 · TTL

A5 canonical: **90 días default · configurable 30-180 por skill**.
- Volátiles (campañas estacionales) → 30 días
- Cotización B2B → 90 días
- Compliance/fiscal → 180 días

### D5 · Consolidation pipeline states

A5 data layer: `candidate | active | archived | revoked`.
**UI display** (per prompt): **Candidate → Active → Archived → Reverted** (display `Reverted` for `revoked`, per prompt §0 decision list).

A4 skill-gold pipeline uses "Reverted" natively — no rename needed there.

### D6 · Feedback taxonomy

Two competing canons:
- **A4 / P6 codes (data layer):** `tone · data · structure · policy · scope · context` (6)
- **Prompt (UI):** 5 reasons "claim sin evidencia · tono · dato incorrecto · acción riesgosa · otro"

**Decision:** UI shows **prompt's 5** as radio labels; internal `feedback.reason_code` stores mapped code:
- `claim_sin_evidencia` → `data`
- `tono` → `tone`
- `dato_incorrecto` → `data`
- `accion_riesgosa` → `policy`
- `otro` → `context`

This preserves both canons. Mock `feedbacks` collection carries both `reason` (UI) + `code` (data).

### D7 · Action-risk registry (6 fields)

[NOT IN SPEC]. Prompt-authoritative. Schema:
- `action_id` (string)
- `reversibility` ∈ `reversible_24h | reversible_cost | irreversible | irreversible_cost`
- `side_effects` (string[])
- `min_autonomy` ∈ `L0..L4`
- `required_role` ∈ `operator | admin | owner`
- `audit_class` ∈ `commercial | financial | operational | policy | meta`

### D8 · Provenance chain

[NOT IN SPEC]. Prompt-authoritative:
`claim_id → evidence_span_id → source_version → retrieval_run_id`

A4 adjacency: `ModelFingerprint` (`provider, model_family, model_version, system_prompt_hash, tools_manifest_hash, policy_version, retrieval_index_version`) — **carry as a 2nd pane** in the Evidence tab so the ModelFingerprint canon gets surfaced.

### D9 · Learning Thermometer

A4 verbatim: 🔵 Frío (0-2) · 🟡 Tibio (3-5) · 🔴 Caliente (6+, urgente).

### D10 · Knowledge scopes

A5 canonical: `global · org · dept · user`. `business_entity_id` = metadata (NOT a 5th scope). Pivote trigger: ≥20-25% knowledge "per account/opportunity" across 3 design partners → formalize 5th scope.

### D11 · Roles & break-glass

A5 verbatim:
- Roles: `owner | admin | operator`
- Break-glass: `support_impersonation` permission, **8 hours**, "MFA fuerte + uso auditado"
- Delegable perms: `can_approve_promotion` (7d), `can_view_audit_technical` (24h), `support_impersonation` (8h), `can_manage_directory_sync` (24h), `can_rollback_sharing` (24h)

### D12 · RLS session variables

A1 canonical (from SPEC_FABERLOOM_ARCHITECTURE):
```sql
SET LOCAL app.tenant_id   = '<uuid>';
SET LOCAL app.user_id     = '<uuid>';
SET LOCAL app.role        = 'operator';
SET LOCAL app.dept_ids    = '<uuid>,<uuid>,...';
SET LOCAL app.break_glass = 'false';
```

Surface in ops-health debug panel.

### D13 · i18n

Target: **ES default + EN + PT-BR**, minimum 332 keys (prompt target; NOT validated in any SPEC). Existing code has ~130 per file; need to triple to hit target. Build symmetrically — every key in all 3.

### D14 · Tables FROZEN (20)

A1 verbatim:
- S1 (9): `tenant, user_account, department, user_department, session, event_outbox, inbox_message, audit_event, job_execution`
- S2 (7): `agent_spec, agent_binding, agent_run, memory_source, memory_chunk, memory_chunk_vector, overlay_policy`
- S3 (4): `draft, draft_decision, connector_account, connector_send_log`

Surface all 20 in `ops-health` tables grid.

### D15 · Containers

A1 verbatim: "Conteo honesto: dev = 4 · staging = 11 · prod = 11".

---

## Port strategy from existing code (A2)

1. **Port verbatim** into fragments:
   - `core/tokens.css` → `01_design_tokens.css.fragment` (light block as-is; swap dark block with A3)
   - `core/boot.js` (lines 7-201) → `03_boot.js.fragment`
   - `widgets/widgets.js` (lines 8-215) → `06_widgets.js.fragment` + add DraftStateBadge, Toast, Diff, extract Tabs/Timeline
   - `modules/bandeja-detail.js` → `11_module_bandeja_detail.html.fragment`
   - `modules/skill-studio.js` → `12_module_skill_studio.html.fragment`
   - `modules/agent-console.js` → `13_module_agent_console.html.fragment`
   - `modules/workflows.js` → `14_module_workflows_canvas.html.fragment`
   - `data/mock.js` → `05_mock_data.js.fragment` (extend to 17 collections)
   - `i18n/*.js` → `07_i18n_*.js.fragment` (extend symmetrically)
   - `core/shell.js` → `04_shell.html.fragment` (adapt to HTML template + script)

2. **Net-new fragments:**
   - `10_module_bandeja_lista.html.fragment` (biggest missing piece)
   - `15_module_runs_timeline.html.fragment`
   - `16_module_consolidation.html.fragment` (Kanban view, separate from modal)
   - `20_module_admin_users.html.fragment`
   - `21_module_admin_knowledge.html.fragment`
   - `22_module_admin_audit.html.fragment`
   - `23_module_admin_tenant.html.fragment`
   - `24_module_admin_connectors.html.fragment`
   - `30_module_ops_health.html.fragment`
   - `31_module_design_system.html.fragment` (adapt from design-system.html)

3. **Discard:**
   - `index-standalone.html` (superseded by fragment build)

## Biggest risks

1. **Mock data extension is the long pole.** Need 14 new collections at rough fidelity (users, departments, businessEntities, runs, feedbacks, auditEvents, actions, connectors, policies, jobs, alerts, tables). Plan ~500-800 LOC for this fragment alone.

2. **i18n triple-coverage.** 3 files × 200+ new keys each = ~600 net-new LOC. Symmetric or nothing.

3. **Admin modules (5).** All net-new. Each needs mock data that must exist first.

4. **Context budget.** Writing 7-10k LOC of fragment output + research is tight on main-agent context. Use subagents strategically for Phase 3 modules with small paste windows (≤ 300 LOC each).
