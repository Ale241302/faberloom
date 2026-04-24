# B0 — Audit Methodology Framework

**Date:** 2026-04-19
**Status:** living document · framework para auditar el sistema FaberLoom desde la lente de usuario + interacciones
**Purpose:** Documentar QUÉ tipo de profesional ve los detalles de UX/arquitectura del sistema, y CÓMO se audita sistemáticamente con esa visión.

Este doc justifica y enmarca toda la **serie B** (B1 service blueprint, B2 persona journeys, B3 heuristic audit, B4 edge case matrix, B5 cross-concern audits).

---

## La disciplina

Lo que se necesita para ver el sistema "desde dentro, enfocado en usuarios y sus interacciones, manteniendo integridad arquitectónica" se llama **Service Design + UX Architecture**.

Empaquetado bajo títulos distintos según tamaño y madurez de la organización:

| Org type | Título típico |
|---|---|
| Design-mature (Microsoft, Atlassian, Stripe) | **Principal Product Designer** · **Staff Product Designer** |
| Consultoras / orgs con disciplinas separadas | **Service Designer** (mapea end-to-end del servicio) + **Information Architect** (estructura) |
| Orgs híbridas | **Product Architect** · **Experience Architect** (títulos raros pero existen) |
| B2B con sistemas de agentes (emergente 2025-2026) | **AI Interaction Designer** · **Agent UX Architect** |
| Tu tamaño (CEO + arquitecto técnico) | Vos lo hacés sin nombrarlo · este framework lo formaliza |

### Diferencia con un product designer "normal"

- **Product designer normal / visual designer:** diseña pantallas, componentes, interacciones puntuales. Output: Figmas, prototypes, design system pieces.
- **Service designer / UX architect:** diseña el **sistema de interacciones entre todos los actores y todos los touchpoints**. Los pixels son consecuencia, no objetivo. Output: blueprints, journey maps, heurísticas, decisiones cross-cutting.

### El sub-rol nuevo: AI Interaction Designer

En B2B con agentes (lo que es FaberLoom) se está consolidando un rol específico que cubre cosas que no existían en SaaS clásico:

- Provenance UX (cómo mostrar de dónde sacó algo el agente)
- Autonomy ladder UX (cómo el usuario entiende que el sistema aprende y por qué cambió de comportamiento)
- Draft-first como first-class pattern (no como feature de seguridad escondida)
- Handoff packets entre agentes (visualización de P10)
- Trust calibration (cuándo confiar, cuándo verificar)
- Failure graceful (qué pasa cuando el agente alucina)

Cursor, Anthropic, Vercel ya tienen este rol explícitamente. Es la disciplina más nueva y la que más impacta a productos como FaberLoom.

---

## Metodología de auditoría sistemática (toolkit)

Para auditar el sistema completo con esta visión, sin contratar un equipo de 5 specialists, existe un toolkit estandarizado. Listado en orden de ROI para FaberLoom:

### 1. Service Blueprint (artefacto madre) → **B1**

Matriz que mapea cada touchpoint del sistema en 4 capas paralelas:

| Capa | Qué captura |
|---|---|
| **Frontstage** | Lo que el usuario ve / toca (pantalla, mensaje, botón) |
| **Backstage** | Lo que el agente / sistema hace internamente (LLM call, retrieval, validator) |
| **Supporting** | Infra que sostiene (DB write, audit log, RLS check, queue) |
| **User actions** | Lo que el usuario decide hacer (aprobar, editar, esperar, abandonar) |

Para FaberLoom: cada uno de los 14 módulos es una columna; cada interacción es una fila.

**Cuándo descubre cosas:** dónde **falta un touchpoint frontstage para algo que pasa backstage** (ej: el usuario nunca se entera cuando un consolidation_eval corrió y produjo candidatos — eso pasa en backstage sin notificación frontstage).

**Output artefacto:** `B1_SERVICE_BLUEPRINT.md` (vivo, se actualiza con cada feature).

### 2. Persona Journey Maps → **B2 (pendiente)**

Para cada persona crítica, dos journeys:
- **Día normal:** arranca el día, qué abre primero, en qué orden, por qué
- **Día de excepción:** hay una escalación / un cliente angry / un agente que falla / break-glass

Para FaberLoom las personas mínimas son:
- **Bruno** (operator de Ventas Muito Work) — el día a día
- **Ana** (admin que cubre Ops + Ventas, segundo decisor en aprobaciones) — gestión + aprobación
- **Álvaro** (owner, raramente usa el día a día pero entra para break-glass / config) — gobernanza

3 personas × 2 días = **6 journeys**.

Cada journey termina con su **fricción log**: cada momento donde el usuario duda, retrocede, re-tipea, abre otra tab, o abandona.

**Output artefacto:** `B2_PERSONA_JOURNEYS.md`.

