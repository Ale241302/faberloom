/* ============================================================
   Módulo: Skill Studio — 3 capas + Learning Thermometer + Consolidación
   ============================================================ */

import { i18n, bus } from '../core/boot.js';
import { skills, consolidations } from '../data/mock.js';
import { thermometer, openConsolidationModal, emptyState, loadingState, errorState, injectWidgetStyles } from '../widgets/widgets.js';

let root = null;
let stateUnsub = null;
let currentState = 'loaded';
let activeLayer = 'manual';

export const meta = { id: 'skill-studio', route: '#/skills/:id' };

export async function mount(slot, ctx) {
  root = slot;
  injectWidgetStyles();
  injectStyles();

  const skillId = ctx.params.id || 'sk_cotizar';
  const skill = skills[skillId] || skills.sk_cotizar;

  stateUnsub = bus.on('view-state:change', (s) => { currentState = s; render(skill); });
  render(skill);

  return { unmount };
}

export function unmount() {
  stateUnsub?.();
  root && (root.innerHTML = '');
}

function render(skill) {
  if (currentState === 'loading') { root.innerHTML = loadingState(); return; }
  if (currentState === 'error')   { root.innerHTML = errorState(); return; }
  if (currentState === 'empty')   { root.innerHTML = emptyState({ title: i18n.t('skill.goldSamples.empty'), subtitle: 'Aún no hay skills configuradas.', icon: '◇' }); return; }

  const t = (k) => i18n.t(k);
  const cons = consolidations.find(c => c.skillId === skill.id);
  root.innerHTML = `
    <div class="ss-wrap">
      <header class="ss-header">
        <div class="ss-title">
          <div class="t-label-sm" style="color:var(--text-muted);">${t('skill.title')}</div>
          <h1 class="t-display-sm" style="margin: 4px 0 0 0;">${skill.name}</h1>
        </div>
        ${thermometer(skill.overlayLearned.thermometer, skill.overlayLearned.pendingPatterns)}
      </header>

      <nav class="ss-tabs" role="tablist">
        <button class="ss-tab ${activeLayer === 'base' ? 'active' : ''}" data-layer="base" role="tab">${t('skill.layers.base')}</button>
        <button class="ss-tab ${activeLayer === 'manual' ? 'active' : ''}" data-layer="manual" role="tab">${t('skill.layers.manual')}</button>
        <button class="ss-tab ${activeLayer === 'learned' ? 'active' : ''}" data-layer="learned" role="tab">
          ${t('skill.layers.learned')}
          ${skill.overlayLearned.pendingPatterns ? `<span class="chip chip-danger" style="margin-left: 8px;">${skill.overlayLearned.pendingPatterns}</span>` : ''}
        </button>
      </nav>

      <div class="ss-grid">
        <section class="ss-main">
          ${activeLayer === 'base'    ? renderBase(skill) : ''}
          ${activeLayer === 'manual'  ? renderManual(skill) : ''}
          ${activeLayer === 'learned' ? renderLearned(skill, cons) : ''}
        </section>

        <aside class="ss-aside">
          <div class="card ss-gold">
            <div class="ss-gold-head">
              <h2 class="t-heading-md" style="margin:0;">${t('skill.goldSamples.title')}</h2>
              <span class="chip">${skill.goldSamples.length}</span>
            </div>
            <ul class="ss-gold-list">
              ${skill.goldSamples.map(gs => `
                <li class="ss-gold-item">
                  <div class="ss-gold-head-row">
                    <span class="chip ${gs.status === 'active' ? 'chip-success' : gs.status === 'candidate' ? 'chip-warning' : ''}">
                      ${t('skill.goldSamples.' + gs.status)}
                    </span>
                    <span class="mono-inline" style="font-size: 11px;">${gs.id}</span>
                  </div>
                  <div class="t-body-sm" style="margin-top: 6px; color: var(--text-secondary);">${gs.contextSummary}</div>
                  ${gs.approvedBy ? `<div class="t-body-sm" style="color: var(--text-muted); font-size: 11px; margin-top: 4px;">✓ ${gs.approvedBy} · ${gs.approvedAt}</div>` : ''}
                </li>
              `).join('')}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  `;
  wireEvents(skill);
  i18n.applyToDom(root);
}

