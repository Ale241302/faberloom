# A2 — Existing Code Inventory (salvage triage)

**Folder:** `C:\Users\alvar\OneDrive\Documentos\Claude\Projects\MWT KB\faberloom-mockup\`

**Bottom-line up front:** existing modular ESM code is **scaffolding-done, not scaffolding-needed**. ~3,600 LOC port-ready (A/B health). Gap is breadth (8 missing admin/ops modules, 9 missing mock collections, 4 missing widgets), NOT depth — the hard parts (provenance linkage, 3-layer skill, autonomy ladder, consolidation modal) are already solid.

---

## 1. File inventory

| file | LOC | purpose | health |
|---|---|---|---|
| `README.md` | 195 | Project doc: stack, routes, contract, bus/store APIs, mock overview | **A** — port verbatim |
| `index.html` | 127 | ESM entrypoint: no-flash theme bootstrap, splash, skip-link, `#fl-root`, `#fl-live` | **A** — keep |
| `index-standalone.html` | 1,482 | Previous monolithic base | **C** — superseded; visual reference only |
| `design-system.html` | 453 | Tokens, typography, widget previews light/dark | **B** — port, extend for 15 widgets |
| `core/boot.js` | 250 | Bus + versioned localStorage + i18n + theme + a11y + router with error boundary | **A** — port verbatim |
| `core/shell.js` | 291 | Topbar + sidebar + main slot + axe-core | **B** — extend nav for admin routes |
| `core/tokens.css` | 289 | Light + dark tokens, reset, typography classes, `.btn` `.card` `.chip` | **A** — port verbatim |
| `data/mock.js` | 359 | 1 workspace, 7 agents, 1 full skill, 7 drafts, 1 consolidation | **B** — keep schema, extend to 17 collections |
| `i18n/es.js` | 137 | ES dict, ~22 top-level namespaces | **B** — port, extend |
| `i18n/en.js` | 108 | EN mirror | **B** |
| `i18n/pt-BR.js` | 108 | PT-BR mirror | **B** |
| `modules/bandeja-detail.js` | 357 | Draft detail 4 tabs (evidence/provenance/risk/trace) | **A** — demo-critical |
| `modules/skill-studio.js` | 315 | 3-layer skill + thermometer + consolidation | **A** |
| `modules/agent-console.js` | 286 | 4 tabs (summary KPIs + ladder / skills / memory / logs) | **A** |
| `modules/workflows.js` | 240 | SVG canvas, 7 nodes, 6 edges, palette + inspector + minimap | **B** |
| `widgets/widgets.js` | 339 | 11 widget functions + modal infra | **A** |

---

## 2. Widgets present vs 15 required

| widget | present? | file:line | port verdict |
|---|---|---|---|
| Thermometer | yes | `widgets.js:8-22` | **A** |
| AutonomyLadder | yes | `widgets.js:25-49` | **A** |
| ProvenanceSupport | yes | `widgets.js:65-67` | **A** |
| RiskBadge | yes | `widgets.js:52-62` | **A** |
| DraftStateBadge | **no** | — | **net-new** (~30 LOC, mirrors riskBadge) |
| EmptyState | yes | `widgets.js:70-78` | **A** |
| LoadingSkeleton | yes | `widgets.js:81-93` | **A** |
| DegradedCard | yes | `boot.js:203-220` | **B** — move into widgets.js |
| Modal | yes | `widgets.js:104-128` | **A** |
| FeedbackModal | yes | `widgets.js:131-162` | **A** (5 reasons match spec) |
| ConsolidationModal | yes | `widgets.js:165-215` | **A** |
| Toast | **no** | — | **net-new** (~40 LOC, bus-driven) |
| Tabs | partial | inline per-module | **B** — extract factory |
| Diff | **no** | — | **net-new** |
| Timeline | partial | inline `bandeja-detail.js:188-204` | **B** — extract+generalize |

**Score: 11/15 present, 4 missing/weak.**

---

## 3. Modules present vs 14 required

| module | present? | file:line | coverage % |
|---|---|---|---|
| bandeja-lista | **no** | — | 0% |
| bandeja-detail | yes | `modules/bandeja-detail.js:1-357` | ~95% |
| skill-studio | yes | `modules/skill-studio.js:1-315` | ~90% |
| agent-console | yes | `modules/agent-console.js:1-286` | ~85% |
| workflows-canvas | yes | `modules/workflows.js:1-240` | ~70% |
| runs-timeline | partial | `bandeja-detail.js:188-204` (renderTrace) | ~25% |
| consolidation | yes (modal) | `widgets.js:165-215` | ~80% |
| admin-users | **no** | — | 0% |
| admin-knowledge | **no** | — | 0% |
| admin-audit | **no** | — | 0% |
| admin-tenant | **no** | — | 0% |
| admin-connectors | **no** | — | 0% |
| ops-health | **no** | — | 0% |
| design-system | yes | `design-system.html:1-453` | ~60% |

**Score: 6/14 meaningfully present, 8 missing. `bandeja-lista` is the biggest gap since routes jump straight into detail.**

---

## 4. Mock data coverage vs 17 collections

