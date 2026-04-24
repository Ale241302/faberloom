# Gemini Prompt Pack · 16 ideation sessions for FaberLoom v3.5

**Date:** 2026-04-19
**Purpose:** Iterate each functional view of the mockup with Google Gemini (voice mode preferred). Each prompt is self-contained — Gemini doesn't need other context.
**Workflow:** Prompts here → Gemini → structured summary → Claude (mockup updates + A7) OR Cowork (canon promotion).

---

## Cómo usar este pack

### Loop por vista (15-25 min cada uno)

1. **Abrí Gemini** (preferido: app móvil con voz · alternativa: web con typing)
2. **Pegá el prompt completo** de la vista que querés discutir
3. **Hablá con Gemini** 10-15 min — desafialo, pedile contraargumentos, pidele ejemplos de qué haría DISTINTO
4. **Al final del chat**, decile: *"Dame el resumen estructurado en el formato que pediste arriba"* → Gemini devuelve ~300-400 palabras estructuradas
5. **Copiá el resumen**:
   - Si surfacéo decisiones de UX/producto → mandalo a **Claude** ("update A7 con esto y aplicalo al mockup si corresponde")
   - Si surfacéo cambios para canon (`docs/`) → mandalo a **Cowork** ("promové lo aplicable de este resumen a `docs/`")

### Orden sugerido (para no diluir foco)

| Orden | Vista | Por qué arrancar acá |
|---|---|---|
| 1 | **Meta · cohesión del producto** (§16) | Sin dirección global, las vistas individuales no encajan |
| 2 | **Bandeja detail (dr_001)** (§3) | Demo-critical · el momento "wow" |
| 3 | **Chat** (§1) | Primera impresión del usuario |
| 4 | **Agent list + create wizard** (§5) | El loop crítico nuevo de v3.5 |
| 5 | **Bandeja lista polimórfica** (§2) | Workflow operacional |
| 6 | **Skill Studio** (§4) | Donde se ve la promesa "tu org construye evidencia" |
| 7-15 | El resto (admin, ops, etc.) | Solo si querés profundidad operativa |

### Reglas para Gemini

Pegá esto al inicio de CUALQUIER prompt si querés ser explícito:

> Sos un Senior Product Designer + UX Architect con experiencia en B2B SaaS y agentes con LLM. Tu trabajo NO es validar — es desafiar. Pedile contraargumentos, casos límite, comparables (cómo lo hace Linear / Cursor / Notion / Stripe). Si algo es razonable, decilo en una frase y seguí. Si algo está mal, fundamentá. Al final devolveme un resumen estructurado con: decisiones confirmadas · decisiones desafiadas · ideas nuevas · open questions.

---

## §1 · Vista: Chat (default route `#/chat`)

**Background mínimo (Gemini necesita esto):**
FaberLoom es una plataforma B2B LATAM para que equipos comerciales de calzado-de-seguridad operen con agentes de IA. Default route es `/chat` — la primera impresión es conversacional. Soy Álvaro, CEO. Mi persona target es Bruno, operator de ventas (no es técnico, no le interesa "configurar agentes" pero sí "hacer cotizaciones rápido").

**JTBD de esta vista:** *"Dame un canvas conversacional donde puedo arrancar trabajo nuevo, ver qué está pensando el agente, y entregar drafts a la bandeja sin perder contexto."*

**Layout (3 columnas, max 1600px):**
- **Left (280px):** Always-on (chips Personal + Org Muito Work, no desactivables) · 6 agentes con sparkline runs-7d · 12 skills con thermometer icon (🔴🟡⚪⭐) · conversaciones recientes (hasta 5)
- **Center:** Empty state con SuggestGrid 2×2 (4 sugerencias contextuales) O conversación con messages · cada agent message tiene MessageActionsMenu (8 acciones: Copy/Iterate/Handoff/Open draft/Explain evidence/Consolidate/Feedback/Rerun) + PatternBadge (learned/gold/none) + provenance superscripts [E1]..[En] que cross-highlight con la columna derecha
- **Right (320px):** GroundedInBlock (top-5 sources con score bars) · SLABar p95 retrieval (con sustained-window indicator: día X de 7 hacia pivote-out) · Active handoffs (pills linkeando a `#/bandeja/dr_XXX`) · VoiceOfCustomer card rotativo

