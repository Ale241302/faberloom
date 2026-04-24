/* ============================================================
   Módulo: Agent Console — 4 tabs reales
   Resumen / Skills / Memoria / Logs
   ============================================================ */

import { i18n, bus } from '../core/boot.js';
import { agents, skills, drafts } from '../data/mock.js';
import { thermometer, autonomyLadder, emptyState, loadingState, errorState, injectWidgetStyles } from '../widgets/widgets.js';

let root = null;
let stateUnsub = null;
let currentState = 'loaded';
let activeTab = 'summary';

export const meta = { id: 'agent-console', route: '#/agentes/:id' };

export async function mount(slot, ctx) {
  root = slot;
  injectWidgetStyles();
  injectStyles();

  const agentId = ctx.params.id || 'ag_cotizador';
  const agent = agents.find(a => a.id === agentId) || agents[0];

  stateUnsub = bus.on('view-state:change', s => { currentState = s; render(agent); });
  render(agent);
  return { unmount };
}

export function unmount() { stateUnsub?.(); root && (root.innerHTML = ''); }

function render(agent) {
  if (currentState === 'loading') { root.innerHTML = loadingState(); return; }
  if (currentState === 'error')   { root.innerHTML = errorState(); return; }
  if (currentState === 'empty')   { root.innerHTML = emptyState({ title: 'Agente sin datos', subtitle: 'Aún no ha generado runs.', icon: '◔' }); return; }

  const t = (k) => i18n.t(k);
  root.innerHTML = `
    <div class="ac-wrap">
      <header class="ac-header">
        <div class="ac-id">
          <div class="ac-avatar" aria-hidden="true">${agent.icon}</div>
          <div>
            <div class="t-label-sm" style="color: var(--text-muted);">${t('agent.console.title')}</div>
            <h1 class="t-display-sm" style="margin: 4px 0 4px 0;">${agent.name}</h1>
            <p class="t-body-sm" style="color: var(--text-secondary); margin: 0;">${agent.persona}</p>
          </div>
        </div>
        <div class="ac-meta">
          <span class="chip ${agent.status === 'active' ? 'chip-success' : 'chip-warning'}">${t('status.' + agent.status)}</span>
          <span class="chip">${t('autonomy.label')}: <strong>L${agent.autonomy}</strong> · ${t('autonomy.L' + agent.autonomy + '.name')}</span>
          ${thermometer(agent.thermometer, agent.thermometer === 'hot' ? 7 : 0)}
        </div>
      </header>

      <nav class="ac-tabs" role="tablist">
        ${['summary','skills','memory','logs'].map(tab => `
          <button class="ac-tab ${activeTab === tab ? 'active' : ''}" role="tab" data-tab="${tab}">${t('agent.tabs.' + tab)}</button>
        `).join('')}
      </nav>

      <section class="ac-tab-panel">
        ${activeTab === 'summary' ? renderSummary(agent) : ''}
        ${activeTab === 'skills'  ? renderSkills(agent)  : ''}
        ${activeTab === 'memory'  ? renderMemory(agent)  : ''}
        ${activeTab === 'logs'    ? renderLogs(agent)    : ''}
      </section>
    </div>
  `;
  wireEvents(agent);
  i18n.applyToDom(root);
}

