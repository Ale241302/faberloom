# FaberLoom Mockup · Delivery Notes V4

**Version:** V4.0 (F1 canonized · DEC-006/007/008)
**Date:** 2026-04-22
**Predecessor:** v3.5 (chat bidireccional, Voice of Customer, AgentSpec wizard)
**Canonical DECISIONS applied this release:**
- DEC-006 · FaberLoom F1 routing = tiered hardcoded YAML (no adaptive)
- DEC-007 · Arena Mode descartado de FaberLoom F1
- DEC-008 · Adaptive Routing postpuesto a F2, gated a 5K drafts/mes × 3 tenants × 3 meses

---

## 1. What changed vs v3.5

### New top-level surface
- **LLM · Infra** admin module (`#/admin/llm-orchestration`) with 8 tabs:
  1. Tiers (read-only YAML view)
  2. Data Residency (tenant_model_allowlist)
  3. Circuit Breakers (2-level, Redis)
  4. HA LiteLLM (primary + backup + HAProxy)
  5. Cold Start (30-day manual)
  6. Voice Profile (6th Add-on)
  7. Open Questions (Q1-Q18)
  8. F2 Roadmap (muted cards)

### Extended surfaces
- **Skill Studio** · now shows Sealed/Open badge, Fork-to-Open CTA, Voice Profile cross-link card
- **Agent Console** · Summary tab gains Position card + Authority slider; header gets Sealed/Open badge + Fork CTA; audit events for authority/position changes
- **Agent List** · new "Origen" column + compact Sealed/Open badge + inline Fork CTA
- **Chat** (default route) · dismissable Cold Start banner at top

### Mock data (fragments/05_mock_data.js.fragment §31-§41)
- `llmTiers` · `llmTiersYamlUrl` · `llmTiersYamlVersion` · `llmTiersLastCommit`
- `modelAllowlist` · `llmPlansDefaults`
- `circuitBreakers` (thresholds + 7 providers + 7 models with 3 states)
- `haLitellm` (primary/backup/haproxy + Fernet + observability)
- `coldStart` (30-day tenant lifecycle)
- `voiceProfile` (tenant t_muito with técnico tone, blocked terms, signature)
- `positionCatalog` (8 positions)
- `authorityMatrix` (4 modes + L0-L4 × authority validity)
- `sealedOpenFlags` (4 skills + 7 agents tagged sealed/open + hashes)
- `openQuestionsQ1Q18` (18 rows with priority/area/pending/suggested/unblocks)
- `f2Roadmap` (3 cards: Adaptive/Arena/Critic)

### Design tokens (fragments/01_design_tokens.css.fragment)
21 new tokens grouped in light + dark:
- 4× Authority + soft variants
- 5× Ladder semantic aliases
- 4× Sealed (+ chip)
- 4× Open (+ chip)
- 4× F2 muted (+ chip)
- 3× Circuit Breaker + soft variants
- 3× Pending CEO

### Widgets (fragments/06_widgets.js.fragment)
9 new widget functions + scoped CSS:
- `sealedOpenBadge(origin, {compact})`
- `forkToOpenCta(entityId, entityType)` + `wireForkCta(root, handler)`
- `authoritySlider(currentMode, ladder)` + `wireAuthoritySlider(root, onChange)`
- `circuitBreakerLight(state)`
- `coldStartBanner(cs)`
- `pendingCeoFlag(qId, pendingText, suggestedAnswer)`
- `dataResidencyRow(row, {readOnly})`
- `haStatusPill(instance)`
- `f2MutedCard(card)`

### Internationalization
- `admin_llm_infra: 'LLM · Infra'` added to ES/EN/PT i18n dicts
- Module body copy is Spanish-only (matches pre-existing mockup policy)

### Routes registered (fragments/03_boot.js.fragment)
```
/admin/llm-orchestration        → admin-llm-infra
/admin/llm-orchestration/:tab   → admin-llm-infra
```
`:tab` is one of: `tiers | residency | cb | ha | coldstart | voice | questions | roadmap`

### Nav sidebar (fragments/04_shell.html.fragment)
New link inside `#fl-nav-admin`:
```html
<a href="#/admin/llm-orchestration" data-route="admin-llm-infra">LLM · Infra</a>
```

