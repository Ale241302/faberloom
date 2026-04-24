# FaberLoom Mockup V4 · Handoff to Cowork

**From:** Álvaro Alfaro / Claude (MWT project)
**To:** Cowork engineering (FaberLoom build team)
**Date:** 2026-04-22
**Artifact:** `index-standalone.html` (547 KB · file:// compatible · zero build dependencies)

---

## 0. TL;DR

V4 is the F1-canonized mockup. Cowork asked for 3 separated scopes:
1. **F1 — implement fully.** Done across 11 fragments. 8 acceptance items verified.
2. **F2 — muted roadmap cards only.** Done as 3 `fl-f2card` elements in a dedicated tab. No F2 behavior anywhere else.
3. **Q1-Q18 — placeholders with ⚠ tooltips + full panel.** Done. 18 questions readable + flagged at 3 touch points.

All changes traceable to `ENT_PLAT_LLM_ROUTING v2.0` · `SPEC_AGENT_COMPOSITION §6` · `SPEC_SKILL_COMPOSITION §7` · `DEC-006/007/008` · `ENT_GOB_PENDIENTES Q1-Q18`.

---

## 1. What you can ship as-is

### 1.1 The new admin module
Route `/admin/llm-orchestration` with 8 tabs covering:
- Tiers (YAML read-only)
- Data Residency (tenant_model_allowlist)
- Circuit Breakers (provider + model)
- HA LiteLLM (primary + backup + HAProxy)
- Cold Start (30 days)
- Voice Profile (6th Add-on)
- Open Questions (Q1-Q18, collapsible)
- F2 Roadmap (muted)

Everything is mocked against `FL.mock.*` — no network calls. Replace mock object references with your API responses at production time.

### 1.2 The 9 new widgets
Located in `fragments/06_widgets.js.fragment`. All scoped under `FL.widgets` and use the tokens declared in `fragments/01_design_tokens.css.fragment`. Reuse them in production UI.

### 1.3 Tokens
`fragments/01_design_tokens.css.fragment` has the V4 additions (21 tokens × 2 themes). Cowork can copy them into a production theme file untouched.

### 1.4 Route table
```
#/admin/llm-orchestration              (default to tiers tab)
#/admin/llm-orchestration/tiers
#/admin/llm-orchestration/residency
#/admin/llm-orchestration/cb
#/admin/llm-orchestration/ha
#/admin/llm-orchestration/coldstart
#/admin/llm-orchestration/voice
#/admin/llm-orchestration/questions
#/admin/llm-orchestration/roadmap
```

---

## 2. What Cowork still needs to wire

These were intentionally stubbed to keep V4 deliverable offline:

### 2.1 Fork-to-Open (actual clone logic)
Current: shows confirm + audit event + toast.
Needed: duplicate the entity with `origin='open'`, reset `manual_overlay=null`, copy bindings, null out `base_sealed_hash`, disable update channel, invalidate agent memory (if agent fork), reset ladder to L0 Shadow.

### 2.2 Voice Profile persistence
Current: form present but only saves to audit event.
Needed: POST to `/tenant/{tenant_id}/voice_profile` and apply as system_prompt overlay at runtime (sealed skills) OR as part of fork base (open skills).

### 2.3 YAML link
Current: hardcoded to `https://github.com/sjoalfaro/mwt-knowledge-hub/blob/main/faberloom/config/llm_tiers.yaml`.
Needed: dynamic from config (probably inject at build time or use `tenant.yamlSourceUrl`).

### 2.4 Authority slider
Current: updates `agent.authorityMode` in memory + audit event.
Needed: PATCH to `/agent/{id}/authority` + enforce the `authorityMatrix.ladderAllowedAuthorities` matrix server-side too.

### 2.5 Position dropdown
Current: updates `agent.positionId` in memory + audit event.
Needed: PATCH to `/agent/{id}/position`; downstream propagate to AgentMemory scope (position_id, not user_id) per D12.

### 2.6 Circuit Breaker live state
Current: static snapshots.
Needed: Redis subscribe or polling every 5s to `cb:provider:*` and `cb:model:*` keys; update pills via `FL.bus.emit('cb:update', ...)`.

### 2.7 HA LiteLLM live state
Current: static snapshots.
Needed: HAProxy stats endpoint poll every 10s; update pills via `FL.bus.emit('ha:update', ...)`.

### 2.8 Cold Start
Current: single tenant example with `daysElapsed:2`.
Needed: compute from `tenant.cold_start.started_at`; emit signal when `daysElapsed >= daysTotal` to flip allowlist edit rights from CEO to admin.

---

## 3. What NOT to build (F2 discipline)

Per DEC-008, these belong to F2 and must not leak into F1:

| Feature | Status | Notes |
|---|---|---|
| Adaptive routing runtime | F2 deferred | gate: 3 tenants × 5K/mes × 3 meses |
| `model_evidence_ledger` table | F2 deferred | use git history instead in F1 |
| `routing_policy_proposal` table | F2 deferred | use PR review instead in F1 |
| `routing_policy_version` table | F2 deferred | use git SHA + tag instead |
| Weekly policy tuning cron | F2 deferred | manual PR cadence in F1 |
| Arena Mode UI (head-to-head voting) | F2 deferred | DEC-007 |
| Adversarial critic in swarm | F2 deferred | F1 swarm = paralelo → merge |
| MAB / Thompson / ε-greedy routing | F2 deferred | F1 is static tier |
| Page-Hinkley / ADWIN drift detection | F2 deferred | F1 has no drift signal |

If any of these shows up in an F1 PR, reject citing DEC-006/007/008.

---

## 4. What CEO still owes (Q1-Q18)

The Open Questions tab lists all 18 in detail. The P0s that block F1 shipping:

| ID | Area | Pending | Suggested |
|---|---|---|---|
| Q1 | voice_profile | per-tenant F1 or per-user F2 | per-tenant F1 (only owner edits) |
| Q2 | infra | KVM 8 specs confirm | Hostinger KVM 8 (8 vCPU / 32 GB / 400 GB NVMe) |
| Q3 | infra | KVM region | CEO to define |
| Q6 | infra | Moonshot/DeepSeek/OpenAI API keys exist | CEO to verify |
| Q7 | data_residency | CEO-ONLY allowlist scope | Anthropic + Ollama only |
| Q11 | research_swarm | F1 or F2 research swarm | F1 sin critic · max_depth=2, budget=$0.50 |
| Q12 | f1_routing | Accept DEC-006 downgrade | SÍ · Kimi LOW confidence justifica |

Each ⚠ flag in the UI tooltips to the matching row. Cowork can wire resolution ("mark answered") into their admin console later.

---

## 5. Build reproducibility

```
cd faberloom-mockup
python build.py
# → index-standalone.html 547 KB, 9280 lines, 28 fragments

# Syntax check (optional but recommended)
node --check <(grep -oP '<script[^>]*>\K[\s\S]*?(?=</script>)' index-standalone.html)
```

### Output invariants
- 28 fragments processed (3 head + 25 body)
- `admin-llm-infra` module present (search for `FL.modules['admin-llm-infra']`)
- 11 new mock collections (search for `[V4-PATCH 2026-04-22]`)
- 21 new tokens (search for `V4-PATCH 2026-04-22` inside `:root`)
- 9 new widgets (search for `W.sealedOpenBadge`, `W.authoritySlider`, etc.)

---

## 6. File-by-file diff summary

| File | Status | Purpose |
|---|---|---|
| `fragments/01_design_tokens.css.fragment` | modified | +21 tokens × 2 themes |
| `fragments/03_boot.js.fragment` | modified | +2 routes |
| `fragments/04_shell.html.fragment` | modified | +nav link |
| `fragments/05_mock_data.js.fragment` | modified | +11 collections |
| `fragments/06_widgets.js.fragment` | modified | +9 widgets + CSS |
| `fragments/07_i18n_es.js.fragment` | modified | +2 entries |
| `fragments/07_i18n_en.js.fragment` | modified | +2 entries |
| `fragments/07_i18n_pt.js.fragment` | modified | +2 entries |
| `fragments/12_module_skill_studio.html.fragment` | modified | +badge, fork CTA, voice card |
| `fragments/13_module_agent_console.html.fragment` | modified | +position, authority, sealed, fork |
| `fragments/17_module_chat.html.fragment` | modified | +cold start banner |
| `fragments/19_module_agent_list.html.fragment` | modified | +Origen column, fork CTA |
| `fragments/25_module_admin_llm_infra.html.fragment` | **NEW** | 498 lines, 8 tabs |
| `AC_V4_v1.md` | NEW | acceptance criteria |
| `DELIVERY_NOTES_V4.md` | NEW | what changed + how to run |
| `CHANGES_F1_v4.0.md` | NEW | conceptual + file-level changelog |
| `HANDOFF_V4_TO_COWORK.md` | NEW | this document |

---

## 7. Open questions for Cowork

1. Is the route scheme `/admin/llm-orchestration/:tab` OK or do you prefer a sidebar-subnav pattern?
2. Should the Sealed/Open icons (🔒/🔓) be kept as emoji or swapped for lucide/heroicons once you have the design system?
3. Should Voice Profile Add-on live inside Skill Studio itself (currently cross-link) when skill-sealed overlays are first supported?
4. Do you want the Q1-Q18 panel surface-by-surface linkable (e.g. `#/admin/llm-orchestration/questions?q=Q7`)?

Contact: sjoalfaro@gmail.com · DM or GitHub issue on `mwt-knowledge-hub`.
