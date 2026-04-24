# B1 — Service Blueprint v1

**Date:** 2026-04-19
**Status:** living document · update with each module change
**Purpose:** Map every touchpoint of FaberLoom across 4 layers (Frontstage · Backstage · Supporting · User actions) so we can SEE where the experience has gaps before we build them.

This is the **first** of the B-series (service-design audits). Pairs with:
- B2 — Persona journey maps (3 personas × 2 days each)
- B3 — Heuristic audit (Nielsen 10 + 5 AI-specific)
- B4 — Edge case matrix (per demo-critical flow)
- B5 — Cross-concern audits (i18n, audit trail, role permission, keyboard a11y, error recovery, telemetry)

---

## Method

### Layer model

Service blueprint = matrix of all touchpoints across 4 horizontal layers, organized by user-facing surface:

| Layer | What it captures | Example for "approve a draft" |
|---|---|---|
| **Frontstage** | What the user sees / touches | Approve button, draft body, evidence chip |
| **Backstage** | What the agent / system does internally | LLM compose call, retrieval, validator pass |
| **Supporting** | Infra that sustains | DB write `draft_decision`, audit_event append, RLS check, queue post-send |
| **User actions** | What the user actually decides | Approve / Reject / Edit / Send to other agent / Snooze |

### How to read this doc

For each module:
1. **Job-to-be-done (JTBD)** — what is the user really hiring this module for?
2. **Frontstage / Backstage / Supporting / User actions** — what's there now, what's canonical
3. **Gap call-out** — what the JTBD demands but the mockup doesn't deliver yet

At the end:
- Cross-cutting flow maps (3 demo-critical end-to-end)
- 12 inbound item types × where they land
- Service ecology map (intersections with external systems)
- Surfaced gaps catalog (consolidates what the blueprint reveals)

---

## Module blueprints

### 1. Bandeja (`#/bandeja` + `#/bandeja/:id`)

**JTBD:** *"Decime qué necesita mi atención hoy y dejame cerrarlo eficientemente."*

NOT "list of drafts to approve". Bandeja is the operator's daily command center.

**Frontstage**
- Lista filtrable por estado / agente / cuenta
- Per row: agente, asunto, state badge, risk badge, recipient, age
- Detail con 4 tabs (Content · Evidence · Risk · Trace)
- GroundedInBlock top-3 (v2 add)
- Bulk approve toolbar sticky (v2 add)

**Backstage**
- Filter logic on `FL.mock.drafts`
- DraftStateBadge / RiskBadge derivation per item
- Provenance superscript ↔ evidence cross-highlight
- Bulk approve bus.emit `drafts:bulk-approve`

**Supporting**
- `FL.mock.drafts` (14 entries seeded)
- `FL.mock.actions` (registry de 18 acciones con 6 campos)
- `FL.mock.agents` (lookup nombre)
- Audit_event append on approve (canonical, NOT wired in mock)
- Outbox post-send queue (canonical, NOT wired)

**User actions available (today)**
- Filter
- View detail
- Approve / Reject / Edit (stub) / Feedback / Consolidate (jump)
- Bulk approve (with double-confirm if irreversible)

**User actions canonical but missing**
- Triage of inbound (assign to agent, snooze, archive)
- Edit-with-AI (toolbar inline + mini-chat embed) — see C14 in A7
- Handoff to another agent (P10 packet)
- Multi-output bundle approval (1 approve → N actions)
- Approval chain to second user (Bruno → Ana)
- Comments / @mentions thread per draft
- Attachments (inbound + auto-generated + user-uploaded)
- Snooze with reminder

**🔴 GAP** — Bandeja today is **outbox-only**. The JTBD demands inbox+outbox unified with 12 item types (not just drafts). See "Cross-cutting" §C below.

---

### 2. Bandeja Detail (`#/bandeja/:id`)

**JTBD:** *"Que entienda qué propone el agente, en qué se basa, qué riesgo tiene, y que pueda decir sí/no/cambiar sin abrir 3 tabs."*

**Frontstage**
- Header: agente, state badge, risk badge, business entity
- Envelope con recipient + subject (tipo email)
- 4 tabs: Content (con `[E1]..[En]` superscripts) · Evidence (claims con evidence chain) · Risk (6-field action-risk + ModelFingerprint) · Trace (workflow timeline)
- GroundedInBlock top-3 + "Ver Evidencia" jump (v2)
- Footer actions: Approve / Edit / Reject / Feedback / Consolidate

