# A7 — Chat module contradictions log

**Date:** 2026-04-19
**Trigger:** Building the chat module forced canonical decisions that surfaced conflicts between the user prompt, SPEC_FABERLOOM_ARCHITECTURE (A1), ARCH_AGENT_PRINCIPLES (A4), and SPEC_USER_ADMIN_KNOWLEDGE_FLOW (A5). This doc captures each one + the decision taken.

**Rule of precedence** (inherited from A6): SPEC > prompt for data canon; prompt > SPEC for UI copy.

---

## C1 · Feedback taxonomy · prompt vs. A4/P6

**Prompt §10:** 5 UI reasons — `reason_no_evidence · reason_tone · reason_wrong_data · reason_risky · reason_other`.
**A4 P6 canonical codes:** 6 data-layer codes — `tone · data · structure · policy · scope · context`.

**Conflict:** Five does not cleanly map to six. `claim_sin_evidencia` isn't a separate code in A4 (it's a subset of `data`). `accion_riesgosa` = `policy`? That's a stretch.

**Decision (A6 §D6 confirmed in v2):**
- UI: prompt's 5 reasons as radios.
- Internal `feedback.code` mapping stored alongside `feedback.reason`:
  - `claim_sin_evidencia` → `data`
  - `tono` → `tone`
  - `dato_incorrecto` → `data`
  - `accion_riesgosa` → `policy`
  - `otro` → `context`
- `structure` and `scope` from A4 P6 are **never surfaced** by the UI — they'd be used by backend classifiers when analyzing free-text feedback. v2 doesn't expose them.

**Open:** If A4 is authoritative for the data layer, the UI is creating two classes of feedback (typed vs. code-derived) that will have to be reconciled at the DB boundary. Worth a product decision before shipping. Candidate resolutions:
- (a) UI stays with prompt's 5 and A4 P6 is deprecated.
- (b) UI exposes 6 codes (change from prompt).
- (c) Introduce a mapping table `feedback_reason_ui_code → feedback_code_internal` in the schema.

---

## C2 · PatternBadge "sealed" kind · not in any SPEC

**Invented:** The widget `W.patternBadge` supports 4 kinds: `learned | gold | none | sealed`. "sealed" is the UI label for the base-sealed skill layer.

**Reason:** Skill studio needed a visually consistent badge for the base layer (because the learned/gold layers have pattern badges, and the base column looked visually orphaned without one). I added `sealed` as a fourth kind.

**Conflict:** A5 §2.4 storage has `agent_spec_base` but doesn't define a UI status label for it.

**Decision:** Keep `sealed` as a UI-only kind. Not a data-layer status.

**Open:** If A5 grows a formal "sealed skill status" in the DB, reconcile with `agent_spec_base.status`.

---

## C3 · GroundedIn vs. Evidence tab · conceptual overlap

**Chat module right column:** `GroundedInBlock` shows 2-5 sources with score bars.
**Bandeja detail Evidence tab:** Full provenance chain per claim.

**Difference modeled:**
- GroundedIn = **what the model pulled as context** (retrieval-layer view). Score = relevance at retrieval time.
- Evidence = **what supports each claim in the final draft** (output-layer view). Score = N/A, it's a citation.

**Conflict:** A SPEC doesn't distinguish these. They could be the same primitive rendered twice.

**Decision:** Treat as two distinct primitives with different purposes. GroundedIn is live (per conversation turn), Evidence is frozen (per generated draft).

**Open:** If a source appears in GroundedIn but NOT in the final Evidence chain, that's a signal of "retrieved but not used". Current mockup doesn't show this delta. Worth exposing: `retrieved_but_unused` count → suggests the agent had better context than it used → training signal.

---

## C4 · `cross_skill` on consolidations · underspecified

**Prompt §5:** Consolidations have `crossSkill: boolean`.
**A4 P12:** "Propagación cross-skill del aprendizaje; Org-wide / Cluster / Skill-specific; humano checkboxea skills".

**Conflict:** P12 implies 3-level scope (Org / Cluster / Skill) but my mock data uses boolean crossSkill.

**Decision:** Model as `scope: 'skill' | 'cluster' | 'org'` instead of boolean. v2 mock has it as `scope: 'skill'` on all entries (no cluster-level demo yet).

