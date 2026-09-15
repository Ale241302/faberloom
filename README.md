# FaberLoom

Producto propio sobre [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness),
conectado por MCP a la consola MWT.ONE. Este repositorio reúne los módulos de
FaberLoom (espacios, agentes, rutinas, mesa, memoria, autonomía).

**Estado:** primer corte de **E3 · Espacios y contexto**. No es una instalación ni
un producto terminado.

## Primer corte: Espacios y contexto

- Modelo de espacios, subespacios, herencia configurable y exclusiones.
- Resolución de **contexto efectivo** con registro de versiones y exposición de
  conflictos.
- **Ámbito personal** («sin espacio asignado») aislado por usuario.
- **Vista previa de audiencia** al vincular una conversación a un espacio
  compartido.
- **Persistencia** con repositorio intercambiable (memoria o archivo JSON atómico).
- **Servidor MCP** (stdio) que expone las operaciones como herramientas.
- Contrato `run(operation, params)` compartido por UI y MCP.

Diseño y contrato: [`docs/spaces-model.md`](docs/spaces-model.md).

## Uso

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

## Pruebas

```bash
node --test
```

## Alcance y límites

- El núcleo es **independiente del harness**: no asume que un directorio técnico
  sea un espacio de negocio.
- Persistencia en archivo JSON (síncrona) en este corte; el backend definitivo se
  decide tras el inventario de persistencia del harness.
- Pendiente: transporte MCP por HTTP con identidad, ACL fina e integración con la
  UI del harness.

Los planes e inventarios operativos viven en el paquete de planificación
(hermano `DeepSeek-Harnees`).