**Backstage**
- Claim-to-evidence cross-highlight (mouseenter / focus / click)
- Tab state machine (W.wireTabs)
- Approve flow: simple-confirm o double-confirm si irreversible

**Supporting**
- `draft.claims[]` con evidenceSpans (provenance chain)
- `draft.action` (6-field registry lookup)
- `draft.workflowTrace[]` (7-step canonical)
- `draft.modelFingerprint` (P13 canonical)

**User actions canonical but missing**
- Edit con AI assist toolbar (Reformular / Acortar / Formalizar / Traducir / Fact-check / Compliance check)
- Mini-chat embed para "/AI lo que querés"
- Handoff structured packet a otro agente
- Comments thread visible y respondible inline
- Attachments panel (drag-drop, generated PDFs)
- "Send to verifier" sub-action sin commit final
- Diff view vs versión anterior si fue editado

**🔴 GAP** — El draft es un objeto editable, hoy es solo aprobable. La promesa del producto incluye iteración asistida; el módulo no la entrega.

---

### 3. Chat (`#/chat` + `#/chat/:id` + `#/chat/new?agent=X`)

**JTBD:** *"Dame un canvas conversacional donde puedo arrancar trabajo nuevo, ver lo que el agente está pensando, y entregar drafts a la bandeja."*

**Frontstage**
- 3 columnas (Always-on + Agents + Skills · Conversation · Grounded-in + SLA + Handoffs)
- SuggestGrid 2x2 en empty state
- Messages con provenance superscripts + PatternBadge + MessageActionsMenu (8 actions)
- IterationComposer embedded bajo message cuando "Iterate"
- ChatComposer al pie con pills activas

**Backstage**
- Skill toggle / Agent pin → state mutation + re-render
- Provenance ↔ GroundedIn cross-highlight
- queueAgentReply (500ms simulated)
- Iteration creates new message con `iterationOf`

**Supporting**
- `FL.mock.conversations` (8 seeded)
- `FL.mock.messages` (~45 seeded incluyendo 1 iteration)
- `FL.mock.availableAgents` / `availableSkillsForChat`
- `FL.mock.knowledgeHeatSamples` (para GroundedIn matching)
- `FL.mock.voiceOfCustomerSamples`

**User actions available (today)**
- Send message → fake response
- Pick suggest → populate composer
- Toggle skill / pin agent
- Iterate any agent message
- 8 menu actions per agent message
- Open draft from pill

**User actions canonical but missing**
- Real LLM integration (today: simulated reply)
- Handoff to another agent **with packet structure** (P10 fields visible)
- Voice input
- File upload as part of message
- Save message as gold sample directly
- Branch conversation (fork)
- Search past conversations
- Pin / archive conversation

**🟡 PARCIAL** — Chat es la primitiva más madura del v2 pero la integración LLM es simulada. Backstage real falta.

---

### 4. Skill Studio (`#/skills/:id`)

**JTBD:** *"Quiero ver de qué está hecho un skill, qué aprendió, y decidir si promuevo o reverto patterns sin miedo."*

**Frontstage**
- 3 columnas: Base sellada · Manual overlay · Learned overlay
- Thermometer header + Consolidate button (active si hot)
- Pattern badges en cada row (sealed / learned / gold)
- Gold samples section
- TTL display (90d default)

**Backstage**
- Skill data fetch
- Consolidation modal trigger si thermometer hot
- Manual overlay edit (stub)

**Supporting**
- `FL.mock.skills.sk_X` (3 seeded full)
- `agent_spec_base` / `agent_spec_overlay_manual` / `agent_spec_overlay_learned` canonical

**User actions canonical but missing**
- Editar manual overlay realmente (hoy: stub button)
- Diff con versión anterior del base
- Test del skill ANTES de promover (sandbox)
- Rollback de un overlay aprobado
- Ver historial de cambios del skill (versioning view)
- Share skill con otra org (planificado v1.5)

**🟡 PARCIAL** — Lectura completa, escritura mínima. El JTBD demanda edición confiable.

---

### 5. Agent Console (`#/agentes/:id`)

**JTBD:** *"Quiero entender cómo se está comportando un agente, si está listo para subir de nivel, y poder hablarle directamente."*

