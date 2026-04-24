# Trazabilidad v3 · matrix de gaps cerrados

**Fecha:** 2026-04-19
**Método:** Cada row mapea un gap (B1 critical, A7 open question, brief request) → fragment(s) que lo cierran → status.

🟢 closed · 🟡 partial · 🔴 deferred

| # | Gap (origen) | Estado v2 | Cerrado por (v3) | Status |
|---|---|---|---|---|
| **B1 · 8 brechas críticas** | | | | |
| 1 | Bandeja outbox-only → 12 inbound types | 🔴 | `05_mock_data` +6 collections incl. `inboxItems`(12) · `10_module_bandeja_lista` polymorphic + saved-views · `11_module_bandeja_detail` `renderInboxItem` | 🟢 |
| 2 | Edit-with-AI ausente | 🔴 | `06_widgets` +`aiAssistToolbar`+`aiAssistChat` · `11_module_bandeja_detail` Edit btn → toolbar inline + escape a mini-chat | 🟢 |
| 3 | Workflows canvas read-only | 🔴 | `14_module_workflows_canvas` palette buttons add nodes + `animateRun()` | 🟡 (basic, no drag yet) |
| 4 | Admin Tenant display-only | 🔴 | `23_module_admin_tenant` 6 secciones editables + save emite audit | 🟢 |
| 5 | Onboarding agente invisible (L0→L1) | 🔴 | `13_module_agent_console` `renderSummary` Ready CTA + `openPromoteModal` + emite approval_request en bandeja | 🟢 |
| 6 | Postmark inbound no modelado | 🔴 | `inboxItems` con kind `inbound_email` (3 entries) | 🟢 (mock; real BSP integration pending) |
| 7 | Promote-to-base post-Active invisible | 🔴 | `16_module_consolidation` Active → "↑ Promover a base" → `promoteToBase()` → bump version + `agent_spec.published` audit | 🟢 |
| 8 | Approval chains entre usuarios no existen | 🔴 | `05_mock_data` `approvalChains` + `comments` collections · `11_module_bandeja_detail` `renderApprovalChain` + `renderComments` | 🟢 |
| **B1 · 8 importantes** | | | | |
| 9 | Skill Studio editar manual overlay | 🟡 | (sandbox embed via chatThread permite testing) | 🟡 (test sí, edit aún no commit) |
| 10 | Runs Timeline drill-down | 🟡 | (no cambios) | 🟡 |
| 11 | Admin Users invite + lifecycle | 🟡 | (Edit modal de v2 sigue) + LGPD download nuevo | 🟢 (edit + portability cubiertos) |
| 12 | Admin Knowledge editar chunk con sanitization | 🟡 | (3-step promote de v2 sigue) | 🟡 (promote sí, edit chunk aún no) |
| 13 | Admin Audit drill-down + filtro fecha | 🟡 | (no cambios) | 🟡 |
| 14 | Admin Connectors disconnect + send log | 🟡 | (config 3-tab de v2 sigue) | 🟡 |
| 15 | Ops Health drill-down container/SLO/job | 🟡 | (no cambios) | 🟡 |
| 16 | Multi-output bundle approval | 🔴 | `actionBundles` collection + `renderActionBundle` con N-action breakdown + aggregate risk | 🟢 |
| **A7 · 17 open questions** | | | | |
| 17 | C1 Feedback taxonomy reconciliation | 🔴 | `06_widgets` FeedbackModal: 5 UI reasons con tooltip + label `→ internal_code` mapping visible | 🟢 |
| 18 | C4 Cluster scope cross-skill | 🔴 | `06_widgets` ConsolidationModal: scope select 3-level (skill/cluster/org) | 🟢 |
| 19 | C5 Iteration auto-feedback policy | 🔴 | `06_widgets` IterationComposer: checkbox "Contar como feedback" default checked | 🟢 |
| 20 | C7 SLA breach window semantics | 🔴 | `06_widgets` SLABar: sustainedDays + sustainedThreshold con pivote-out indicator | 🟢 |
| 21 | C8 UserControlProfile structure | 🔴 | (Always-on en chat sigue plantilla; profile structure aún no expandido) | 🔴 (deferred to v3.5) |
| 22 | C9 Trigger_kind enum | 🔴 | `13_module_agent_console` header chip derivation triggerKind word/event/schedule | 🟢 |
| 23 | C10 5th scope pivote design partners | 🔴 | (decision pending real partners feedback) | 🔴 (deferred) |
| 24 | C11 Handoff packet UX | 🔴 | `11_module_bandeja_detail` Handoff button → modal con 8 P10 fields | 🟢 |
| 25 | C12 ModelFingerprint normalization | 🔴 | (decision pending — store policy; UI sigue mostrando per-message) | 🔴 (deferred) |
| 26 | C13 LearningHeat 4th state "gold" | 🟡 | Ya implementado v2 + formalizado en SkillPill icons | 🟢 |
| 27 | C14 Bandeja item polymorphism | 🔴 | Block 1 completo (gaps 1, 8 above) | 🟢 |
| 28 | C14 Approval chains branching + escalation | 🔴 | `approvalChains` mock + render chain timeline + due dates | 🟡 (no escalation auto-trigger) |
| 29 | C14 Multi-output bundle aggregate risk | 🔴 | `aggregateRisk` field + `max(reversibility)` UI semantics | 🟢 |
| 30 | C15 Chat primitive multi-agent per thread | 🔴 | (W.chatThread embebido sí, multi-agent en mismo thread aún no) | 🔴 (deferred) |
| 31 | C15 Chat primitive shared history standalone↔embed | 🔴 | (chatThread acepta conversationId; share funciona, pero falta sync bidireccional) | 🟡 |
| 32 | C16 Data portability per user (LGPD) | 🔴 | `20_module_admin_users` +section "Mis datos" + JSON download + audit | 🟢 |
| 33 | C16 Tenant export format + retention | 🔴 | `23_module_admin_tenant` +section "Tenant export" manual + scheduled | 🟢 |
| **Cross-cutting / new** | | | | |
| 34 | Bandeja saved-views URL pattern | nuevo v3 | `?view=triage|approve|mine|team|attention|all` con state push | 🟢 |
| 35 | Comments thread con @mention support visual | nuevo v3 | `renderComments` + add form | 🟢 (visual only) |
| 36 | Chat thread reusable primitive | nuevo v3 | `W.chatThread` deployed in 3 places | 🟢 |
| 37 | Workflow run animation | nuevo v3 | `animateRun()` secuencial 400ms | 🟢 |
| 38 | Tenant editable sections + audit | nuevo v3 | 6 secciones × save × audit | 🟢 |
| 39 | LGPD compliance entry point UX | nuevo v3 | "Mis datos" + "Tenant export" prominentes | 🟢 |
| 40 | Promote-to-base loop visible | nuevo v3 | Active → button → modal → version bump + audit | 🟢 |

---

## Resumen v3

- **🟢 cerrados:** 27
- **🟡 parciales:** 9
- **🔴 deferred (v3.5+):** 4 (C8 UserControlProfile · C10 5th scope decision · C12 ModelFingerprint normalization · C15 multi-agent per thread)

**Cobertura de las 8 brechas críticas B1: 8/8 cerradas (1 parcial: workflows drag aún básico).**

**Cobertura de A7 open questions: 13/17 cerradas o parciales · 4 deferred (todas requieren input externo: partners reales, decisiones de team, multi-tenant futuro).**

## Items que requieren live browser verification

- Hover highlight provenance ↔ GroundedIn (heredado v2)
- Workflow animation timing
- Modal focus trap escape
- Mobile breakpoints (820 / 1180)
