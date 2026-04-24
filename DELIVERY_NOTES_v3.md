# FaberLoom v1 Beta · Standalone Mockup **v3** — Delivery notes

**Date:** 2026-04-19
**Output:** `index-standalone.html` (**421 KB · 7,338 lines · 26 fragments · 44 V3-PATCH markers**)
**Predecessors:** v1 (223 KB / 4,226 lines), v2 (340 KB / 6,156 lines)
**Open with:** double-click (file://) — no server, no build tooling.
**Default route:** `#/chat`

---

## 1. What changed vs. v2

### Surfaced 9 architectural changes documented in research/A7 + B1

This release closes the 8 critical gaps from `B1_SERVICE_BLUEPRINT.md` and integrates 13 of the 17 open questions from `A7_chat_contradictions.md`.

### Edited fragments (10, all marked `[V3-PATCH 2026-04-19]`)

| Fragment | Patches |
|---|---|
| `05_mock_data.js.fragment` | +6 collections: `inboxItems`(12 items × 11 kinds), `comments`(4), `actionBundles`(2), `approvalChains`(1), `attachments`(4), `handoffPackets`(1) |
| `06_widgets.js.fragment` | +6 widgets: `aiAssistToolbar`+wire · `aiAssistChat`+wire · `chatThread`+wire · extended IterationComposer (autofb checkbox), SLABar (sustained), FeedbackModal (code mapping), ConsolidationModal (3-level scope) |
| `07_i18n_es/en/pt.js.fragment` | +30 keys per language (states untriaged/assigned/etc, kind labels, view labels, col_kind/sender) |
| `10_module_bandeja_lista` | Polymorphic items (12 kinds) + saved-views URL pattern + per-kind icon/color/label + urgency dot + role-aware visibility |
| `11_module_bandeja_detail` | Polymorphic dispatch (draft vs inbox item) + AI assist Edit flow + Thread agente embed + Handoff packet modal + Comments thread + Approval chain viz + Action bundle viz |
| `12_module_skill_studio` | Sandbox section embedding chatThread primitive |
| `13_module_agent_console` | Ready-to-promote CTA per A4 thresholds + promote modal → emits approval_request to Owner inbox + trigger_kind chip + debug thread embed in Conversación tab |
| `14_module_workflows_canvas` | Run animation (sequential node highlight) + add-node from palette |
| `16_module_consolidation` | Active items → "↑ Promover a base" button → modal preview version bump + commit emits agent_spec.published audit |
| `20_module_admin_users` | "Mis datos · LGPD/LFPDPPP/Ley 1581/Ley 29733" section + JSON download + audit user.data_exported |
| `23_module_admin_tenant` | 6 sections converted to editable inputs + save per section emits audit + Test SMTP + Manual backup + Tenant export (manual + scheduled) |

---

## 2. Output diff

| Metric | v1 | v2 | v3 | Δ v2→v3 |
|---|---|---|---|---|
| `index-standalone.html` size | 223 KB | 340 KB | **421 KB** | +81 KB |
| Lines | 4,226 | 6,156 | **7,338** | +1,182 |
| Fragments processed | 25 | 26 | 26 | 0 |
| Widgets | 15 | 25 | **31** | +6 |
| Mock collections | 17 | 23 | **29** | +6 |
| V-PATCH markers | 0 | 36 (V2) | 44 (V3) + 36 (V2) = **80 total** | +44 V3 |
| i18n keys per language | 200 | 377 | 407 | +30 |

---

## 3. AC summary (48 binary checks across 9 blocks)

| Block | PASS | REQUIRES-BROWSER | FAIL |
|---|---|---|---|
| 1 · Bandeja polymorphic | 8/8 | 0 | 0 |
| 2 · AI assist toolbar+chat | 5/5 | 0 | 0 |
| 3 · Chat as primitive | 5/5 | 0 | 0 |
| 4 · Approval chains+bundles+comments | 5/5 | 0 | 0 |
| 5 · Onboarding L0→L1 | 4/4 | 0 | 0 |
| 6 · Workflows + Tenant editable | 6/6 | 0 | 0 |
| 7 · Promote-to-base loop | 4/4 | 0 | 0 |
| 8 · Data portability LGPD | 6/6 | 0 | 0 |
| 9 · Open questions surfacing | 5/5 | 0 | 0 |
| **Total v3** | **48/48** | 0 | 0 |

Detalle full en `verification/AC_v3.md`.

---

## 4. Trazabilidad cerrada vs deferred

- **🟢 cerradas:** 27 items (8/8 B1 críticas + 13/17 A7 open + 6 cross-cutting nuevos)
- **🟡 parciales:** 9 (B1 importantes que requieren más profundidad: workflows drag, runs drill-down, knowledge chunk edit, audit drill-down, connectors disconnect, ops drill-down)
- **🔴 deferred (v3.5+):** 4 items
  - C8 UserControlProfile structure (espera definición de spec sister doc)
  - C10 5th scope pivote (espera evidencia de design partners reales)
  - C12 ModelFingerprint normalization (decisión arquitectónica del team)
  - C15 multi-agent per thread (mejora futura post-validación)

Detalle full en `verification/trazabilidad_v3.md`.

---

## 5. What to click on first (demo path actualizado)

### Loop 1 · Bandeja polymorphic
1. Open `#/bandeja` — landing en saved-view "Atención"
2. Click tab "Triage" → ves 4-5 items entrantes (RFQ, WhatsApp, escalación, alert)
3. Click `in_e_001` (RFQ ACME Toluca) → polymorphic detail con preview + atachments + "Asignar a ag_cotizador" button
4. Click "Asignar" → te lleva a `#/chat/new?agent=ag_cotizador` con agente pineado

### Loop 2 · AI assist + handoff + chat embedded
1. Open `#/bandeja/dr_001` (demo-critical)
2. Click "✎ Editar" → AI toolbar embed bajo botones; click "Reformular" → propuesta visible
3. Click "/AI" en toolbar → mini-chat aparece
4. Click "💬 Thread agente" → chat thread primitive embed con agente del draft
5. Click "→ Handoff" → modal con 8 P10 fields + send

### Loop 3 · Approval chain + bundle visible
1. Open `#/bandeja/dr_010` (escalated, irreversible_cost)
2. Ves Approval chain (3 steps: Bruno ✓ / Ana pending / Álvaro waiting)
3. Ves Action bundle (3 actions atómicas: SAP order + email + CRM commit) marcado en rojo (irreversible)
4. Comments thread con discusión Bruno↔Ana visible

### Loop 4 · Onboarding L0→L1
1. Open `#/agentes/ag_followup` (L0 SHADOW)
2. Tab Resumen muestra "⏳ Onboarding en progreso · 8/3 runs · 0%/70%"
3. Open `#/agentes/ag_cotizador` (L1) — distinto, ya cumple, listo para L2
4. Click "Solicitar promoción a CEO" → modal evidencia → enviar
5. Open `#/bandeja?view=mine` (como Owner) → ves el approval_request nuevo

### Loop 5 · Promote-to-base loop cerrado
1. Open `#/consolidaciones`
2. Click en `cons_3` (Active, sk_cotizar) → "↑ Promover a base"
3. Modal muestra v1.0.3 → v1.0.4 + supersedes
4. Confirm → toast `agent_spec.published` + bump
5. Open `#/skills/sk_cotizar` → version updated

### Loop 6 · LGPD compliance
1. Open `#/admin/usuarios` → sección "📥 Mis datos" prominente
2. Click "Descargar mis datos (JSON)" → archivo descargado + audit emitido
3. Open `#/admin/tenant` (como owner) → sección "📦 Tenant export" abajo
4. Click "Generar export ahora" → archivo + audit
5. Open `#/admin/auditoria` → ver `user.data_exported` y `tenant.exported` en log

### Loop 7 · Workflows ejecutables
1. Open `#/workflows`
2. Click "▶ Ejecutar" → animación secuencial de 7 nodos coloreados
3. Click en palette item "trigger" → nuevo nodo agregado al canvas

### Loop 8 · Admin Tenant editable
1. Open `#/admin/tenant`
2. Cambiar "Identity mode" → click "Guardar" → toast + audit
3. Click "Probar conexión" en SMTP → simula latencia
4. Click "▶ Trigger backup manual" → simula 1.4s + audit `backup.triggered_manual`

---

## 6. Honest gaps (deferred a v3.5+)

| # | Item | Razón del deferral |
|---|---|---|
| 1 | Workflows drag-drop real | UX complex, basic add-node + animate ya entrega 70% del valor |
| 2 | Skill Studio editar manual overlay con commit | Necesita versioning UX dedicado |
| 3 | Runs Timeline drill-down a un run individual | Diagnóstico avanzado no es v1 demo-critical |
| 4 | Admin Knowledge editar chunk inline | Sanitization pipeline UX complex |
| 5 | Admin Connectors disconnect + send log per connector | Lifecycle de connector requiere más mock data |
| 6 | Ops Health drill-down container/SLO/job | Operacional, post-deploy real |
| 7 | C8 UserControlProfile structure | Spec sister doc no definido aún |
| 8 | C10 5th scope pivote | Evidencia de design partners pendiente |
| 9 | C12 ModelFingerprint normalization | Decisión storage policy del team |
| 10 | C15 multi-agent per thread | Mejora futura cuando haya tracción real |
| 11 | Postmark inbound real (vs mock) | Integración BSP real, no scope mockup |
| 12 | i18n a 500+ claves | 407 actual cubre +90% de strings; resto es polish |
| 13 | Mobile viewport tested | Breakpoints definidos pero no eyeballed en device real |

---

## 7. File tree v3

```
faberloom-mockup/
├── build.py
├── index-standalone.html               ← THE DELIVERABLE (421 KB · 7,338 lines)
├── DELIVERY_NOTES_v3.md                ← THIS FILE
├── DELIVERY_NOTES_v2.md
├── DELIVERY_NOTES.md                   ← v1
├── README.md
├── fragments/ (26 files, 10 edited V3)
│   ├── 03_boot.js.fragment             [V2]
│   ├── 04_shell.html.fragment          [V2]
│   ├── 05_mock_data.js.fragment        [V2 + V3]
│   ├── 06_widgets.js.fragment          [V2 + V3]
│   ├── 07_i18n_es.js.fragment          [V2 + V3]
│   ├── 07_i18n_en.js.fragment          [V2 + V3]
│   ├── 07_i18n_pt.js.fragment          [V2 + V3]
│   ├── 10_module_bandeja_lista         [V2 + V3]
│   ├── 11_module_bandeja_detail        [V2 + V3]
│   ├── 12_module_skill_studio          [V2 + V3]
│   ├── 13_module_agent_console         [V2 + V3]
│   ├── 14_module_workflows_canvas      [V3]
│   ├── 16_module_consolidation         [V3]
│   ├── 17_module_chat                  [V2]
│   ├── 20_module_admin_users           [V2 + V3]
│   ├── 21_module_admin_knowledge       [V2]
│   ├── 23_module_admin_tenant          [V3]
│   ├── 24_module_admin_connectors      [V2]
│   └── … (untouched: 00, 01, 02, 15, 22, 30, 31, 99)
├── research/ (8 docs)
│   ├── A1_spec_canon.md
│   ├── A2_existing_inventory.md
│   ├── A3_dark_palette.md
│   ├── A4_arch_principles.md
│   ├── A5_knowledge_flow.md
│   ├── A6_reconciliation.md
│   ├── A7_chat_contradictions.md
│   ├── B0_AUDIT_METHODOLOGY.md
│   └── B1_SERVICE_BLUEPRINT.md
└── verification/ (5 docs · 3 new V3)
    ├── AC_v2.md
    ├── trazabilidad_v2.md
    ├── axe_report_2026-04-19_static.md
    ├── AC_v3.md                        ← NEW
    └── trazabilidad_v3.md              ← NEW
```

---

## 8. Run + reproduce

```bash
cd "MWT KB/faberloom-mockup"
python build.py
# → [OK] index-standalone.html · 421 KB · 7338 lines

# Open
start index-standalone.html        # Windows
open index-standalone.html         # macOS

# Sanity check
python -c "import re; html=open('index-standalone.html',encoding='utf-8').read(); print('V3-PATCH markers:', html.count('[V3-PATCH'))"
```

---

## 9. Meta-note (continuing from v2)

v3 ejecuta el toolkit B0 completo: aplicó B1 service blueprint para identificar las 8 críticas, surfaceó las decisiones en A7, e implementó 13 de las 17 open questions. Los 4 deferred son legítimamente "esperan input externo" (partners reales, decisiones de team, sister specs no escritas).

El próximo ciclo natural es **B2 Persona Journeys** (Bruno/Ana/Álvaro × normal/excepción) — caminar los 6 journeys sobre v3 y capturar fricciones que solo aparecen al USAR. Mockup-as-pressure functioning as designed.