**Frontstage**
- Header: nombre + thermometer + estado + tier
- 5 tabs: Resumen (KPIs + Autonomy ladder + unlock criterion) · Conversación (v2 add) · Skills · Memoria · Logs
- AutonomyLadder L0-L4 con criterio textual visible

**Backstage**
- KPI derivation
- Sparkline render
- "Abrir chat con agente" → `#/chat/new?agent=X` con pin

**Supporting**
- `FL.mock.agents` (7 seeded)
- `FL.mock.runs` (54 seeded)
- AgentRuntime canonical (estado actual, métricas, cola termómetro)

**User actions canonical but missing**
- Ver evidencia detallada de cada KPI (drill-down)
- Comparar dos agentes lado a lado
- Pause agent / Activate agent toggle
- Force-degrade agent autonomy (CEO override)
- Schedule agent maintenance window
- Ver dependencias del agente (skills / KB / connectors)

**🟢 OK** — Cumple el JTBD lectura. Falta capa "operate the agent" (pause, force-degrade, schedule).

---

### 6. Workflows Canvas (`#/workflows`)

**JTBD:** *"Quiero ver cómo se conectan trigger → retrieve → llm → validator → hitl → action en un agente para entender o auditar el flow."*

**Frontstage**
- Canvas SVG con 7 nodos del cotizador
- Palette izquierda con 7 tipos
- Inspector derecha
- Botón Ejecutar (toast simulado)

**Backstage**
- Nodes/edges hardcoded
- Click selecciona

**Supporting**
- Inline en módulo (no es mock data colección)

**🔴 GAP IMPORTANTE** — Hoy es read-only de UN flow demo. El JTBD demanda:
- Editar nodos (drag-drop)
- Crear flow nuevo desde plantilla
- Ver flow EJECUTÁNDOSE en vivo (heatmap de qué nodo está activo ahora)
- Versionar flows
- Asociar flow a un agente desde acá

Es el módulo más alejado de su JTBD. Tier "demo prop", no "tool real" en v1 beta.

---

### 7. Runs Timeline (`#/runs`)

**JTBD:** *"Quiero ver el historial de ejecuciones de los agentes para diagnosticar problemas o auditar performance."*

**Frontstage**
- Tabla de 54 runs con paginación (20/página)
- Filter por agente
- Columnas: id · agent · started · state · tokens · cost

**Backstage / Supporting**
- `FL.mock.runs`
- AgentRun canonical (append-only)

**User actions canonical but missing**
- Drill-down en una run (ver el trace completo del workflow ejecutado)
- Filter por rango de fechas
- Filter por estado / fallo
- Re-run desde acá
- Export CSV
- Ver tokens / cost agregado por agente / día

**🟡 PARCIAL** — Lista plana sin profundidad. JTBD demanda diagnóstico, hoy es solo listado.

---

### 8. Consolidation (`#/consolidaciones`)

**JTBD:** *"Quiero gobernar qué patterns aprendidos se promueven a base, cuáles archivamos, cuáles revertimos — sin que el sistema haga eso solo."*

**Frontstage**
- Kanban 4 columnas: Candidate · Active · Archived · Reverted
- Tarjetas con skill / suggested rule / pattern count
- Botón Aprobar en candidates abre ConsolidationModal

**Backstage**
- Filter por status
- Modal display via W.openConsolidationModal

**Supporting**
- `FL.mock.consolidations` (5 seeded cubriendo los 4 estados)

**User actions canonical but missing**
- Drag entre columnas (UX kanban natural)
- Diff visual antes/después de cada candidate
- Comments / discusión por consolidation
- Bulk operations (aprobar 3 candidates similares juntos)
- Schedule consolidation review (recurring)
- Ver cuál fue el último Reverted y por qué

**🟢 OK** — Cumple lectura + acción simple. Faltan UX-affordances de kanban real.

---

### 9. Admin · Users (`#/admin/usuarios`)

**JTBD:** *"Como admin/owner, quiero gestionar quién puede hacer qué, dar break-glass cuando hace falta, y revertir si algo sale mal."*

**Frontstage**
- Tabla users con role / dept / last active
- Botón Editar abre modal con role/dept/BE/bg/scope (v2)
- Break-glass button
- Audit event auto-emite en cambios (v2)

