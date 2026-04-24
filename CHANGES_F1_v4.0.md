# FaberLoom F1 · Changes log v4.0

**Base:** v3.5 (2026-04-19)
**Target:** v4.0 (2026-04-22)
**Canonicalizations:** DEC-006 · DEC-007 · DEC-008

---

## A. Conceptual changes (what's different in F1)

### A.1 Routing model downgraded per DEC-006
v3.5 carried latent expectations of adaptive routing (shadow mode, evidence ledger, weekly tuning). V4 **removes** these from the F1 surface and canonizes the tiered hardcoded approach:

| Aspect | Before (v3.5) | After (v4 F1) |
|---|---|---|
| Routing source | Implicit runtime router | YAML in git (`faberloom/config/llm_tiers.yaml`) |
| Change mechanism | Dynamic weights | Commit + PR |
| Tiers | Implied but unspecified | 4 explicit tiers (simple/medium/complex/local_only) |
| Fallback | Unclear | Explicit chain per tier |
| History | `routing_policy_version` table | Git history |
| Runtime intelligence | Assumed | Removed — YAML hot-reload every 60s only |

### A.2 Arena Mode removed per DEC-007
All Arena references in v3.5 (head-to-head chat-arena style testing) are removed from F1 UI. Arena becomes a muted F2 card only.

### A.3 F2 gate formalized per DEC-008
The transition to F2 adaptive routing now has an explicit gate visible in the F2 roadmap card:
`3 tenants × 5,000 drafts/mes × 3 meses sostenido`.

### A.4 Voice Profile promoted to 6th Add-on
The slot originally occupied by Arena Mode is reallocated to **Voice Profile** (tenant-level): tone, blocked terms, preferred substitutions, signature, language. Canonicalized as Add-on #6 per handoff D17.

### A.5 Data Residency enforcement made explicit
New `tenant_model_allowlist` table with hard block semantics: rejected requests return HTTP 403 `tenant_model_allowlist` BEFORE tier check. No silent fallback.

### A.6 Circuit Breakers formalized as 2-level
Previously implicit; now explicitly surfaced as two Redis-backed layers (provider + model) with 3 states (closed/half_open/open) and explicit thresholds: 50%/20req open, 60s half-open, 10%/10req close, 15s p99 trigger, 3×429 consecutive trigger.

### A.7 HA LiteLLM surfaced as F1 baseline
Two LiteLLM instances (primary:4000 + backup:4001) behind HAProxy (8080) with 10s health check, shared Fernet key mount, failover >30s → pg-boss requeue. Previously vague; now visible.

### A.8 Cold Start formalized
30-day manual exploration window with CEO reviewing ≥1 sample/day. Post-day-30, admin del tenant gains edit rights over `tenant_model_allowlist`. Before this patch it was implicit.

### A.9 Agent Authority decoupled from Autonomy Ladder
Previously one axis (L0-L4 autonomy). Now two axes:
- **Ladder L0-L4** (Shadow / Propone / Auto-bajo / Auto+notif / Auto+excepciones)
- **Authority mode** (SEÑALA / PROPONE / EJEC·aprob / EJEC·solo)

Valid combinations hardcoded in `authorityMatrix.ladderAllowedAuthorities` per SPEC_AGENT_COMPOSITION §6.

### A.10 Position decoupled from User (D12)
`agent.positionId` references `positionCatalog`. AgentMemory and skills belong to the position, not the user. This supports employee rotation: new person takes the seat, inherits the context.

### A.11 Sealed vs Open dual mode
All skills and agents carry an `origin` flag:
- **Sealed** · FaberLoom-made, immutable base, update channel enabled
- **Open** · client-made or forked, 100% editable, no update channel

Forking Sealed → Open is a one-way action with explicit consequence prompts.

---

## B. File-level changes

### B.1 fragments/05_mock_data.js.fragment
**+** Collection 31 `llmTiers` (4 rows) + YAML metadata
**+** Collection 32 `modelAllowlist` (4 classifications) + `llmPlansDefaults` (4 plans)
**+** Collection 33 `circuitBreakers` (thresholds + 7 providers + 7 models)
**+** Collection 34 `haLitellm` (primary/backup/haproxy/Fernet/observability)
**+** Collection 35 `coldStart` (tenant timeline, cadence)
**+** Collection 36 `voiceProfile` (tenant t_muito with 4 field types)
**+** Collection 37 `positionCatalog` (8 positions)
**+** Collection 38 `authorityMatrix` (4 modes + L0-L4 × auth matrix + sacred rule)
**+** Collection 39 `sealedOpenFlags` (4 skills + 7 agents origin + hashes)
**+** Collection 40 `openQuestionsQ1Q18` (18 rows)
**+** Collection 41 `f2Roadmap` (3 cards)

