# E6 · Mesa de trabajo y revisión — diseño y contrato

**Fecha:** 15 de septiembre de 2026. **Estado:** implementado, probado e integrado
en el MCP (`src/board/index.js`).

La Mesa reúne resultados y excepciones que requieren atención. Separar **aprobar**
de **efectuar** es la regla central: aprobar no envía nada.

## 1. Elemento de la Mesa

```
{
  id, ownerId, spaceId, title, kind,
  status, revision,
  versions: [{ revision, result, evidence, links, at, by }],
  reviews:  [{ revision, decision, comment, at, by }],
  effects:  [{ revision, ref, at, by, authorizationRef }],
  stale, staleReason, executionId, createdAt, updatedAt
}
```

Estados: `in_progress`, `waiting_data`, `waiting_approval`, `approved`,
`completed`, `failed`, `reopened`, `needs_review`.

## 2. Operaciones

| Operación | Uso |
|---|---|
| `board.submit` | Envía un resultado a revisión (**exige evidencia real**) |
| `board.get` / `board.list` | Consulta |
| `board.review` | `approve` (versión exacta) o `correction` (nueva versión) |
| `board.requestData` | Excepción: faltan datos |
| `board.markStale` | Los datos cambiaron; la aprobación vigente queda obsoleta |
| `board.revalidate` | Revalida antes del efecto (`changed`) |
| `board.recordEffect` | Registra el efecto externo (exige autorización) |
| `board.reopen` / `board.fail` | Corrección posterior / fallo |

## 3. Reglas

- **Sin evidencia no hay «preparado»**: `submit` rechaza sin `evidence`
  (`NO_EVIDENCE`).
- **Aprobación por versión exacta**: `review approve` compara con `revision`;
  una versión vieja → `STALE_REVISION`. Una `correction` crea la versión
  siguiente y deja el elemento en `in_progress`.
- **Aprobar ≠ enviar**: `review approve` no produce efectos (`effects` queda
  vacío). El efecto se registra aparte con `recordEffect`, que **exige
  `authorizationRef`** (`NO_AUTHORIZATION`) y solo si la versión está aprobada,
  vigente y no obsoleta.
- **Revalidación (F09)**: `markStale` marca el elemento y, si estaba aprobado,
  vuelve a `waiting_approval`. Mientras esté obsoleto, aprobar o efectuar falla
  (`REVALIDATION_REQUIRED`). `revalidate({ changed:false })` lo despeja;
  `changed:true` mantiene la obsolescencia y exige una nueva revisión.
- **Reapertura**: un elemento aprobado/completado puede `reopen` para una
  corrección posterior, conservando historial y evidencia.

## 4. Persistencia

Tabla SQLite `board_items` (incremental `saveBoardItem`; también JSON/memoria).

## 5. Pruebas

`test/board.test.js` cubre **F16** (aprobar no envía; el efecto exige
autorización), evidencia obligatoria, aprobación por versión exacta, corrección
con nueva versión, **F09** (obsolescencia y revalidación), excepciones
(`requestData`, `reopen`) y persistencia SQLite.

## 6. Fuera de alcance (siguiente)

- Conectar la Mesa con las ejecuciones (crear el elemento al proponer un
  resultado) y con la autonomía (E7/E8).
- Adjuntar el documento real como blob al elemento (hoy guarda `result`/`links`).