**User actions canonical but missing**
- Invitar nuevo usuario (button existe, flow no)
- Suspender / reactivar
- Ver historial de cambios de un usuario
- Bulk ops (asignar dept a 5 users)
- View permissions effective (cuál es el conjunto real de permisos de Bruno hoy)
- Delegate temporary permission (`can_approve_promotion` 7d a Ana)

**🟡 PARCIAL** — Edit funciona, lifecycle no.

---

### 10. Admin · Knowledge (`#/admin/conocimiento`)

**JTBD:** *"Quiero ver qué conoce el sistema en cada scope, promover/revertir chunks con confianza, y entender qué está vivo en retrieval."*

**Frontstage**
- Tree de 4 scopes (global / org / dept / user)
- Lista de chunks por scope
- Botón Promote abre flow 3-step (preview / sanitize / confirm) (v2)

**Backstage**
- 3-step state machine
- Audit event auto-emite al promover

**User actions canonical but missing**
- Editar contenido de un chunk (controlado, con sanitization)
- Ver supersedes_chunk_id chain (genealogía)
- Search across chunks
- Filter por classification (public / partner_b2b / internal / ceo_only)
- Bulk supersede (rotar versión de 10 chunks juntos)
- Ver qué chunks están en retrieval vs revoked
- Test retrieval con un query (ver qué chunks salen y en qué orden)

**🟡 PARCIAL** — Lectura por scope OK, write/promote OK, falta operate-the-knowledge layer.

---

### 11. Admin · Audit (`#/admin/auditoria`)

**JTBD:** *"Quiero responder rápido '¿quién hizo qué cuándo?', exportar para auditor externo, y detectar patrones anómalos."*

**Frontstage**
- Tabla 64 events con filter (sev, actor, action contains)
- Paginación 20/página
- Export CSV (blob download)

**User actions canonical but missing**
- Filter por rango de fechas
- Filter por target ID
- Drill-down: ver beforeState / afterState diff
- Subscribe a alertas (notify si POLICY event ocurre)
- Schedule export recurrente
- Anomaly highlight (3 break-glass en 1 día = sospechoso)

**🟡 PARCIAL** — Filter básico + export. Falta análisis.

---

### 12. Admin · Tenant (`#/admin/tenant`)

**JTBD:** *"Como owner, quiero configurar identidad SSO, retención, branding, feature flags, SMTP, backup — sin perderme."*

**Frontstage**
- 6 secciones (identity / retention / branding / flags / SMTP / backup)
- Beta slice card

**User actions canonical but missing**
- Editar realmente cualquier sección (hoy: read-only display)
- Test SSO connection
- Branding preview en vivo
- Feature flag toggle (hoy: chip estático)
- Backup manual trigger
- Restore from snapshot

**🔴 GAP IMPORTANTE** — Display puro. Cero interacción real. Display-de-config no es admin-de-tenant.

---

### 13. Admin · Connectors (`#/admin/conectores`)

**JTBD:** *"Quiero conectar / desconectar servicios externos y verificar que están vivos."*

**Frontstage**
- Grid 5 connectors con status chip
- Filter all / connected / disconnected / planned
- Botón Configurar abre modal 3 tabs (creds / scope / test) (v2)

**User actions canonical but missing**
- Disconnect (revoke credentials)
- View send log per connector (para Postmark: emails enviados últimos 7d)
- Webhook setup (donde recibe eventos inbound)
- Rate-limit visibility
- Cost tracking per connector

**🟡 PARCIAL** — v2 dio config flow. Falta lifecycle + observability.

---

### 14. Ops Health (`#/ops/health`)

**JTBD:** *"Quiero un pulse-check en 30 segundos: ¿está todo vivo? ¿hay alertas? ¿falló algún job?"*

**Frontstage**
- 11 containers staging + 4 dev
- 3 SLOs (p95 / availability / error rate)
- 10 jobs últimos
- 3 alerts activas
- 20 tablas FROZEN
- RLS debug snippet

**User actions canonical but missing**
- Click container → logs
- Click SLO → 7d trend chart
- Click job → output / failure reason
- Acknowledge alert
- Trigger manual job run
- Force restart container

**🟡 PARCIAL** — Display rico, interacción cero. JTBD requiere acciones operacionales.

---

### 15. Design System (`#/design`)