### B.2 fragments/01_design_tokens.css.fragment
**+** 21 tokens in `:root`
**+** Full dark-mode equivalents in `[data-theme="dark"]`

### B.3 fragments/06_widgets.js.fragment
**+** `sealedOpenBadge(origin, opts)`
**+** `forkToOpenCta(entityId, entityType, opts)` + `wireForkCta(root, handler)`
**+** `authoritySlider(currentMode, ladder, opts)` + `wireAuthoritySlider(root, onChange)`
**+** `circuitBreakerLight(state, opts)`
**+** `coldStartBanner(cs, opts)`
**+** `pendingCeoFlag(qId, pendingText, suggestedAnswer)`
**+** `dataResidencyRow(row, opts)`
**+** `haStatusPill(instance)`
**+** `f2MutedCard(card)`
**+** CSS for all 9 widgets appended to existing style template

### B.4 fragments/03_boot.js.fragment
**+** Route `/admin/llm-orchestration` → `admin-llm-infra`
**+** Route `/admin/llm-orchestration/:tab` → `admin-llm-infra`

### B.5 fragments/04_shell.html.fragment
**+** `<a href="#/admin/llm-orchestration">LLM · Infra</a>` in admin nav group

### B.6 fragments/07_i18n_es.js.fragment · fragments/07_i18n_en.js.fragment · fragments/07_i18n_pt.js.fragment
**+** `admin_llm_infra: 'LLM · Infra'` + module route alias

### B.7 fragments/12_module_skill_studio.html.fragment
**+** Sealed/Open badge next to title
**+** Fork-to-Open CTA when origin=sealed
**+** Voice Profile cross-link card below header
**+** audit event + toast on fork
**+** CSS for Voice Profile card

### B.8 fragments/13_module_agent_console.html.fragment
**+** Sealed/Open badge in header
**+** Fork-to-Open CTA when origin=sealed
**+** Position card in Summary tab (select + effects)
**+** Authority slider card in Summary tab
**+** audit events: `agent_authority_change`, `agent_position_change`, `agent_fork_to_open`
**+** CSS for position grid

### B.9 fragments/17_module_chat.html.fragment
**+** Cold Start banner wrapper at top of chat layout
**+** Dismissable × button with `FL.store` persistence
**+** CSS for banner positioning

### B.10 fragments/19_module_agent_list.html.fragment
**+** "Origen" column in agent table (compact Sealed/Open badge)
**+** Inline Fork-to-Open CTA per sealed row
**+** Wire fork handler

### B.11 fragments/25_module_admin_llm_infra.html.fragment (NEW)
498 lines · 8 tabs · reads from 11 mock collections · all widgets used · scoped styles.

---

## C. Verification

- Build: `python build.py` → `index-standalone.html 547 KB · 9280 lines`
- JS syntax: 25 `<script>` blocks pass `node --check` after concatenation
- Scope discipline: Arena/evidence_ledger/adaptive/weekly refs only in F2 roadmap card
- Token coverage: 21/21 new tokens referenced from widget CSS
- Route coverage: 8 sub-tabs reachable from sidebar "LLM · Infra"
- Dark mode: all 21 tokens have dark overrides

---

## D. What was NOT changed

- Autonomy Ladder widget (L0-L4 with unlock copy)
- Draft-first policy (sacred rule now quoted explicitly)
- RLS knowledge scope 4 levels
- Bandeja bidireccional
- ⌘K task launcher stub
- Pre-existing 11 routes
- 9-state draft lifecycle
- 6-field risk registry
- Memory scopes (run-session / org-account / curated)
- Dark/light palette base hues

---

## E. Next (post-V4)

1. Canonize DEC-006/007/008 in `ENT_GOB_DECISIONES.md` upstream (current status DRAFT post-Kimi #4)
2. CEO answers Q1, Q7, Q11, Q12 (P0 blockers) to unblock F1 shipping
3. When F2 gate nears (first tenant at 5K/mes), rebuild F2 spec with Kimi-diferred mejoras (decay 0.85 semanal, Page-Hinkley, MAB Thompson+ε-greedy, N≥500, 4-eyes + firma SOC 2, dataset sintético)
4. Real wiring of Fork-to-Open logic (clone + reset + memory isolation) pending backend
