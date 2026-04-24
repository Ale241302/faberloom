# A5 — USER_ADMIN_KNOWLEDGE_FLOW Canon

**Source:** `C:\Users\alvar\OneDrive\Documentos\Claude\Projects\MWT KB\docs\SPEC_USER_ADMIN_KNOWLEDGE_FLOW_v1_BETA.md`
**Version:** 1.0 · **Status:** DRAFT · **Date:** 2026-04-19 · **Lines:** 683
**Authors:** "CEO + arquitecto (decisión sobre gaps residuales)"

---

## 1. Knowledge scopes (§2.1 "v1 beta: 4 niveles")

1. `global` — "FaberLoom base sealed"
2. `org` — "admin org sube"
3. `dept` — "admin depto sube o hereda"
4. `user` — "usuario autoría + sistema aprende (UserControlProfile)"

**business_entity_id (§2.2):** "NO es 5º scope formal en v1. Vive como metadata en AgentMemory":
- `scope_level = org | dept | user`
- `business_entity_type = account | opportunity | ticket | customer`
- `business_entity_id = nullable`
- `sharing_mode = private | dept_shared | org_shared`

**Pivote trigger (§2.3):** "Formalizar 5º scope solo si en los primeros 3 design partners ≥20-25% del conocimiento útil resulta ser 'por cliente / cuenta / oportunidad'."

**"private-by-default"** — verbatim at §5 line 289, §11 line 576 (invariant, not standalone definition).

---

## 2. Scope promotion mechanics

**Who can promote (§6 matrix + §5.1):**
- Promote-up user→dept: Tenant Owner Sí · Admin Sí · Operator No
- Promote-up dept→org: Tenant Owner Sí · Admin Sí · Operator No

**Required permission: `can_approve_promotion`** (§6.1). Delegable, Tenant Owner grants, 7 días.
"Knowledge Reviewer NO es rol formal en v1. Si hace falta, permiso granular `can_approve_promotion` sobre Admin" (§6.2).

**Supersede semantics (§7):**
- `memory_chunk.status = active | superseded | revoked`
- `supersedes_chunk_id`
- `visibility_active = false` "saca del retrieval"
- Reindex incremental async
- `promotion_event` y `revocation_event` auditan lineage
- **Rule verbatim:** "no borrar chunks promovidos, versionarlos"

**Rollback vs Revoke** — related but distinct:
- Revoke = state on chunk (`status = revoked`) + `revocation_event` audit
- Rollback = UX verb ("Revert sharing" / "Revoke promotion"), §9.6 "Rollback UX ≤3 clicks"
- `can_rollback_sharing` delegable 24h (§6.1)
- "Rollback: siempre auditado" (§6.2)

---

## 3. Consolidation pipeline

**State labels (§9.1 Knowledge Registry, verbatim):**
`candidate / active / archived / revoked`

**Brief requested "Archived/Reverted" — doc uses "revoked"**, not "reverted". "Reverted" appears only in §1.4 state machine for `merge_event` (`reverted_at`), not for memory chunks.

**Storage layer (§7):** chunk status = `active | superseded | revoked` (the Registry UI adds `candidate / archived` filters on top).

**Transition triggers:** [NOT IN DOC] — no explicit Candidate → Active trigger definition.

Implicit mechanics:
- Candidate learnings from "sistema aprende" (§2.1) + offboarding queue (§1.7)
- Promotion gated by `can_approve_promotion` + sanitization pipeline (§7.2)
- Active → Revoked via rollback UX (§9.6) / admin action

**Rollback UX (§9.6):** 3 clicks: "Abrir item → 'Revert sharing' o 'Revoke promotion' → Confirmar." Post: "badge `Revoked` + timestamp + actor + preview 'ya no participa en retrieval'."

**`consolidation_eval` cron:** [NOT IN DOC]. Closest: §7.1 "Default: 90 días de reuse antes de marcar para revisión" (TTL, not cron).