**JTBD:** *"Como designer/dev, quiero ver todos los tokens y widgets en un lugar para diseñar consistente y debuggear."*

**Frontstage**
- Color tokens grid (18)
- Typography scale (7 styles)
- 15 widget showcase
- Demo buttons para Modal / Feedback / Consolidation / Toast

**Esto cumple bien.** No es módulo de producto, es herramienta interna. JTBD = referencia técnica.

---

## Cross-cutting flows (3 demo-critical)

### A · Cotización end-to-end

```
[Inbound RFQ email] → bandeja-triage*  → "Asignar a ag_cotizador"
                                       ↓
[Chat con ag_cotizador]   ←  pre-context (RFQ visible)
   ↓
[User completa contexto]  →  agent compose draft
   ↓
[Draft generado] → bandeja-detail (pendiente aprobación)
   ↓
[User revisa]:
  - Tab Content (claims con superscripts)
  - Tab Evidence (verificar fuentes)
  - Tab Risk (6 fields visibles)
  - Tab Trace (workflow steps)
   ↓
[Decisión]:
  - Approve simple → action ejecuta → Outbox → external send
  - Approve irreversible → double-confirm → ejecuta
  - Edit → (CANONICAL: AI-assist toolbar) → modify → re-validate → re-show
  - Reject → feedback modal con 5 razones → cierra loop
  - Handoff → ag_compliance → resultado vuelve como nuevo draft

* triage NO existe hoy. Email entra al CRM directo o queda en email del usuario.
```

**Touchpoints en cada paso**:

| Step | Frontstage | Backstage | Supporting | Gap |
|---|---|---|---|---|
| RFQ entrada | (no UI hoy) | (Postmark webhook) | inbox_message | NO modelado |
| Chat input | composer | LLM call | conversation row | OK (simulado) |
| Compose | message stream | LLM + retrieve | agent_run + traces | OK |
| Draft show | bandeja detail | render | drafts row | OK |
| Approve | btn Approve | bus event | draft_decision + outbox | parcial (no outbox real) |
| Send | (toast) | external API | connector_send_log | NO modelado realmente |

**Gap de flow**: 2 de 6 pasos no están modelados. La cadena se rompe en los extremos (entrada del RFQ y salida real).

---

### B · Consolidation triggered by feedback

```
[Bandeja-detail] User clicks Feedback
   ↓
[FeedbackModal] 5 razones → submit
   ↓
[Backend) feedback row + thermometer increment
   ↓
[Cuando termómetro = hot (6+ patterns)]
   ↓
[Skill Studio header] Consolidate button activates
   ↓
[ConsolidationModal] Aprobar / Rechazar / Diff
   ↓
[Decision]:
  - Aprobar → pattern → consolidations.candidate
  - Rechazar → archived
   ↓
[Consolidation kanban] Visible en /consolidaciones
   ↓
[Tenant Owner] Promueve candidate → active → integrado al base
   ↓
[Skill Studio refresh] Pattern visible en base layer (versionado)
```

**Touchpoints en cada paso**:

| Step | Frontstage | Backstage | Supporting | Gap |
|---|---|---|---|---|
| Feedback submit | modal radios + textarea | bus emit | feedback row | feedback collection mock OK |
| Thermometer increment | (no live update) | (no real counter) | thermometer field | NO live wiring |
| Skill consolidate btn | btn Consolidar | open modal | skill.temperature | OK |
| Modal review | learned/applies/impact | render | consolidation row | OK |
| Approve | btn confirm | bus emit | consolidations.status | OK static |
| Kanban view | columns | filter | consolidations rows | OK static |
| Promote to base | (no UX hoy) | (canonical) | agent_spec_base + supersedes | NO modelado |

**Gap de flow**: el "promote to base" después de Active es invisible. El loop nunca se cierra visualmente.

---

### C · Onboarding nuevo agente (L0 SHADOW → L1 PROPONE)

```
[Admin Users] Owner crea / asigna nuevo agente
   ↓
[Agent starts in L0 SHADOW]  → todos los skills arrancan SHADOW
   ↓
[Agent observes 10+ runs] → métricas acumulan
   ↓
[Agent Console summary] muestra:
  - Runs en L0
  - Approval rate
  - Edit-light rate
  - Días estables
   ↓
[Threshold met (≥3 runs + >70% approval, exception SHADOW→L1)]
   ↓
[Agent Console UI] Activa "Solicitar promoción a L1"
   ↓
[Owner notification] (canonical, NOT modeled in mock)
   ↓
[Owner approves] → Agent activates L1 PROPONE
   ↓
[Agent now drafts + queues for human approval]
```