**Open:** Clusters aren't defined anywhere. Need to model what "skill cluster" means (probably: skills sharing same `tool_manifest_hash`?).

---

## C5 · Iteration vs. Feedback · two loops that look the same

**Iteration** (v2 pattern): user clicks "Iterate" on an agent message → IterationComposer opens below → user types refinement → new agent message tagged `iterationOf: msgId`.

**Feedback** (v1 pattern): user clicks "Feedback" → FeedbackModal with 5 reasons + note → emits `feedback:submit` event → queued for consolidation.

**Conflict:** Both are corrective signals from the user, but they look different in the UI. A SPEC doesn't distinguish them clearly.

**Decision:** Two loops by design:
- **Iteration = synchronous**, same turn, user still in flow. Output: a new (better) draft. Doesn't enter consolidation pipeline directly.
- **Feedback = asynchronous**, queued. Output: a data point that feeds consolidation.thermometer.

**Open:** Should an iteration automatically also produce a feedback data point ("the user iterated → the original must have been sub-optimal") so that consolidation sees it? Current mockup does NOT auto-produce feedback from iterations. Product decision pending.

---

## C6 · Synthetic IDs `cv_live_*` / `msg_live_*` · not UUIDv7

**Architecture (A1):** `PK = uuid (UUIDv7)`.
**Mockup:** When user sends a message or creates a conversation live, IDs are generated as `'cv_live_' + Date.now()` / `'msg_live_' + Date.now()`.

**Decision:** Acceptable for mockup — the frontend never generates UUIDs in a real system (backend assigns). The `_live_` prefix is a visual signal these are synthetic.

**Open:** When real backend is wired, mock these with a mocked UUIDv7 generator to catch format issues early.

---

## C7 · SLA breach wording · single-sample vs. sustained

**Architecture §8 (A1):** Pivote-out trigger is `p95 retrieval > 300ms 7 días sostenido`.
**My SLABar:** Shows `current: 310ms` with warn state (close to breach).

**Conflict:** SPEC requires **7 days sustained** before triggering pivote-out. My UI breach indicator could be read as "we're failing right now" when semantically it's "single-sample measurement is over target".

**Decision:** Add a second data point to SLABar props: `sustainedDays: 7` + indicator showing "x días sobre target" vs. single-point measurement. Not done in v2 — ship a TODO.

**Open:** Is the chat SLABar showing the single-point or the sustained window? Probably both, stacked. Product decision.

---

## C8 · UserControlProfile · referenced in A5 but not modeled

**A5 §2.1 user scope:** "usuario autoría + sistema aprende (UserControlProfile)".

**Conflict:** UserControlProfile is a named concept, not defined in any visible doc. My Always-on section shows `Personal` as if it were a flat grounding level, but A5 implies there's a profile that governs what's always-included.

**Decision:** Use "Personal" as a collapsed alias for UserControlProfile in the UI. Don't expose the profile structure.

**Open:** When UserControlProfile is defined (likely in a SKILL_MEM_USER_PROFILE sister doc or similar), expand this section to show: what's always-on, what can be toggled off, what TTL applies.

---

## C9 · L4 trigger word semantics · typed vs. event-driven

**My mock:** `ag_triage` has `autonomy: 'L4'` and `triggerWord: '(auto)'`.

**A4 AgentSpec fields:** `trigger_word` is required. But L4 = "Auto+excepciones" — the agent acts without a user typing anything.

**Conflict:** What does `trigger_word` mean for an L4 agent? Current value `'(auto)'` is a placeholder that reads as "n/a".

**Decision:** For L4 agents, `trigger_word` should be renamed to `trigger_event` (e.g., `ticket_received`, `stock_alert_fired`). Different concept than a `/word` typed in chat.

**Open:** AgentSpec schema needs to support both: `trigger_kind: 'word' | 'event' | 'schedule'`. Current mock doesn't differentiate.

---

## C10 · Per-customer learning scope · undefined

**cv_002 msg_017:** Agent says "Pattern guardado: 'lenguaje simple > técnico para Minera MX'".

**A5 §2.2:** `business_entity_id` is metadata, not a 5th scope. `sharing_mode` = `private | dept_shared | org_shared`.