**Interacciones clave:**
- Click skill → pill aparece en composer · click agent → AgentChip + header "Hablando con: X · L1"
- Click "Iterate" en menu de un message del agente → IterationComposer aparece DEBAJO del message (no en el composer principal) → permite refinar manteniendo contexto · checkbox "Contar como feedback" default checked
- Mensaje del usuario que genera draft → pill `Draft dr_042 · awaiting_approval` linkea a bandeja
- Provenance superscript en mensaje del agente → highlight en GroundedInBlock derecho

**Lo que quiero discutir con vos (Gemini):**

1. **Always-on lock semántico** — el usuario no puede desactivar Personal + Org grounding. Es decisión de producto: queremos que NUNCA el agente responda sin contexto org. ¿Es paternalista? ¿Hay caso real donde el user querría hablar con el modelo "puro"? (yo digo no — pero quiero que me pelees)

2. **Posición del IterationComposer** — hoy aparece debajo del message original, no en el composer principal. ¿Es claro que es una iteración del DRAFT, no un mensaje nuevo a la conversación? Riesgo de confusión visual.

3. **Sugerencias de SuggestGrid** — son 4 hardcoded ("Cotizar Marluvas", "Consolidar feedback", "Pipeline Colombia", "Verificar POL_MX_001"). ¿Deberían ser ranked por: (a) historial del usuario, (b) skills más usados de su rol, (c) eventos pendientes, (d) lo que estás trabajando últimamente?

4. **MessageActionsMenu con 8 acciones** — ¿son demasiadas? ¿cuáles fusionar / quitar / esconder bajo "más"?

5. **Open question A7-C15:** chat es primitiva (se embebe en bandeja-detail, skill-studio sandbox, agent-console debug) — pero también es destino (`/chat`). ¿Cuándo el usuario va a `/chat` vs trabaja en chat embebido? ¿Hay riesgo de que se sienta "donde estoy hablando ahora?"

**Format que necesito al final:**

```
## Resumen vista Chat
**Decisiones confirmadas:** [bullets, 1-line each]
**Decisiones desafiadas:** [bullets, +contraargumento por cada uno]
**Ideas nuevas:** [bullets, ≤5]
**Open questions:** [bullets que quedan abiertas]
**Acción para Claude:** [qué patch al mockup propondrías]
**Acción para Cowork:** [qué actualizar en docs/ canónico, si aplica]
```

---

## §2 · Vista: Bandeja Lista (polymorphic, `#/bandeja`)

**Background mínimo:** Bandeja en v3 es WORKSPACE unificado, no outbox. Maneja 12 kinds de items: drafts del agente + 11 inbound (inbound_email Postmark, inbound_msg WhatsApp, crm_event, alert system, approval_request entre users, escalation desde agente, feedback_reply, sla_timer, webhook externo, audit_alert, task asignada).

**JTBD:** *"Decime qué necesita mi atención hoy y dejame cerrarlo eficientemente."*

**Layout:**
- Header con saved-view tabs/segments (6): **Atención** (default · urgentes) · **Triage** (entrantes sin asignar) · **Aprobar** (drafts awaiting_approval) · **Mías** (asignadas a mí) · **Equipo** · **Todos**
- URL pattern `?view=triage|approve|mine|team|attention|all` — saved-view es bookmark-able
- Filtros secundarios: state · agent · business_entity
- Bulk approve toolbar STICKY cuando ≥1 draft seleccionado (solo drafts, no otros kinds) · double-confirm si alguno es irreversible
- Tabla con columnas: checkbox · urgency dot (●/●/○) · kind chip + icon · subject · state badge · risk badge · sender · age · acción
- Cada row con `border-left:3px solid var(--color-del-kind)` para diferenciación visual
- Sort default: urgencia desc · luego age desc

**Interacciones:**
- Click row → navega a `/bandeja/:id` (dispatch polimórfico al detail correcto)
- Audit_alert solo visible para admin/owner

**Lo que quiero discutir:**

1. **¿6 saved-views es demasiado?** ¿O lo correcto es: solo "Mías hoy" y un "Buscar todo"? ¿Cómo lo hace Linear / Front / Hey?

2. **Bulk approve solo en drafts** — pero el usuario podría querer bulk-acknowledge alerts, bulk-archive crm_events. ¿Generalizar bulk a TODOS los kinds con per-kind action set?

3. **Urgencia cómo se calcula** — hoy es predicado simple (P0 si state es `failed/escalated/blocked` o action `irreversible_*`; P2 si `awaiting_approval`; P1 default). ¿Debería ser ML-ranked en lugar de regla? ¿O agregar señales: edad relativa al SLA del kind, entity_priority, etc?

4. **Audit_alert visible solo a admin/owner** — pero un operator podría QUERER saber si su sesión disparó break-glass. ¿Notificación lateral en lugar de filtrado?