---

## 4. Feedback taxonomy

**[NOT IN DOC].** The 5 strings (`claim_sin_evidencia`, `tono`, `dato_incorrecto`, `accion_riesgosa`, `otro`) are entirely absent.

(A4 has a different set of 6 codes via P6: `tone · data · structure · policy · scope · context` — that's what ARCH_AGENT_PRINCIPLES actually declares.)

---

## 5. Learning Thermometer

**[NOT IN DOC]** in this SPEC. (A4 has it: "🔵 Frío (0-2)", "🟡 Tibio (3-5)", "🔴 Caliente (6+, urgente)".)

---

## 6. Skill 3-layer — overlay rules

**Layers (§2.4 storage table):**
- Base sealed → `agent_spec_base`
- Overlay manual org → `agent_spec_overlay_manual`
- Overlay aprendido → `agent_spec_overlay_learned`

Plus: `memory_document`/`memory_chunk`, `memory_example` (gold), `user_control_profile`, business-context items.

**TTL (§7.1, verbatim):**
- "Default: 90 días de reuse antes de marcar para revisión"
- "Configurable por skill en rango 30-180:"
  - Skills volátiles (campañas estacionales): **30 días**
  - Skills estables (compliance, fiscal): **180 días**
  - Skills cotización B2B: **90 días (default)**

**Review vs consolidate:** 90d clock triggers "marcar para revisión" (review gate), not auto-expiry. Consolidation/promotion still requires `can_approve_promotion` + sanitization (§7.2).

**Candidate → Active gate:**
- Approver: Tenant Owner or Admin with `can_approve_promotion`
- Sanitization (§7.2): PII regex, redacción nombres propios, redacción `business_entity_id`, quita secretos canal, review humano si `confidence_score sanitizer < 0.95`.

---

## 7. Roles: Owner / Admin / Operator (§6 matrix)

**Private-by-default:**
- Tenant Owner: No por default leer user-private ajeno
- Admin: No por default
- Operator: No

**Break-glass (§1.10 + §6.1):**
- `support_impersonation` — 8 h
- "1 cuenta Tenant Owner break-glass por org, creada en onboarding, fuera de Entra / Google"
- "MFA fuerte + uso auditado"
- Audit: §12.1 control 1 "Audit log estructurado: actor, action, resource, before_state, after_state, timestamp — obligatorio en sharing / promotion / role change"

**Full permissions matrix (§6):**

| Permission | Owner | Admin | Operator |
|---|---|---|---|
| Configurar identity mode | Sí | Sí | No |
| Conectar/desconectar directory | Sí | Sí | No |
| Invitar/suspender usuarios | Sí | Sí | No |
| Asignar `role_in_faberloom` | Sí | Sí | No |
| Crear/editar org knowledge | Sí | Sí | No |
| Crear/editar dept knowledge | Sí | Sí | Sí (solo su dept) |
| Crear/editar user-private | Sí (propio) | Sí (propio) | Sí (propio) |
| Leer user-private ajeno | No default | No default | No |
| Aprobar promote-up user→dept | Sí | Sí | No |
| Aprobar promote-up dept→org | Sí | Sí | No |
| Revocar knowledge compartido | Sí | Sí | No |
| Activar/desactivar cross-skill propagation | Sí | Sí | No |
| Ver audit log resumido | Sí | Sí | No |
| Ver audit log técnico | Sí | Sí | No |
| Exportar conocimiento org | Sí | Sí | No |
| Usar break-glass recovery | Sí | No | No |
| Rollback de sharing/promoción | Sí | Sí | No |
| Impersonación de soporte | Sí (time-bound) | Sí (time-bound) | No |

**Delegable permissions (§6.1):**
- `can_approve_promotion` — Owner → 7 días
- `can_view_audit_technical` — Owner → 24 h
- `support_impersonation` — Owner → 8 h
- `can_manage_directory_sync` — Owner → 24 h
- `can_rollback_sharing` — Owner → 24 h

---

## 8. RLS session variables

**[NOT IN DOC]** — no `SET LOCAL app.*` enumeration.

What doc says (§1.9):
- "v1: Postgres RLS nativo"
- "Tablas flatten: `membership`, `group_membership`, `content_acl`"
- "Helper functions SQL chicas y estables"
- "Políticas por tabla, no combinaciones exóticas scope × rol × feature × source"
- "Envolver `auth.uid()` / `auth.jwt()` en `select` para que el planner cachee"
- "Indexar columnas usadas por RLS"

**Pivote-out thresholds (§1.9):** >30 políticas RLS distintas en una sola tabla · p95 retrieval > 300ms 7 días sostenido · formalización 4+1 scope.

Break-glass at SQL session level: [NOT IN DOC]. Only at identity level (§1.10). (A1 has the `SET LOCAL app.*` enumeration from SPEC_FABERLOOM_ARCHITECTURE.)

---

## 9. i18n scope

**[NOT IN DOC].** No language declaration, no "332+ keys" figure.

Indirect: §10.1 regulatory countries: Brasil (LGPD), México (LFPDPPP), Colombia (Ley 1581), Perú (Ley 29733) — implies ES-LATAM + PT-BR reach.

---

## 10. Leakage tests

**Suite:** `tests/leakage/` in pytest (§8).

**10 minimum cases v1 (verbatim):**
1. Usuario org A jamás ve chunk org B
2. User-private no aparece a otro user de la misma org
3. Dept MX no recupera dept CO
4. Org-shared aparece a users autorizados
5. `business_entity_id` filtra correctamente
6. Promote-up revocado deja de salir en top-k
7. Fallback de admin no abre user-private
8. Cross-skill no salta de scope sin review
9. P12 cross-dept no hace auto-propagación (solo review)
10. `business_entity_id` con ACL distinta filtra correctamente aunque dept match

**CI gate:** "Gate CI pre-release. Si falla, no hay merge a main." · DoD: "leakage suite green".

---

## 11. Exact quotes

1. "private-by-default"
2. "Regla: no borrar chunks promovidos, versionarlos."
3. "directory manda identidad; FaberLoom manda autorización."
4. "Knowledge Reviewer NO es rol formal en v1."
5. "Break-glass recovery" / "Usar break-glass recovery"
6. "MFA fuerte + uso auditado"
7. "Revert sharing"
8. "Revoke promotion"
9. "ya no participa en retrieval"
10. "¿Por qué salió así?" (§9.3 Overlay Resolver panel)
11. "Guardar como contexto · Convertir en patrón · Promover · Propagar a skills marcadas (discreto)"
12. "Gate CI pre-release. Si falla, no hay merge a main."
13. "leakage suite green"
14. "Controles anti-Admin-dios" (§6.2 heading)
15. Status pills: "candidate / active / archived / revoked"
16. Identity modes: "Local / OIDC / Directory read-only"
17. "Impersonación: permiso temporal ≤8 h"
18. "Progressive disclosure. NO matriz completa de 60+ celdas por default."

**Note:** "Gate humano" is [NOT IN DOC] (A4 has it). Status vocab is `revoked` not `reverted` (A4 has "Reverted" in skill pipeline).

---

## 12. Gaps

1. Consolidation: no Candidate→Active trigger spec; no `consolidation_eval` cron; `archived` only a Registry filter
2. Feedback taxonomy: 5 typed reasons entirely absent
3. Learning Thermometer: not present
4. Overlay expire-vs-consolidate branching: 90d triggers review, no separate expire vs consolidate paths
5. Role permissions gaps: no rows for drafts authoring, skills authoring, feedback review
6. RLS session variables: no `SET LOCAL app.*` enumeration
7. i18n scope: no languages, no "332+ keys"
8. "Gate humano" verbatim phrase absent
9. Status "reverted" vs "revoked" mismatch with brief