**Conflict:** A per-customer learned pattern needs to live somewhere:
- It's not pure `user` scope (other users would benefit).
- It's not `org` scope (irrelevant to other customers).
- It's tied to `business_entity_id`.

**Decision:** Model as `scope: 'dept'` + `business_entity_id: 'be_minera_mx'` + `sharing_mode: 'dept_shared'`. But the A5 pivote threshold (≥20-25% across 3 design partners) is exactly what this is — evidence that per-customer knowledge is a real thing.

**Open:** If v1 beta design partners confirm this pattern, formalize 5th scope per A5 §2.3. The mockup is a signal, not a decision.

---

## C11 · Handoff packet structure · not in UI

**A4 P10:** Handoff packet = `task · goal · context · constraints · artifacts · deadline · confidence · requested_output_format`.

**My MessageActionsMenu:** "Handoff" action stubbed to toast.

**Conflict:** Not a conflict per se — gap.

**Decision:** Wire "Handoff" to open a modal that renders the 8-field packet. Not done in v2 — deferred.

**Open:** Handoff UX pattern: inline composer vs. modal vs. drag-drop to agent in left column?

---

## C12 · Per-message ModelFingerprint · architectural extrapolation

**My mock:** `msg_002` in `cv_001` has a `modelFingerprint` field.
**A4 P13:** ModelFingerprint is attached to **autonomy state** (agent × model × toolchain × policy). Not per-message.

**Conflict:** Per-message storage could mean: "this response was generated by model X, when we detect a rollback or an investigation we can pin down exactly which fingerprint was live at that moment".

**Decision:** Keep per-message in the mock. It's additive, not contradictory — autonomy state inherits the latest message's fingerprint.

**Open:** Storage decision: is ModelFingerprint normalized (a table, joined via FK) or denormalized (copy on each message for immutability)? Matters for storage cost at scale.

---

## C13 · `learningHeat` term vs. Learning Thermometer

**My mock `availableSkillsForChat`:** Uses `learningHeat: 'cold' | 'warm' | 'hot' | 'gold'`.
**A4 verbatim:** Thermometer states: "🔵 Frío (0-2) · 🟡 Tibio (3-5) · 🔴 Caliente (6+, urgente)".

**Conflict:** I added a 4th state `gold` to my UI (= gold sample), but A4 only has 3 (cold/warm/hot).

**Decision:** `gold` is a UI-only state meaning "this skill has graduated learned patterns — thermometer is dormant because the patterns moved to base". Different from "hot" (pending consolidation).

**Open:** Formalize `gold` in A4's thermometer vocabulary OR remove from UI and show gold-state skills without a thermometer icon at all.

---

## C14 · Bandeja como workspace unificado, no como outbox

**Origen:** sesión 2026-04-19 post-v2 — Álvaro plantea que el operator necesita ver más que drafts en bandeja (emails entrantes, mensajes, alertas, approval requests).

**Estado actual del mockup:** Bandeja modela solo `drafts` (1 tipo de 12 que el JTBD demanda — ver B1_SERVICE_BLUEPRINT §C "12 inbound item types"). Bandeja se llama "Bandeja de salida" pero la realidad operativa es bidireccional.

**Conflicto:**
- A1 SPEC tiene `inbox_message` como tabla S1 FROZEN — implícitamente reconoce que hay items entrantes, pero NO define UI/UX.
- A4/A5 hablan de drafts (outbound) pero no de "lo que el usuario triagea entra día".
- El nombre "Bandeja" en español es ambiguo (de salida/de entrada/inbox); el usuario lee "lo que necesita mi atención".

**Decisión:**
- Bandeja unificada con item polimórfico: 12 tipos de items, mismo módulo, render distinto según `item.kind`.
- 3 modos cognitivos por item: **triage** (entrantes que necesitan rumbo) · **approve** (drafts listos) · **co-compose** (working surface con AI assist).
- Single ruta `#/bandeja` con saved-views URL-addressable (`?view=triage`, `?view=approve`, `?view=mine`, `?view=team`). NO dos módulos separados.
- Default sort: "needs attention now" — mezcla de aprobaciones expirando + inbound sin asignar + tareas vencidas, ordenado por urgencia, no por tipo. Patrón Linear, no Outlook.