5. **12 kinds vs simplificación** — ¿hay kinds que en realidad son el MISMO concepto desde la lente del usuario? Por ejemplo `feedback_reply` y `task` ambos requieren acción humana de bajo nivel.

**Open question A7-C14:** approval chains permiten branching condicional (Bruno → Ana O Carlos según monto). ¿Eso debería verse en bandeja-lista o solo en detail?

**Format final igual que §1.**

---

## §3 · Vista: Bandeja Detail · `dr_001` (demo-critical)

**Background:** Esta es LA vista que enseñamos primero a Marluvas/Tecmater. Es el draft de cotización 14 Velox + 8 Goliath para ACME MX, MXN 1.13M, generado por ag_cotizador, awaiting_approval.

**JTBD:** *"Que entienda qué propone el agente, en qué se basa, qué riesgo tiene, y que pueda decir sí/no/cambiar sin abrir 3 tabs."*

**Layout:**
- Header: nombre del agente · DraftStateBadge (awaiting_approval) · RiskBadge (reversible_24h) · businessEntityId chip · breadcrumbs
- **Envelope card:** recipient + subject (estilo email)
- **Approval chain card** (porque dr_010 sí tiene cadena, dr_001 no — pero la primitive existe): 3 steps Bruno→Ana→Álvaro con dot states (✓/⏳/◯)
- **Action bundle card** (dr_001 SÍ tiene bundle de 5 acciones): "1 aprobación → 5 actions atómicas" — send_email + attach_pdf + update_crm + reserve_stock + schedule_followup · aggregate risk visible
- **Comments card:** thread con avatares + form para agregar (visual @mention support)
- **GroundedIn compacto top-3** + link "Ver Evidencia" jump-to-tab
- **Tabs (4):** Content (con [E1]..[E6] superscripts cross-highlight) · Evidence (claims con full provenance chain `claim → evidence_span → source · sourceVersion · line · retrievalRunId`) · Risk (6 fields del action-risk registry + ModelFingerprint P13 con 7 campos) · Trace (workflow timeline 7 steps)
- **AI assist Edit slot:** (revealable) toolbar inline con 6 presets (Reformular/Acortar/Formalizar/Traducir/Fact-check/Compliance) + escape `/AI` a mini-chat
- **Thread agente slot:** (revealable) chat thread embed con el agente que generó el draft (W.chatThread primitive)
- **Footer actions:** Aprobar (con double-confirm si irreversible) · Editar · Rechazar · Handoff (modal con 8 fields P10) · Thread agente · Feedback · Consolidar

**Lo que quiero discutir:**

1. **Densidad de la vista** — hay APROVECHO mucho info en una sola pantalla (envelope + chain + bundle + comments + grounded-in + 4 tabs + 7 botones). ¿Es paralizante para Bruno (operator)? Compará con: Gmail+Linear (separan info en columnas), Stripe Dashboard (dense by design), Asana (collapses lo no-crítico).

2. **AI assist con toolbar de 6 presets vs solo chat libre** — ¿el toolbar acelera o es ruido? Notion, Cursor, Linear adoptaron toolbar+chat híbrido. ¿Estoy copiando ciegamente o aplica acá?

3. **Provenance superscripts [E1]..[E6]** — son small + clickeables + hover-highlight. Riesgo: distraen del CONTENIDO del draft. Alternativa: mostrar solo on-hover + tab Evidence siempre visible.

4. **El botón "Handoff" abre un modal con 8 campos editables (P10 packet)**. ¿Bruno alguna vez va a llenarlos manualmente? O ¿debería ser auto-fill con override solo en casos raros?

5. **Action bundle de 5 acciones atómicas** — Bruno aprueba 1, se ejecutan 5. ¿Necesita poder DESMARCAR alguna del bundle antes de aprobar? (ej: aprobar email pero NO reservar stock todavía). Hoy no se puede.

**Open questions A7 relevantes:**
- C5 · iteration auto-feedback — el toggle "contar como feedback" está checked default. ¿Es paternalista o correcto?
- C11 · handoff packet UX standardization — los 8 fields son canon (A4 P10) pero ¿este modal es el mejor encoding visual?

**Format final igual que §1.**

---

## §4 · Vista: Skill Studio (`/skills/sk_cotizar`)

**Background:** Skill Studio es donde se gestionan los 3 layers de un skill: base sellada · manual overlay · learned overlay. El skill `sk_cotizar` está en thermometer 🔴 Caliente (6 patterns pendientes consolidación).

