# E3 · Espacios y contexto — diseño y contrato

**Fecha:** 15 de septiembre de 2026. **Estado:** primer corte implementado y probado
(`src/spaces/index.js`, 7 pruebas en verde).

Este documento fija el modelo y el contrato compartido que consumirán la interfaz
y el servidor MCP de FaberLoom. El núcleo es independiente del harness: no asume
que un directorio técnico del harness sea un espacio de negocio.

## 1. Modelo

**Espacio (`Space`)**

| Campo | Tipo | Notas |
|---|---|---|
| `id` | string | Identificador estable `sp_<uuid>`; nunca cambia |
| `name` | string | Nombre visible |
| `theme` | string \| null | Tema/tipo (estudios, logística, investigación…) |
| `ownerId` | string | Propietario |
| `parentId` | string \| null | Espacio padre (subespacio) |
| `inheritContext` | boolean | Si hereda el contexto del padre |
| `members` | string[] | Incluye siempre al propietario |
| `context` | ContextItem[] | Contexto propio |
| `excluded` | (string \| {key})[] | Claves excluidas de lo heredado |
| `personal` | boolean | Ámbito personal («sin espacio asignado») |
| `version` | number | Sube en cada edición; se registra al usar el contexto |

**ContextItem:** `{ id, key, value, source }`. `key` es la clave lógica (p. ej.
`moneda`), `source` indica de dónde viene (útil para procedencia y conflictos).

## 2. Operaciones (contrato compartido UI/MCP)

Todas se invocan con `run(operation, params)` y devuelven `{ ok: true, data }` o
`{ ok: false, error: { code, message } }`. Nunca lanzan por errores de dominio.

| Operación | Parámetros | Devuelve |
|---|---|---|
| `spaces.create` | `name, ownerId, parentId?, inheritContext?, members?, context?, excluded?, theme?` | Espacio |
| `spaces.get` | `spaceId, userId` | Espacio |
| `spaces.list` | `userId` | Espacios accesibles (excluye el personal) |
| `spaces.update` | `spaceId, userId, patch` | Espacio (versión +1) |
| `spaces.effectiveContext` | `spaceId, userId` | `{ items, resolved, conflicts, excluded, versions }` |
| `spaces.personal` | `userId, spaceId?` | Ámbito personal o el espacio indicado |
| `spaces.previewLink` | `userId, targetSpaceId, material[]` | `{ audienceBefore, audienceAfter, newlyVisibleTo, material, warning }` |
| `spaces.resolveWorkdir` | `spaceId, userId` | `{ spaceId, ref }` (referencia opaca) |

Códigos de error: `INVALID_NAME`, `INVALID_OWNER`, `INVALID_USER`,
`INVALID_CONTEXT_ITEM`, `PARENT_NOT_FOUND`, `SPACE_NOT_FOUND`, `ACCESS_DENIED`,
`CYCLE`, `UNKNOWN_OPERATION`.

## 3. Contexto efectivo

1. Se recorre la cadena de ancestros. Un espacio **solo** incluye a su padre si
   `inheritContext` es verdadero (recursivo: el padre aplica su propia decisión).
2. Se añade el contexto propio.
3. Se eliminan las claves en `excluded` (quedan listadas en `excluded`).
4. Se agrupa por `key`. Si una clave llega con valores distintos se **expone un
   conflicto**; `resolved` toma el valor más local (último), pero el conflicto
   queda visible, no oculto.
5. Se registra `versions`: qué versión de cada espacio contribuyó, para poder
   reconstruir con qué contexto se tomó una decisión.

## 4. Ámbito personal

- `spaces.personal` sin `spaceId` devuelve el espacio personal del usuario, creado
  a demanda. Es `personal: true`, `inheritContext: false` y no aparece en
  `spaces.list`.
- El personal de un usuario **no** es accesible por otro (`ACCESS_DENIED`).

## 5. Directorio de trabajo

`spaces.resolveWorkdir` devuelve `fw_<hash>`: una referencia opaca. El path real
del harness se resuelve internamente y **nunca** se expone a la UI ni al agente.

## 6. Pruebas de esta entrega

| ID del plan | Caso | Cubierto |
|---|---|---|
| F01 | Espacio de estudios sin MWT | `test/spaces.test.js` |
| F02 | Marluvas → Eguisa, herencia/exclusión | idem |
| F37 | Iniciar sin espacio (personal aislado) | idem |
| F41 | Vincular conversación personal a espacio compartido | idem |

Además: conflicto de reglas expuesto, versiones registradas, workdir opaco y
contrato `run()` sin excepciones.

## 7. Fuera de este corte (siguientes)

- **Persistencia** real (hoy en memoria) y migraciones.
- **Servidor MCP** que exponga estas operaciones con la identidad del usuario.
- **ACL fina** (roles por espacio, herencia de accesos) y verificación de acceso a
  cada ancestro al resolver contexto.
- Integración con la **UI** del harness (navegación por espacios) y con el login
  del gateway (identidad y empresa).
- Vínculo de **conversaciones y archivos** a espacios (más allá de la vista previa).
