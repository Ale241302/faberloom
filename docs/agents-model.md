# E4 · Agentes y política de modelos — diseño y contrato

**Fecha:** 15 de septiembre de 2026. **Estado:** implementado y probado
(`src/agents/index.js`) e integrado en el MCP.

Núcleo independiente del harness: pool de modelos, catálogo de agentes con
versiones y una política de modelo por agente con **resolver** y **recomendador**
comunes. Contrato `run(operation, params)` → `{ok,data}` / `{ok:false,error}`.

## 1. Modelo del pool

`Model`: `{ id, provider, name, capabilities:{vision,tools,structuredOutput,longContext,reasoning}, contextLimit, outputLimit, available, pricing:{input,output,cacheInput?,currency,unit}, priceSource, priceDate, notes }`.

`pricing` en `per_million_tokens`. **Coste desconocido no es cero**: si falta la
tarifa, no se afirma que un modelo sea el más barato.

## 2. Agente

`Agent`: `{ id, name, responsibility, ownerId, spaceId, kind: base|specialist|temporary,
origin:{route:pool|scratch|task, ref?, fromAgentId?, templateId?}, modelPolicy,
requirements:{capabilities[],minContext}, skills[], tools[], subagents[], active,
version, history[], createdAt, updatedAt }`.

**Tres rutas de creación:** `scratch` (desde cero), `pool` (desde plantilla o
agente base) y `task` (desde una conversación/tarea; guarda `origin.ref`).

**Versiones:** cada edición (`agents.update`, `agents.setModelPolicy`,
`agents.duplicate`) sube `version` y añade una entrada a `history`.

## 3. Política de modelo

```
modelPolicy = {
  principal: modelId,
  exclusive: bool,               // desactiva fallback y escalamiento
  fallback: [modelId...],        // sustitutos ante fallo de proveedor
  escalation: { model, conditions:[validation_failed|complexity], mode:auto|manual } | null,
  budget: { amount, currency, perTask, maxEscalations, maxAttempts } | null,
}
```

## 4. Resolver (`agents.resolveModel`)

Devuelve una decisión con `status`, `kind`, `modelId`, `provider`, `reason`,
`policyVersion`, `estimatedCost` y `uncertainty`.

Orden de resolución: identidad/estado del agente → exclusividad → principal →
alternativas por fallo → escalamiento autorizado → presupuesto → detener.

| Situación | status / reason |
|---|---|
| Principal disponible | `selected` / `PRINCIPAL` |
| Fallo de proveedor, hay alternativa | `selected` / `FALLBACK` |
| Exclusivo y no disponible | `denied` / `EXCLUSIVE_UNAVAILABLE` |
| Escalamiento automático permitido | `selected` / `ESCALATION_AUTO` |
| Escalamiento requiere aprobación | `needs_approval` / `ESCALATION_MANUAL` |
| Límite de escalaciones | `denied` / `ESCALATION_LIMIT` |
| Presupuesto insuficiente | `denied` / `BUDGET_EXCEEDED` |
| No se puede estimar el costo exigido | `needs_decision` / `COST_UNKNOWN` |
| Sin candidato | `denied` / `NO_CANDIDATE` |

Fail-closed: si hay presupuesto monetario y no se puede estimar el costo, se
detiene y se pide decisión; nunca se asume cero.

## 5. Recomendador (`agents.recommendModel`)

Considera solo candidatos accesibles y compatibles (capacidades y contexto),
estima el **costo por tarea útil** (incluye `attempts`/reintentos) y devuelve
`candidates`, `recommended`, `costKnown`, `provisional` y `limitations`. Sin
tarifas → `recommended: null` y `limitations: [cost_unknown]`.

## 6. Operaciones

| Operación | Uso |
|---|---|
| `models.register` / `models.list` / `models.get` / `models.remove` | Pool |
| `templates.register` / `templates.list` | Plantillas para la ruta `pool` |
| `agents.create` / `agents.get` / `agents.list` / `agents.update` | Catálogo |
| `agents.duplicate` / `agents.deactivate` | Ciclo de vida |
| `agents.setModelPolicy` / `agents.getEffectivePolicy` | Política |
| `agents.recommendModel` / `agents.resolveModel` | Selección |
| `agents.recordSelection` / `agents.listSelections` | Registro por ejecución |
| `tools.register` / `tools.list` | Herramientas ejecutables del host |
| `agents.executeTool` | Ejecuta una herramienta permitida al agente |
| `agents.delegate` | Delega en un subagente autorizado |
| `agents.listExecutions` | Registro de ejecuciones (herramientas y delegaciones) |
| `models.recordOutcome` / `models.evidence` | Evidencia real por modelo |

## 7. Herramientas y subagentes ejecutables

- **Herramientas**: el host registra `handler(input, ctx)`, **síncrono o
  asíncrono** (si devuelve una promesa, se espera). Un agente solo puede ejecutar
  lo que declara en `tools` (o `*`); si no → `FORBIDDEN_TOOL`. Cada ejecución se
  registra con estado, error y duración. El contrato `run()` devuelve el resultado
  de inmediato para handlers síncronos y una promesa para asíncronos; el
  transporte MCP (stdio y HTTP) la espera.
- **Subagentes**: `agents.delegate` exige que el padre tenga autorizado el
  subagente (`subagents`), resuelve el **modelo del hijo con su propia política**,
  comparte el **presupuesto del padre** (no abre uno nuevo) y ejecuta las
  herramientas del hijo. Devuelve el modelo efectivo, la versión de política y las
  ejecuciones. Sin autorización → `FORBIDDEN_SUBAGENT`; sin costo estimable con
  presupuesto → `needs_decision`; excedido → `BUDGET_EXCEEDED`.

## 8. Evidencia real por modelo

`models.recordOutcome` guarda resultados reales (`approved`/`corrected`/`error`)
con costo y latencia por `(modelo, tipo de tarea)`. `models.evidence` agrega
conteos, `correctionRate`, `avgCost`, `avgLatencyMs` y **costo por resultado útil**
(`totalCost / aprobados`, que castiga reintentos y correcciones).

El recomendador usa la evidencia: si hay casos probados, ordena por costo por
resultado útil (`basis: "evidence"`) y deja de ser provisional; sin evidencia,
cae a costo estimado y marca `provisional`.

## 9. Límites conocidos

- Persistencia de la política dentro del harness (el gateway ya inyecta el MCP).

## 10. Pruebas

`test/agents.test.js` cubre **F03, F19, F23, F24, F25, F26, F27/F30, F28, F29,
F42** y requisitos de capacidad. `test/agents-exec.test.js` cubre herramientas
ejecutables (permitida / no permitida / error), delegación (autorizada, no
autorizada, presupuesto compartido) y evidencia (recomendación basada en casos
probados, provisional sin evidencia y persistencia en SQLite).
