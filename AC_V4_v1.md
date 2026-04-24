# FaberLoom Mockup · Acceptance Criteria V4 v1.0

**Build:** `index-standalone.html` · 547 KB · 9,280 lines · 28 fragments processed
**Date:** 2026-04-22
**Scope:** F1 canonized per DEC-006/007/008 + Q1-Q18 placeholders + F2 roadmap (muted)
**Canonical sources:** `ENT_PLAT_LLM_ROUTING v2.0` · `SPEC_AGENT_COMPOSITION §6` · `SPEC_SKILL_COMPOSITION §7` · `ENT_GOB_DECISIONES §B` · `ENT_GOB_PENDIENTES Q1-Q18`

---

## A. F1 CANONIZED — implemented scope (8 items from V4 handoff)

### AC-1A · LLM Orchestration · 4 tiers hardcoded (read-only UI)
- [x] Route `/admin/llm-orchestration/tiers` renders table with 4 tiers: simple/medium/complex/local_only
- [x] Columns: key · primary model · fallback chain · max cost USD · description
- [x] `fallback` for `local_only` shows em-dash ("— no fallback · CEO-ONLY")
- [x] Header shows commit SHA (`a3c7f9e`), author, YAML version (`1.0`)
- [x] "Ver en GitHub ↗" link to `https://github.com/sjoalfaro/mwt-knowledge-hub/blob/main/faberloom/config/llm_tiers.yaml`
- [x] Chip `read-only en UI` visible next to the link
- [x] Copy explains: "Editable solo vía commit + PR · Hot-reload cada 60s · git history reemplaza routing_policy_version"
- [x] Plans defaults table shows Starter/Pro/Enterprise/CEO-ONLY with model allowlists and CEO-ONLY note about US-only
- [x] DEC-006 attribution visible in the informational block

### AC-1B · Data Residency · tenant_model_allowlist (hard block)
- [x] Route `/admin/llm-orchestration/residency` renders table of 4 classifications
- [x] 4 rows present: PUBLIC, INTERNAL, CONFIDENTIAL, CEO_ONLY
- [x] Each row shows: allowed providers · blocked regions · reason denied · updated by/at
- [x] Copy declares "Hard block BEFORE tier check" and the HTTP 403 `tenant_model_allowlist` error code
- [x] Button "▶ Simular hard-block CEO-ONLY → kimi_k2" triggers toast with `HTTP 403 · tenant_model_allowlist`
- [x] CEO-ONLY row carries Q7 pending-CEO flag (sugerido: Anthropic + Ollama only)
- [x] Edit buttons visible only to owner (non-owner sees "read-only" chip)

### AC-1C · Circuit Breakers · 2-level (provider + model)
- [x] Route `/admin/llm-orchestration/cb` renders thresholds + two tables
- [x] Thresholds shown: open at ≥50% err / 20req · half-open after 60s · close at <10%/10req · p99>15s · 3×429 consecutivo
- [x] Provider table: anthropic/openai/google/moonshot/deepseek/ollama/groq
- [x] Model table: sonnet_4_6/opus_4_6/gpt_4o_mini/gemini_flash/kimi_k2/deepseek_v3/ollama_llama_3_2_3b
- [x] Each row shows Redis key (`cb:provider:X` / `cb:model:provider:model`)
- [x] 3 circuit states visualized: closed (green ●) · half_open (amber ◐) · open (red ◯)
- [x] Moonshot/kimi shown as `half_open` · Groq shown as `open` with `lastOpenedAt`
- [x] Legend row explains each state
- [x] Fallback semantics noted: all_models_unavailable NOT silent degradation

### AC-1D · HA LiteLLM (primary:4000 + backup:4001 + HAProxy)
- [x] Route `/admin/llm-orchestration/ha` renders 2-pill layout with `+` separator
- [x] Primary pill: `litellm-primary:4000` · status · uptime · p50 ms
- [x] Backup pill: `litellm-backup:4001` · status · uptime · p50 ms
- [x] HAProxy block: `haproxy:8080` · health check 10s · status chip
- [x] Shared Fernet key mount path: `/run/secrets/litellm_fernet`
- [x] Observability line shows Langfuse URL + Prometheus exporter
- [x] Banner toggles between "Stack healthy" and "Failover activo · pg-boss requeue"
- [x] Single-node F1 note (Q4 sugerido) in copy