### 3. JTBD Reframing por módulo → integrado en B1 §"Module blueprints"

Para cada uno de los 14 módulos, hacé esta pregunta: **"¿Qué job está hiring el usuario cuando entra acá?"**

Ejemplos del blueprint actual:
- Bandeja: el job NO es "ver lista de drafts". Es **"limpiar lo que necesita mi atención antes del mediodía"**
- Skill Studio: el job NO es "editar overlays". Es **"entender por qué el agente sigue cometiendo el mismo error y arreglarlo de raíz"**
- Admin Audit: el job NO es "ver event log". Es **"saber si alguien hizo algo que rompió las reglas, rápido"**

Cuando reframás el módulo desde el job, descubrís que la implementación actual sirve sólo X% del job.

### 4. Heurísticas Nielsen 10 + 5 AI-specific → **B3 (pendiente)**

**Las 10 clásicas Nielsen:**
1. Visibility of system status
2. Match between system and real world
3. User control and freedom
4. Consistency and standards
5. Error prevention
6. Recognition rather than recall
7. Flexibility and efficiency of use
8. Aesthetic and minimalist design
9. Help users recognize, diagnose, recover from errors
10. Help and documentation

Las aplicás módulo por módulo y rankeás severidad 1-4 (cosmetic / minor / major / catastrophic).

**Las 5 nuevas para sistemas con agentes (NN/g + Anthropic 2024-2025):**
1. **Trust calibration** — ¿el usuario sabe cuánto confiar en cada output?
2. **Provenance visibility** — ¿puede ver de dónde sacó eso el agente?
3. **Reversibility transparency** — ¿sabe qué pasa si dice "sí"?
4. **Autonomy graduality** — ¿entiende que el sistema aprende y por qué cambió de comportamiento?
5. **Failure graceful** — ¿qué pasa cuando el agente alucina o se equivoca?

**Output artefacto:** `B3_HEURISTIC_AUDIT.md` con tabla módulo × heurística × severidad.

### 5. Edge Case Matrix por flow crítico → **B4 (pendiente)**

Por cada flow principal (ej: "aprobar cotización con descuento"), enumerás todos los estados posibles:

| Estado | Pregunta | Hoy en mockup |
|---|---|---|
| **Empty** | ¿Qué ve el user si no hay drafts? | Cubierto |
| **Loading** | ¿Qué ve mientras espera? | Cubierto |
| **Error** | ¿Qué pasa si algo falla? | Cubierto |
| **Slow** | ¿Qué pasa si tarda 8 segundos? | NO cubierto |
| **Offline** | ¿Sin internet, file:// o conexión cortada? | NO cubierto |
| **Stale** | ¿El draft expiró mientras lo miraba? | NO cubierto |
| **Concurrent** | ¿Ana lo aprobó al mismo tiempo? | NO cubierto |
| **Permission revoked mid-flow** | ¿Su rol cambió mientras editaba? | NO cubierto |
| **Role-mismatch** | ¿Intenta hacer algo que su rol nuevo no permite? | NO cubierto |

Hoy el mockup cubre Loaded + Empty + Loading + Error. **Faltan los 5-6 escenarios más realistas.**

**Output artefacto:** `B4_EDGE_CASE_MATRIX.md` con flows demo-críticos × 9 estados cada uno.

### 6. Cross-cutting Concern Audit → **B5 (pendiente)**

Por cada concern transversal, una auditoría dedicada que pasa por todos los módulos:

| Concern | Pregunta |
|---|---|
| **i18n coverage** | ¿Cada string en cada módulo tiene `data-i18n`? |
| **Audit trail integrity** | ¿Cada acción mutativa emite audit_event? |
| **Role permission** | ¿Cada módulo respeta la matrix de A5? |
| **Keyboard accessibility** | ¿Cada interacción es alcanzable sin mouse? |
| **Error recovery** | ¿Cada error tiene path para "salir vivo"? |
| **Telemetry P8** | ¿Cada acción crítica emite las métricas requeridas? |

Cada uno produce un reporte tipo `B5_concern_X.md` con check por módulo.

**Output artefactos:** 6 reportes (B5_concern_i18n / B5_concern_audit_trail / B5_concern_role_perm / B5_concern_keyboard / B5_concern_error_recovery / B5_concern_telemetry).

### 7. Service Ecology Map → integrado en B1 §"Service ecology map"

Donde FaberLoom intersecta con otros sistemas externos (Postmark, WhatsApp BSP, CRM, ERP, Calendar, Drive/Notion, Slack, identity providers).

Por cada boundary: qué handoff hay, qué se pierde en la traducción, dónde podría romperse, qué pasa si el sistema externo está caído.

---

## Gobernanza del proceso de auditoría

Para que esto NO se vuelva burocracia muerta, recomendaciones operativas para FaberLoom dado el tamaño actual:

### Cadencia