function renderSummary(agent) {
  const t = (k) => i18n.t(k);
  return `
    <div class="ac-summary-grid">
      <div class="card ac-kpis">
        ${[
          { k: 'draftsToday', v: agent.kpis.draftsToday },
          { k: 'approved7d', v: agent.kpis.approved7d },
          { k: 'approvalRate7d', v: agent.kpis.approvalRate7d + '%' },
          { k: 'cost7d', v: '$' + agent.kpis.cost7d.toFixed(2) }
        ].map(kpi => `
          <div class="ac-kpi">
            <div class="t-label-sm" style="color: var(--text-muted);">${t('agent.kpis.' + kpi.k)}</div>
            <div class="t-display-sm" style="font-style: normal; font-family: var(--font-ui); font-weight: 600; margin-top: 4px;">${kpi.v}</div>
          </div>
        `).join('')}
      </div>

      <div class="card ac-unlock">
        <h3 class="t-label-md" style="color: var(--text-muted); margin: 0 0 var(--space-3) 0;">${t('agent.nextUnlock.title')}</h3>
        ${autonomyLadder(agent.autonomy)}
        <div class="ac-criterion" style="margin-top: var(--space-4);">
          <div class="t-label-sm" style="color: var(--text-muted);">${t('autonomy.criterion')}</div>
          <div class="t-body-md" style="margin-top: 4px;">
            <strong>${agent.autonomyCurrent.approvedRate} %</strong> aprobado en <strong>${agent.autonomyCurrent.runs} runs</strong>
            — desbloqueo: <em>${agent.autonomyTargetCriteria}</em>
          </div>
          <div class="ac-progress" aria-label="Progreso al próximo unlock">
            <div class="ac-progress-bar" style="width: ${(agent.nextUnlockProgress * 100).toFixed(0)}%;"></div>
          </div>
        </div>
        <div class="t-body-sm" style="color: var(--text-muted); font-style: italic; margin-top: var(--space-3);">
          <span aria-hidden="true">│ </span>El gate de autonomía es un contrato textual visible, no un toggle. Solo sube cuando los datos lo respaldan.
        </div>
      </div>

      <div class="card ac-activity">
        <h3 class="t-label-md" style="color: var(--text-muted); margin: 0 0 var(--space-3) 0;">Actividad reciente</h3>
        <ul class="ac-activity-list">
          ${[
            { icon: '✓', text: 'Draft <code>dr_001</code> aprobado por Álvaro', time: 'hace 12 min' },
            { icon: '🔴', text: '7 patrones acumulados en skill <code>sk_cotizar</code> · listo para consolidar', time: 'hace 1 h' },
            { icon: '◔', text: 'Run <code>run_8842</code> ejecutado en 4.2 s', time: 'hace 2 h' },
            { icon: '↶', text: 'Regla aprendida <code>oa_3</code> revertida por humano', time: 'ayer' }
          ].map(a => `
            <li class="ac-activity-item">
              <span class="ac-activity-icon" aria-hidden="true">${a.icon}</span>
              <div>
                <div class="t-body-md">${a.text}</div>
                <div class="t-body-sm" style="color: var(--text-muted);">${a.time}</div>
              </div>
            </li>
          `).join('')}
        </ul>
      </div>
    </div>
  `;
}

function renderSkills(agent) {
  const t = (k) => i18n.t(k);
  return `
    <ul class="ac-skill-list">
      ${agent.skills.map(skId => {
        const sk = skills[skId];
        if (!sk) return `<li class="card"><div class="t-body-sm">Skill <code>${skId}</code> sin datos en mock</div></li>`;
        return `
          <li class="card ac-skill-item">
            <div>
              <div class="t-heading-md" style="margin: 0;">${sk.name}</div>
              <div class="t-body-sm" style="color: var(--text-muted); margin-top: 4px;">
                <span class="mono-inline">${sk.id}</span> · v${sk.base.version}
              </div>
            </div>
            <div class="ac-skill-stats">
              ${thermometer(sk.overlayLearned.thermometer, sk.overlayLearned.pendingPatterns)}
              <a href="#/skills/${sk.id}" class="btn btn-sm">Abrir studio →</a>
            </div>
          </li>
        `;
      }).join('')}
    </ul>
  `;
}

function renderMemory(agent) {
  const t = (k) => i18n.t(k);
  return `
    <div class="ac-memory">
      ${[
        { layer: 'session', items: [
          { fact: 'Cliente "Distribuidora ABC" prefiere ser saludado como Claudia', at: 'sesión actual' }
        ]},
        { layer: 'project', items: [
          { fact: 'Indusur usa moneda CRC para pagos locales', at: '2026-04-12' },
          { fact: 'Tecnoseguridad cierra los viernes a las 14h', at: '2026-04-08' }
        ]},
        { layer: 'global', items: [
          { fact: 'Marluvas Goliath x40 norma EN ISO 20345:2011 S3 SRC', at: '2026-03-12' },
          { fact: 'Descuento distribuidor 8% para CR y MX', at: '2026-03-15' },
          { fact: 'Plazo mínimo logística MX = 5 días hábiles', at: '2026-04-02' }
        ]}
      ].map(layer => `
        <section class="ac-mem-layer card">
          <h3 class="t-label-md" style="color: var(--text-muted); margin: 0 0 var(--space-3) 0;">
            ${t('agent.memory.' + layer.layer)} · ${layer.items.length}
          </h3>
          <ul class="ac-mem-list">
            ${layer.items.map(item => `
              <li class="ac-mem-item">
                <div class="t-body-md" style="flex: 1;">${item.fact}</div>
                <div class="t-body-sm" style="color: var(--text-muted); white-space: nowrap;">${item.at}</div>
                <button class="btn btn-ghost btn-sm">${t('agent.memory.forget')}</button>
              </li>
            `).join('')}
          </ul>
        </section>
      `).join('')}
    </div>
  `;
}