**JTBD:** *"Quiero ver de qué está hecho un skill, qué aprendió, y decidir si promuevo o reverto patterns sin miedo."*

**Layout:**
- Header con nombre + thermometer + Consolidate button (active si hot)
- **3 columnas:**
  - **Base sellada:** PatternBadge `🔒 Sealed` + version + author + system prompt (read-only, scrollable) + policies (chips) + tools (chips)
  - **Manual overlay:** lista de reglas (rule + author + date) + botón "+ Añadir regla"
  - **Learned overlay:** lista de patterns con PatternBadge `✦ Learned · N` + first/last seen + TTL 90d + chip "Pendiente consolidación"
- **Gold samples card:** lista con star + label + author + approvedAt
- **Sandbox embed** (revealable): chat thread primitive (W.chatThread con scope='sandbox') para PROBAR esta versión del skill antes de promover

**Interacciones:**
- Click Consolidate → ConsolidationModal con thermometer + diff before/after + scope select 3-level (skill/cluster/org per A4 P12) + Confirm/Discard
- Sandbox toggle: abre chat embebido para testing

**Lo que quiero discutir:**

1. **Visualización de los 3 layers** — hoy son 3 columnas paralelas. ¿Comunica bien la JERARQUÍA (base es lo seguro, manual es lo agregado, learned es lo propuesto)? Alternativas: stack vertical con visual hierarchy, o "stratified" como capas geológicas.

2. **El sandbox** — está bueno pero el usuario tiene que IMAGINAR cómo se va a comportar el agente. ¿Debería mostrarse el "antes y después" lado a lado, dado un mismo input?

3. **Consolidation timing** — hoy Consolidate aparece SOLO si thermometer hot. ¿Y si quiero proactivamente revisar lo learned aunque no esté caliente? ¿Botón siempre visible con disabled state + tooltip "consolida cuando hay 6+ patterns"?

4. **Editar manual overlay realmente** — hoy es "+ Añadir regla" stub. La pregunta es: ¿debería el editor estar en MODAL o INLINE (click en regla → se vuelve textarea)? Linear va inline, Notion va modal.

5. **Cross-skill propagation (P12)** — hoy ConsolidationModal tiene scope select 3-level (skill/cluster/org). ¿Pero qué define "cluster"? ¿skills que comparten el mismo `tools_manifest_hash`? ¿Por dominio (compras/ventas/soporte)? Open A7-C4.

**Format final igual.**

---

## §5 · Vista: Agent List + Create Wizard (`/agentes`) [NUEVO v3.5]

**Background:** Hasta v3, no había forma de CREAR un agente. v3.5 cierra el gap génesis. Lista en `/agentes` reemplaza el redirect a ag_cotizador.

**JTBD:** *"Quiero saber qué agentes tengo, en qué status están, y poder crear uno nuevo cuando aparezca un caso de uso."*

**Layout lista:**
- Header con title + descripción "7 agentes · A4 P1 · 7 fields per spec" + CTA "+ Crear agente" (solo owner/admin)
- Filtros tier (6) + status (5: active/shadow/paused/retired/all)
- Tabla con columnas: name+trigger+kind · spec version · tier · autonomy + ceiling · thermometer · runs7d + sparkline · status · acciones (Ver/Clonar/Lifecycle⋯)
- Lifecycle dropdown ⋯ por row: Pause / Resume / Edit Spec / Clone / Retire (soft)

**Wizard 5 pasos** (mapea a los 7 fields de AgentSpec A4 P1):
- **Paso 1 · Identidad:** name, description, triggerWord, triggerKind (`word`/`event`/`schedule`), tier, businessEntityScope
- **Paso 2 · Skills:** multi-select de los 12 skills disponibles
- **Paso 3 · KB refs + Connectors:** multi-select de 10 memory sources + 5 connectors
- **Paso 4 · State machine + Events:** template select (default_v1/simple/custom) + checkbox de 11 events
- **Paso 5 · Guardrails:** autonomyCeiling (L0-L4 dropdown), escalationPolicy (textarea), learningConsolidation (manual_only/auto_with_review/auto_no_review), summary preview con dl

Confirmar → agente nace en L0 SHADOW + audit `agent_spec.created` + entry en `agentSpecVersions` v1.0.0.

**Lo que quiero discutir:**

1. **5 pasos vs flujo más corto** — ¿cuántos campos puede llenar Bruno (operator) en su primer intento? Compará con: Linear "create issue" (1 input + opcionales escondidos), Stripe "create webhook" (3-4 fields), Zapier "create zap" (wizard largo pero con previews).

