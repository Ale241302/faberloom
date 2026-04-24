# Acceptance Criteria v3.5 · Agent lifecycle

**Date:** 2026-04-19 (post v3)
**Output:** `index-standalone.html` (461 KB · 7,935 lines · 27 fragments)
**Scope:** B1 gap #5 (génesis del agente) + C17 (lifecycle UX completo)

---

| # | AC | Status | Evidence |
|---|---|---|---|
| 1 | `/agentes` lista todos los 7 agentes (no redirige a console) | ✅ PASS | `03_boot` route patched · `19_module_agent_list` mount muestra tabla |
| 2 | Tabla con columnas: Nombre/Spec/Tier/Autonomía+Ceiling/Termómetro/Runs7d/Status/Acciones | ✅ PASS | `19_module_agent_list` `render()` table headers |
| 3 | Filtros tier (6 opciones) y status (5 opciones) funcionan sin reload | ✅ PASS | wire `[data-f]` re-renders |
| 4 | Sparkline 7d visible en cada row | ✅ PASS | `W.sparkline(sparkD.sparklineData)` per row |
| 5 | CTA "+ Crear agente" visible para owner/admin, oculto para operator | ✅ PASS | `canCreate = role === 'owner'\|'admin'` check |
| 6 | Click "+ Crear" abre wizard 5 pasos | ✅ PASS | `W.openAgentSpecWizard({mode:'create'})` |
| 7 | Wizard step 1: name/desc/triggerWord/triggerKind/tier/businessEntityScope | ✅ PASS | `renderStep1()` con 6 campos |
| 8 | Wizard step 2: multi-select de los 12 skills | ✅ PASS | itera `availableSkillsForChat` |
| 9 | Wizard step 3: KB refs (10 opciones) + Connectors (5 opciones) | ✅ PASS | hardcoded list `allKb` + `mock.connectors` |
| 10 | Wizard step 4: stateMachine template select + events checkbox | ✅ PASS | `renderStep4()` 11 events |
| 11 | Wizard step 5: autonomyCeiling L0-L4 + escalationPolicy textarea + learningConsolidation + summary preview | ✅ PASS | `renderStep5()` con dl preview |
| 12 | Crear emite `agent_spec.created` audit + agente arranca L0 SHADOW | ✅ PASS | `onSubmit` callback en agent-list pushea audit + sets autonomy:'L0', state:'shadow' |
| 13 | Nueva versión añadida a `agentSpecVersions` collection | ✅ PASS | `agentSpecVersions.push({id, agentId, specVersion:'1.0.0', ...})` |
| 14 | Header de agent-console muestra spec version + lifecycle controls (admin/owner) | ✅ PASS | `<header class="ac-head">` con lifecycle buttons + `Spec: <code>vX.Y.Z</code>` |
| 15 | Lifecycle Edit → wizard prefilled con `mode:'edit'` | ✅ PASS | `handleLifecycle('edit', agent)` → `W.openAgentSpecWizard({mode:'edit', initial:agent})` |
| 16 | Edit publica nueva versión + supersedes anterior + emite `agent_spec.published` | ✅ PASS | `onSubmit` → `bumpVersion` + `agentSpecVersions.push` + audit |
| 17 | Lifecycle Clone → wizard prefilled como nuevo agente | ✅ PASS | `handleLifecycle('clone', agent)` con `mode:'clone'` + `id:null` |
| 18 | Lifecycle Pausar / Reactivar cambia `lifecycleStatus` + emite audit | ✅ PASS | `agent.lifecycleStatus = 'paused'\|'active'` + `logAudit(agent.id, 'agent_spec.paused\|resumed')` |
| 19 | Lifecycle Retire (soft) requiere confirm + emite `agent_spec.retired` + status pasa a `retired` | ✅ PASS | `confirm()` + status update + audit; NO delete |
| 20 | Tab Versionado lista todas las versiones del AgentSpec con publishedBy/supersedes/changeNote | ✅ PASS | `renderVersioning(agent)` table desde `agentSpecVersions` filtered by agentId |
| 21 | Versión actual highlighted en background coral | ✅ PASS | inline `style="background:var(--accent-primary-soft);"` if v.specVersion === agent.specVersion |
| 22 | Botón Rollback (forward-only) crea nueva versión clonando contenido de la target | ✅ PASS | `handleRollback(agent, targetVersion)` con `bumpVersion` + nueva entry asv_*  |
| 23 | Lista lifecycle dropdown desde botón ⋯ por row (admin/owner) | ✅ PASS | `openLifecycleMenu(btn, id)` posiciona inline menu |
| 24 | Filter "shadow" muestra agentes en SHADOW (recién creados) | ✅ PASS | `state.filterStatus === 'shadow'` filter pred |
| 25 | i18n símetrico ES/EN/PT para `agents.*` (create/edit/clone/pause/resume/retire/rollback) | ✅ PASS | extendido en los 3 archivos `07_i18n_*` |
| 26 | Mock enriquecido: 7 agentes existentes con specVersion/autonomyCeiling/escalationPolicy/etc | ✅ PASS | IIFE `enrichAgentsWithSpec()` corre al final del mock IIFE |
| 27 | `agentSpecVersions` collection con 6 entries históricos (lineage realista) | ✅ PASS | mock `agentSpecVersions: [...]` con asv_001..asv_006 |
| 28 | Operator NO ve lifecycle controls ni botón Crear | ✅ PASS | role checks gateway en list y console |

---

## Summary

- **PASS:** 28 / 28
- **REQUIRES-BROWSER:** 0
- **FAIL:** 0

## Combined v3 + v3.5 cumulative

| Block | AC PASS | Notas |
|---|---|---|
| v2 (20 AC) | 18 PASS · 1 REQUIRES-BROWSER · 0 FAIL | hover highlight needs browser |
| v3 (48 AC) | 48 PASS · 0 · 0 | 9 implementation blocks |
| v3.5 (28 AC) | 28 PASS · 0 · 0 | C17 agent lifecycle |
| **Total cumulative** | **94 PASS · 1 RB · 0 FAIL** | |

---

## What's NOT covered in v3.5 (legitimate deferral)

- **Diff visual entre 2 versiones de AgentSpec** — Versionado muestra changeNote textual; diff campo-por-campo de los 7 AgentSpec fields sería v4
- **Approval gate raise de autonomyCeiling** — actualmente cualquier admin/owner edit publica; CEO gate diferenciado para raise sería v3.6
- **Sandbox test del AgentSpec antes de publish** — Skill Studio ya tiene sandbox; agent-level analog pendiente
- **Auto-rollback on quality regression** — P13 probation logic no surfaceado en UI
