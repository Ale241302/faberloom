# E9 · UI FaberLoom y distribución

**Fecha:** 15 de septiembre de 2026. **Estado:** capa de proyección (BFF) + tokens
+ consola de solo lectura implementadas, probadas y desplegadas.

Un frontend completo excede este entorno, así que E9 entrega el **contrato que la
UI consume**: modelos de vista de cada pantalla, tokens de identidad y una consola
HTML mínima para verificarlos. La aplicación final (o el chat del harness) los
reutiliza.

## 1. Capa de proyección (`src/ui/index.js`)

`UiService` ensambla los modelos de vista a partir de los servicios existentes:

| Operación | Pantalla (pantallas-faberloom.md) |
|---|---|
| `ui.navigation` | 1 · navegación lateral y contexto personal |
| `ui.home` | 1 · inicio desde cero (texto, contexto, modelos) |
| `ui.board` | 3 · Mesa agrupada (necesita revisión / en espera / hecho) |
| `ui.item` | 3 · resultado, contexto y **autonomía** del elemento |
| `ui.spaces` | 4 · espacios y subespacios |
| `ui.agents` | 5-6 · catálogo y pool de modelos |
| `ui.routines` | 7 · rutinas y versiones |
| `ui.memory` | 8 · enseñanzas y desempeño |
| `ui.settings` | 10 · conexiones, modelos, permisos y respaldos |
| `ui.tokens` | tokens de identidad |

Se exponen por MCP (`ui_*`) para que cualquier UI las consuma con la identidad del
usuario.

## 2. Tokens de identidad (`src/ui/tokens.js`)

Color, tipografía, espaciado, radios, sombras, movimiento y layout. `ui.tokens` los
devuelve como JSON; `tokensToCss()` genera variables CSS (`--fl-*`). Se sirven en
`GET /ui/tokens` y `GET /ui/tokens.css`.

## 3. Consola de solo lectura

`GET /ui` renderiza en el servidor una consola con la navegación y la Mesa (tokens
aplicados), usando la identidad de `X-Faberloom-User-Id` / `X-Forwarded-User-Email`
o `FABERLOOM_UI_USER`. Si hay `FABERLOOM_GATEWAY_KEY`, exige `?key=` o el header.
Es una verificación de la proyección y los tokens, no la aplicación final.

## 4. Distribución

- **Piloto por navegador**: la consola y, sobre todo, el chat del harness (que ya
  inyecta el MCP por usuario) son el acceso principal; no requiere instalable.
- **Servidor permanente**: `faberloom-mcp` + `faberloom-bridge` (contenedores) con
  volumen y respaldo (E8). La app instalable propia queda como empaquetado futuro
  (identidad de aplicación, firma y canal de actualización).
- **Actualización**: versión fijada y procedimiento controlado (ver
  `docs/operations.md`).

## 5. Pruebas

`test/ui.test.js` cubre navegación/inicio, Mesa agrupada, detalle con contexto y
autonomía, agentes con modelo efectivo, rutinas, memoria y configuración, y los
tokens.

## 6. Fuera de alcance (siguiente)

- **Frontend propio** (SPA) e instalable firmado: consumen `ui_*` y los tokens.
- Consola con acciones (hoy es de solo lectura) y autenticación de navegador
  completa (hoy usa identidad por header/`?key` para el piloto).
