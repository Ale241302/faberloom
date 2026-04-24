/* ============================================================
   Módulo: Workflows — canvas con nodos por color de tipo
   ============================================================ */

import { i18n, bus } from '../core/boot.js';
import { emptyState, loadingState, errorState, injectWidgetStyles } from '../widgets/widgets.js';

let root = null;
let stateUnsub = null;
let currentState = 'loaded';
let selectedNode = 'n_cotizar';

export const meta = { id: 'workflows', route: '#/workflows' };

const nodes = [
  { id: 'n_email',    type: 'trigger',   label: 'Email recibido', x: 40,  y: 60,  detail: 'Gmail · inbox filtrado por asunto "cotización"' },
  { id: 'n_parse',    type: 'skill',     label: 'Parsear solicitud', x: 260, y: 60,  detail: 'sk_parse · extrae modelo, cantidad, zona' },
  { id: 'n_kb',       type: 'action',    label: 'Consultar KB Marluvas', x: 480, y: 40, detail: 'connector.kb · retrieval con rerank' },
  { id: 'n_stock',    type: 'action',    label: 'Consultar stock ERP', x: 480, y: 120, detail: 'connector.erp · SP-API bodega' },
  { id: 'n_cotizar',  type: 'skill',     label: 'Componer cotización', x: 720, y: 80,  detail: 'sk_cotizar · 3 capas · thermometer 🔴 caliente' },
  { id: 'n_risk',     type: 'condition', label: 'Monto > 10k USD?', x: 940, y: 80,  detail: 'policy.amount_threshold · escalar a L1 si true' },
  { id: 'n_draft',    type: 'output',    label: 'Crear draft', x: 1160, y: 80, detail: 'action.draft_created · bandeja pendiente' }
];

const edges = [
  ['n_email', 'n_parse'],
  ['n_parse', 'n_kb'],
  ['n_parse', 'n_stock'],
  ['n_kb', 'n_cotizar'],
  ['n_stock', 'n_cotizar'],
  ['n_cotizar', 'n_risk'],
  ['n_risk', 'n_draft']
];

export async function mount(slot, ctx) {
  root = slot;
  injectWidgetStyles();
  injectStyles();

  stateUnsub = bus.on('view-state:change', s => { currentState = s; render(); });
  render();
  return { unmount };
}

export function unmount() { stateUnsub?.(); root && (root.innerHTML = ''); }