| collection | present? | rows | gap notes |
|---|---|---|---|
| tenants | partial | 1 | `workspace` constant; no multi-tenant shape |
| users | **no** | 0 | — |
| departments | **no** | 0 | — |
| businessEntities | **no** | 0 | strings only in drafts |
| agents | yes | 7 | full KPI/autonomy/thermometer shape |
| skills | partial | 1 | only `sk_cotizar` fully shaped |
| drafts | yes | 7 | `dr_001` rich + 6 stubs |
| runs | **no** (fabricated) | 0 | inline in `agent-console.js:207-224` |
| consolidations | yes | 1 | hot for sk_cotizar |
| feedbacks | **no** | 0 | — |
| auditEvents | **no** | 0 | — |
| actions | partial | — | in `workflowTrace` only |
| connectors | **no** | 0 | — |
| policies | partial | — | string only |
| jobs | **no** | 0 | — |
| alerts | **no** | 0 | — |
| tables | **no** | 0 | — |

**Score: 3/17 usable, 5/17 partial, 9/17 missing.**

Extras: `adminAutonomyEvidence` (`mock.js:337-359`) — approval curve + correction distribution for `ag_cotizador`. Worth keeping for admin views.

---

## 5. i18n inventory

**Top-level namespaces (identical in all 3 files, 15 each):** `app, nav, topbar, state, status, autonomy, bandeja, agent, skill, workflow, feedback, consolidation, empty, error, a11y`.

- `es.js` ~130 keys · `en.js` ~128 · `pt-BR.js` ~128.

**Sample mismatches (12):**
1. `autonomy.L3.name` — ES `Auto+notif`, EN `Auto+notify`, PT `Auto+notif`. Inconsistent EN.
2. `skill.learned.cold/warm/hot` values carry emoji `🔵 Frío` but widget calls expect plain labels.
3. `nav.factory` — present but no route registered → dead key.
4. No keys exist for missing modules: `admin.*`, `ops.*`, `connectors.*`, `dashboard.*`.

**Bottom line:** Tight mirrors. Extend symmetrically for new modules.

---

## 6. Design tokens check

| category | coverage | gaps |
|---|---|---|
| brand | full | complete |
| surfaces | full | 5 levels (canvas/surface/subtle/sunken/overlay) |
| text | full | primary/secondary/muted/inverse/evidence |
| borders | full | default/strong/focus + widths |
| semantic — status | full | success/warning/danger/info/neutral + `*-soft` |
| semantic — draft state | **missing** | no DRAFT/VIGENTE/STUB/DONE tokens |
| semantic — risk | partial | reuses status tokens; no `--risk-critical` distinct |
| semantic — autonomy | **missing** | no L0-L4 color tokens |
| typography | full | 11 `t-*` utility classes |
| spacing | full | 12-step scale 4-96px |
| radii | full | sm/md/lg/xl/pill |
| shadows | full | sm/md/lg/overlay |
| motion | full | 2 easings + 3 durations + reduced-motion override |
| z-index | **missing** | inline values scattered |
| node colors | full | 6 workflow node types |

**Dark block:** `tokens.css:86-128`. Good quality; paritarian; contrast visually tuned. Only risk: `--text-evidence #E89090` close to `--status-danger #E07061` in dark. → **A3 palette supersedes this block.**

---

## 7. PORT LIST — salvage verbatim

1. **`core/tokens.css` lines 1-128** → `01_design_tokens.css.fragment` (swap dark block with A3).
2. **`core/boot.js` lines 7-201** (bus + store + i18n + theme + a11y + router) → `03_boot.js.fragment` verbatim.
3. **`widgets/widgets.js` lines 8-215** (11 widgets + modal infra) → `06_widgets.js.fragment` verbatim; extract `renderDegradedCard` from boot.js:203-220.
4. **`modules/bandeja-detail.js` lines 1-357** → `11_module_bandeja_detail.html.fragment` — demo-critical; provenance↔evidence linkage (lines 218-229) is crown jewel.
5. **`data/mock.js` lines 172-222** (`dr_001` schema) → `05_mock_data.js.fragment` — canonical schema template.
6. **`data/mock.js` lines 120-170** (`skills.sk_cotizar` 3-layer) → keep schema.
7. **`modules/skill-studio.js` lines 97-205** (3 render functions for base/manual/learned) → `12_module_skill_studio.html.fragment`.
8. **`modules/agent-console.js` lines 74-131** (`renderSummary`) → `13_module_agent_console.html.fragment`.
9. **`modules/workflows.js` lines 15-33** (nodes+edges) + **87-113** (SVG bezier) → `14_module_workflows_canvas.html.fragment`.
10. **`i18n/*.js`** all three → `07_i18n_*.js.fragment`, extend symmetrically.

---

## 8. REWRITE LIST

- `index-standalone.html` (1,482 LOC) — superseded.
- `agent-console.js:196-229` (fabricated run rows) → replace with real `runs` mock.
- `agent-console.js:113-117, 159-175` (hardcoded activity/memory strings) → move into mock.
- `bandeja-detail.js:234` (`alert('Draft aprobado')`) → replace with toast widget.
- `skill-studio.js:111` — duplicate `class` attribute (HTML invalid).
- `shell.js:74-81` — `factory` route dead; remove from i18n or add stub.
- `design-system.html:60-96` — re-inlines widgets; rewrite to import from widgets.js.

---

## 9. Bottom line

The existing code is a **strong starting point, not a rewrite candidate**. Core scaffolding (tokens, bus, store, router, i18n, a11y) is production-shaped. 3 fully-built modules + widget library = ~40% of target spec, with hardest parts (provenance linkage, 3-layer skill, autonomy ladder, consolidation modal) already solid. Gap is breadth: 8 new admin/ops modules, ~14 mock collections, 4 new widgets, symmetric i18n extension — all bolt onto existing contract cleanly. **Port modular tree verbatim → fragment form, discard `index-standalone.html`, treat as scaffolding-done.**