**Touchpoints**:

| Step | Frontstage | Backstage | Supporting | Gap |
|---|---|---|---|---|
| Crear agent | (no UX hoy) | (canonical) | agent_spec | 🔴 NO existe creación de agente desde UI |
| L0 shadow runs | (sólo en agent-console summary) | run loop | agent_run | 🟡 metric pasivo, no badge "shadow mode" |
| Threshold cross | (no notification) | (canonical evaluator) | (no event) | 🔴 NO hay badge "ready to promote" |
| Owner notification | (no modelo de notificación) | (canonical) | inbox_message | 🔴 NO modelado |
| Owner approve | (no UX hoy) | (canonical) | agent_spec.published | 🔴 NO modelado |

**Gap de flow**: este flow está al 0% en la UI. Solo el resultado final (L1) es visible. El proceso de promoción es invisible.

---

## 12 inbound item types × where they should land

| # | Tipo | Origen | Should arrive at | Hoy en mockup |
|---|---|---|---|---|
| 1 | Draft de agente | agente | bandeja `/in?type=draft` | 🟢 modelado (14 drafts) |
| 2 | Email entrante | Postmark inbound | bandeja `/in?type=inbound_email` | 🔴 NO existe |
| 3 | WhatsApp entrante | BSP | bandeja `/in?type=inbound_msg` | 🔴 NO existe (BSP planificado) |
| 4 | CRM update | webhook | bandeja `/in?type=crm_event` | 🔴 NO existe |
| 5 | System alert | scheduler / monitor | bandeja `/in?type=alert` + ops/health | 🟡 ops/health solo |
| 6 | Approval request from user | other user | bandeja `/in?type=approval_req` | 🔴 NO existe |
| 7 | Escalation from agent | agente | bandeja `/in?type=escalation` | 🟡 state existe, no flow |
| 8 | Feedback response | other user | bandeja `/in?type=feedback_reply` | 🔴 NO existe |
| 9 | SLA / expiry timer | scheduler | bandeja `/in?type=timer` + reminder modal | 🔴 NO existe |
| 10 | External webhook event | external API | bandeja `/in?type=webhook` | 🔴 NO existe |
| 11 | Audit alert | audit_worker | bandeja `/in?type=audit_alert` (admin only) | 🔴 NO existe |
| 12 | Task assigned | other user / agent | bandeja `/in?type=task` | 🔴 NO existe |

**Score: 1.5 / 12 modelados.**

Esta es la fuente del gap más grande del producto. Vamos a tener que decidir, por cada tipo: ¿v1 beta? ¿v1.5? ¿no-scope-MVP?

---

## Service ecology map (límites del sistema)

Donde FaberLoom intersecta con sistemas externos:

| Sistema externo | Dirección | Estado del modelo | Riesgo |
|---|---|---|---|
| **Postmark SMTP** | OUT (envío de drafts aprobados) | 🟢 connector mock + `external_send` action | bajo |
| **Postmark inbound** | IN (capturar emails que llegan) | 🔴 NO modelado | **alto** — sin esto la bandeja queda half-system |
| **Google Drive / Notion** | IN (KB sources) | 🟢 connector mock | medio (cómo refresca? cómo detecta cambios?) |
| **Google Workspace / Entra ID** | IDP | 🟡 mencionado en admin/tenant | medio (no hay flow real de SSO config) |
| **WhatsApp BSP** | IN+OUT | 🔴 connector planificado, no modelado | medio |
| **CRM (HubSpot/SF)** | IN+OUT | 🔴 NO modelado | alto si las cotizaciones tocan CRM |
| **ERP / SAP** | OUT (create_order_sap) | 🟡 action en registry, no flow | alto (irreversible_cost) |
| **Slack** | OUT (post_slack action) | 🟡 action en registry, no flow | bajo |
| **Calendar (Google/MS)** | OUT (agendar follow-ups) | 🔴 NO modelado | medio |
| **Webhook entrante genérico** | IN | 🔴 NO modelado | medio |
| **Identity directory sync** | IN | 🔴 referenciado en A5, no modelado | bajo en v1 beta (manual user mgmt OK) |

