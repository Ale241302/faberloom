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
| `executions.migrate` / `previewMigration` | Migración explícita de versión |
| `events.ingest` | Entrada real de eventos (correo/servicio) |
| `sources.register` / `list` / `remove` | Fuentes por usuario (email/webhook) con token |
| `dispatcher.dispatch` | Despacho bajo bloqueo |
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

## 8. Disparadores reales (eventos)

Una rutina declara `triggers`:

- `manual`: solo por instrucción explícita.
- `event` / `email`: se disparan con un evento entrante. `source` filtra el canal
  (p. ej. `email`) y `match` compara campos con igualdad o expresión regular:
  `{ subject: { regex: 'orden de compra' }, from: 'cliente@x.com' }`.
- `date`: se dispara una vez cuando `now >= at`.
- `recurrence`: se dispara cada `intervalMinutes`.

`events.ingest(evento)` (y el endpoint HTTP `POST /events`) recibe eventos reales
que el host traduce desde correo/servicio (p. ej. un puente IMAP o una regla de
correo). Reanuda las esperas que coinciden y **lanza** las rutinas cuyos
disparadores coinciden, con **idempotencia por id de mensaje** (el mismo correo no
abre dos casos). `executions.tick({ now, events })` evalúa además fecha y
recurrencia.

```bash
# un puente de correo reenvía el mensaje al host:
curl -sS -X POST https://faberl-mcp/events \
  -H "X-Faberloom-Gateway-Key: $KEY" -H 'Content-Type: application/json' \
  -d '{"type":"event","source":"email","id":"msg-1","from":"cliente@x.com","subject":"Orden de Compra 123"}'
```

## 9. Migración de versiones

`executions.previewMigration` informa compatibilidad (pasos pendientes que ya no
existen → `unmappedSteps`). `executions.migrate` **solo** migra con confirmación,
conserva los pasos completados, añade los nuevos como pendientes y admite un mapa
`rename` para pasos renombrados. Si algún paso pendiente no existe y no se mapea →
`MIGRATION_INCOMPATIBLE` (no se migra a ciegas).

## 10. Fuentes por usuario y puente de correo

Cada usuario registra sus **fuentes** con `sources.register` (tipo `email` o
`webhook`); devuelve un **token** que solo se muestra al crearla. El endpoint
`POST /events` acepta:

- `X-Faberloom-Gateway-Key` (host/servicio) — puede indicar `userId` en el cuerpo.
- `Authorization: Bearer <token>` o `X-Faberloom-Source-Token` — resuelve el
  **usuario** de la fuente, sin clave de gateway. La ingesta solo dispara las
  rutinas de ese usuario.

**Puente IMAP** (`src/bridge/main.js`, `npm run bridge`): sondea los buzones de las
fuentes tipo `email` (cliente IMAP mínimo sin dependencias en `src/bridge/imap.js`),
convierte cada mensaje no visto en un evento (from, subject, `Message-ID` como id de
deduplicación) y llama a `events.ingest` con el usuario de la fuente. El secreto
IMAP vive en la configuración de la fuente.

```bash
FABERLOOM_BRIDGE_INTERVAL_MS=60000 npm run bridge
```

## 11. Bloqueo de despachador

`acquireLock` / `releaseLock` guardan un **lease** persistente (`dispatcher`,
`owner`, `expiresAt`). `dispatcher.dispatch`/`dispatchOnce` solo ejecuta el tick si
consigue el bloqueo, de modo que varios despachadores no procesan la misma cola a
la vez. El host lo programa periódicamente (`FABERLOOM_DISPATCH_MS`).

## 12. Estado

- **Bloqueo atómico**: `SqliteRepository.tryAcquireLock` resuelve el lease en una
  sola sentencia (`INSERT ... ON CONFLICT ... WHERE ...`), atómica en la base de
  datos; `releaseLock` solo borra si el titular coincide. Los repositorios de
  memoria/JSON usan el respaldo leer-y-escribir.
- **Adjuntos del correo**: el puente parsea MIME (`src/bridge/mime.js`; multipart,
  base64 y quoted-printable) y guarda cada adjunto en el almacén de blobs; el
  evento lleva `data.attachments: [{ fileName, mediaType, size, sha256, ref }]`.
  Una rutina puede vincular esos `ref` a un espacio.
