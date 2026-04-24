# FaberLoom v2 — Mockup modular

Control-plane de agentes de IA para operaciones B2B en LatAm. Wedge: cotización de calzado de seguridad Marluvas/Tecmater, distribuidores MX→CO.

## Cómo correrlo

Los módulos ESM requieren HTTP. No funciona con `file://`.

```bash
cd faberloom-mockup
python -m http.server 8000
# abrir http://localhost:8000
```

Alternativa Node:

```bash
npx http-server -p 8000 -c-1
```

## Mapa de módulos

```
faberloom-mockup/
├── index.html                  · entry point, splash + boot
├── design-system.html          · showcase standalone (tokens, tipografía, widgets)
├── core/
│   ├── tokens.css              · design tokens light + dark
│   ├── boot.js                 · bus, store, i18n, theme, a11y, router
│   └── shell.js                · topbar + sidebar + layout
├── widgets/
│   └── widgets.js              · Thermometer, Autonomy Ladder, ProvSup, RiskBadge,
│                                  Empty/Loading/Error states, Modal, Feedback modal,
│                                  Consolidation modal
├── modules/
│   ├── bandeja-detail.js       · draft + evidence/provenance/risk/trace tabs
│   ├── skill-studio.js         · 3 capas: base / manual / aprendido
│   ├── agent-console.js        · summary / skills / memory / logs
│   └── workflows.js            · canvas SVG con nodos coloreados por tipo
├── data/
│   └── mock.js                 · 7 agents, 14 drafts, 50+ runs, evidencia rica
└── i18n/
    ├── es.js                   · ~120 claves (default)
    ├── en.js
    └── pt-BR.js
```

## Rutas

| Hash                    | Módulo          | Estado demo |
| ----------------------- | --------------- | ----------- |
| `#/bandeja/dr_001`      | bandeja-detail  | **demo-critical** · claims con provenance |
| `#/skills/sk_cotizar`   | skill-studio    | hot · 7 patrones pendientes |
| `#/agentes/ag_cotizador`| agent-console   | L1 · 67% / 43 runs |
| `#/workflows`           | workflows       | cotización B2B · 7 nodos |

Default: redirige a `#/bandeja/dr_001`.

## Contrato de módulo

Cada módulo exporta:

```js
export const meta = { id: 'nombre', route: '#/ruta' };

export async function mount(slot, ctx) {
  // slot: HTMLElement donde renderizar
  // ctx: { params, query, navigate }
  return { unmount };
}

export function unmount() {
  // cleanup: listeners, timers, subs del bus
}
```

El router en `core/boot.js` envuelve cada mount en error boundary. Si un módulo truena, su ruta renderiza `DegradedCard`, el resto del shell sigue funcionando y la ruta queda en `FAILED` set (reintentable).

## Event bus

```js
import { bus } from './core/boot.js';

bus.on('view-state:change', (state) => { /* loaded|empty|loading|error */ });
bus.emit('launcher:open');
bus.emit('feedback:open', { draftId });
bus.emit('consolidation:open', { skillId });
```

## Store (localStorage versionado)

```js
import { store } from './core/boot.js';

store.get('theme');              // → 'light' | 'dark'
store.set('selectedAgent', 'ag_cotizador');
// se persiste en localStorage como `faberloom.v1.theme`
```

## Atajos de teclado

| Tecla     | Acción                           |
| --------- | -------------------------------- |
| `⌘K` / `Ctrl+K` | Abrir launcher (stub)     |
| `Esc`     | Cerrar overlay / modal           |

## Toggle de estados (topbar)

Botón dropdown que emite `bus.emit('view-state:change', state)` — cada módulo escucha y re-renderiza en el estado correspondiente.

- `loaded` — contenido normal con mock data
- `empty` — `emptyState()` widget
- `loading` — skeleton animado
- `error` — degraded card con retry

## A11y

- Skip-link al `<main>` (enfocable con Tab)
- Live region `#fl-live` (polite) para anuncios
- Focus ring visible 2px coral
- `data-theme="dark"` conserva contraste WCAG AA en todos los textos
- `prefers-reduced-motion` desactiva shimmer y animaciones de entrada
- Botón **Validar** en topbar corre axe-core runtime sobre la vista y muestra resultados en consola

## i18n

```js
import { i18n } from './core/boot.js';

i18n.t('bandeja.title');        // → "Bandeja de salida"
i18n.setLang('en');             // → switch global + re-render
i18n.applyToDom(root);          // aplica data-i18n attrs
```

~120 claves por idioma en 20 dominios. El selector está en el topbar.

## Tema

```js
import { theme } from './core/boot.js';

theme.toggle();
theme.set('dark');
// persiste en store, respeta prefers-color-scheme en el primer load
```

## Mock data destacada

`data/mock.js` — todo lectura, sin latencia simulada:

- **`agents[]`** · 7 agentes con KPIs, autonomía, termómetro, tier
- **`skills.sk_cotizar`** · base sellada v1.0.3 + 4 overlays manuales + 7 patrones pendientes + 4 gold samples
- **`drafts[]`** · 14 drafts. **`dr_001`** es el demo-crítico — tiene 6 claims con provenance, 6 evidence spans con `source_version` y líneas exactas, y 7 pasos de workflow trace
- **`consolidations[]`** · 1 hot activa para `sk_cotizar`
- **`adminAutonomyEvidence`** · para `ag_cotizador` (aprobación curve, correction distribution, failing types)

## Contenido en vivo vs. FROZEN

Este mockup es un prototipo visual para validar flujos con design partners. No toca la KB de MWT. No escribe en pgvector. No llama a Claude.

Cuando pase a implementación real, mantener:

- Three-layer skill model con gate humano para learned overlays
- Autonomy ladder L0-L4 con unlock criterion textual (no toggle)
- Provenance schema `claim_id → evidence_span_id → source_version`
- Action-risk registry con 6 campos obligatorios
- Workflow state ledger con trace paso-a-paso
- Feedback tipificado en 5 razones

## Debug

En consola del navegador:

```js
window.__faberloom
// → { bus, store, i18n, theme, router }

window.__faberloom.bus.emit('view-state:change', 'loading');
window.__faberloom.router.navigate('#/skills/sk_cotizar');
```

## Pendiente para post-demo

- Persistencia de feedback en memoria de sesión (hoy se pierde al navegar)
- Modo "comparar" entre dos versiones de skill
- Drag & drop real en palette de workflows
- Export de la consolidación aprobada a changelog
- Conexión a SP-API / Helium 10 (cuando se decida el pilot real)

---

**Stack:** HTML5 + ESM vanilla + CSS variables. Cero dependencias de build. Solo `axe-core` vía CDN al presionar Validar.

**No usa:** React, Next, Vite, Tailwind, frameworks. Modular puro por diseño — cada archivo es legible solo.