**Implicaciones técnicas:**
- `bandeja-detail` se vuelve **polimórfico**: mismo shell, contenidos según `item.kind`. Hace falta `item.kind = 'draft' | 'inbound_email' | 'inbound_msg' | 'crm_event' | 'alert' | 'approval_request' | 'escalation' | 'feedback_reply' | 'sla_timer' | 'webhook' | 'audit_alert' | 'task'`.
- Cada tipo tiene sus propias acciones disponibles (action set per kind).
- Approval chains entre users: nuevo estado `awaiting_approval_from:user_id` + thread de comentarios + escalation timeout.
- Multi-output bundle: 1 aprobación → N actions atómicas → `bundle_id` con `max(reversibility)` como riesgo agregado.
- Edit con AI assist: toolbar inline (Reformular/Acortar/Formalizar/Traducir/Fact-check/Compliance) + escape hatch a mini-chat embebido (patrón Cursor/Notion/Linear converged).
- Attachments: 3 flavors (inbound original / auto-generado / user-upload) con su propio `evidence_span` si el agente los usó.

**Open:**
- ¿Cómo categorizar la urgencia para el sort default? (heurística por SLA + tier + age vs. ML-ranked)
- ¿Tasks asignadas son items first-class o extensión de drafts?
- ¿Approval chains soportan branches (Bruno → Ana O Carlos según monto)?

---

## C15 · Chat como primitiva, no como destino

**Origen:** misma sesión 2026-04-19 — al pensar bandeja como workspace con AI assist embebido, el rol del módulo `/chat` se vuelve ambiguo.

**Estado actual del mockup:** `chat` es un destino (top-nav + ruta propia + módulo standalone). El AI assist en bandeja está plantedo como widget separado.

**Conflicto:** dos primitivas conversacionales construidas dos veces (chat module vs. embedded chat in bandeja item) crearía:
- Código duplicado del composer + message thread
- Confusión cognitiva ("¿voy a /chat o me quedo en bandeja?")
- Inconsistencia de behaviors (skills picker en uno, no en otro)

**Decisión:** Chat es **primitiva reusable**, no destino exclusivo.

- La ruta `/chat` se queda como "modo exploración / canvas en blanco" — para arrancar trabajo nuevo sin item de origen pre-existente.
- El componente `W.chatComposer + message-thread` se deploya también:
  - Embebido en `bandeja-detail` (cada item tiene un thread de iteración con el agente que lo generó)
  - Embebido en `skill-studio` (test sandbox del skill — "habla con esta versión del skill antes de promover")
  - Embebido en `agent-console` (debug conversacional con un agente específico)
- Misma primitiva técnica, 3 deployments con framing distinto.

**Implicaciones:**
- `06_widgets.js.fragment` ya tiene `W.chatComposer` y `W.wireChatComposer` — la primitiva existe.
- Hace falta una helper `W.chatThread(conversationId, opts)` que renderice un thread completo y se pueda inyectar en cualquier slot.
- Los handlers (sendMessage, iterate, handoff, etc.) deben aceptar un `context` (conversationId, parentItemId opcional) para que la misma primitiva sirva en múltiples lugares.

**Reframe del mental model del producto:**
> De "chat + inbox separados" → A "workspace donde todo es item + cada item conversa con agentes".
> Es la diferencia entre Slack-with-AI vs Linear/Cursor/Notion. Los segundos ganan en B2B operativo.

**Open:**
- ¿La primitiva embed soporta multi-agente por thread (Bruno, ag_cotizador y ag_compliance en el mismo thread)?
- ¿El thread embed comparte historial con `/chat` standalone si la conversación arrancó allá y migró acá?

---

## C16 · Compliance regulatorio · user-level data portability

**Origen:** sesión 2026-04-19 — pregunta de Álvaro sobre backups de información del usuario.

**Estado actual del mockup:**
- Backup operacional (tenant-level): A1 §10 + ops-health → `backup_snapshot` job nightly, RPO 24h / RTO 2h, `pg_dump` cubre tablas FROZEN.
- "Exportar conocimiento org" como permiso (A5 §6): Owner + Admin sí · Operator no — pero el doc define el **permiso**, no el **mecanismo** (formato? alcance? periodicidad?).
- En el mockup hay "⬇ Exportar CSV" en admin/auditoría — solo audit_events filtrados.

