# E5 · Rutinas y ejecución persistente — diseño y contrato

**Fecha:** 15 de septiembre de 2026. **Estado:** implementado, probado e integrado
en el MCP (`src/routines/index.js`).

## 1. Conceptos

- **Rutina**: procedimiento reutilizable y **versionado** (borrador → activa →
  pausada). Guarda propietario, espacio, intención, disparadores, entradas, pasos,
  dependencias, resultado esperado, permisos y política de fallos.
- **Ejecución**: un recorrido concreto de una tarea con su estado por paso.
  Conserva la **versión de rutina** con la que empezó (una edición no cambia el
  recorrido en curso).

## 2. Rutina

`steps[]`: `{ id, type, instruction, agentId?, toolId?, dependsOn[], isEffect,
reconcileType?, revalidateType?, onMissingData }`.

- `type` es el handler registrado por el host (`registerStepHandler`), síncrono o
  asíncrono.
- `isEffect` marca pasos con efectos externos (se protegen con idempotencia).
- `revalidateType` se ejecuta al reanudar una espera para detectar datos viejos.
- `reconcileType` consulta el estado externo cuando hubo un timeout tras escribir.

`failurePolicy`: `{ onStepFailure: 'stop' | 'continue' }`.

## 3. Validación

`routines.validate` comprueba: dependencias existentes, **ciclos**, handlers
registrados, herramientas disponibles y agentes disponibles. `routines.activate`
y `executions.start` **rechazan** si falta algo (`ROUTINE_NOT_EXECUTABLE` /
`MISSING_CAPABILITY`) — no se finge un proceso ejecutable.

## 4. Motor de ejecución

- **Persistir antes del efecto**: el estado del paso se guarda *antes* de invocar
  el handler de un paso con efecto.
- **Idempotencia**: `executions.start` deduplica por `idempotencyKey` (la misma
  orden por dos canales → un caso con ambas evidencias en `sources`). Los efectos
  se guardan en un libro por clave `${executionId}:${stepId}`.
- **Recuperación**: si un paso con efecto quedó a medias, al reanudar se llama
  `reconcileType`; si el efecto ya existe se registra sin repetirlo; si no se puede
  reconciliar, la ejecución pasa a `needs_review` (no se reintenta a ciegas).
- **Esperas**: un handler puede devolver `{ waitFor: { type, key, timeoutAt } }`.
  El despachador `executions.tick({ now, events })` reanuda por evento o por
  tiempo (timeout → `WAIT_TIMEOUT`). Al reanudar, el handler recibe `ctx.event`.
- **Revalidación**: si un paso en espera declara `revalidateType`, al reanudar se
  compara el valor actual con el de la espera; si cambió → `REVALIDATION_CHANGED`.
- **Cancelar obsoleto**: un paso puede devolver `effect: { cancelledRef }` para
  marcar un efecto previo como cancelado.

## 5. Operaciones

| Operación | Uso |
|---|---|
| `routines.create` / `get` / `list` / `update` | Definición y versiones |
| `routines.validate` / `activate` / `pause` | Ciclo de vida |
| `executions.start` / `get` / `list` | Inicio (idempotente) |
| `executions.advance` / `resume` / `tick` | Avance, reanudación y despacho |
| `executions.effects` | Libro de efectos de la ejecución |
| `stepHandlers.register` | Handlers del host (no por MCP) |

Estados de ejecución: `pending`, `running`, `waiting`, `completed`, `failed`,
`cancelled`, `needs_review`.

## 6. Persistencia

Tablas SQLite `routines`, `executions`, `effects` (escritura incremental
`saveRoutine`/`saveRun`/`saveEffect`; también JSON/memoria). El estado sobrevive al
cierre de sesión y al reinicio del proceso.

## 7. Pruebas

`test/routines.test.js` cubre **F04** (editar crea versión), **F05** (ejecución
activa conserva su versión), **F06** (falta de capacidad), **F07** (idempotencia
por dos canales), **F08** (recorrido completo), **F09** (revalidación de precio),
**F10** (reinicio sin repetir efectos), **F11** (timeout tras escritura
reconciliado) y **F12** (cancelar seguimiento obsoleto), además de ciclos y
dependencias inválidas.

## 8. Fuera de alcance (siguiente)

- Disparadores reales de correo/servicio (el host los traduce a `events`).
- Migración explícita de una ejecución en curso a una versión nueva de la rutina.