function renderBase(skill) {
  const t = (k) => i18n.t(k);
  return `
    <div class="card ss-layer ss-layer-base">
      <header class="ss-layer-head">
        <div>
          <div class="t-label-sm" style="color: var(--status-info);">${t('skill.base.sealed').toUpperCase()}</div>
          <h2 class="t-heading-md" style="margin: 4px 0 0 0;">${t('skill.layers.base')}</h2>
        </div>
        <div class="t-body-sm" style="color:var(--text-muted);">
          <span class="mono-inline">v${skill.base.version}</span> · ${t('skill.base.published')} ${skill.base.publishedAt}
        </div>
      </header>
      <pre class="ss-code">${skill.base.body}</pre>
      <div class="t-body-sm" style="color: var(--text-muted); font-style: italic;" class="ss-gloss">
        <span aria-hidden="true">│ </span>La capa base es sellada: define el contrato mínimo que nunca cambia sin release. Tu overlay manual y aprendido se superponen encima.
      </div>
    </div>
  `;
}

function renderManual(skill) {
  const t = (k) => i18n.t(k);
  return `
    <div class="card ss-layer">
      <header class="ss-layer-head">
        <div>
          <div class="t-label-sm" style="color: var(--accent-primary);">EDITABLE</div>
          <h2 class="t-heading-md" style="margin: 4px 0 0 0;">${t('skill.layers.manual')}</h2>
        </div>
        <div style="display:flex; gap: var(--space-2);">
          <button class="btn btn-sm">${t('skill.manual.version')}</button>
          <button class="btn btn-primary btn-sm">+ ${t('skill.manual.addRule')}</button>
        </div>
      </header>

      <ul class="ss-rules">
        ${skill.overlayManual.map(r => `
          <li class="ss-rule-item">
            <div class="ss-rule-body">
              <div class="t-body-md">${r.rule}</div>
              <div class="t-body-sm" style="color: var(--text-muted); font-size: 11px; margin-top: 4px;">
                <span class="mono-inline">${r.id}</span> · ${r.by} · ${r.at}
              </div>
            </div>
            <div class="ss-rule-actions">
              <button class="btn btn-ghost btn-sm" aria-label="Edit">✎</button>
              <button class="btn btn-ghost btn-sm" aria-label="Suspend">⏸</button>
              <button class="btn btn-ghost btn-sm" aria-label="Archive">⌫</button>
            </div>
          </li>
        `).join('')}
      </ul>
    </div>
  `;
}

function renderLearned(skill, cons) {
  const t = (k) => i18n.t(k);
  const learned = skill.overlayLearned;
  return `
    <div class="card ss-layer ss-layer-learned">
      <header class="ss-layer-head">
        <div>
          <div class="t-label-sm" style="color: var(--status-danger);">GATE HUMANO</div>
          <h2 class="t-heading-md" style="margin: 4px 0 0 0;">${t('skill.layers.learned')}</h2>
        </div>
        ${cons ? `<button class="btn btn-primary btn-sm" id="ss-open-cons">${t('skill.learned.openModal')} →</button>` : ''}
      </header>

      <div class="ss-learned-stats">
        <div><div class="t-display-md" style="font-family: var(--font-ui); font-style: normal; color: var(--status-danger);">${learned.pendingPatterns}</div><div class="t-body-sm">${t('skill.learned.pending')}</div></div>
        <div><div class="t-display-md" style="font-family: var(--font-ui); font-style: normal; color: var(--status-success);">${learned.activeRules}</div><div class="t-body-sm">${t('skill.learned.active')}</div></div>
        <div><div class="t-display-md" style="font-family: var(--font-ui); font-style: normal; color: var(--text-muted);">${learned.revertedRules}</div><div class="t-body-sm">${t('skill.learned.reverted')}</div></div>
      </div>

      <h3 class="t-label-md" style="margin: var(--space-6) 0 var(--space-3) 0; color: var(--text-muted);">Patrones pendientes</h3>
      <ul class="ss-patterns">
        ${learned.pending.map(p => `
          <li class="ss-pattern-item">
            <div class="ss-pattern-head">
              <span class="chip chip-warning">${p.appliesTo}</span>
              <span class="t-body-sm" style="color: var(--text-muted);">${p.count} ocurrencias · confianza ${(p.confidence*100).toFixed(0)}%</span>
            </div>
            <div class="t-body-md" style="margin-top: var(--space-2);">${p.pattern}</div>
          </li>
        `).join('')}
      </ul>

      <h3 class="t-label-md" style="margin: var(--space-6) 0 var(--space-3) 0; color: var(--text-muted);">Reglas activas</h3>
      <ul class="ss-rules">
        ${learned.active.map(r => `
          <li class="ss-rule-item" style="background: var(--status-success-soft); border-color: transparent;">
            <div class="ss-rule-body">
              <div class="t-body-md">${r.rule}</div>
              <div class="t-body-sm" style="color: var(--text-muted); font-size: 11px; margin-top: 4px;">
                <span class="mono-inline">${r.id}</span> · confirmada ${r.confirmedAt} · ${r.runs} runs
              </div>
            </div>
            <div class="ss-rule-actions">
              <button class="btn btn-ghost btn-sm" aria-label="Revert">↶</button>
              <button class="btn btn-ghost btn-sm" aria-label="Suspend">⏸</button>
            </div>
          </li>
        `).join('')}
      </ul>
    </div>
  `;
}