2. **Defaults inteligentes** — hoy todos los pasos arrancan vacíos / con valores genéricos. ¿Debería pre-cargar basado en: (a) skill seleccionado en Paso 2 → infiere kbRefs / connectors / events típicos, (b) tier seleccionado → infiere autonomyCeiling razonable, (c) clonar ag_cotizador como template default?

3. **Paso 4 events checkbox** — hay 11 events. Demasiados. ¿Agruparlos por origen (system / external / user-action)? ¿Solo mostrar los 3-4 más comunes y "ver más"?

4. **autonomyCeiling vs autonomy** — el wizard pide CEILING (máximo permitido). El agente arranca en L0 SHADOW siempre. ¿Es claro que ceiling NO es el nivel actual? Riesgo de confusión.

5. **Editar AgentSpec siempre versiona (no in-place edit)** — cada edit publica nueva versión + supersedes anterior. ¿Es overhead innecesario para edits triviales (typo en escalationPolicy)? O ¿forzar versioning siempre es la disciplina correcta para auditoría futura?

6. **Lifecycle dropdown ⋯ vs botones separados** — en lista uso dropdown, en console uso botones inline. Inconsistencia. ¿Cuál pattern?

**Open questions A7 relevantes:**
- C17 · Approval gate diferenciado para raise de autonomyCeiling vs otros edits — actualmente cualquier admin/owner publica
- C17 · Diff visual entre versiones — hoy solo changeNote textual

**Format final igual.**

---

## §6 · Vista: Agent Console (`/agentes/:id`)

**Background:** 6 tabs (Resumen/Conversación/Skills/Memoria/Logs/Versionado). Header con lifecycle controls + Spec version + breadcrumb back to lista.

**JTBD:** *"Quiero entender cómo se comporta este agente específico, intervenir si hace falta, y ver su historial."*

**Layout (tabs):**
- **Resumen:** KPI grid (5 cards: runs30d / approval / latency / fail / cost) + AutonomyLadder L0-L4 con unlock criterion + Ready-to-promote CTA (si cumple thresholds A4)
- **Conversación:** botón "Abrir chat con este agente" + lista conversaciones recientes + chat thread embebido (W.chatThread scope='debug')
- **Skills:** lista de skills assigned con thermometer + link a skill-studio
- **Memoria:** 3 cards (run/session · org/account · curated/gold) con counts
- **Logs:** tabla últimas 20 runs con state badge + tokens + cost
- **Versionado [v3.5 NUEVO]:** lineage table con versiones (publishedAt/publishedBy/supersedes/changeNote) + current highlighted + botón Rollback (forward-only)

**Lo que quiero discutir:**

1. **6 tabs en una vista** — ¿es demasiado? Linear "issue detail" tiene 4-5 tabs. ¿Cuáles fusionar (ej: Skills + Memoria son ambos "lo que el agente tiene")?

2. **Ready-to-promote CTA en Resumen** — aparece cuando agente cumple thresholds A4. ¿Debería ser MÁS prominente (banner top) o está bien embedded en summary?

3. **Versionado tab con rollback forward-only** — el pattern es: rollback NO rebobina histórico, crea NUEVA versión clonando contenido de target. ¿Lo entiende un usuario no-técnico? Compará con git revert vs git checkout.

4. **Chat embebido en tab Conversación + botón "Abrir chat con agente"** — dos formas de hablarle. Redundante o útil?

5. **Rollback button** — solo aparece para versiones NO-current. ¿Debería preguntar `changeNote` mandatoriamente al rollback (para auditar el WHY)?

**Format final igual.**

---

## §7 · Vista: Workflows Canvas (`/workflows`)

**Background:** SVG canvas con 7 nodes del workflow del cotizador (trigger → retrieve(stock) + retrieve(price) → llm(compose_draft) → validator(provenance_check) → hitl(awaiting_approval) → action(send_email)).

**JTBD:** *"Quiero ver cómo se conectan los pasos del agente para auditar / modificar / aprender."*

**Layout:**
- Layout 3 columnas: palette (clickeable para agregar nodo) · canvas SVG · inspector
- Botón "▶ Ejecutar" → animación secuencial 400ms por nodo (highlight → fade)
- Click nodo → inspector muestra id/type/label/detail/coords

**Lo que quiero discutir:**

1. **Drag-drop de nodos NO existe** — agregar nodos solo posiciona en (60+30N, 240). Para v3.5 acepté mockup limitado. Pregunta: ¿drag-drop es realmente necesario en v1 beta? Compará con n8n/Zapier (drag) vs Linear automations (config sin canvas) vs Retool (drag).