---

## 2. Explicit rejections (scope discipline)

Per the V4 Cowork handoff, the following F2-bound features are **not implemented** in F1:
- No Adaptive Routing runtime (no adaptive router, no evidence ledger, no weekly tuning loop)
- No Arena Mode (no chatbot-arena style head-to-head in UI)
- No Research Swarm critic (F1 swarm uses paralelo → merge directo)
- No policy_proposal workflow UI
- No shadow_mode toggle
- No N≥20 detection UI

These appear **only** as muted cards inside `/admin/llm-orchestration/roadmap`, attributed to DEC-007/008.

---

## 3. Open items (requires CEO decision)

Q1-Q18 are rendered in the Open Questions tab with:
- 7× **P0** — block F1 canonicalization
- 6× **P1** — block F2 gate
- 5× **P2** — roadmap only

Each ⚠ flag in the UI (Voice Profile header, CEO-ONLY residency row, Skill Studio voice card) tooltips to the corresponding question. Suggested answers are prefilled per `ENT_GOB_PENDIENTES`.

---

## 4. Build + verification

```
$ python build.py
[OK] index-standalone.html - 547 KB - 9280 lines - 2026-04-22
     fragments processed: 28  head: 3  body: 25

$ node --check <concatenated scripts>  → no syntax errors (25 blocks)
```

Static scans confirmed:
- Arena/evidence_ledger/adaptive_routing/weekly references only inside F2 roadmap card
- All 11 new mock collections accessible from built file
- All 21 new tokens injected in light + dark theme
- All 9 widgets present with CSS

---

## 5. How to run

```
cd faberloom-mockup
python build.py
# open index-standalone.html in any browser (file:// works)
```

Primary routes to visit:
- `#/chat` — default landing with Cold Start banner
- `#/admin/llm-orchestration` — new 8-tab admin module
- `#/agentes/ag_cotizador` — Position + Authority slider (sealed agent + base hash)
- `#/agentes/ag_bant` — Open agent (forked from ag_cotizador)
- `#/skills/sk_cotizar` — sealed skill with Fork-to-Open CTA + Voice Profile card
- `#/skills/sk_stock_lookup` — open skill (forked)

---

## 6. Known limitations of V4

1. Fork-to-Open is illustrative (shows confirm + audit); does not actually duplicate the mock entity
2. Voice Profile editor persists only in memory (no localStorage write for fields)
3. Authority slider persists in agent object at runtime but resets on full rebuild
4. Circuit breaker and HA LiteLLM states are static snapshots (no live polling simulation)
5. YAML "Ver en GitHub" link points to a placeholder SHA; real path is `mwt-knowledge-hub/faberloom/config/llm_tiers.yaml`
6. Q1-Q18 don't support inline "mark as resolved" UI — they're read-only until CEO answers outside the tool

---

## 7. Files touched (11)

```
fragments/01_design_tokens.css.fragment       ← +21 tokens × 2 themes
fragments/03_boot.js.fragment                 ← +2 routes
fragments/04_shell.html.fragment              ← +1 nav link
fragments/05_mock_data.js.fragment            ← +11 collections (§31-§41)
fragments/06_widgets.js.fragment              ← +9 widgets + CSS
fragments/07_i18n_es.js.fragment              ← +2 i18n entries
fragments/07_i18n_en.js.fragment              ← +2 i18n entries
fragments/07_i18n_pt.js.fragment              ← +2 i18n entries
fragments/12_module_skill_studio.html.fragment ← +Sealed/Open badge, Fork CTA, Voice Profile card
fragments/13_module_agent_console.html.fragment ← +Position, Authority, Sealed/Open, Fork CTA
fragments/17_module_chat.html.fragment        ← +Cold Start banner + dismiss
fragments/19_module_agent_list.html.fragment  ← +Origen column, Fork CTA
fragments/25_module_admin_llm_infra.html.fragment (NEW · 498 lines) ← 8-tab module
```

Generated: `index-standalone.html` · 547 KB · 9,280 lines · 28 fragments concatenated.