function wireEvents(skill) {
  root.querySelectorAll('.ss-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      activeLayer = btn.dataset.layer;
      render(skill);
    });
  });
  root.querySelector('#ss-open-cons')?.addEventListener('click', () => {
    const cons = consolidations.find(c => c.skillId === skill.id);
    if (cons) openConsolidationModal(cons);
  });
}

function injectStyles() {
  if (document.getElementById('ss-styles')) return;
  const s = document.createElement('style');
  s.id = 'ss-styles';
  s.textContent = `
    .ss-wrap { max-width: 1400px; margin: 0 auto; }
    .ss-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      padding-bottom: var(--space-4);
      border-bottom: 1px solid var(--stroke-default);
      margin-bottom: var(--space-5);
      flex-wrap: wrap; gap: var(--space-3);
    }
    .ss-tabs {
      display: flex; gap: 0;
      border-bottom: 1px solid var(--stroke-default);
      margin-bottom: var(--space-5);
    }
    .ss-tab {
      padding: var(--space-3) var(--space-4);
      font-size: 14px; font-weight: 500;
      color: var(--text-muted);
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
      min-height: 44px;
      display: inline-flex; align-items: center; gap: var(--space-2);
    }
    .ss-tab:hover { color: var(--text-primary); }
    .ss-tab.active { color: var(--accent-primary); border-bottom-color: var(--accent-primary); font-weight: 600; }

    .ss-grid {
      display: grid; grid-template-columns: 1.6fr 1fr;
      gap: var(--space-5);
      align-items: flex-start;
    }
    @media (max-width: 1080px) { .ss-grid { grid-template-columns: 1fr; } }

    .ss-layer { padding: var(--space-6); }
    .ss-layer-base { border-left: 3px solid var(--status-info); }
    .ss-layer-learned { border-left: 3px solid var(--status-danger); }
    .ss-layer-head {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: var(--space-5); flex-wrap: wrap; gap: var(--space-3);
    }

    .ss-code {
      font-family: var(--font-mono);
      font-size: 13px;
      line-height: 1.6;
      padding: var(--space-4);
      background: var(--bg-sunken);
      border-radius: var(--radius-md);
      color: var(--text-secondary);
      overflow-x: auto;
      margin: 0 0 var(--space-4) 0;
      white-space: pre-wrap;
    }

    .ss-rules, .ss-patterns { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--space-2); }
    .ss-rule-item {
      display: flex; justify-content: space-between; align-items: flex-start;
      padding: var(--space-3) var(--space-4);
      background: var(--bg-subtle);
      border: 1px solid var(--stroke-default);
      border-radius: var(--radius-md);
      gap: var(--space-3);
    }
    .ss-rule-body { flex: 1; }
    .ss-rule-actions { display: flex; gap: var(--space-1); opacity: 0; transition: opacity var(--dur-fast); }
    .ss-rule-item:hover .ss-rule-actions { opacity: 1; }

    .ss-pattern-item {
      padding: var(--space-3) var(--space-4);
      background: var(--status-warning-soft);
      border-left: 3px solid var(--status-warning);
      border-radius: var(--radius-md);
    }
    .ss-pattern-head { display: flex; gap: var(--space-3); align-items: center; flex-wrap: wrap; }

    .ss-learned-stats {
      display: grid; grid-template-columns: repeat(3, 1fr);
      gap: var(--space-4);
      padding: var(--space-4);
      background: var(--bg-subtle);
      border-radius: var(--radius-md);
      text-align: center;
    }

    .ss-gold { padding: var(--space-5); position: sticky; top: calc(var(--topbar-h) + var(--space-4)); }
    .ss-gold-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4); }
    .ss-gold-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--space-3); max-height: 520px; overflow-y: auto; }
    .ss-gold-item { padding: var(--space-3); border: 1px solid var(--stroke-default); border-radius: var(--radius-md); background: var(--bg-surface); }
    .ss-gold-head-row { display: flex; justify-content: space-between; align-items: center; gap: var(--space-2); flex-wrap: wrap; }
  `;
  document.head.appendChild(s);
}