2. **¿El canvas es la METÁFORA correcta?** O ¿estamos imponiendo una visualización porque "look at the cool DAG"? Para Bruno (operator) un workflow podría ser una LISTA (paso 1, paso 2...) en lugar de un canvas.

3. **7 nodes hardcoded del cotizador** — el canvas no se deriva del workflow real del agente. Es teatro. ¿Es honesto mostrarlo en demo? O ¿es mejor decir "workflow viewer · v1.5" y NO mostrar?

4. **Run animation** — anima 7 nodes secuencialmente en 2.8s. Bonito pero ¿comunica algo útil? O es eye candy?

**Format final igual.**

---

## §8 · Vista: Runs Timeline (`/runs`)

**Background:** 54 runs en mock, paginado 20/página, filter por agente.

**JTBD:** *"Quiero el historial de ejecuciones para diagnosticar problemas o auditar performance."*

**Layout:** filtro agent + tabla columns: id · agent · started · state · tokens · cost. Paginación.

**Lo que quiero discutir:**

1. **Drill-down a UNA run** — hoy no existe. Click row no hace nada. ¿Debería abrir un panel/modal con el trace completo del workflow ejecutado? O ¿es feature de v2 de la vista?

2. **Filtros faltantes** — solo hay agent. Falta: rango fechas, state, fail rate, tokens range. ¿Cuáles son los 3 que un operator REALMENTE usaría?

3. **Métricas agregadas vs lista** — ¿debería esta vista ser un DASHBOARD (gráfico de runs/día, $/día, error rate evolution) en lugar de una lista plana?

4. **Comparable** — Datadog logs / Grafana / Sentry events / GitHub actions runs. ¿Qué pattern adoptar?

**Format final igual.**

---

## §9 · Vista: Consolidation (`/consolidaciones`)

**Background:** Kanban 4 columnas (Candidate/Active/Archived/Reverted). Tarjetas con skill + suggested rule + pattern count. Click "↑ Promover a base" en Active → modal con version bump + supersedes + commit emite `agent_spec.published` audit.

**JTBD:** *"Quiero gobernar qué patterns aprendidos se promueven a base, cuáles archivamos, cuáles revertimos."*

**Layout:** Kanban 4 cols + Cards + buttons per state.

**Lo que quiero discutir:**

1. **Drag-drop entre columnas no existe** — los buttons son la única manera de mover cards. ¿Drag es expected en kanban (Trello/Linear) o es overkill para esto?

2. **El loop Active → Promote-to-base → Archived es CRÍTICO** — porque es donde se cierra el ciclo "aprende → curador humano valida → integra al base". ¿Está visualmente claro que cuando promovés se INTEGRA AL SKILL (no se "guarda" en otra parte)?

3. **Diff visual antes/después** — hoy es texto en el modal. ¿Debería ser un diff visual estilo GitHub, especialmente para changes en system prompt?

4. **Cluster scope del propagación** — el modal pide scope 3-level (skill/cluster/org per A4 P12). ¿Pero qué define cluster? Open A7-C4.

5. **Reverted como columna terminal** — ¿debería poder UN-revert (volver a Active)? O ¿revert es como bankruptcy, es definitivo?

**Format final igual.**

---

## §10 · Vista: Admin Users (`/admin/usuarios`)

**Background:** 7 users mock. Edit modal con role/dept/BE/break-glass/scope. Sección NUEVA "📥 Mis datos · LGPD/LFPDPPP/Ley 1581/Ley 29733" con botón download JSON. Break-glass button con countdown 8h. Solo visible para owner/admin.

**JTBD:** *"Como admin, quiero gestionar quién puede hacer qué + responder pedidos LGPD de portabilidad sin escalación."*

**Lo que quiero discutir:**

1. **"Mis datos" download está en admin-users** — pero el operator NO puede ver admin-users. ¿Dónde se debería poder pedir mis datos un operator? ¿Settings personal? ¿Footer global?

2. **JSON export — formato correcto?** Compará con Google Takeout (zip de carpetas), GitHub data export, Stripe customer export. ¿Es JSON crudo lo que un usuario LGPD entiende?

3. **Break-glass UX** — un botón. Click → confirm → 8h activado. ¿Se entiende lo que IMPLICA (visibilidad ampliada, audit log explosivo)? Compará con AWS root account warnings.

4. **Permissions matrix per A5 §6 NO está visible** — el admin no SABE qué puede o no puede cada rol. ¿Debería haber una sub-vista "Matriz de permisos" para referencia?

