# E7 · Memoria, aprendizaje y autonomía — diseño y contrato

**Fecha:** 15 de septiembre de 2026. **Estado:** implementado, probado e integrado
en el MCP (`src/learning/index.js` y `src/access/index.js`).

Dos memorias: **historia del caso** (no se borra) y **conocimiento vigente**. Y una
regla central: **aprobar o aprender nunca concede permiso**.

## 1. Enseñanzas (conocimiento vigente)

```
{
  id, ownerId, scope: { spaceId?, agentId?, taskType? }, kind: 'error'|'preference'|'requirement',
  status: 'candidate'|'active'|'superseded'|'revoked',
  version, versions: [{ version, text, at, by, status }],
  provenance: { source, ref, caseId, executionId, itemId, author },
  createdAt, updatedAt
}
```

- `learning.propose` → **candidata**; `learning.activate` la activa (instrucción
  explícita dentro del alcance).
- `learning.edit` → **nueva versión**; la anterior queda `superseded` (historia
  intacta).
- `learning.revoke` → deja de recuperarse; historia y usos se conservan.
- `learning.retrieve(scope)` → solo las **activas del alcance** (no mezcla
  clientes) y **registra el uso** con la versión aplicada.
- `learning.usages(teachingId)` → trazabilidad de usos por versión.
- `learning.recordLateError` → error posterior: nueva enseñanza `error` vinculada
  al caso original (`provenance.ref`).

## 2. Desempeño contextual

`learning.recordOutcome({ agentId, spaceId, taskType, outcome, lateError,
reviewMs })` con `outcome ∈ approved | corrected | error | requirement_change`.
`learning.performance(...)` agrega: aprobados, correcciones, errores, **errores
tardíos**, cambios de requisito, tasa de corrección y tiempo medio de revisión.
`requirement_change` **no** cuenta como fallo del agente. Si la muestra es pequeña
(< 5) se marca `evidence: "insuficiente"`; **no** se inventan porcentajes de
confianza.

## 3. Autonomía (concesiones)

```
grant = { id, ownerId, agentId, action, context, status: active|revoked|expired,
          expiresAt, maxUses, uses, reason, grantedBy, createdAt, updatedAt }
```

- `access.grant` concede por **acción, agente y contexto**; `access.revoke` la
  retira; `access.check` la valida antes de un efecto (`NO_GRANT`,
  `GRANT_REVOKED`, `GRANT_EXPIRED`, `GRANT_EXHAUSTED`, `OUT_OF_CONTEXT`);
  `access.consume` suma usos.
- Es **independiente** de la confianza y del aprendizaje.

## 4. Mesa ↔ autonomía

La Mesa valida el `authorizationRef` contra las concesiones
(`BoardService({ authorize })`): **aprobar no crea ninguna concesión**; el efecto
solo se registra si existe una concesión válida para `action: "board.effect"` y el
contexto del elemento. Una concesión de otro elemento no sirve (`OUT_OF_CONTEXT`).

## 5. Persistencia

Tablas SQLite `teachings`, `teaching_usages`, `outcomes`, `grants` (incremental;
también JSON/memoria).

## 6. Pruebas

`test/learning.test.js` cubre **F13** (recuperación por alcance sin contaminar),
**F14** (cambio de requisito ≠ fallo), **F15** (error posterior vinculado sin
borrar el pasado), **F32** (exportar/importar conserva versiones y **no** restaura
permisos), **F36** (editar/revocar con historia y usos) y persistencia SQLite.
`test/access.test.js` cubre concesiones (contexto, expiración, agotamiento,
revocación) y **Mesa ↔ autonomía**.

## 7. Fuera de alcance (siguiente)

- Extracción automática de enseñanzas desde una corrección (hoy se proponen).
- Promoción de una excepción de un cliente a una base común (requiere revisión de
  alcance y permisos).