### AC-1E · Cold Start Banner · 30 days manual exploration
- [x] Widget `W.coldStartBanner` rendered on chat main route
- [x] Title: "Cold Start · exploración manual · Día 2 de 30"
- [x] Progress bar reflects `daysElapsed/daysTotal` %
- [x] Dismiss × button persists state in `FL.store` (session-level)
- [x] Meta shows samples today / total / days remaining
- [x] Same widget appears again on `/admin/llm-orchestration/coldstart` (no dismiss there)
- [x] Admin Cold Start tab shows 6 KPI cells: started at · days elapsed · days remaining · cadence · samples today · samples total
- [x] Post-day-30 behavior copy: "admin del tenant gana edición sobre tenant_model_allowlist"

### AC-1F · Voice Profile · 6th Add-on (replaces Arena)
- [x] Route `/admin/llm-orchestration/voice` renders full editor
- [x] Fields: tone (formal/casual/neutral/técnico) · primary language (es-LATAM/pt-BR/en-US/es-ES) · blocked terms · preferred substitutions · default signature
- [x] Tenant-level scope; tenant `t_muito` example data prepopulated
- [x] Q1 pending-CEO flag visible in header (per-tenant F1 vs per-user F2)
- [x] Sealed vs Open behavior explained:
  - Sealed: "se aplica como overlay · no modifica base sealed"
  - Open: "es parte del fork editable"
- [x] Skill Studio (`/skills/:id`) shows Voice Profile cross-link card with summary chips
- [x] Save button emits audit event `voice_profile_update` + success toast

### AC-1G · Agent · Position + Authority slider (separate axis)
- [x] Agent Console (`/agentes/:id`) Summary tab shows 2 new cards:
  - **Position (D12)**: `<select>` populated from `positionCatalog` (8 positions)
  - **Authority**: segmented control SEÑALA / PROPONE / EJEC · aprobación / EJEC · solo
- [x] Authority allowed list driven by `authorityMatrix.ladderAllowedAuthorities[ladder]`:
  - L0: SEÑALA, PROPONE
  - L1: SEÑALA, PROPONE
  - L2: PROPONE, EJEC·aprob, EJEC·solo
  - L3: PROPONE, EJEC·aprob, EJEC·solo
  - L4: EJEC·solo
- [x] Disallowed modes rendered disabled + `aria-disabled="true"`
- [x] Each authority dot colored per token (`--auth-signal` sky, `--auth-propose` amber, `--auth-exec-approve` sage, `--auth-exec-solo` coral)
- [x] Sacred rule visible: "Canales externos SIEMPRE draft-first · ni L4 cambia esto"
- [x] Chip near header reads `Current: L<N> · <AUTH_MODE>`
- [x] Changes emit audit events: `agent_authority_change` and `agent_position_change`

### AC-1H · Sealed vs Open · badges + Fork CTA
- [x] Widget `W.sealedOpenBadge(origin)` used in 5 surfaces:
  - Skill Studio header
  - Agent Console header
  - Agent List table (new "Origen" column)
  - (No separate /skills list; skills surfaced in chat panel)
- [x] Sealed badge: 🔒 · dark-evidence color · `data-origin="sealed"` · tooltip "Sealed · FaberLoom-made · base_content inmutable · canal de updates activo"
- [x] Open badge: 🔓 · sage color · `data-origin="open"` · tooltip "Open · Fork editable · 100% del tenant · sin canal de updates"
- [x] Compact variant (`{compact:true}`) for table cells
- [x] Fork-to-Open CTA only rendered when `origin === 'sealed'` (dashed sage border)
- [x] Clicking Fork shows `confirm()` with 4-line consequence warning; on confirm emits audit `skill_fork_to_open` / `agent_fork_to_open` and toast
- [x] Header copy shows base_sealed_hash and forkedFrom when relevant

---

## B. F2 DEFERRED — muted roadmap cards only (NO implementation)

### AC-2 · F2 Roadmap tab
- [x] Route `/admin/llm-orchestration/roadmap` renders 3 muted cards
- [x] **F2.A · Adaptive Routing** — gate "3 tenants × 5,000 drafts/mes × 3 meses"; features list: per-tenant evidence ledger · weekly policy tuning · concept drift · MAB híbrido · pesos aprendidos · N≥500 · 4-eyes SOC 2 · sintético shadow testing
- [x] **F2.B · Arena Mode** — rationale "beta volume insufficient for N≥20 per model-pair"
- [x] **F2.C · Adversarial Critic** — rationale "F1 Research Swarm paralelo → merge SIN critic"
- [x] All cards use `fl-f2card` styles (dashed border, muted palette, "Coming in F2" chip)
- [x] Refs shown: DEC-007/008, `ENT_PLAT_LLM_ROUTING §G`, `archivo/kimi_swarm_4_adaptive_routing.md`
- [x] **F2 features exist ONLY inside these cards** — verified no loose `evidence_ledger`, `weekly tuning`, `Adaptive Routing`, `Arena Mode`, `policy_proposal`, or `shadow_mode` refs outside the F2 roadmap context