**Format final igual.**

---

## §11 · Vista: Admin Knowledge (`/admin/conocimiento`)

**Background:** Tree view de 4 scopes (global/org/dept/user) + lista chunks por scope + 3-step Promote modal (preview → sanitize checklist → confirm) + emite `memory_chunk.promoted` audit.

**JTBD:** *"Quiero ver qué conoce el sistema en cada scope, promover/revertir chunks con confianza."*

**Lo que quiero discutir:**

1. **Editar contenido de un chunk** — hoy NO se puede. Solo promover/revertir (ya con UX). ¿Edit con sanitization debería existir o el flujo es "supersede via NEW chunk + retire old"?

2. **Sanitization checklist** — 4 checks (PII / credentials / scope / TTL). ¿Son los 4 correctos? ¿Falta algo (license/copyright, business sensitivity)?

3. **Test retrieval** — debería poder probar "si pongo este chunk como activo, qué sale en retrieval para query X?" antes de promover. Hoy no.

4. **Bulk supersede** — supersede 10 chunks con misma política. Hoy es 1 a la vez.

**Format final igual.**

---

## §12 · Vista: Admin Audit (`/admin/auditoria`)

**Background:** Tabla de 64+ audit events con filter (severity / actor / action contains) + paginación + export CSV.

**JTBD:** *"Quiero responder rápido '¿quién hizo qué cuándo?' + exportar para auditor externo."*

**Lo que quiero discutir:**

1. **Drill-down before/after diff** — hoy NO se puede ver el diff de un edit. Solo se ve action + target. Critical para auditoría real.

2. **Filter por rango de fechas** — falta. Solo filter por action substring.

3. **Anomaly detection** — "3 break-glass en 1 día = sospechoso". ¿UI debería highlight automáticamente patrones inusuales?

4. **Subscribe a alertas** — ¿"notificame si POLICY event ocurre"? Hoy no.

**Format final igual.**

---

## §13 · Vista: Admin Tenant (`/admin/tenant`)

**Background:** 6 secciones editables (identity SSO / retention / branding / flags / SMTP / backup) + Beta slice info + sección "📦 Tenant export" para LGPD compliance + manual backup trigger. Save por sección emite audit.

**JTBD:** *"Como owner, quiero configurar la organización + cumplir compliance LGPD + tener disaster recovery confiable."*

**Lo que quiero discutir:**

1. **6 secciones inline en una vista** — ¿es la organización correcta? O ¿debería ser sub-pages (`/tenant/identity`, `/tenant/branding`, etc.)?

2. **Save por sección vs save global** — hoy cada sección tiene su botón. Compará con: GitHub settings (per-section save), Stripe (auto-save inline), Notion (no save, todo se persiste).

3. **Tenant export con scheduled monthly** — ¿la opción "scheduled" debería ser configurable (semanal/mensual/trimestral) o "scheduled" es OK como una toggle?

4. **Branding solo permite editar 2 colores + logo URL** — ¿es suficiente? Compará con Linear theme (~10 vars) vs GitHub Enterprise branding (~5 fields).

**Format final igual.**

---

## §14 · Vista: Admin Connectors (`/admin/conectores`)

**Background:** Grid de 5 connectors (Postmark / Drive / SAPI / Helium10 / WhatsApp) con status (connected/disconnected/planned) + filter + Configurar modal 3 tabs (Credentials/Scope/Test connection) + emite `connector.enabled` audit.

**JTBD:** *"Quiero conectar / desconectar servicios externos y verificar que están vivos."*

**Lo que quiero discutir:**

1. **Disconnect flow no existe** — solo Configurar. ¿Debería ser un botón explícito o un step en el modal?

2. **Send log per connector** — para Postmark debería poder ver "últimos 50 emails enviados". Hoy no.

3. **Webhook setup para inbound** — el connector es OUT por default. Para Postmark INBOUND falta UI de webhook URL.

4. **Cost tracking per connector** — Postmark cuesta por email. ¿Debería verse usage + projected cost?

**Format final igual.**

---

## §15 · Vista: Ops Health (`/ops/health`)

**Background:** Tiles con containers (11 staging + 4 dev) + SLOs (p95 retrieval / availability / error rate) + 10 jobs últimas runs + 3 alerts activas + 20 tablas FROZEN + RLS debug snippet.

**JTBD:** *"Quiero un pulse-check en 30 segundos: ¿está todo vivo? ¿hay alertas? ¿falló algún job?"*