**Conflicto / gap:**
- A5 §10.1 lista regulaciones LATAM (LGPD Brasil, LFPDPPP México, Ley 1581 Colombia, Ley 29733 Perú) pero **NO define mecanismo de export user-level**.
- LGPD especialmente exige "right to data portability" — un user (no solo el tenant owner) debe poder pedir TODO lo que el sistema tiene sobre él en formato exportable.
- No existe path para:
  - Export self-service del Operator
  - Export user-private memory chunks
  - Export de conversaciones / drafts / feedbacks de un user
  - Tenant export para migración (si Muito Work se va de FaberLoom)

**Decisión:**
- v1 beta: agregar feature **"📥 Descargar mis datos (JSON)"** en perfil del user — produce un .zip con conversations + drafts owned + feedbacks + user-private memory chunks + audit events del propio user.
- v1 beta: agregar **tenant-export nightly** scheduled (cron job), accesible desde admin/tenant para Owner — produce snapshot completo en formato exportable a S3 del cliente o descarga directa.
- v1.5: features avanzadas (S3 archive policies con lifecycle rules, geo-replicación, encrypted backup con KEK rotación, scheduled user-export para compliance officer, blockchain-anchored audit log para legal evidence).

**Tres preguntas que necesitan canon antes de implementar:**
1. **¿Quién puede pedir backup?** — (a) cualquier user de su propio data · (b) admin de su org · (c) owner del tenant completo. A5 cubre b/c parcial; v1 beta debe cubrir (a) por LGPD.
2. **¿Qué incluye?** — memory chunks (con scope filter por rol), drafts (todos los que aprobé/generé), conversaciones (mías), feedbacks (míos), audit events (mis acciones). Formato JSON + adjuntos en .zip. Exclude: ceo_only data si user no es owner.
3. **¿Frecuencia y retention?** — on-demand (botón "descargar") + automática mensual a storage (S3 cliente o download directo). Retention del backup: 30 días default, configurable por tenant.

**Implicaciones de UI:**
- Nuevo módulo / sección en `admin-users` para "Mi perfil" → tab "Mis datos" → botón Descargar
- Nuevo módulo / sección en `admin-tenant` → tab "Backup" expandida con manual trigger + scheduled config
- Audit events nuevos: `user.data_exported`, `tenant.backup_downloaded`, `tenant.backup_scheduled_changed`

**Open:**
- ¿El user-level backup incluye datos GENERADOS por el user pero owned por el tenant (ej: drafts de cotizaciones que aprobé)? Posición legal: depende de la jurisdicción. LGPD dice sí.
- ¿Qué pasa con datos ceo_only si el user es owner pero el ceo_only es de OTRO tenant (multi-tenant en el futuro)?

---

## C17 · Agent lifecycle UX · creación / edición / clonación / retiro

**Origen:** sesión 2026-04-19 post-v3 — Álvaro identifica que el mockup nunca muestra cómo se CREA un agente. Solo permite operar agentes pre-existentes.

**Estado pre-v3.5:** `/agentes/:id` muestra consola read-only de un agente; `#/agentes` redirige a `ag_cotizador` por default. Cero UX para create / edit AgentSpec / clone / pause / retire / version rollback.

**Conflicto:**
- A4 P1: AgentSpec es "estática, versionada, inmutable entre ejecuciones" — implica versioning + audit `agent_spec.created|published|retired` enum existe pero no había UX.
- A5 §6 matrix: Owner+Admin pueden editar org knowledge pero no se especifica permission de "crear agente". Inferido: misma row que org-knowledge create.
- B1 gap #5 (onboarding agente invisible) cubrió L0→L1 promote pero NO la génesis del agente.
- Sin create UX, el producto en v1 beta es "usar los 7 agentes prebuilt" lo cual contradice P4 ("Cada organización construye evidencia propia desde nivel 0").

**Decisión (implementada en v3.5):**
- **Lista `/agentes`** (nuevo módulo `19_module_agent_list`): tabla con name/spec/tier/autonomy/thermometer/runs7d/status/actions, filtros por tier+status, CTA "+ Crear agente" (admin/owner only).
- **Wizard 5-step** (`W.openAgentSpecWizard`): mapea los 7 fields de AgentSpec (P1):
  1. Identidad (name, description, triggerWord, triggerKind, tier, businessEntityScope)
  2. Skills (multi-select de los 12 disponibles)
  3. KB refs + Connectors (multi-select)
  4. State machine + Events (template + checkbox events)
  5. Guardrails (autonomyCeiling, escalationPolicy, learningConsolidation)
