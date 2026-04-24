# Handoff a Cowork · FaberLoom mockup + decisiones arquitectónicas

**Fecha:** 2026-04-19
**De:** Álvaro (CEO Muito Work) + Claude (sesiones de iteración)
**Para:** Cowork (responsable de curación de la KB)
**Status del trabajo:** v3.5 entregado (461 KB · 7,935 líneas · 27 fragments) · PR #1 abierto en `sjoalfaro/mwt-knowledge-hub`

---

## 1. Contexto que necesitás antes de leer el resto

**FaberLoom** es la plataforma B2B SaaS de agentes que Muito Work está construyendo para LATAM (calzado seguridad — design partners Marluvas BR + Tecmater). SPEC en DRAFT v1.0, beta wedge 2026-04-20 → 2026-06-14, gate APPROVED bloqueado por validación de los 3 design partners.

**Tu rol (Cowork):** Sos el responsable de la curación de la KB canónica que vive en `C:\Users\alvar\OneDrive\Documentos\Claude\Projects\MWT KB\docs\` (entities ENT_*, policies POL_*, schemas SCH_*, indexes IDX_*, specs SPEC_*, principios ARCH_*).

**El problema que esto resuelve para vos:** En las últimas N sesiones se construyó un mockup HTML standalone como **herramienta de review arquitectónico** (no como producto). Ese ejercicio surfacéo decisiones, contradicciones, y gaps que la prosa de los SPECs no había forzado a definir. Algunas de esas decisiones ya son canon → deberían vivir en `docs/`. Otras siguen abiertas → deberían entrar a tu pendientes-de-CEO. Este doc te dice cuáles son cuáles.

---

## 2. El mockup en una página

**Ubicación:** `MWT KB/faberloom-mockup/`
**Entregable principal:** `index-standalone.html` (461 KB, doble clic para abrir, file:// compatible, sin server)
**Build:** `python build.py` concatena 27 fragments en `fragments/` → output

**Trayectoria de versiones:**
| Versión | Tamaño | Líneas | Hito principal |
|---|---|---|---|
| v1 | 223 KB | 4,226 | Scaffold inicial · 14 módulos básicos · A1-A6 research |
| v2 | 340 KB | 6,156 | Módulo chat · 25 widgets · 17 mock collections · A7 contradicciones |
| v3 | 421 KB | 7,338 | Bandeja polimórfica (12 kinds) · AI assist · chat-as-primitive · approval chains · LGPD compliance · 8/8 brechas críticas B1 cerradas |
| **v3.5** | **461 KB** | **7,935** | **Agent lifecycle UX completo** (create/edit/clone/pause/retire/version/rollback) — cierra B1 gap #5 al 100% |

**Cobertura funcional actual:**
- 15 módulos ruteados · 32 widgets · 30 mock collections · i18n ES/EN/PT (407+ keys cada uno simétrico) · light + dark mode WCAG AA
- 11 V2-PATCH + 44 V3-PATCH + 11 V3.5-PATCH = 66 anotaciones de cambio trackeable

**AC cumulativo verificado:** 94 PASS · 1 REQUIRES-BROWSER · 0 FAIL

---

## 3. Artefactos producidos · paths exactos

### 3.1 Investigación (research/)

Estos son los docs que destilaron canon de los SPECs y construyeron el sistema de auditoría. **Algunos de estos deberían migrar a la KB canónica con minor edits** (ver §5).

| Path | Propósito | Status para KB |
|---|---|---|
| `research/A1_spec_canon.md` | Extracción canónica de SPEC_FABERLOOM_ARCHITECTURE_v1_BLUEPRINT (3 objetos, state machine, 20 tablas FROZEN, RLS vars, audit verbs, severity, etc.) | **Mantener en research** (es síntesis, no canon nuevo) |
| `research/A2_existing_inventory.md` | Inventario del código ESM previo a fragments (qué reutilizar/qué tirar) | Archivable post-v3.5 |
| `research/A3_dark_palette.md` | Paleta dark mode con cálculos WCAG AA verificados (luminance math) | **Promover a KB**: tokens definitivos, no son mockup-specific |
| `research/A4_arch_principles.md` | Extracción de `ARCH_AGENT_PRINCIPLES.md` (P0-P13, autonomy ladder L0-L4, state machine, gold sample pipeline, `tone/data/structure/policy/scope/context` codes) | **Mantener en research** (síntesis del canon ya existente) |
| `research/A5_knowledge_flow.md` | Extracción de `SPEC_USER_ADMIN_KNOWLEDGE_FLOW_v1_BETA.md` (4 scopes, business_entity_id metadata NO 5to scope, permissions matrix, break-glass, leakage tests) | **Mantener en research** |
| `research/A6_reconciliation.md` | Reconciliación prompt vs. SPEC vs. canon — D1 a D15 decisiones para el mockup | **Promover D1-D15 selectivamente a KB** (ver §5) |
| `research/A7_chat_contradictions.md` | Log vivo de contradicciones surfacedas al construir UI. **17 entries (C1-C17)** + 21 open questions | **CRÍTICO para vos** — son las decisiones pendientes que necesitan resolución antes de cerrar SPECs |
| `research/B0_AUDIT_METHODOLOGY.md` | Framework de auditoría (Service Design + UX Architecture + AI Interaction Design) con toolkit B0-B5 | **Promover a KB** como `POL_AUDITORIA_UX.md` o similar — es proceso operativo |
| `research/B1_SERVICE_BLUEPRINT.md` | Service blueprint de 14 módulos × 4 capas + 12 inbound types + ecology map de 11 sistemas externos + catálogo consolidado de 23 gaps | **Promover el ecology map a KB** (`ENT_PLAT_BOUNDARIES.md`) — el resto queda como research |

### 3.2 Fragments (fragments/)

27 archivos que `build.py` concatena. No relevantes para la KB excepto como evidencia de implementación. Si Cowork necesita ver cómo se renderiza algún concepto específico, leer el fragment correspondiente.

### 3.3 Verification (verification/)

| Path | Propósito |
|---|---|
| `verification/AC_v2.md` | 20 AC v2, 18 PASS · 1 REQUIRES-BROWSER · 0 FAIL |
| `verification/trazabilidad_v2.md` | 60-row matrix de gaps cerrados v2 |
| `verification/axe_report_2026-04-19_static.md` | WCAG 2.1 AA static audit (0 violations esperadas) |
| `verification/AC_v3.md` | 48 AC v3, 48/48 PASS |
| `verification/trazabilidad_v3.md` | Trazabilidad de las 8 brechas críticas B1 + 13/17 open questions de A7 |
| `verification/AC_v3_5.md` | 28 AC v3.5 (agent lifecycle), 28/28 PASS |

### 3.4 Delivery notes

`DELIVERY_NOTES.md` (v1) · `DELIVERY_NOTES_v2.md` · `DELIVERY_NOTES_v3.md` · `DELIVERY_NOTES_v3_5.md` — cada uno documenta el diff vs versión anterior, AC summary, demo path.

---

## 4. Lo que el mockup CONFIRMÓ del canon existente

Antes de listar lo que cambia, lo que se VALIDÓ que ya está bien en la KB y NO necesita tocarse:

| Concepto | Doc canónico | Status |
|---|---|---|
| 4 scopes knowledge (global/org/dept/user) | `SPEC_USER_ADMIN_KNOWLEDGE_FLOW_v1_BETA.md` §2.1 | ✅ Confirmado |
| `business_entity_id` como metadata no 5to scope | mismo §2.2 | ✅ Confirmado · pivote trigger ≥20-25% sigue válido |
| Roles owner/admin/operator + matrix de permisos | mismo §6 | ✅ Confirmado · usable en UI tal cual |
| Break-glass 8h MFA `support_impersonation` | mismo §1.10 | ✅ Confirmado |
| TTL learned overlay 90d (rango 30-180) | mismo §7.1 | ✅ Confirmado |
| Leakage tests pytest gate CI | mismo §8 | ✅ Confirmado |
| 20 tablas FROZEN (S1=9, S2=7, S3=4) | `SPEC_FABERLOOM_ARCHITECTURE_v1_BLUEPRINT.md` §2 | ✅ Confirmado |
| RLS session vars (`SET LOCAL app.tenant_id` etc) | mismo §1 | ✅ Confirmado |
| Autonomy Ladder L0-L4 con thresholds globales | `ARCH_AGENT_PRINCIPLES.md` P4 | ✅ Confirmado |
| 3 objetos canónicos (Spec/Runtime/Memory) P1 | mismo P1 | ✅ Confirmado |
| State machine `drafting → awaiting_approval → approved → executing → completed` + branches | mismo P7 | ✅ Confirmado |
| Draft-first absoluto P3 | mismo P3 | ✅ Confirmado |
| Feedback codes: tone/data/structure/policy/scope/context | mismo P6 | ✅ Confirmado (con caveat C1) |
| Thermometer 🔵 Frío 0-2 / 🟡 Tibio 3-5 / 🔴 Caliente 6+ | mismo | ✅ Confirmado |
| Gold sample pipeline Candidate→revisión→eval→Activo→Archived/Reverted | mismo P5 | ✅ Confirmado |

**Conclusión:** la KB canónica está sólida en sus fundamentos. Lo que sigue son las cosas que NECESITAN actualizarse o crearse.

---

## 5. Decisiones que TOMÉ en el mockup y deberían reflejarse en la KB canónica

Estas son cosas que el mockup implementó como decisión y que, si las validás como producto, deberían entrar a la KB. Cada item identifica el doc canónico target.

### 5.1 Promover a `docs/` directamente (decisiones cerradas)

| # | Decisión del mockup | Target en KB | Acción |
|---|---|---|---|
| D1 | **Bandeja unificada polimórfica** con 12 item kinds (drafts + 11 inbound: inbound_email, inbound_msg, crm_event, alert, approval_request, escalation, feedback_reply, sla_timer, webhook, audit_alert, task) | NUEVO: `SPEC_BANDEJA_UNIFIED.md` o sección en `SPEC_FABERLOOM_ARCHITECTURE_v1_BLUEPRINT.md` | **CREAR** spec de la bandeja con los 12 kinds + per-kind action set + saved-views URL pattern |
| D2 | **Chat como primitiva, no destino** — `W.chatThread` reusable en 4 contextos (standalone + bandeja-detail + skill-studio sandbox + agent-console debug) | `SPEC_FABERLOOM_ARCHITECTURE_v1_BLUEPRINT.md` §UX o NUEVO `SPEC_CHAT_PRIMITIVE.md` | **CREAR** sección sobre el rol de chat como primitiva conversacional reusable |
| D3 | **Action-risk registry** con 6 fields (action_id, reversibility ∈ reversible_24h\|reversible_cost\|irreversible\|irreversible_cost, side_effects[], min_autonomy L0-L4, required_role, audit_class ∈ commercial\|financial\|operational\|policy\|meta) | NUEVO: `SCH_ACTION_RISK.md` schema | **CREAR** schema FROZEN del registry con 18 acciones canónicas (ya están en mock como referencia) |
| D4 | **Provenance chain** `claim_id → evidence_span_id → source (sourceVersion, line, retrievalRunId)` para drafts generados por agentes | NUEVO: `SCH_PROVENANCE.md` schema | **CREAR** schema con field types + relation con ModelFingerprint (P13) |
| D5 | **Multi-output bundle approval** — 1 aprobación → N actions atómicas con aggregate risk = max(reversibility) | Sección en `ARCH_AGENT_PRINCIPLES.md` (extender P3 draft-first) | **EDITAR** P3 para clarificar que un draft puede invocar múltiples acciones bundle |
| D6 | **Approval chains entre usuarios** — Bruno → Ana → Álvaro con states `pending/approved/waiting_previous` + comments thread + escalation timeouts | Extender `SPEC_USER_ADMIN_KNOWLEDGE_FLOW_v1_BETA.md` §6 (permissions matrix + multi-step approval) | **EDITAR** §6 para añadir approval chain pattern |
| D7 | **AgentSpec lifecycle UX** — create/edit/clone/pause/resume/retire + versioning + soft-delete (per A5 §7) + audit verbs `agent_spec.created\|published\|paused\|resumed\|retired` | `ARCH_AGENT_PRINCIPLES.md` P1 + `SPEC_FABERLOOM_ARCHITECTURE_v1_BLUEPRINT.md` §audit_event enum | **EDITAR** P1 para añadir lifecycle states + verificar que audit_event enum incluye los 5 verbs |
| D8 | **LGPD/LFPDPPP/Ley 1581/Ley 29733 data portability** — user-level "Mis datos" download (.json) + tenant-level export (manual + scheduled monthly) + retention 30d default + audit `user.data_exported` y `tenant.exported` | NUEVO: `POL_DATA_PORTABILITY_LATAM.md` policy | **CREAR** policy que documente: quién puede pedir, qué incluye, formato, frecuencia, retention, audit verbs |
| D9 | **Dark mode tokens WCAG AA verificados** — paper-under-lamp atmosphere (warm-dark, no slate) con 30+ tokens calculados | `ENT_MARCA_IDENTIDAD.md` o NUEVO `ENT_DESIGN_SYSTEM_TOKENS.md` | **CREAR** o **EXTENDER** entity con la paleta dark verificada (tomar de `research/A3_dark_palette.md` §4 CSS block) |
| D10 | **Bandeja saved-views URL pattern** `?view=triage\|approve\|mine\|team\|attention\|all` con sort default por urgencia | Sección en spec de bandeja (D1) | Incluir en D1 |

### 5.2 Updates menores a docs existentes

| # | Doc canónico | Edit |
|---|---|---|
| U1 | `ARCH_AGENT_PRINCIPLES.md` P1 (3 objetos) | Añadir mención de **AgentSpec versioning** + lifecycle states (`shadow\|active\|paused\|retired`) + `triggerKind` enum (`word\|event\|schedule`) — el mockup demostró que `trigger_word` solo es insuficiente para L4 agentes event-driven |
| U2 | `ARCH_AGENT_PRINCIPLES.md` P11 (3-destination classifier) | Añadir nota sobre **iteration auto-feedback policy** (C5): cuando un user iteró un agent message, ¿debería contarse automáticamente como feedback data point hacia consolidation? Mockup propone: sí (default checked, toggleable) |
| U3 | `ARCH_AGENT_PRINCIPLES.md` P12 (cross-skill propagation) | Definir explícitamente los 3 niveles de scope: `skill / cluster / org` — hoy P12 dice "Org-wide / Cluster / Skill-specific" pero "cluster" no está definido (qué define un cluster) |
| U4 | `ARCH_AGENT_PRINCIPLES.md` P6 (feedback codes) | Añadir tabla de mapeo entre **5 razones UI** (claim_sin_evidencia / tono / dato_incorrecto / accion_riesgosa / otro) → **6 codes internos** (tone / data / structure / policy / scope / context) — el mockup mostró que coexistir crea ambigüedad si no hay mapping explícito (C1) |
| U5 | `SPEC_FABERLOOM_ARCHITECTURE_v1_BLUEPRINT.md` §8 (SLOs) | Clarificar **single-sample vs sustained-window semantics** del p95 retrieval breach (hoy SPEC dice "7 días sostenido" pero el UI tiende a mostrar single-sample como breach inmediato — C7) |
| U6 | `SPEC_USER_ADMIN_KNOWLEDGE_FLOW_v1_BETA.md` §6 (permissions matrix) | Añadir rows nuevas: "Crear agente" (Owner/Admin sí · Operator no), "Editar AgentSpec" (Owner/Admin sí · Operator no), "Pausar/Retirar agente" (Owner/Admin sí). Ver C17 |
| U7 | `SPEC_USER_ADMIN_KNOWLEDGE_FLOW_v1_BETA.md` §10.1 (regulaciones LATAM) | Añadir mecanismo de export user-level + tenant-level (ver D8) — hoy lista las 4 regulaciones pero no define el flow de cumplimiento |
| U8 | `SPEC_FABERLOOM_ARCHITECTURE_v1_BLUEPRINT.md` §12 (audit_event enum) | Verificar/añadir verbs nuevos: `agent_spec.paused`, `agent_spec.resumed`, `tenant.config_changed`, `tenant.exported`, `user.data_exported`, `connector.enabled`, `memory_chunk.promoted` |

### 5.3 Items que NO son canon pero deberían existir como referencia operacional

| # | Doc | Por qué |
|---|---|---|
| O1 | `POL_AUDITORIA_UX.md` | El framework de auditoría del mockup (B0_AUDIT_METHODOLOGY) define cómo se audita el producto desde la lente de usuario. Es proceso, no canon — pero ayuda al equipo a ejecutar consistente |
| O2 | `ENT_PLAT_BOUNDARIES.md` | El service ecology map de B1 §"Service ecology" — qué sistemas externos toca FaberLoom (Postmark, Drive, CRM, ERP, WhatsApp BSP, etc.) con qué nivel de integración |
| O3 | `SCH_AGENT_SPEC_VERSIONING.md` | Schema de cómo se versionan los AgentSpec (lineage via `supersedes_spec_id`, audit on publish, rollback es forward-only via new version) |

---

## 6. Open questions · 21 items que necesitan resolución del CEO/team

Estos están en `research/A7_chat_contradictions.md` — los resumo acá para que entren a tu pendientes-de-CEO. Cada uno tiene contexto en A7.

### Alta prioridad (bloquean canon)
1. **C1** · Feedback taxonomy reconciliation — UI 5 reasons vs A4 6 codes: ¿adoptar 5 o 6?
2. **C5** · Iteration auto-feedback policy — ¿iteration counts como feedback automáticamente?
3. **C7** · SLA breach window — ¿UI muestra single-sample o sustained-window?
4. **C9** · Trigger_kind enum en AgentSpec — ¿formalizar `word\|event\|schedule`?
5. **C14** · Multi-output bundle aggregate risk semantics — ¿`max(reversibility)` es correcto o necesita lógica más granular?
6. **C16** · Data portability mecanismo per user — confirmar formato JSON + retention + scope incluido
7. **C16** · Tenant export retention policy — ¿30d default es OK?
8. **C17** · Approval gate diferenciado para raise de `autonomyCeiling` vs otros AgentSpec edits

### Media prioridad (mejoran canon)
9. **C4** · Cluster scope definition — ¿qué define un "cluster" de skills?
10. **C8** · UserControlProfile structure — A5 lo menciona pero no define
11. **C10** · 5to scope pivote decision — esperar evidencia design partners
12. **C11** · Handoff packet UX standardization — los 8 fields P10 son canon pero UX pattern aún no
13. **C12** · ModelFingerprint normalization policy — per-message vs per-autonomy-state storage
14. **C13** · LearningHeat 4to estado "gold" — ¿formalizar en A4 o eliminar de UI?
15. **C15** · Multi-agent per thread support — futuro
16. **C15** · Chat primitive shared history standalone↔embed — sync bidirectional

### Baja prioridad (polish, no bloqueante)
17. **C17** · Diff visual entre 2 versiones del AgentSpec
18. **C17** · Sandbox test del AgentSpec antes de publish
19. **C17** · Auto-rollback on quality regression (P13 probation logic)
20. **C2** · "sealed" como UI-only kind del PatternBadge (no canon necesario)
21. **C6** · Synthetic IDs `cv_live_*` aceptable en mockup (no canon necesario)

---

## 7. Brechas de conocimiento detectadas en la KB existente

Cosas que mientras construía el mockup descubrí que **deberían existir en la KB pero no existen** (o existen incompletas):

1. **No hay schema FROZEN para `connector_account` con todos los kinds soportados.** SPEC menciona `connector_account` como tabla S3 pero no enumera los kinds (email/messaging/marketplace/marketplace_intel/kb_source/erp/calendar/identity_provider). Recomendación: crear `SCH_CONNECTOR_ACCOUNT.md` con enum de kinds + per-kind config schema.

2. **No hay catálogo canónico de events que disparan agentes.** El wizard de v3.5 tiene 11 events hardcoded (manual_trigger, rfq_received, lead_inbound, etc.) — esto debería ser una lista canónica con definición de cada event + payload schema. Recomendación: `SCH_AGENT_EVENTS.md`.

3. **No hay state machine canónica formalmente exportable.** A4 P7 muestra el ASCII state machine pero no hay SCH formal. Recomendación: `SCH_DRAFT_STATE_MACHINE.md` con los 10 states + transitions table + reversibility rules.

4. **`overlay_policy` table existe en SPEC §2 pero no tiene schema definido.** Esto es central para el skill 3-layer. Recomendación: `SCH_OVERLAY_POLICY.md` con structure manual_overlay + learned_overlay + sealed_base relations.

5. **No hay POL definido para "qué eventos LIVE se broadcast al user en bandeja vs solo al log".** Hoy el mockup decide ad-hoc (sla_timer va a bandeja, agent_run.started solo al log). Recomendación: `POL_NOTIFICATION_ROUTING.md`.

6. **Falta documento de personas canónicas.** El mockup asume Bruno (operator), Ana (admin), Álvaro (owner) — esto es proxy razonable pero no hay `ENT_PERSONAS_OPERATIVAS.md` canon. Recomendación: crearlo con job-to-be-done por persona.

---

## 8. Cómo está estructurado el repo

```
MWT KB/                              ← repo root (sjoalfaro/mwt-knowledge-hub)
├── docs/                             ← TU territorio (canonical KB)
│   ├── ENT_*.md                       ← entities (master data)
│   ├── POL_*.md                       ← policies (rules)
│   ├── SCH_*.md                       ← schemas (data structures)
│   ├── IDX_*.md                       ← indexes (routers)
│   ├── ARCH_*.md                      ← architecture principles
│   ├── SPEC_*.md                      ← specifications
│   └── archivo/                       ← deprecated
├── audit/                            ← KB audit findings + scripts
├── reportes/                         ← reports
├── faberloom-mockup/                 ← MOCKUP territory (this work)
│   ├── index-standalone.html         ← deliverable
│   ├── build.py                      ← integrator
│   ├── fragments/                    ← 27 source fragments
│   ├── research/                     ← 9 docs (A1-A7 + B0-B1)
│   ├── verification/                 ← 6 docs (AC + traceability + axe)
│   ├── DELIVERY_NOTES_v3_5.md        ← latest delivery
│   └── HANDOFF_TO_COWORK.md          ← THIS FILE
└── PROMPT_*.md                       ← session prompts (no canónicos)
```

**Tu zona = `docs/`**. Mi zona (mockup) = `faberloom-mockup/`. Punto de intersección = lo que se promueve de research/* a docs/*.

---

## 9. Acciones sugeridas para vos · priorizado

### P0 · Esta semana (antes de la demo a design partners)

1. **Validar y promover D9** (dark palette) → crear/extender `ENT_DESIGN_SYSTEM_TOKENS.md` con tokens de A3. Bajo riesgo, alto valor visual.
2. **Validar y promover D7** (AgentSpec lifecycle) → editar `ARCH_AGENT_PRINCIPLES.md` P1 + verificar audit verbs en `SPEC_FABERLOOM_ARCHITECTURE_v1_BLUEPRINT.md` §12. Crítico para coherencia create-flow ↔ canon.
3. **Resolver C1** (feedback taxonomy 5 vs 6) → decisión de Álvaro + actualizar P6 + actualizar mockup wizard de feedback. Bloqueante de menor scope.

### P1 · Próximas 2 semanas (pre-corte beta 2026-06-14)

4. **Crear D1** (`SPEC_BANDEJA_UNIFIED.md` con 12 kinds) → la bandeja es central para Marluvas/Tecmater demo
5. **Crear D8** (`POL_DATA_PORTABILITY_LATAM.md`) → compliance LGPD es legal exposure no negociable
6. **Resolver C5, C7, C9, C16 retention** → cuatro decisiones cortas que cierran 4 contradicciones
7. **Editar U6** (permissions matrix con rows agent lifecycle) → coherencia operacional

### P2 · Post-validation con partners

8. **Resolver C10** (5to scope pivote) → solo después de medir 20-25% en primeros 3 partners
9. **Crear D2** (`SPEC_CHAT_PRIMITIVE.md`) → consolida la decisión chat-as-primitive
10. **Crear schemas faltantes** (`SCH_ACTION_RISK.md`, `SCH_PROVENANCE.md`, `SCH_CONNECTOR_ACCOUNT.md`, `SCH_AGENT_EVENTS.md`, `SCH_DRAFT_STATE_MACHINE.md`, `SCH_OVERLAY_POLICY.md`)

### P3 · Iteración continua

11. Resolver el resto de open questions (C4, C8, C11, C12, C13, C15) cuando haya señal real del producto
12. Mantener `research/A7` como log vivo — cada vez que el mockup expone una contradicción nueva, entra ahí; cada vez que se resuelve, se promueve a canon

---

## 10. Cómo seguir construyendo encima

Si en próximas sesiones se sigue iterando el mockup:

- **No tocar** docs canónicos desde el mockup. Toda decisión nueva entra primero a `research/A7` como contradicción, después se promueve a canon vía vos.
- **No re-litigar** decisiones marcadas como confirmadas en §4 de este doc.
- **Mantener V?-PATCH markers** en los fragments para trazar qué versión introdujo cada cambio.
- **Build siempre via `python build.py`** — no editar `index-standalone.html` directamente (se regenera).
- **Cada release nueva** debe incluir: nuevo `DELIVERY_NOTES_v?.md`, AC actualizado, traceability, y entrada en A7 si surfacéo contradicciones.

---

## 11. Bottom line para Cowork

El mockup como producto está al ~95% de su utilidad como **herramienta de review arquitectónico**. Cumple su misión: forzó decisiones, surfacéo contradicciones, expuso gaps en la KB.

Tu trabajo ahora:
- Promover ~10 decisiones claras (§5.1) a canon → eso queda listo para Marluvas/Tecmater demo del 2026-04-20
- Resolver ~8 open questions de alta prioridad (§6) con Álvaro → eso desbloquea SPEC APPROVED para corte 2026-06-14
- Crear ~6 schemas canónicos faltantes (§7) → eso cierra deuda técnica de la KB

El mockup queda vivo como artefacto de presión y verificación. Cada vez que se construya algo en producto real, se contrasta con el mockup y se actualiza A7 si hay drift.

---

## Quick links

- **Mockup:** `MWT KB/faberloom-mockup/index-standalone.html`
- **Decisiones tomadas:** `MWT KB/faberloom-mockup/research/A6_reconciliation.md`
- **Decisiones pendientes:** `MWT KB/faberloom-mockup/research/A7_chat_contradictions.md`
- **Service blueprint:** `MWT KB/faberloom-mockup/research/B1_SERVICE_BLUEPRINT.md`
- **PR:** https://github.com/sjoalfaro/mwt-knowledge-hub/pull/1
- **AC trazabilidad:** `MWT KB/faberloom-mockup/verification/`