**Lo que quiero discutir:**

1. **Drill-down faltante en TODO** — click container → ¿logs? click SLO → ¿7d trend? click job → ¿output? Hoy todo es display.

2. **Acknowledge alerts** — hoy no se puede. Compará con PagerDuty / Datadog.

3. **Manual job trigger** — útil ("forzá consolidation_eval ahora") pero no existe.

4. **RLS debug snippet** — copy-able? Útil?

**Format final igual.**

---

## §16 · META · Cohesión del producto

**Esta es LA conversación más importante. Hacela primera.**

**Background:** FaberLoom v3.5 tiene 15 módulos rutados:

```
PRINCIPAL: Chat · Bandeja · Agentes · Workflows · Runs
CONSTRUCCIÓN: Skill Studio · Consolidaciones · Design System
GESTIÓN: Usuarios · Conocimiento · Auditoría · Tenant · Conectores · Ops Health
```

JTBD del producto entero: *"Que un equipo comercial B2B (3-15 personas) opere su día a día con agentes que aprenden, sin perder control sobre lo que el agente decide ni sobre lo que aprende."*

Personas:
- **Bruno** (operator de ventas) — usa día a día. Su success: cerrar más cotizaciones rápido sin meter la pata.
- **Ana** (admin que cubre Ops + Ventas) — gestión + aprobación. Su success: cero escalación a CEO + zero compliance issue.
- **Álvaro** (owner CEO) — aparece para break-glass + config + promote autonomy. Su success: ver evolución del producto + tomar decisiones críticas.

**Lo que quiero discutir con vos (Gemini):**

1. **¿15 módulos es el set correcto?** ¿Qué falta · qué sobra · qué fusionar?

2. **El balance Principal (5) / Construcción (3) / Gestión (6)** — ¿está bien que GESTIÓN sea el bloque más grande para una persona (Bruno) que NO va a usar nada de eso?

3. **Si tuvieras que matar 3 módulos** para v1 beta y ofrecerlos en v1.5, ¿cuáles?

4. **¿Hay un módulo que falta** y que es OBVIO una vez que ves el set actual? Por ejemplo: "Reports" o "Calendar integration" o "Onboarding wizard global" o "Settings personales".

5. **El default route es `/chat`** — ¿correcto para Bruno? ¿O para Bruno debería ser `/bandeja` (ya que su día es triage)?

6. **Distribución de poder** — ¿hay un riesgo de que Bruno se sienta NIÑERA del agente (todo el día aprobando drafts en bandeja)? ¿O el modelo "draft-first" es genuinamente liberador?

7. **El bloque Construcción (Skill Studio + Consolidaciones + Design System)** — design-system es para devs, no operadores. ¿Debería estar ESCONDIDO y solo accesible vía URL `/design`?

8. **Comparables** — pensá en 3 productos que conocés bien que tienen estructura similar (Linear · Front · Hubspot · Salesforce · Intercom · Notion · Slack · Pipedrive). ¿Qué pattern de navegación usan? ¿Cómo se compara el nuestro?

**Format final** (extra importante esta vez):

```
## Resumen META · cohesión del producto FaberLoom v3.5
**Estructura confirmada:** [qué del set actual te parece sólido]
**Estructura desafiada:** [qué cambiarías y por qué]
**Módulos sobrantes (kill list):** [3 + razón]
**Módulo faltante crítico:** [si existe]
**Default route ideal:** [chat / bandeja / otro · justificación]
**Riesgo principal de UX:** [el más grande que vés]
**Comparable directo más útil:** [1 producto + qué copiar]
**Top 3 acciones para Claude:** [patches al mockup ranked por impact]
**Top 3 acciones para Cowork:** [docs canónicos ranked]
```

---

## Quick reference

- Mockup path: `MWT KB/faberloom-mockup/index-standalone.html`
- Open con doble clic
- Default route `#/chat` · navega via sidebar
- Personas: Bruno operator / Ana admin / Álvaro owner
- Cambiar role/lang/theme en topbar para simular cada persona

---

## Nota final

Cada prompt está pensado para 15-25 min de conversación con Gemini. Si querés más profundidad, decile a Gemini al final: "Profundizá en el punto N", "dame 3 alternativas más", "qué haría [Linear / Notion / Stripe]", etc.

Si surge algo que NO está en el prompt original, anotálo aparte → me lo mandás → A7 lo captura.

**Total: 16 sesiones × 20 min promedio = ~5 horas de ideación con Gemini para cubrir todo el producto. Hacelo en 2-3 días, no en una sentada.**