function renderLogs(agent) {
  const agentDrafts = drafts.filter(d => d.agentId === agent.id);
  return `
    <div class="card">
      <table class="ac-logs">
        <thead>
          <tr>
            <th>Run ID</th><th>Draft</th><th>Estado</th><th>Tiempo</th><th>Tokens</th>
          </tr>
        </thead>
        <tbody>
          ${agentDrafts.map((d, i) => `
            <tr>
              <td><code>run_${8800 + i}</code></td>
              <td><a href="#/bandeja/${d.id}">${d.subject.slice(0, 50)}…</a></td>
              <td><span class="chip chip-success">✓ OK</span></td>
              <td class="t-body-sm">${(2.1 + i * 0.4).toFixed(1)} s</td>
              <td class="t-body-sm">${1200 + i * 180}</td>
            </tr>
          `).join('')}
          ${[1,2,3,4].map(i => `
            <tr>
              <td><code>run_${8780 - i}</code></td>
              <td class="t-body-sm" style="color: var(--text-muted);">Histórico</td>
              <td><span class="chip ${i % 3 === 0 ? 'chip-warning' : 'chip-success'}">${i % 3 === 0 ? '⚠ Warn' : '✓ OK'}</span></td>
              <td class="t-body-sm">${(1.8 + i * 0.3).toFixed(1)} s</td>
              <td class="t-body-sm">${980 + i * 90}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function wireEvents(agent) {
  root.querySelectorAll('.ac-tab').forEach(btn => {
    btn.addEventListener('click', () => { activeTab = btn.dataset.tab; render(agent); });
  });
}

function injectStyles() {
  if (document.getElementById('ac-styles')) return;
  const s = document.createElement('style');
  s.id = 'ac-styles';
  s.textContent = `
    .ac-wrap { max-width: 1280px; margin: 0 auto; }
    .ac-header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: var(--space-4); border-bottom: 1px solid var(--stroke-default); margin-bottom: var(--space-5); flex-wrap: wrap; gap: var(--space-4); }
    .ac-id { display: flex; gap: var(--space-4); align-items: flex-start; }
    .ac-avatar { width: 56px; height: 56px; border-radius: var(--radius-lg); background: var(--accent-primary-soft); display: inline-flex; align-items: center; justify-content: center; font-size: 28px; }
    .ac-meta { display: flex; gap: var(--space-2); align-items: center; flex-wrap: wrap; }

    .ac-tabs { display: flex; border-bottom: 1px solid var(--stroke-default); margin-bottom: var(--space-5); }
    .ac-tab { padding: var(--space-3) var(--space-4); font-size: 14px; font-weight: 500; color: var(--text-muted); border-bottom: 2px solid transparent; margin-bottom: -1px; min-height: 44px; }
    .ac-tab:hover { color: var(--text-primary); }
    .ac-tab.active { color: var(--accent-primary); border-bottom-color: var(--accent-primary); font-weight: 600; }

    .ac-summary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-4); }
    @media (max-width: 980px) { .ac-summary-grid { grid-template-columns: 1fr; } }

    .ac-kpis { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-4); padding: var(--space-5); }
    .ac-kpi { padding: var(--space-3); }

    .ac-unlock { padding: var(--space-5); }
    .ac-progress { width: 100%; height: 6px; background: var(--bg-sunken); border-radius: var(--radius-pill); margin-top: var(--space-3); overflow: hidden; }
    .ac-progress-bar { height: 100%; background: linear-gradient(90deg, var(--accent-primary), var(--accent-primary-hover)); transition: width var(--dur-slow) var(--ease-out); }

    .ac-activity { padding: var(--space-5); grid-column: 1 / -1; }
    .ac-activity-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--space-3); }
    .ac-activity-item { display: flex; gap: var(--space-3); align-items: flex-start; padding: var(--space-2) 0; }
    .ac-activity-icon { width: 24px; text-align: center; }

    .ac-skill-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--space-3); }
    .ac-skill-item { display: flex; justify-content: space-between; align-items: center; padding: var(--space-4) var(--space-5); flex-wrap: wrap; gap: var(--space-3); }
    .ac-skill-stats { display: flex; gap: var(--space-3); align-items: center; }

    .ac-memory { display: grid; grid-template-columns: 1fr; gap: var(--space-4); }
    .ac-mem-layer { padding: var(--space-5); }
    .ac-mem-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--space-1); }
    .ac-mem-item { display: flex; gap: var(--space-3); align-items: center; padding: var(--space-2) 0; border-bottom: 1px solid var(--stroke-default); }
    .ac-mem-item:last-child { border-bottom: 0; }

    .ac-logs { width: 100%; border-collapse: collapse; }
    .ac-logs th, .ac-logs td { text-align: left; padding: var(--space-3); border-bottom: 1px solid var(--stroke-default); font-size: 13px; }
    .ac-logs th { color: var(--text-muted); font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
    .ac-logs tr:last-child td { border-bottom: 0; }
    .ac-logs a { color: var(--accent-primary); text-decoration: none; }
    .ac-logs a:hover { text-decoration: underline; }
  `;
  document.head.appendChild(s);
}