function render() {
  if (currentState === 'loading') { root.innerHTML = loadingState(); return; }
  if (currentState === 'error')   { root.innerHTML = errorState(); return; }
  if (currentState === 'empty')   { root.innerHTML = emptyState({ title: 'Sin workflows', subtitle: 'Cuando armes uno aparecerá acá.', icon: '◫', cta: 'Crear workflow' }); return; }

  const t = (k) => i18n.t(k);
  const node = nodes.find(n => n.id === selectedNode);

  root.innerHTML = `
    <div class="wf-wrap">
      <header class="wf-header">
        <div>
          <div class="t-label-sm" style="color: var(--text-muted);">${t('workflow.title')}</div>
          <h1 class="t-display-sm" style="margin: 4px 0 0 0;">Cotización B2B · Marluvas MX/CR/CO</h1>
        </div>
        <div class="wf-toolbar">
          <button class="btn btn-sm" aria-label="${t('workflow.toolbar.fit')}">◈ ${t('workflow.toolbar.fit')}</button>
          <button class="btn btn-sm" aria-label="Zoom out">−</button>
          <span class="t-body-sm" style="min-width: 40px; text-align: center;">100%</span>
          <button class="btn btn-sm" aria-label="Zoom in">+</button>
          <button class="btn btn-sm">${t('workflow.toolbar.run')} ▶</button>
          <button class="btn btn-primary btn-sm">${t('workflow.toolbar.deploy')}</button>
        </div>
      </header>

      <div class="wf-layout">
        <aside class="wf-palette card">
          <h3 class="t-label-md" style="color: var(--text-muted); margin: 0 0 var(--space-3) 0;">Paleta</h3>
          <ul class="wf-palette-list">
            ${['trigger','action','condition','skill','output','loop'].map(type => `
              <li class="wf-palette-item" data-type="${type}" draggable="true">
                <span class="wf-node-dot" style="background: var(--node-${type});" aria-hidden="true"></span>
                <span class="t-body-md">${t('workflow.nodes.' + type)}</span>
              </li>
            `).join('')}
          </ul>
        </aside>

        <section class="wf-canvas-wrap">
          <div class="wf-canvas" role="region" aria-label="Workflow canvas">
            <svg class="wf-edges" viewBox="0 0 1400 240" preserveAspectRatio="none" aria-hidden="true">
              ${edges.map(([from, to]) => {
                const a = nodes.find(n => n.id === from);
                const b = nodes.find(n => n.id === to);
                if (!a || !b) return '';
                const x1 = a.x + 180, y1 = a.y + 35;
                const x2 = b.x,       y2 = b.y + 35;
                const cx = (x1 + x2) / 2;
                return `<path d="M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}" stroke="var(--stroke-strong)" stroke-width="1.5" fill="none"/>`;
              }).join('')}
            </svg>
            ${nodes.map(n => `
              <button class="wf-node ${selectedNode === n.id ? 'selected' : ''}"
                      data-node="${n.id}"
                      style="left: ${n.x}px; top: ${n.y}px; border-left-color: var(--node-${n.type});"
                      aria-label="${t('workflow.nodes.' + n.type)}: ${n.label}">
                <div class="wf-node-head">
                  <span class="t-label-sm" style="color: var(--node-${n.type});">${t('workflow.nodes.' + n.type)}</span>
                  <span class="mono-inline" style="font-size: 10px;">${n.id}</span>
                </div>
                <div class="t-body-md">${n.label}</div>
              </button>
            `).join('')}
          </div>
          <div class="wf-minimap" aria-hidden="true">
            ${nodes.map(n => `<span class="wf-minimap-dot" style="left: ${n.x / 14}px; top: ${n.y / 4}px; background: var(--node-${n.type});"></span>`).join('')}
          </div>
        </section>

        <aside class="wf-inspector card">
          ${node ? `
            <div class="wf-insp-head">
              <span class="chip" style="background: var(--node-${node.type}); color: #fff; border-color: transparent;">${t('workflow.nodes.' + node.type)}</span>
              <span class="mono-inline" style="font-size: 11px;">${node.id}</span>
            </div>
            <h3 class="t-heading-md" style="margin: var(--space-3) 0 var(--space-2) 0;">${node.label}</h3>
            <p class="t-body-sm" style="color: var(--text-secondary); margin: 0;">${node.detail}</p>

            <div class="wf-insp-section">
              <h4 class="t-label-sm" style="color: var(--text-muted);">Configuración</h4>
              <label class="wf-insp-field">
                <span class="t-label-sm">Timeout (ms)</span>
                <input class="input" type="number" value="8000"/>
              </label>
              <label class="wf-insp-field">
                <span class="t-label-sm">Reintentos</span>
                <input class="input" type="number" value="2"/>
              </label>
              <label class="wf-insp-field">
                <span class="t-label-sm">On error</span>
                <select class="select">
                  <option>Continuar</option>
                  <option>Abortar</option>
                  <option>Escalar a humano</option>
                </select>
              </label>
            </div>

            <div class="wf-insp-section">
              <h4 class="t-label-sm" style="color: var(--text-muted);">Últimos runs</h4>
              <ul class="wf-runs-mini">
                <li>✓ 2.1 s · 2026-04-19 08:10</li>
                <li>✓ 1.9 s · 2026-04-19 07:42</li>
                <li>⚠ 8.2 s · 2026-04-19 06:33</li>
              </ul>
            </div>
          ` : `<div class="t-body-sm" style="color: var(--text-muted);">${t('workflow.inspector.empty')}</div>`}
        </aside>
      </div>
    </div>
  `;
  wireEvents();
  i18n.applyToDom(root);
}

