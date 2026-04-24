# FaberLoom v1 Beta · Standalone Mockup **v3.5** — Delivery notes

**Date:** 2026-04-19 (post v3)
**Output:** `index-standalone.html` (**461 KB · 7,935 lines · 27 fragments · 11 V3.5-PATCH markers**)
**Predecessors:** v1 (223 KB), v2 (340 KB), v3 (421 KB)
**Default route:** `#/chat`
**Open with:** double-click

---

## What v3.5 adds

**Single focused topic:** agent lifecycle UX — closes B1 gap #5 fully (la génesis del agente que faltaba) y agrega C17 al log de contradicciones.

### New fragment

- `19_module_agent_list.html.fragment` (~190 LOC) — lista de agentes con CTA Crear + filtros tier/status + lifecycle dropdown por row

### Edited fragments (all marked `[V3.5-PATCH 2026-04-19]`)

| Fragment | Patch |
|---|---|
| `03_boot.js.fragment` | route `/agentes` apunta a `agent-list` (era `agent-console` redirect) |
| `04_shell.html.fragment` | nav link "Agentes" apunta a `#/agentes` (era `#/agentes/ag_cotizador`) |
| `05_mock_data.js.fragment` | +`agentSpecVersions` collection (6 entries) + IIFE enriqueciendo los 7 agentes existentes con 12 fields nuevos (specVersion, autonomyCeiling, escalationPolicy, kbRefs, connectorBindings, events, stateMachine, learningConsolidation, triggerKind, specSupersedes, createdAt, lifecycleStatus) |
| `06_widgets.js.fragment` | +`W.openAgentSpecWizard` (5-step modal, mode: create/edit/clone) + estilos `aspw-*` |
| `07_i18n_es/en/pt.js.fragment` | +`agents.*` (7 keys lifecycle) + `agent.tab_versioning` |
| `13_module_agent_console.html.fragment` | header con lifecycle controls (Editar/Clonar/Pausar/Reactivar/Retirar) + 6ta tab "Versionado" + handler para rollback |

### Updated docs

- `research/A7_chat_contradictions.md` → +C17 entry (agent lifecycle) + open questions 18-21
- `verification/AC_v3_5.md` (28 AC, 28 PASS) — nuevo

---

## Output diff

| Metric | v3 | v3.5 | Δ |
|---|---|---|---|
| Size | 421 KB | **461 KB** | +40 KB |
| Lines | 7,338 | **7,935** | +597 |
| Fragments | 26 | **27** | +1 (agent-list) |
| Modules registered | 14 | **15** | +1 (agent-list) |
| Widgets | 31 | **32** | +1 (openAgentSpecWizard) |
| Mock collections | 29 | **30** | +1 (agentSpecVersions) |
| V-PATCH markers (cumulative V2+V3+V3.5) | 80 | **91** | +11 V3.5 |

---

## How an agent is now created and managed (the demo path)

### Crear agente nuevo
1. Open `#/agentes` → lista con 7 agentes existentes + filtros + sparklines
2. Click "+ Crear agente" (visible solo si role=owner/admin)
3. Wizard 5 pasos:
   - **Paso 1 · Identidad:** name, description, triggerWord, triggerKind (word/event/schedule), tier, businessEntityScope
   - **Paso 2 · Skills:** seleccionar de los 12 disponibles
   - **Paso 3 · KB + Connectors:** memory sources + connectors permitidos
   - **Paso 4 · State machine + Events:** template + event triggers
   - **Paso 5 · Guardrails:** autonomyCeiling, escalationPolicy, learningConsolidation + summary preview
4. Confirmar → agente nuevo en L0 SHADOW + audit `agent_spec.created` + `agentSpecVersions` entry v1.0.0

### Editar AgentSpec
1. Open `#/agentes/ag_cotizador`
2. Click "✎ Editar Spec" (header, admin/owner only)
3. Wizard prefilled `mode='edit'`
4. Save → bump version (v1.0.3 → v1.0.4) + supersedes anterior + audit `agent_spec.published`
5. Tab Versionado refleja la nueva entry con changeNote

