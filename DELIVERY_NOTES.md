# FaberLoom v1 Beta · Standalone Mockup — Delivery notes

**Date:** 2026-04-19
**Output:** `index-standalone.html` (223 KB · 4,226 lines · 25 fragments)
**Open with:** double-click (file://) — no server, no build tooling.

---

## What was built

### Core infra
- `build.py` — zero-dependency Python concatenator. Run with `python build.py`.
- `fragments/` — 25 modular fragments that `build.py` glues into `index-standalone.html`.
- `research/` — 6 canonical research docs (A1 SPEC canon, A2 code inventory, A3 dark palette, A4 agent principles, A5 knowledge flow, A6 reconciliation). These document every decision made and every [NOT IN SPEC] gap surfaced.

### Base fragments (11)
1. `00_head.html.fragment` — meta, fonts (Google Fonts CDN), favicon, title
2. `01_design_tokens.css.fragment` — full light + dark token set (A3 WCAG AA verified)
3. `02_base_styles.css.fragment` — reset, typography classes, atoms (btn/card/chip/input)
4. `03_boot.js.fragment` — bus + store (localStorage + Map fallback) + i18n + theme + a11y + router with error boundary + session (tenant/role/break-glass)
5. `04_shell.html.fragment` — topbar (logo + 6 switchers + validate button + user) + sidebar (3 blocks) + main slot + live region + toast slot + overlay slot
6. `05_mock_data.js.fragment` — **17 collections** with usable fidelity (tenants, users, departments, businessEntities, agents, skills, drafts, runs, consolidations, feedbacks, auditEvents, actions, connectors, policies, jobs, alerts, tables)
7. `06_widgets.js.fragment` — **15 widgets** registered on `window.__faberloom.widgets`
8. `07_i18n_es.js.fragment` — ES default (~200 keys)
9. `07_i18n_en.js.fragment` — EN mirror
10. `07_i18n_pt.js.fragment` — PT-BR mirror
11. `99_footer.html.fragment` — closing tags

### Module fragments (14)
| Route | Module | Fragment |
|---|---|---|
| `#/bandeja` | bandeja-lista | `10_module_bandeja_lista.html.fragment` |
| `#/bandeja/:id` | **bandeja-detail** (demo-critical) | `11_module_bandeja_detail.html.fragment` |
| `#/skills/:id` | skill-studio | `12_module_skill_studio.html.fragment` |
| `#/agentes/:id` | agent-console | `13_module_agent_console.html.fragment` |
| `#/workflows` | workflows-canvas | `14_module_workflows_canvas.html.fragment` |
| `#/runs` | runs-timeline | `15_module_runs_timeline.html.fragment` |
| `#/consolidaciones` | consolidation | `16_module_consolidation.html.fragment` |
| `#/admin/usuarios` | admin-users | `20_module_admin_users.html.fragment` |
| `#/admin/conocimiento` | admin-knowledge | `21_module_admin_knowledge.html.fragment` |
| `#/admin/auditoria` | admin-audit | `22_module_admin_audit.html.fragment` |
| `#/admin/tenant` | admin-tenant | `23_module_admin_tenant.html.fragment` |
| `#/admin/conectores` | admin-connectors | `24_module_admin_connectors.html.fragment` |
| `#/ops/health` | ops-health | `30_module_ops_health.html.fragment` |
| `#/design` | design-system | `31_module_design_system.html.fragment` |

---

## Demo-critical path (`#/bandeja/dr_001`)

This is the route that boots by default. It demonstrates:

- **6 claims with full evidence chain** (`claim_id → evidence_span_id → source (sourceVersion, line, retrievalRunId)`)
- **4 tabs:** Content · Evidence · Risk · Trace
- **9-state draft badge** (current state: `awaiting_approval`)
- **Action-risk registry (6 fields)** surfaced in Risk tab: action_id, reversibility, side_effects, min_autonomy, required_role, audit_class
- **ModelFingerprint** (P13 canon from A4): provider, model_family, model_version, system_prompt_hash, tools_manifest_hash, policy_version, retrieval_index_version
- **7-step workflow trace** timeline
- **Provenance superscript cross-highlight:** hover a `[E1]..[E6]` superscript in the text → auto-jump to Evidence tab with matching claim highlighted
- **Double-confirmation for irreversible actions** (see `dr_010` escalated with `irreversible_cost`)
- **Feedback modal** with 5 typed reasons (claim_sin_evidencia, tono, dato_incorrecto, accion_riesgosa, otro)

---

## Canon reconciliation highlights (see research/A6)

Several concepts the original prompt treated as "decided in SPEC" are **not in `SPEC_FABERLOOM_ARCHITECTURE_v1_BLUEPRINT.md`**. A4 (ARCH_AGENT_PRINCIPLES) and A5 (USER_ADMIN_KNOWLEDGE_FLOW) fill the gaps. Key reconciliations:

- **Autonomy Ladder** — A4 provides L0 SHADOW / L1 PROPONE / L2 EJECUTA_INTERNO / L3 AUTO_NOTIFICA / L4 AUTO_EXCEPCIONES with verbatim global unlock thresholds. UI shows friendlier labels per user prompt.
- **Feedback taxonomy** — User prompt's 5 reasons stored alongside A4's 6 technical codes (`tone`, `data`, `structure`, `policy`, `scope`, `context`). Mock.feedbacks carries both.
- **Consolidation states** — A5 storage uses `candidate / active / archived / revoked`. UI renders "Reverted" label for `revoked` per user prompt.
- **Action-risk registry (6 fields)** — Not in any SPEC. User-prompt-authoritative. Schema documented in A6.
- **Provenance chain** — Not in any SPEC. User-prompt-authoritative. ModelFingerprint (A4 P13) surfaced as complementary pane.
- **TTL 90d (30-180 range)** — A5 verbatim confirmation.
- **Break-glass 8h MFA** — A5 verbatim confirmation (`support_impersonation` permission).

---

## How to open

```
# from anywhere
python build.py   # inside faberloom-mockup/

# then
open index-standalone.html                 # macOS
start index-standalone.html                # Windows
# or just double-click the file in Explorer/Finder
```

Try these routes:
- `#/bandeja/dr_001` — demo-critical (default on first load)
- `#/skills/sk_cotizar` — 3-column skill studio, thermometer at 🔴 hot → Consolidate button active
- `#/agentes/ag_cotizador` — autonomy ladder at L1 with unlock criterion
- `#/workflows` — SVG canvas with 7 nodes (trigger → retrieve → llm → validator → hitl → action)
- `#/design` — full widget + token showcase
- `#/admin/auditoria` — 64 audit events, filters, CSV export
- `#/ops/health` — containers (11 staging / 4 dev), SLOs, jobs, 20 FROZEN tables, RLS debug

Top-bar interactions:
- **Lang switch ES/EN/PT** — live re-render of shell chrome + module content
- **Theme toggle ☾/☀** — paper-under-lamp dark (A3 palette)
- **Role switch owner/admin/operator** — hides Gestión group when `operator`
- **View-state dropdown** — emits `view-state:change` event; modules that subscribe re-render accordingly
- **Validate button** — loads axe-core via CDN on demand; runs WCAG 2.1 A+AA audit on current route

Keyboard:
- `⌘K` / `Ctrl+K` — launcher stub (toast for now)
- `Esc` — closes open modals

---

## What's NOT fully done (vs original §12 30 AC)

Honest gap list for the next iteration:

1. **AC verification not systematically run.** Sanity checks pass (balanced tags, 25 fragments assembled, 14 modules registered, 15 widgets, slots present, default route set). The 30 binary AC in §12 were not individually checked.
2. **Trazabilidad matriz (60 rows §14)** — not run. A6 documents the reconciliation but no 60-row green report.
3. **Axe-core output not captured in a file.** The topbar button runs it on demand but results are shown via toast + `console.table`, not saved as `verification_report.md`.
4. **Bulk-approve UI** in bandeja-lista is not wired (per-row view only).
5. **Admin modules intentionally minimal** — they show the right structure but not every interaction is functional (e.g., admin-users "Editar" is a stub; admin-knowledge promote button is visible but doesn't route through a sanitization flow).
6. **Mock fidelity is moderate** — 14 drafts (prompt asked for "14+"), 54 runs (prompt asked for "50+"), 64 audit events (prompt asked for "60+"), 18 actions (prompt asked for "18"). Good on counts; less narrative depth per item than the maximal spec.
7. **`research/` docs were written by me after chat-paste from sub-agents** — because the sub-agent sandbox blocked writes to `MWT KB`. Next iteration should grant sub-agent write access, which would let them update their own research inline and free my main context for more module depth.
8. **i18n keys ≈ 200 per language** (prompt target: 332+). Core shell/widgets/states/risks/autonomy/feedback covered symmetrically; more per-module i18n keys can be added later — the `data-i18n` attributes in modules mostly fall back to Spanish strings for now.

---

## File tree

```
faberloom-mockup/
├── build.py
├── index-standalone.html          ← THE DELIVERABLE
├── DELIVERY_NOTES.md              ← THIS FILE
├── research/
│   ├── A1_spec_canon.md
│   ├── A2_existing_inventory.md
│   ├── A3_dark_palette.md
│   ├── A4_arch_principles.md
│   ├── A5_knowledge_flow.md
│   └── A6_reconciliation.md
├── fragments/                     ← 25 source fragments
│   ├── 00_head.html.fragment
│   ├── 01_design_tokens.css.fragment
│   ├── 02_base_styles.css.fragment
│   ├── 03_boot.js.fragment
│   ├── 04_shell.html.fragment
│   ├── 05_mock_data.js.fragment
│   ├── 06_widgets.js.fragment
│   ├── 07_i18n_es.js.fragment
│   ├── 07_i18n_en.js.fragment
│   ├── 07_i18n_pt.js.fragment
│   ├── 10_module_bandeja_lista.html.fragment
│   ├── 11_module_bandeja_detail.html.fragment
│   ├── 12_module_skill_studio.html.fragment
│   ├── 13_module_agent_console.html.fragment
│   ├── 14_module_workflows_canvas.html.fragment
│   ├── 15_module_runs_timeline.html.fragment
│   ├── 16_module_consolidation.html.fragment
│   ├── 20_module_admin_users.html.fragment
│   ├── 21_module_admin_knowledge.html.fragment
│   ├── 22_module_admin_audit.html.fragment
│   ├── 23_module_admin_tenant.html.fragment
│   ├── 24_module_admin_connectors.html.fragment
│   ├── 30_module_ops_health.html.fragment
│   ├── 31_module_design_system.html.fragment
│   └── 99_footer.html.fragment
├── (existing ESM code left untouched — can be retired or kept for reference)
├── core/
├── data/
├── i18n/
├── modules/
├── widgets/
├── index.html
├── design-system.html
└── README.md
```

---

## Next iteration (if you want to extend)

Priority order for next session:

1. **Grant sub-agent write access to `MWT KB`** via your settings or sandbox config. Unblocks parallel module/mock extension.
2. **Run the 30 AC checklist** against the HTML (many are testable via axe-core + manual inspection; a few are DOM-query verifiable).
3. **Extend mock data** to maximal spec: 14 drafts with rich bodies, 60+ audit events with real diffs, 18+ actions with full 6-field completeness, richer consolidation scenarios.
4. **Wire bulk approve** in bandeja-lista.
5. **i18n coverage to 332+ keys** symmetrically across ES/EN/PT.
6. **Add admin-knowledge break-glass flow** with MFA modal + 8h countdown visible.
7. **Capture axe-core results to a file** via a "Validate + export" flow.
8. **Produce trazabilidad matrix report** (60 rows green/yellow/red).