---

## C. Q1-Q18 BLOCKED — placeholders

### AC-3 · Open Questions panel
- [x] Route `/admin/llm-orchestration/questions` renders 3 `<details>` groups (P0 open by default, P1/P2 collapsed)
- [x] 18 rows total: 7× P0, 6× P1, 5× P2
- [x] Columns: ID (with ⚠ pending-CEO flag) · Area · Pending · Suggested · Unblocks
- [x] Collapse-all / expand-all controls
- [x] `pendingCeoFlag(qId, pendingText, suggestedAnswer)` widget in use at:
  - Voice Profile header (Q1)
  - CEO-ONLY row in Data Residency (Q7)
  - Skill Studio Voice Profile card (Q1)
- [x] Tooltip shows full pending + suggested answer text

---

## D. Visual system additions

### AC-4 · Tokens
- [x] 21 new tokens in `:root` + dark mode overrides:
  - Authority: `--auth-signal`, `--auth-propose`, `--auth-exec-approve`, `--auth-exec-solo` + `-soft` variants
  - Ladder aliases: `--ladder-l0..l4`
  - Sealed/Open: `--sealed-bg`, `--sealed-border`, `--sealed-ink`, `--sealed-chip-bg`, `--open-bg`, `--open-border`, `--open-ink`, `--open-chip-bg`
  - F2 muted: `--fl-muted-bg`, `--fl-muted-border`, `--fl-muted-ink`, `--fl-muted-chip-bg`
  - Circuit breaker: `--cb-closed`, `--cb-half-open`, `--cb-open` + `-soft` variants
  - Pending CEO: `--pending-ceo`, `--pending-ceo-bg`, `--pending-ceo-border`
- [x] All tokens have dark mode equivalents maintaining WCAG AA contrast

### AC-5 · Widgets
- [x] 9 new JS widgets in `FL.widgets`: sealedOpenBadge · forkToOpenCta + wireForkCta · authoritySlider + wireAuthoritySlider · circuitBreakerLight · coldStartBanner · pendingCeoFlag · dataResidencyRow · haStatusPill · f2MutedCard
- [x] All scoped CSS classes follow `fl-*` prefix convention
- [x] Injected once via existing `W.injectStyles()` template literal

---

## E. Preserved (NOT touched by V4)

- [x] Autonomy Ladder L0-L4 widget intact
- [x] Draft-first policy still enforced
- [x] RLS knowledge scope 4 levels (private/team/company/public)
- [x] Bandeja bidireccional (D11 from v3.5)
- [x] Task launcher ⌘K hotkey stub
- [x] Dark/light palette
- [x] All 11+ pre-existing routes functional
- [x] 9-state draft lifecycle state machine

---

## F. Build verification

- [x] `python build.py` → OK · 28 fragments processed (3 head + 25 body)
- [x] All 25 `<script>` blocks pass `node --check` after concatenation (UTF-8)
- [x] Individual fragment checks: `05_mock_data` OK · `06_widgets` OK · `03_boot` OK
- [x] Mock data collections 31-41 referenced correctly: llmTiers (10) · modelAllowlist (3) · circuitBreakers (3) · haLitellm (6) · voiceProfile (6) · coldStart (8) · positionCatalog (7) · authorityMatrix (3) · sealedOpenFlags (10) · openQuestionsQ1Q18 (3) · f2Roadmap (3)
- [x] Widget render counts: sealedOpen 6 · authority 17 · CB 6 · coldStart 15 · haPill 6 · f2Card 17 · dataResidencyRow 3 · forkCta 3

---

## G. Out-of-scope / acknowledged

- `W.aiAssistChat` / `aiAssistToolbar` from v3 preserved but not repositioned
- Skill library/factory (D16) not in V4 scope — remains as design doc only
- No backend wiring; all state is mock-based in-memory with localStorage persistence for toggles
- i18n: only Spanish strings complete for V4 additions; EN/PT nav labels added but in-module copy remains ES (matches existing mockup policy)
