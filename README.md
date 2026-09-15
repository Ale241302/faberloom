# FaberLoom

Producto propio sobre [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness),
conectado por MCP a la consola MWT.ONE. Este repositorio reúne:

- el **producto** FaberLoom (espacios, agentes, rutinas, mesa, memoria, autonomía), y
- el **mockup v2** (prototipo visual previo), conservado en la raíz como referencia.

## Producto · E3 — Espacios y contexto (primer corte)

- Modelo de espacios, subespacios, herencia configurable y exclusiones.
- Resolución de **contexto efectivo** con registro de versiones y exposición de
  conflictos.
- **Ámbito personal** («sin espacio asignado») aislado por usuario.
- **Vista previa de audiencia** al vincular una conversación a un espacio
  compartido.
- **Persistencia** con repositorio intercambiable (memoria o archivo JSON atómico).
- **ACL por espacio**: roles `owner`/`admin`/`editor`/`viewer` con permisos
  `view`/`edit`/`manage`.
- **Servidor MCP** en **stdio** y **HTTP** (identidad por cabecera y gateway key
  opcional) que expone las operaciones como herramientas.
- Contrato `run(operation, params)` compartido por UI y MCP.

Diseño y contrato: [`docs/spaces-model.md`](docs/spaces-model.md).

### Uso

```js
import { SpacesService } from './src/spaces/index.js'
import { JsonFileRepository } from './src/store/repository.js'

const spaces = new SpacesService({ repository: new JsonFileRepository('./data/spaces.json') })
const { ok, data } = spaces.run('spaces.create', { name: 'Marluvas', ownerId: 'u1' })
console.log(data.id)
```

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
- Persistencia en archivo JSON (síncrona) en este corte; el backend definitivo se
  decide tras el inventario de persistencia del harness.
- Pendiente: transporte MCP por HTTP con identidad por usuario/empresa, ACL fina e
  integración con la UI del harness.

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