### Clonar agente
1. Botón "⎘ Clonar" en console o "⎘" en lista
2. Wizard prefilled con `(copia)` añadido al name
3. Save → nuevo agente independiente con su propio agentSpecVersions

### Pausar / Reactivar / Retirar
- Botones header en console o dropdown ⋯ en lista
- Pause: status `paused`, no nuevos drafts, audit
- Resume: status `active`, audit
- Retire: confirm + status `retired` (NO delete — soft per A5 §7), audit `agent_spec.retired`

### Rollback de versión
1. Tab Versionado en console
2. Click "↩ Rollback" en versión anterior
3. Confirm → crea NUEVA versión clonando contenido de target (forward-only, no rebobina histórico — preserva audit trail completo)

---

## AC summary

**28/28 PASS** vía static inspection (`verification/AC_v3_5.md`).

**Cumulative v2+v3+v3.5: 94/96 (94 PASS · 1 REQUIRES-BROWSER · 0 FAIL · 1 carry-over).**

---

## What's deferred to v4

| # | Item | Razón |
|---|---|---|
| 1 | Diff visual entre 2 versiones del AgentSpec | Versionado muestra changeNote textual; diff campo-por-campo necesita widget Diff extendido |
| 2 | Approval gate diferenciado para raise de `autonomyCeiling` vs otros edits | Actualmente cualquier admin/owner publica; CEO gate específico para autonomy raise sería v3.6 |
| 3 | Sandbox test del AgentSpec antes de publish | Skill Studio ya tiene sandbox skill-level; agent-level analog pendiente |
| 4 | Auto-rollback on quality regression post-publish (P13 probation) | Logic backend, no UI todavía |
| 5 | Audit log filter para `agent_spec.*` events específico | Admin Audit existente ya filtra por action; refinement bajo prioridad |

---

## Final file tree

```
faberloom-mockup/
├── build.py
├── index-standalone.html               ← 461 KB · 7,935 lines
├── DELIVERY_NOTES_v3_5.md              ← THIS
├── DELIVERY_NOTES_v3.md
├── DELIVERY_NOTES_v2.md
├── DELIVERY_NOTES.md                   ← v1
├── README.md
├── fragments/ (27, +1 new in v3.5)
│   ├── 03_boot                         [V2 + V3 + V3.5]
│   ├── 04_shell                        [V2 + V3.5]
│   ├── 05_mock_data                    [V2 + V3 + V3.5]
│   ├── 06_widgets                      [V2 + V3 + V3.5]
│   ├── 07_i18n_es/en/pt                [V2 + V3 + V3.5]
│   ├── 10-17 modules                   [V2 + V3]
│   ├── 19_module_agent_list            ← NEW [V3.5]
│   ├── 20-31 modules                   [V2 + V3]
│   └── … (untouched: 00, 01, 02, 99)
├── research/ (9 docs)
│   ├── A1..A7 (A7 extended with C17 in V3.5)
│   ├── B0_AUDIT_METHODOLOGY.md
│   └── B1_SERVICE_BLUEPRINT.md
└── verification/ (6 docs · 1 new V3.5)
    ├── AC_v2.md
    ├── trazabilidad_v2.md
    ├── axe_report_2026-04-19_static.md
    ├── AC_v3.md
    ├── trazabilidad_v3.md
    └── AC_v3_5.md                      ← NEW
```

---

## Bottom line v3.5

El producto ahora muestra el **ciclo completo del agente**: crear → SHADOW → evidencia → promote L1 → operate → edit → version → eventually retire. Sin ese loop visible, FaberLoom era "usar 7 agentes pre-built". Con el loop visible, FaberLoom es **una plataforma donde cada org construye sus agentes desde 0 con evidencia** (P4).

Próximo ciclo natural: **B2 Persona Journeys** — caminar el flow create-agent end-to-end como Bruno (que NO debería poder), Ana (admin que SÍ puede), Álvaro (owner que aprueba promote a L1+) y capturar fricciones.
