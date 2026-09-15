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
- Contrato `run(operation, params)` compartido por UI y MCP.

Diseño y contrato: [`docs/spaces-model.md`](docs/spaces-model.md).

## Uso

```js
import { SpacesService } from './src/spaces/index.js'

const spaces = new SpacesService()
const { ok, data } = spaces.run('spaces.create', { name: 'Marluvas', ownerId: 'u1' })
console.log(data.id)
```

## Pruebas

```bash
node --test
```

## Alcance y límites

- El núcleo es **independiente del harness**: no asume que un directorio técnico
  sea un espacio de negocio.
- Persistencia en memoria por ahora; el backend de datos se decide después del
  inventario de persistencia del harness.
- Pendiente: servidor MCP propio, integración con la UI y con el login del gateway.

Los planes e inventarios operativos viven en el paquete de planificación
(hermano `DeepSeek-Harnees`).