function wireEvents() {
  root.querySelectorAll('.wf-node').forEach(btn => {
    btn.addEventListener('click', () => { selectedNode = btn.dataset.node; render(); });
  });
}

function injectStyles() {
  if (document.getElementById('wf-styles')) return;
  const s = document.createElement('style');
  s.id = 'wf-styles';
  s.textContent = `
    .wf-wrap { max-width: 1600px; margin: 0 auto; }
    .wf-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: var(--space-4); border-bottom: 1px solid var(--stroke-default); margin-bottom: var(--space-4); flex-wrap: wrap; gap: var(--space-3); }
    .wf-toolbar { display: flex; gap: var(--space-2); align-items: center; }

    .wf-layout { display: grid; grid-template-columns: 200px 1fr 280px; gap: var(--space-4); align-items: flex-start; }
    @media (max-width: 1180px) { .wf-layout { grid-template-columns: 1fr; } }

    .wf-palette { padding: var(--space-4); }
    .wf-palette-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--space-1); }
    .wf-palette-item {
      display: flex; align-items: center; gap: var(--space-3);
      padding: var(--space-2) var(--space-3);
      border-radius: var(--radius-md);
      cursor: grab;
      border: 1px solid transparent;
    }
    .wf-palette-item:hover { background: var(--bg-subtle); border-color: var(--stroke-default); }
    .wf-node-dot { width: 10px; height: 10px; border-radius: var(--radius-pill); display: inline-block; }

    .wf-canvas-wrap { position: relative; }
    .wf-canvas {
      position: relative;
      background: var(--bg-canvas);
      background-image: radial-gradient(circle, var(--stroke-default) 1px, transparent 1px);
      background-size: 20px 20px;
      background-position: 0 0;
      border: 1px solid var(--stroke-default);
      border-radius: var(--radius-lg);
      height: 520px;
      overflow: auto;
    }
    .wf-edges { position: absolute; top: 0; left: 0; width: 1400px; height: 240px; pointer-events: none; }
    .wf-node {
      position: absolute;
      width: 180px; padding: var(--space-3) var(--space-3) var(--space-3) var(--space-4);
      background: var(--bg-surface);
      border: 1px solid var(--stroke-default);
      border-left: 3px solid;
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-sm);
      text-align: left;
      transition: box-shadow var(--dur-fast), border-color var(--dur-fast);
      cursor: pointer;
    }
    .wf-node:hover { box-shadow: var(--shadow-md); }
    .wf-node.selected { border-color: var(--accent-primary); box-shadow: 0 0 0 2px var(--accent-primary-soft), var(--shadow-md); }
    .wf-node-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .wf-node .t-body-md { font-size: 13px; line-height: 1.35; }

    .wf-minimap {
      position: absolute; bottom: var(--space-3); right: var(--space-3);
      width: 120px; height: 40px;
      background: var(--bg-subtle); border: 1px solid var(--stroke-default);
      border-radius: var(--radius-sm);
      opacity: 0.85;
    }
    .wf-minimap-dot { position: absolute; width: 6px; height: 6px; border-radius: var(--radius-pill); }

    .wf-inspector { padding: var(--space-4); position: sticky; top: calc(var(--topbar-h) + var(--space-4)); }
    .wf-insp-head { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-2); }
    .wf-insp-section { margin-top: var(--space-4); padding-top: var(--space-4); border-top: 1px solid var(--stroke-default); }
    .wf-insp-section h4 { margin: 0 0 var(--space-2) 0; }
    .wf-insp-field { display: flex; flex-direction: column; gap: 4px; margin-bottom: var(--space-3); }
    .wf-runs-mini { list-style: none; padding: 0; margin: 0; font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); }
    .wf-runs-mini li { padding: 2px 0; }
  `;
  document.head.appendChild(s);
}