**Score: ~3 / 11 boundary OK · 4 parciales · 4 no modelados.**

Esto es la otra mitad del gap grande: el sistema vive en una burbuja en el mockup. La realidad es que un B2B operator pasa el 60% del día CRUZANDO esos límites (Gmail → CRM → SAP → bandeja → vuelta).

---

## Gaps surfaced por el blueprint (consolidado)

Ordenados por severidad, listos para entrar en backlog:

### 🔴 Críticos (rompe el JTBD del módulo)

1. **Bandeja es outbox-only** — no captura los 12 inbound types. JTBD imposible de cumplir.
2. **Edit-with-AI ausente** — el botón Editar es stub. Promesa central del producto incumplida.
3. **Workflows canvas read-only** — no se puede crear / editar / ejecutar realmente.
4. **Admin Tenant display-only** — cero acción real.
5. **Onboarding agente invisible** — flow L0→L1 no existe en UI.
6. **Postmark inbound no modelado** — la mitad del email loop falta.
7. **Promote-to-base post-Active invisible** — el ciclo de aprendizaje no se cierra visualmente.
8. **Approval chains entre usuarios no existen** — Bruno no puede pedir a Ana que apruebe.

### 🟡 Importantes (módulo cumple lectura, falla operación)

9. **Skill Studio: editar manual overlay realmente**
10. **Runs Timeline: drill-down en run individual**
11. **Admin Users: invite flow + lifecycle**
12. **Admin Knowledge: editar chunk con sanitization**
13. **Admin Audit: drill-down before/after diff + filtro por fecha**
14. **Admin Connectors: disconnect + send log per connector**
15. **Ops Health: drill-down en container / SLO / job + acciones**
16. **Multi-output bundle approval** — un draft = N actions atómicas

### 🟢 Polish (cumple JTBD pero podría mejorar)

17. Consolidation: kanban drag-drop natural
18. Agent Console: pause / force-degrade controls
19. Skill Studio: test sandbox + diff con versión anterior
20. Bandeja: comments / @mentions threaded
21. Bandeja: attachments panel (3 flavors)
22. Chat: branch conversation / save as gold sample
23. Workflows: live execution heatmap

---

## Cómo se actualiza este doc

- **Cuando agregás un módulo nuevo** → añadir su sección (1 JTBD + 4 layers + gap)
- **Cuando cambia un flow cross-cutting** → actualizar la sección §A/B/C correspondiente
- **Cuando cerrás un gap** → mover de 🔴/🟡 a 🟢 con commit hash de referencia
- **Cuando descubrís un gap nuevo** → añadirlo en §"Gaps consolidado" + flag en el módulo afectado
- **Cuando un sistema externo se integra** → actualizar Service Ecology

Cadencia recomendada: revisión mensual + actualización al final de cada release.

---

## Próximos docs en serie B

- **B2 — Persona journey maps**: Bruno (operator) / Ana (admin) / Álvaro (owner) × día normal / día excepción = 6 journeys con fricción log
- **B3 — Heuristic audit**: Nielsen 10 + 5 AI-specific aplicadas a cada uno de los 14 módulos, severidad ranked
- **B4 — Edge case matrix**: por flow demo-crítico (cotización / consolidation / onboarding / break-glass), enumerar 9 estados (loaded/empty/loading/error/slow/offline/stale/concurrent/permission-revoked-mid-flow)
- **B5 — Cross-concern audits**: i18n coverage / audit trail integrity / role permission enforcement / keyboard a11y / error recovery / telemetry P8

Cada uno produce su propio reporte. Juntos = cobertura sistemática de la experiencia.

---

## Bottom line

Hoy el mockup tiene **15 módulos × ~6 user actions cada uno = ~90 acciones modeladas**. El blueprint revela que el JTBD demanda **~180 acciones**. Estamos al **~50%** funcional desde la lente del usuario. Eso NO es malo — es honesto.

Las brechas no son uniformes: 8 críticas (que rompen JTBD), 8 importantes (que limitan operación), 7 polish (que mejoran UX pero no rompen). Atacar las 8 críticas en orden de impacto demo es el siguiente paso natural.

Cuál de los 4 docs B2-B5 querés que produzca primero — o querés que primero atacamos las brechas críticas en el mockup?
