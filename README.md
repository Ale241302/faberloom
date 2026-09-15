# FaberLoom

Producto propio sobre [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness),
conectado por MCP a la consola MWT.ONE. Este repositorio reúne:

- el **producto** FaberLoom (espacios, agentes, rutinas, mesa, memoria, autonomía), y
- el **mockup v2** (prototipo visual previo), conservado en la raíz como referencia.

## Producto · E3 (Espacios) + E4 (Agentes y política de modelos)

- Modelo de espacios, subespacios, herencia configurable y exclusiones.
- Resolución de **contexto efectivo** con registro de versiones y exposición de
  conflictos.
- **Ámbito personal** («sin espacio asignado») aislado por usuario.
- **Vista previa de audiencia** al vincular una conversación a un espacio
  compartido.
- **Persistencia** con repositorio intercambiable: memoria, archivo JSON atómico
  o **SQLite** normalizado (`FABERLOOM_STORE=json|sqlite|memory`).
- **ACL por espacio**: roles `owner`/`admin`/`editor`/`viewer` con permisos
  `view`/`edit`/`manage`, **herencia de miembros** por subespacio e **identidad por
  empresa** (`X-MWT-Client-ID`).
- **Servidor MCP** en **stdio** y **HTTP** (identidad/empresa por cabecera y
  gateway key opcional) que expone las operaciones como herramientas.
- **Vínculos** de conversaciones y archivos a espacios (`linkConversation`,
  `linkFile`, `listLinks`, `unlink`), con `sharedWith` y `previewLink`.
- **Agentes y política de modelos** (E4): pool de modelos, catálogo versionado con
  tres rutas de creación, política (principal/exclusividad/alternativas/
  escalamiento/presupuesto), resolver y recomendador.
- **Herramientas y subagentes ejecutables** y **evidencia real por modelo**
  (`executeTool`, `delegate`, `recordOutcome`/`evidence`), con handlers síncronos
  o asíncronos.
- **Rutinas y ejecución persistente** (E5): rutinas versionadas, idempotencia,
  esperas con revalidación, reconciliación de timeouts y despachador `tick`.
- Contrato `run(operation, params)` compartido por UI y MCP.

Diseño y contrato: [`docs/spaces-model.md`](docs/spaces-model.md).

### Uso

```js
import { SpacesService } from './src/spaces/index.js'
import { SqliteRepository } from './src/store/sqlite.js'

const spaces = new SpacesService({ repository: new SqliteRepository('./data/spaces.sqlite') })
const { ok, data } = spaces.run('spaces.create', { name: 'Marluvas', ownerId: 'u1' })
console.log(data.id)
```

Backend y ruta por entorno: `FABERLOOM_STORE` (`json` por defecto, `sqlite`,
`memory`), `FABERLOOM_DATA_FILE` (JSON) o `FABERLOOM_DB` (SQLite).

Servidor MCP por stdio:

```bash
FABERLOOM_DATA_FILE=./data/spaces.json FABERLOOM_USER_ID=u1 npm run mcp
```

Servidor MCP por HTTP (identidad por cabecera `X-Faberloom-User-Id`; si defines
`FABERLOOM_GATEWAY_KEY`, se exige `X-Faberloom-Gateway-Key`):

```bash
FABERLOOM_DATA_FILE=./data/spaces.json FABERLOOM_PORT=8090 FABERLOOM_GATEWAY_KEY=... npm run mcp:http
```

### Pruebas

```bash
node --test
```

### Alcance y límites

- El núcleo es **independiente del harness**: no asume que un directorio técnico
  sea un espacio de negocio.
- Backends disponibles: JSON y **SQLite** (`node:sqlite`, experimental en Node 22).
- **Desplegado e integrado** con el gateway del harness; la identidad y la empresa
  llegan por cabecera. El contenido de archivos/conversaciones se guarda en el
  almacén de blobs (`FABERLOOM_BLOB_DIR`).

## Despliegue (contenedor)

- `Dockerfile` y `docker-compose.yml`: imagen `faberloom/mcp`, red externa
  `harness-net` y volumen `faberloom-data` (SQLite + blobs).
- Variables clave: `FABERLOOM_GATEWAY_KEY` (secreto compartido con el gateway del
  harness), `FABERLOOM_STORE=sqlite` y `FABERLOOM_BLOB_STORE=memory|fs|s3`
  (con `FABERLOOM_BLOB_DIR` para fs o las `FABERLOOM_S3_*` para MinIO/S3).
- El gateway del harness inyecta este MCP en cada sesión de usuario con
  `X-Faberloom-User-Id` y `X-MWT-Client-ID`.

```bash
cp .env.example .env   # rellena FABERLOOM_GATEWAY_KEY
docker compose up -d --build
```

## Mockup v2 (prototipo visual previo · abril 2026)

Mockup modular de la interfaz (HTML/CSS/JS, sin dependencias): `index.html`,
`design-system.html` (showcase de tokens y widgets), y los módulos `core/`,
`widgets/`, `modules/`, `fragments/`, `i18n/`, `research/`.

Cómo correrlo (los módulos ESM requieren HTTP, no `file://`):

```bash
python -m http.server 8000
# o
npx http-server -p 8000 -c-1
```

El diseño del producto se redefine en el paquete de planificación
(`pantallas-faberloom.md`); el mockup se conserva como referencia histórica.
