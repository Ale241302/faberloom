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
| `spaces.linkConversation` | `spaceId, conversationId, title?, sensitive?, userId` | Vínculo creado (con `sharedWith`) |
| `spaces.linkFile` | `spaceId, fileRef, title?, sensitive?, userId` | Vínculo creado |
| `spaces.listLinks` | `spaceId, userId` | Vínculos del espacio |
| `spaces.unlink` | `spaceId, linkId, userId` | Vínculo quitado |

Códigos de error: `INVALID_NAME`, `INVALID_OWNER`, `INVALID_USER`,
`INVALID_CONTEXT_ITEM`, `PARENT_NOT_FOUND`, `SPACE_NOT_FOUND`, `ACCESS_DENIED`,
`FORBIDDEN`, `INVALID_ROLE`, `INVALID_MEMBER`, `MEMBER_NOT_FOUND`, `CYCLE`,
`UNKNOWN_OPERATION`.

### Roles y permisos (ACL)

Cada miembro tiene un rol: `owner`, `admin`, `editor` o `viewer` (el propietario
siempre es `owner`).

| Permiso | owner | admin | editor | viewer |
|---|---|---|---|---|
| `view` (leer y resolver contexto) | ✓ | ✓ | ✓ | ✓ |
| `edit` (contenido del espacio) | ✓ | ✓ | ✓ | — |
| `manage` (miembros y roles) | ✓ | ✓ | — | — |

- `spaces.update` exige `edit`; si el patch toca `members`, exige `manage`.
- `spaces.addMember`, `spaces.removeMember` y `spaces.setMemberRole` exigen
  `manage`. Roles asignables: `admin`, `editor`, `viewer`.
- No se puede quitar ni degradar al propietario.
- Sin pertenencia → `ACCESS_DENIED`; rol insuficiente → `FORBIDDEN`.
- `members` acepta `['u2']` (rol `editor`) o `[{ userId, role }]`.

**Herencia de miembros (`inheritMembers`, por defecto sí):** el rol de un usuario
en un espacio es el **mayor privilegio** entre su pertenencia propia y la heredada
de sus ancestros. La herencia se corta si algún espacio intermedio tiene
`inheritMembers: false`. Ej.: un `admin` del padre actúa como `admin` en el hijo;
un `viewer` heredado solo puede ver.

**Empresa (`companyId`):** un espacio puede pertenecer a una empresa. Si la
petición trae `X-MWT-Client-ID` y no coincide con el `companyId` del espacio, se
deniega (`COMPANY_MISMATCH`). `spaces.list` filtra por empresa cuando se indica.
El subespacio hereda la empresa del padre.

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

## 7. Persistencia

El servicio acepta un `repository` con `read()`/`write(state)`; si se omite, usa
memoria. Implementaciones incluidas:

- `MemoryRepository`: estado en el proceso (pruebas).
- `JsonFileRepository(ruta)`: archivo JSON con **escritura atómica** (temp + rename).
- `SqliteRepository(ruta)`: **backend definitivo** vía `node:sqlite`, con tablas
  normalizadas (`spaces`, `space_context`, `space_excluded`, `space_members`).

Se elige con `FABERLOOM_STORE` = `json` (por defecto), `sqlite` o `memory`; la ruta
con `FABERLOOM_DATA_FILE` (JSON) o `FABERLOOM_DB` (SQLite). El servicio hidrata al
construirse y persiste tras cada mutación.

**Escritura incremental:** si el repositorio ofrece `saveSpace(space)`,
`saveLink(link)` y `deleteLink(id)`, el servicio escribe **solo el objeto
cambiado** (el `SqliteRepository` lo hace con `upsert` + reemplazo de sus filas
hijas). Si no, cae al snapshot completo (`write(state)`), como hacen los
repositorios JSON y de memoria. `node:sqlite` es experimental en Node 22 (emite un
aviso), pero no requiere flag.

## 8. Servidor MCP

`src/mcp/server.js` expone las operaciones como herramientas MCP sobre **stdio**,
sin dependencias. Herramientas: `spaces_create`, `spaces_get`, `spaces_list`,
`spaces_update`, `spaces_effective_context`, `spaces_personal`,
`spaces_preview_link`, `spaces_resolve_workdir`.

- `initialize`, `tools/list`, `tools/call`, `ping` y notificaciones.
- Errores de dominio llegan como `result.isError: true` (no como excepción).
- Identidad: `FABERLOOM_USER_ID` o `arguments.userId`. Con transporte HTTP, la
  identidad vendrá de la cabecera del gateway (por usuario).

Arranque: `FABERLOOM_DATA_FILE=/ruta/spaces.json node src/mcp/stdio.js`
(o `npm run mcp`).

### Transporte HTTP (identidad)

`src/mcp/http.js` sirve el mismo protocolo por **HTTP** (`POST /mcp`) con
`GET /healthz`. Identidad por cabecera `X-Faberloom-User-Id` (o
`X-Forwarded-User-Email`) y empresa por `X-MWT-Client-ID` (o
`X-Faberloom-Company-Id`); las cabeceras mandan sobre el cuerpo. Si
`FABERLOOM_GATEWAY_KEY` está definido, se exige `X-Faberloom-Gateway-Key`
(fail-closed), igual que el MCP de la consola. En `initialize` devuelve
`Mcp-Session-Id`.

Arranque: `FABERLOOM_PORT=8090 FABERLOOM_GATEWAY_KEY=... npm run mcp:http`.

## 9. Vínculos de conversaciones y archivos

Una conversación o un archivo puede quedar vinculado a un espacio:

- `spaces.linkConversation({ spaceId, conversationId, title?, sensitive? })`
- `spaces.linkFile({ spaceId, fileRef, title?, sensitive? })`
- `spaces.listLinks({ spaceId })` y `spaces.unlink({ spaceId, linkId })`

Reglas:

- Vincular o quitar exige permiso `edit`; listar exige `view`.
- El vínculo guarda `addedBy`, `createdAt`, `sensitive` y una referencia
  (`conversationId` o `fileRef`), más `sharedWith` (miembros que lo verán al
  quedar en el espacio). Usar `spaces.previewLink` antes para ver el cambio de
  audiencia.
- Los vínculos se persisten con el espacio (tabla `space_links` en SQLite; dentro
  del snapshot en JSON/memoria).

**Contenido guardado:** un vínculo puede crearse con `content`:

- **Archivos:** `content` en bytes (el MCP lo recibe en base64) → se guarda en el
  almacén de blobs; el vínculo expone `size`, `sha256`, `mediaType` y `fileName`.
- **Conversaciones:** `content` texto/JSON → se guarda y `spaces.readLinkContent`
  devuelve el texto y su JSON.

Almacén de blobs: `MemoryBlobStore` (pruebas) o `FsBlobStore`
(`FABERLOOM_BLOB_DIR`). `readLinkContent` exige `view`; `unlink` borra el contenido
y `ref` puede ser externo (sin `content`) si se prefiere.

## 10. Estado y límites

Desplegado como contenedor (`faberloom-mcp`, red `harness-net`, volumen
`faberloom-data`) e integrado en el gateway del harness: cada `dsh` por usuario
arranca con el MCP `faberloom` y su identidad/empresa
(`X-Faberloom-User-Id`, `X-MWT-Client-ID`). **No hay pendientes funcionales de E3.**

Mejoras opcionales (no bloquean):

- Almacén de blobs en MinIO/S3 en vez del filesystem.
- Escritura incremental por campo (hoy por espacio/vínculo completo).
- ACL heredada comprobada también por ancestro al listar (hoy el rol efectivo ya
  la aplica).