- **Lifecycle controls** en agent-console header (admin/owner only): Editar Spec / Clonar / Pausar / Reactivar / Retirar.
- **Tab Versionado** (6ta tab) en consola: lineage de `agent_spec_versions` con publishedAt/publishedBy/supersedes/changeNote + botón Rollback (forward-only via new version, no rebobina histórico).
- **Soft retire** (no delete) per A5 §7 "no borrar promovidos, versionar".
- **Audit verbs nuevos cubiertos:** `agent_spec.created` · `agent_spec.published` · `agent_spec.paused` · `agent_spec.resumed` · `agent_spec.retired`.

**Schema extension de `agents`:** se enriquecieron los 7 agentes existentes con campos AgentSpec faltantes (specVersion, autonomyCeiling, escalationPolicy, kbRefs, connectorBindings, events, stateMachine, learningConsolidation, triggerKind, specSupersedes, createdAt, createdBy, lifecycleStatus). Mock collection nueva `agentSpecVersions` con 6 entries de lineage histórico.

**Permisos UI:**
| Acción | Owner | Admin | Operator |
|---|---|---|---|
| Crear / editar / clonar / retirar | ✅ | ✅ | ❌ |
| Pausar / Reactivar | ✅ | ✅ | ❌ |
| Promote autonomy L0→L1 etc | ✅ (per A4 P4 CEO) | ❌ | ❌ |
| Ver consola | ✅ | ✅ | ✅ (read-only) |

**Open:**
- ¿Quién aprueba `agent_spec.published` cuando cambia `autonomyCeiling`? Tentativamente sin gate (admin puede); pero raise de ceiling debería requerir CEO. v3.5 no diferencia — falta confirm.
- ¿Diff visual entre dos versiones del AgentSpec? v3.5 muestra solo changeNote textual. Diff visual de los 7 fields sería v4.
- ¿Test sandbox del AgentSpec antes de publish? (Skill Studio ya tiene sandbox skill-level; agent-level análogo pendiente.)
- ¿Cómo se inicializan los kbRefs cuando es Operator-creado en sub-dept? scope filter implícito.
- ¿Auto-rollback si nueva versión disparare alerta de quality regression? P13 implica probation pero el mockup no muestra ese loop.

---

## Open questions to resolve before production

1. **Feedback taxonomy reconciliation** (C1).
2. **Cluster scope in cross-skill propagation** (C4).
3. **Iteration auto-feedback policy** (C5).
4. **SLA breach window semantics** (C7).
5. **UserControlProfile structure** (C8).
6. **Trigger_kind enum in AgentSpec** (C9).
7. **5th scope pivote decision from design partners** (C10).
8. **Handoff packet UX** (C11).
9. **ModelFingerprint normalization policy** (C12).
10. **learningHeat 4th state "gold"** (C13).
11. **Bandeja item polymorphism: 12 kinds + per-kind action set** (C14).
12. **Approval chains: branching rules + escalation timeouts** (C14).
13. **Multi-output bundle approval: aggregate risk semantics** (C14).
14. **Chat primitive embedding: multi-agent per thread support** (C15).
15. **Chat primitive: shared history between standalone and embedded** (C15).
16. **Data portability mechanism per user (LGPD compliance)** (C16).
17. **Tenant export format + retention policy** (C16).
18. **Approval gate for `autonomyCeiling` raise vs other AgentSpec edits** (C17).
19. **Diff visual between AgentSpec versions** (C17).
20. **AgentSpec sandbox test before publish** (C17).
21. **Auto-rollback on quality regression after AgentSpec.published** (C17 + P13 probation).

## Non-open (resolved in this doc)

- C2 sealed as UI-only
- C3 GroundedIn vs. Evidence as distinct primitives
- C6 synthetic IDs acceptable in mockup

---

## Meta

This is what the mockup is for. Each item above is a decision the prose alone would have let us defer; building it in UI forced us to pick. Keep adding as we iterate.