| Frecuencia | Actividad |
|---|---|
| **Mensual** | Revisión del Service Blueprint (B1) — ¿qué touchpoints nuevos / qué gaps cerrados? |
| **Semanal** | Walk-through de un journey (B2) — pickear uno de los 6 journeys y caminarlo |
| **Por release** | Heuristic audit (B3) del módulo nuevo o modificado |
| **Por release** | Edge case check (B4) del flow afectado |
| **Por release** | Cross-concern gates (B5) corren como CI gates antes de mergear |
| **Cuando aparezca un gap nuevo** | A7 contradiction log entry (no esperar) |

### Ownership

Para no diluir responsabilidad, asignar dueños explícitos:

| Concern | Owner sugerido |
|---|---|
| Service blueprint integrity | Vos (CEO / Product Architect) |
| Persona journeys + fricción | Vos · luego pasarlo a un product manager cuando lo haya |
| Heuristic audit | Quien implemente el módulo (self-audit) + vos como reviewer |
| Edge case matrix | Engineering lead (porque la mayoría de gaps son técnicos) |
| Cross-concern audits | Cada concern un dueño: i18n / audit-trail / role-perm / a11y / error-recovery / telemetry |
| Contradictions log (A7) | Vos · cualquiera puede proponer entries |

### Gates pre-release

Antes de cada release publicado:
- [ ] B1 actualizado con módulos nuevos / cambios cross-cutting
- [ ] B3 corrido sobre módulos modificados — 0 críticos sin resolver
- [ ] B4 cubre los 9 estados para flows nuevos
- [ ] B5 gates en CI pasan para los 6 concerns
- [ ] A7 contiene cualquier nueva contradicción surfaceada

### Escalation triggers

Cuándo elevar de "iteration normal" a "stop and decide":
- Un gap cruza 2+ módulos (decisión arquitectónica)
- Una contradicción afecta cómo está modelado un canon (SPEC update)
- Una heurística catastrophic-severity aparece (bloquea release)
- Un cross-concern falla en >30% de módulos (bug sistémico)

---

## El framework como producto interno

Este toolkit (B0-B5) **es el producto interno** que sostiene la calidad del producto externo (FaberLoom).

Sin él:
- Las decisiones se toman ad-hoc, se pierden en chats, se re-debaten 6 meses después.
- Los gaps se descubren por usuarios reales en producción (caro).
- La integridad arquitectónica deriva — cada nueva feature inconsistente con las anteriores.

Con él:
- Las decisiones quedan documentadas con contexto + open questions (A7 + B0-B5).
- Los gaps se descubren en blueprints/journeys/heurísticas (barato — no llegan a usuario).
- La integridad se mantiene por gates explícitos.

Esto es lo que en orgs grandes hace **Design Ops**: la disciplina que sostiene el meta-sistema. En orgs chicas, lo hace el founder / el architect / cualquiera con el rigor para hacerlo. Acá lo hacemos vos + yo en sesiones como esta.

---

## Cómo usar la serie B

| Doc | Cuándo se produce | Cuándo se actualiza |
|---|---|---|
| **B0** (este) | UNA vez al inicio del programa de auditoría | Si cambia la disciplina/metodología (raro) |
| **B1** Service Blueprint | UNA vez al inicio + después de cada module add | Mensualmente o por release |
| **B2** Persona Journeys | Una vez por persona crítica | Cuando aparece persona nueva o flow cambia drásticamente |
| **B3** Heuristic Audit | Por módulo, en cada iteración mayor | Cuando el módulo cambia |
| **B4** Edge Case Matrix | Por flow demo-crítico | Cuando se agrega flow o aparece edge case nuevo |
| **B5** Cross-concern audits | Por concern, recurring | Cada release (CI gate) |

---

## Bottom line del meta-doc

La pregunta que originó este framework — *"¿qué profesional ve estos detalles y cómo audita el sistema con esa visión?"* — tiene respuesta concreta:

**Profesional:** Service Designer / UX Architect / AI Interaction Designer (con título variable según org).

**Cómo:** Toolkit B0-B5 que cubre 7 técnicas (service blueprint, journey maps, JTBD reframing, heurísticas, edge cases, cross-concern audits, ecology maps) + cadencia + ownership + gates.

**Para vos hoy:** Este framework lo aplicás vos (con asistencia mía) en sesiones de iteración como las últimas. El producto del framework son los docs B1-B5 + A7. El producto del producto es FaberLoom siendo coherente.

Cada vez que volvemos a iterar sobre experiencia de usuario y arquitectura del sistema, el ciclo es:
1. Identificar el gap (sesión de pensamiento conjunto)
2. Documentar la decisión (A7 entry o B-doc update)
3. Implementar en mockup cuando me lo digas (NUNCA antes de tu autorización)
4. Cerrar el loop (verification + audit)

Eso es el método. Lo demás es disciplina.
