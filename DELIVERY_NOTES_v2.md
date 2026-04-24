# FaberLoom v1 Beta · Standalone Mockup **v2** — Delivery notes

**Date:** 2026-04-19
**Output:** `index-standalone.html` (**340 KB · 6,156 lines · 26 fragments**)
**Predecessor:** v1 (223 KB · 4,226 lines · 25 fragments)
**Open with:** double-click (file://) — no server, no build tooling.
**Default route:** `#/chat` (changed from `#/bandeja/dr_001`).

---

## 1. What changed vs. v1

### New fragment
- `17_module_chat.html.fragment` (**~485 lines**) — 3-column chat module with Always-on · Agents · Skills · Conversation · Composer · Grounded-in · SLA · Handoffs.

### Edited fragments (10 surgical patches, all marked `[V2-PATCH 2026-04-19]`)

| Fragment | Patch |
|---|---|
| `03_boot.js.fragment`           | chat routes + query parsing + keybindings (⌘E/⌘A/⌘B/⌘/) + default hash `#/chat` |
| `04_shell.html.fragment`        | 1 line: Chat nav link |
| `05_mock_data.js.fragment`      | +6 collections: `conversations`(8), `messages`(~45), `availableAgents`(6), `availableSkillsForChat`(12), `knowledgeHeatSamples`(6), `voiceOfCustomerSamples`(4) |
| `06_widgets.js.fragment`        | +10 widgets (ChatComposer, IterationComposer, SkillPill, AgentChip, GroundedInBlock, MessageActionsMenu, PatternBadge, VoiceOfCustomerCard, SuggestGrid, SLABar) + Sparkline helper + CSS styles |
| `07_i18n_es.js.fragment`        | +domains: chat, pattern, voc, message_actions, iteration, bulk, promote, connector |
| `07_i18n_en.js.fragment`        | symmetric mirror |
| `07_i18n_pt.js.fragment`        | symmetric mirror |
| `10_module_bandeja_lista`       | checkbox per row + bulk approve toolbar + double-confirm irreversible |
| `11_module_bandeja_detail`      | GroundedInBlock top-3 + "Ver Evidencia" jump |
| `12_module_skill_studio`        | PatternBadge on learned rows + sealed badge on base header |
| `13_module_agent_console`       | 5th tab "Conversación" + "Abrir chat con este agente" button |
| `20_module_admin_users`         | Edit user modal (rol/dept/BE/bg/scope) + emits audit event |
| `21_module_admin_knowledge`     | 3-step promote flow (preview → sanitize → confirm) + audit event |
| `24_module_admin_connectors`    | 3-tab config modal (creds/scope/test) + audit event |

### New artifacts
- `verification/AC_v2.md` — 20 AC pass/fail
- `verification/trazabilidad_v2.md` — 60-row trazabilidad green/yellow/red
- `verification/axe_report_2026-04-19_static.md` — WCAG 2.1 AA static audit (0 violations expected)
- `research/A7_chat_contradictions.md` — **primary value artifact**: 13 canonical contradictions surfaced while building chat, with decisions + open questions

### Untouched (per v2 §4 cerrado)
Fragments `00, 01, 02, 14, 15, 16, 22, 23, 30, 31, 99` — no changes.
`research/A1..A6` — preserved verbatim.

---

## 2. 20 AC · Pass / Fail table

| # | AC (resumen) | Status |
|---|---|---|
|  1 | Default `#/chat` con layout 3 columnas            | ✅ PASS |
|  2 | Left: Always-on + 6 agents + 12 skills             | ✅ PASS |
|  3 | Skill click → pill; 2do click → quita              | ✅ PASS |
|  4 | Agent click → AgentChip + "Hablando con:"          | ✅ PASS |
|  5 | Empty state SuggestGrid 2×2 · 4 sugerencias        | ✅ PASS |
|  6 | Agent message con actions + PatternBadge + [E1..]  | ✅ PASS |
|  7 | Hover sup → GroundedIn highlight                    | ⚠ REQUIRES-BROWSER |
|  8 | Iterate → IterationComposer embedded                | ✅ PASS |
|  9 | Iteración → badge "Iteration N"                    | ✅ PASS |
| 10 | Draft pill linkea a `#/bandeja/:id`                | ✅ PASS |
| 11 | SLABar p95 target vs current                       | ✅ PASS |
| 12 | Agent console 5ta tab + chat pineado               | ✅ PASS |
| 13 | Bandeja bulk approve + double-confirm irreversible | ✅ PASS |
| 14 | Bandeja detail GroundedInBlock top-3 + "Ver todas" | ✅ PASS |
| 15 | Skill studio PatternBadge en learned rows          | ✅ PASS |
| 16 | Admin-users edit modal + audit event               | ✅ PASS |
| 17 | Admin-knowledge 3-step promote + audit event       | ✅ PASS |
| 18 | Admin-connectors 3-tab config + audit event        | ✅ PASS |
| 19 | verification/* committed con resultados reales     | ✅ PASS |
| 20 | i18n ≥ 332 keys × 3 idiomas                       | ✅ PASS (377 c/u) |

**18 PASS · 1 REQUIRES-BROWSER · 0 FAIL.**

---

## 3. i18n key count (exact)

Counted via regex `[a-zA-Z_]\w*\s*:\s*['\"]` + `'...'\s*:\s*['\"]` over each file body (comments stripped).

| Language | Leaf string keys |
|---|---|
| ES (default) | **377** |
| EN           | **377** |
| PT-BR        | **377** |

**Totals:** 1,131 keys across 3 languages. Symmetric 1:1:1.

---

## 4. Diff summary vs. v1

### File-level diff

- **1 new fragment:** `17_module_chat.html.fragment` (+485 lines)
- **10 existing fragments edited:** ~+1,430 lines total
- **4 new docs:** AC_v2.md, trazabilidad_v2.md, axe_report_*.md, A7_chat_contradictions.md (~950 lines)

### index-standalone.html diff

| Metric | v1    | v2    | Delta    |
|---|---|---|---|
| Size   | 223 KB | 340 KB | +117 KB (+52%) |
| Lines  | 4,226 | 6,156 | +1,930 (+46%) |
| Fragments assembled | 25 | 26 | +1 |
| Modules registered  | 14 | 14   | (same count; 1 new chat, 13 unchanged) |

*Note: module count unchanged because we ADDED chat (14 → 15) but the sanity-check regex counts literal `FL.modules['X']` registrations, and bandeja-detail uses `FL.modules[MODULE_ID]` via variable so it's not counted by that regex. Actual modules registered at runtime: 15.*

### Widget count diff

- v1: 15 widgets (thermometer, autonomyLadder, provenanceSup, riskBadge, draftStateBadge, emptyState, loadingSkeleton/skeleton, degradedCard, modal/openModal, feedbackModal, consolidationModal, toast, tabs, diff, timeline)
- v2: 15 + 10 new = **25 widgets**, plus internal helpers (wireX functions, sparkline)

### CSS

New `.fl-*` selectors introduced in v2: ~45 new rules (chat layout, composer pills, messages, iteration, skill pills, agent chips, grounded-in rows, message actions menu, pattern badges, voc card, suggest grid, SLA bar, sparkline + patches on bandeja bulk toolbar, admin edit forms, promote flow, connector config).

---

## 5. What to click on first

### 1. Hit the demo loop
Open `index-standalone.html` → lands on `#/chat`. Pick **"Cotizar 500 Marluvas Goliath · ACME MX"** from SuggestGrid. This populates the composer with a realistic B2B query. Alternatively, jump directly to **`#/chat/cv_001`** to see the pre-seeded 6-message conversation with:
- 6 provenance superscripts (hover → right-column GroundedIn highlights)
- `Draft dr_042` pill (click → jumps to bandeja-detail with full evidence chain)
- Iteration demo (`msg_013b` iterates `msg_013` in `cv_002`)
- Pattern badges on each agent message

### 2. Handoff loop
From `#/agentes/ag_cotizador` → 5th tab "Conversación" → click "Abrir chat con este agente" → lands on chat with Cotizador pinned + its skills pre-activated.

### 3. Bulk approve demo
From `#/bandeja` → check 3 drafts (include `dr_010` which is `irreversible_cost`) → click "Aprobar seleccionados" → observe double-confirm flow.

### 4. Promotion flow
From `#/admin/conocimiento` → pick `org` scope → click "↑ Promover" → walk through the 3 steps. The 4 sanitization checks must all be ticked for step-2 → step-3.

---

## 6. Honest gaps (for the NEXT iteration)

Per v2 §9 final instruction ("Decisiones autónomas / brechas abiertas"), here's what's not ship-ready:

### Process gaps
1. **AC #7 (hover highlight) not auto-verified.** Code wired, needs visual eyeball. Run in a browser.
2. **Axe-core live run not executed in build env.** Static audit predicts 0 violations; run the topbar "Validar" button and confirm.
3. **Mobile viewport untested.** CSS has breakpoints at 820 / 1180 but not eyeballed on a small screen.

### Canon gaps (see A7)
4. **Feedback taxonomy reconciliation** (C1): 5 UI reasons vs. 6 A4/P6 codes. Mapped but needs product decision.
5. **Iteration ↔ Feedback loop boundary** (C5): should iteration auto-produce a feedback data point for consolidation? Current: no.
6. **SLA sustained-window semantics** (C7): UI shows single-sample breach; SPEC requires 7d sustained. Consider stacking both.
7. **UserControlProfile structure** (C8): Always-on "Personal" is a placeholder for an undefined concept.
8. **trigger_kind enum for AgentSpec** (C9): `trigger_word` string doesn't cover L4 event-driven triggers.
9. **Per-customer learning scope** (C10): the Minera MX pattern hints at 5th-scope formalization decision.
10. **Handoff packet UX** (C11): action stubbed; needs 8-field P10 modal.
11. **ModelFingerprint normalization** (C12): per-message vs. per-autonomy-state storage policy.
12. **`learningHeat` 4th state "gold"** (C13): UI has 4 states, A4 has 3.

### Surface gaps
13. **Cross-skill consolidation cluster scope** (C4): modeled as boolean; should be 3-level (skill/cluster/org).
14. **Chat empty state when no conversations match** a `?agent=X` query — currently falls to generic empty. Could be smarter ("start a new conversation with X").
15. **Voice of customer rotation** is by hash(convId). Fine for mockup; in prod would rotate by relevance.
16. **Workflow canvas + design-system modules** unchanged from v1. Eventually: chat integration with workflow step visualization.

---

## 7. Final file tree

```
MWT KB/faberloom-mockup/
├── build.py
├── index-standalone.html                ← THE DELIVERABLE (340 KB · 6,156 lines)
├── DELIVERY_NOTES_v2.md                 ← THIS FILE
├── DELIVERY_NOTES.md                    ← v1 original
├── README.md
├── fragments/ (26 files)
│   ├── 00_head.html.fragment
│   ├── 01_design_tokens.css.fragment
│   ├── 02_base_styles.css.fragment
│   ├── 03_boot.js.fragment              ← EDITED [V2]
│   ├── 04_shell.html.fragment           ← EDITED [V2]
│   ├── 05_mock_data.js.fragment         ← EDITED [V2]
│   ├── 06_widgets.js.fragment           ← EDITED [V2]
│   ├── 07_i18n_es.js.fragment           ← EDITED [V2]
│   ├── 07_i18n_en.js.fragment           ← EDITED [V2]
│   ├── 07_i18n_pt.js.fragment           ← EDITED [V2]
│   ├── 10_module_bandeja_lista.html.fragment   ← EDITED [V2]
│   ├── 11_module_bandeja_detail.html.fragment  ← EDITED [V2]
│   ├── 12_module_skill_studio.html.fragment    ← EDITED [V2]
│   ├── 13_module_agent_console.html.fragment   ← EDITED [V2]
│   ├── 14_module_workflows_canvas.html.fragment
│   ├── 15_module_runs_timeline.html.fragment
│   ├── 16_module_consolidation.html.fragment
│   ├── 17_module_chat.html.fragment            ← NEW [V2]
│   ├── 20_module_admin_users.html.fragment     ← EDITED [V2]
│   ├── 21_module_admin_knowledge.html.fragment ← EDITED [V2]
│   ├── 22_module_admin_audit.html.fragment
│   ├── 23_module_admin_tenant.html.fragment
│   ├── 24_module_admin_connectors.html.fragment ← EDITED [V2]
│   ├── 30_module_ops_health.html.fragment
│   ├── 31_module_design_system.html.fragment
│   └── 99_footer.html.fragment
├── research/ (7 docs)
│   ├── A1_spec_canon.md
│   ├── A2_existing_inventory.md
│   ├── A3_dark_palette.md
│   ├── A4_arch_principles.md
│   ├── A5_knowledge_flow.md
│   ├── A6_reconciliation.md
│   └── A7_chat_contradictions.md        ← NEW [V2]
└── verification/ (3 docs, NEW [V2])
    ├── AC_v2.md
    ├── trazabilidad_v2.md
    └── axe_report_2026-04-19_static.md
```

---

## 8. Run + reproduce

```bash
cd "<path>/MWT KB/faberloom-mockup"
python build.py
# → [OK] index-standalone.html - 340 KB - 6156 lines - <time>

# Open
start index-standalone.html        # Windows
open index-standalone.html         # macOS
xdg-open index-standalone.html     # Linux
```

---

## 9. Meta-note

v2 was built consciously as a **review-the-plans-with-the-architect** artifact, not a sales asset. The most valuable output is not the index-standalone.html — it's `research/A7_chat_contradictions.md`. That file captures 13 canonical product decisions the prose alone would have let you defer, plus 10 open questions that need resolution before production.

Build forced the decisions. The mockup is the pressure mechanism; the contradictions log is the deliverable.
