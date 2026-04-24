/* ============================================================
   Módulo: Bandeja Detail — la demo central
   Draft + provenance sup + evidencia + action-risk + feedback
   ============================================================ */

import { i18n, bus } from '../core/boot.js';
import { drafts, agents } from '../data/mock.js';
import { riskBadge, provenanceSup, openFeedbackModal, emptyState, loadingState, errorState, injectWidgetStyles } from '../widgets/widgets.js';

let root = null;
let stateUnsub = null;
let currentState = 'loaded';

export const meta = { id: 'bandeja-detail', route: '#/bandeja/:id' };

export async function mount(slot, ctx) {
  root = slot;
  injectWidgetStyles();
  injectStyles();

  const draftId = ctx.params.id || 'dr_001';
  const draft = drafts.find(d => d.id === draftId) || drafts[0];
  const agent = agents.find(a => a.id === draft.agentId);

  stateUnsub = bus.on('view-state:change', (s) => {
    currentState = s;
    render(draft, agent);
  });
  render(draft, agent);

  return { unmount };
}

export function unmount() {
  stateUnsub?.();
  root && (root.innerHTML = '');
}

function render(draft, agent) {
  if (currentState === 'loading') { root.innerHTML = loadingState(); return; }
  if (currentState === 'error')   { root.innerHTML = errorState('Simulación de error — recargá.'); return; }
  if (currentState === 'empty')   { root.innerHTML = emptyState({
    title: i18n.t('bandeja.empty.title'), subtitle: i18n.t('bandeja.empty.subtitle'),
    icon: '✓', cta: 'Ver agentes', ctaHref: '#/agentes/ag_cotizador'
  }); return; }

  const t = (k) => i18n.t(k);
  root.innerHTML = `
    <div class="bd-wrap">
      <header class="bd-header">
        <div class="bd-crumbs">
          <a href="#/bandeja/dr_001" class="t-body-sm">${t('bandeja.title')}</a>
          <span aria-hidden="true">/</span>
          <span class="mono-inline">${draft.id}</span>
        </div>
        <div class="bd-meta">
          <span class="chip"><span aria-hidden="true">${agent.icon}</span> ${agent.name}</span>
          ${riskBadge(draft.riskClass)}
          <span class="chip chip-info">${t('bandeja.detail.risk.modes.' + draft.approvalMode)}</span>
          <span class="t-body-sm" style="color: var(--text-muted);">${draft.ageMinutes} ${t('bandeja.age.minutes')}</span>
        </div>
      </header>

      <div class="bd-grid">
        <!-- Left: draft rendered as email -->
        <article class="bd-draft card">
          <div class="bd-envelope">
            <div class="bd-env-row"><span class="t-label-sm">${t('bandeja.detail.from')}</span><span class="t-body-md">${draft.from}</span></div>
            <div class="bd-env-row"><span class="t-label-sm">${t('bandeja.detail.to')}</span><span class="t-body-md">${draft.to}</span></div>
            <div class="bd-env-row"><span class="t-label-sm">${t('bandeja.detail.subject')}</span><h1 class="bd-subject t-display-sm">${draft.subject}</h1></div>
          </div>
          <div class="bd-body t-body-lg" id="bd-body">
            ${renderDraftBody(draft.body)}
          </div>

          <footer class="bd-actions">
            <button class="btn btn-primary" data-act="approve">
              <span aria-hidden="true">✓</span> ${t('bandeja.detail.actions.approve')}
            </button>
            <button class="btn" data-act="edit">${t('bandeja.detail.actions.edit')}</button>
            <button class="btn" data-act="reject">${t('bandeja.detail.actions.reject')}</button>
            <button class="btn" data-act="consolidate" style="margin-left: auto;">
              <span aria-hidden="true">◈</span> ${t('bandeja.detail.actions.consolidate')}
            </button>
          </footer>
        </article>

        <!-- Right: evidence / provenance / risk / trace -->
        <aside class="bd-panel card">
          <nav class="bd-tabs" role="tablist">
            <button class="bd-tab active" role="tab" data-tab="evidence" aria-selected="true">${t('bandeja.detail.tabs.evidence')}</button>
            <button class="bd-tab" role="tab" data-tab="provenance">${t('bandeja.detail.tabs.provenance')}</button>
            <button class="bd-tab" role="tab" data-tab="risk">${t('bandeja.detail.tabs.risk')}</button>
            <button class="bd-tab" role="tab" data-tab="trace">${t('bandeja.detail.tabs.trace')}</button>
          </nav>
          <div class="bd-tab-panel" id="bd-tab-evidence">${renderEvidence(draft)}</div>
          <div class="bd-tab-panel" id="bd-tab-provenance" hidden>${renderProvenance(draft)}</div>
          <div class="bd-tab-panel" id="bd-tab-risk" hidden>${renderRisk(draft)}</div>
          <div class="bd-tab-panel" id="bd-tab-trace" hidden>${renderTrace(draft)}</div>
        </aside>
      </div>
    </div>
  `;

  wireEvents(draft);
  i18n.applyToDom(root);
}

function renderDraftBody(body) {
  return body.map((seg, i) => {
    if (!seg.claim) {
      // preserve newlines
      return seg.text.replace(/\n/g, '<br/>');
    }
    // find span index by evidence_span_id
    const label = `E${parseInt(seg.claim.id.split('_')[1], 10)}`;
    return `<mark class="bd-claim" data-evidence="${seg.claim.evidence_span_id}">${seg.text}</mark>${provenanceSup(seg.claim.id, seg.claim.evidence_span_id, label)}`;
  }).join('');
}

function renderEvidence(draft) {
  const t = (k) => i18n.t(k);
  if (!draft.evidence?.length) return emptyState({ title: t('bandeja.detail.evidence.empty'), subtitle: '', icon: '○' });
  return `<ol class="bd-evidence-list">
    ${draft.evidence.map((e, i) => `
      <li class="bd-ev-item" data-ev="${e.span_id}">
        <div class="bd-ev-head">
          <span class="bd-ev-badge t-label-sm">E${i + 1}</span>
          <span class="mono-inline">${e.source}</span>
        </div>
        <div class="bd-ev-meta t-body-sm">
          <span>${t('bandeja.detail.evidence.version')}: <code>${e.version}</code></span>
          ${e.lineRange ? `<span>${t('bandeja.detail.evidence.lines')}: <code>${e.lineRange}</code></span>` : ''}
        </div>
        <button class="btn btn-ghost btn-sm bd-ev-open">${t('bandeja.detail.evidence.openInKb')} →</button>
      </li>
    `).join('')}
  </ol>`;
}

function renderProvenance(draft) {
  if (!draft.evidence?.length) return emptyState({ title: '—', subtitle: 'Sin procedencia en este draft', icon: '○' });
  return `
    <div class="bd-prov-tree">
      ${draft.evidence.map((e, i) => `
        <div class="bd-prov-node">
          <div class="bd-prov-claim">
            <span class="bd-ev-badge t-label-sm">E${i + 1}</span>
            <span class="mono-inline">claim_${i + 1}</span>
          </div>
          <div class="bd-prov-arrow" aria-hidden="true">→</div>
          <div class="bd-prov-span">
            <span class="t-label-sm" style="color:var(--text-muted);">evidence_span</span>
            <span class="mono-inline">${e.span_id}</span>
          </div>
          <div class="bd-prov-arrow" aria-hidden="true">→</div>
          <div class="bd-prov-source">
            <span class="t-label-sm" style="color:var(--text-muted);">source</span>
            <div class="mono-inline">${e.source}</div>
            <div class="t-body-sm" style="color:var(--text-muted);">v${e.version}${e.lineRange ? ' · L' + e.lineRange : ''}</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderRisk(draft) {
  const t = (k) => i18n.t(k);
  const rows = [
    { k: 'class', v: riskBadge(draft.riskClass) },
    { k: 'mode', v: `<span class="chip chip-info">${t('bandeja.detail.risk.modes.' + draft.approvalMode)}</span>` },
    { k: 'reversible', v: draft.reversible ? '<span class="chip chip-success">✓ Sí</span>' : '<span class="chip chip-danger">✕ No</span>' },
    { k: 'customer', v: draft.customerVisible ? '<span class="chip chip-warning">Visible</span>' : '<span class="chip">Interno</span>' },
    { k: 'financial', v: `<span class="chip">${t('bandeja.detail.risk.levels.' + draft.financialImpact)}</span>` },
    { k: 'truth', v: `<code>${draft.sourceOfTruth}</code>` }
  ];
  return `
    <dl class="bd-risk-grid">
      ${rows.map(r => `
        <dt class="t-label-sm">${t('bandeja.detail.risk.' + r.k)}</dt>
        <dd>${r.v}</dd>
      `).join('')}
    </dl>
  `;
}

function renderTrace(draft) {
  const t = (k) => i18n.t(k);
  if (!draft.workflowTrace?.length) return emptyState({ title: '—', subtitle: 'Sin trace', icon: '○' });
  return `
    <ol class="bd-trace">
      ${draft.workflowTrace.map(step => `
        <li class="bd-trace-step">
          <span class="bd-trace-dot ${step.ok ? 'ok' : 'fail'}" aria-hidden="true">${step.ok ? '✓' : '✕'}</span>
          <div class="bd-trace-body">
            <div class="mono-inline">${step.step}</div>
            <div class="t-body-sm" style="color: var(--text-muted);">${step.at.replace('T', ' ').slice(5, 19)} · ${step.durMs}ms</div>
          </div>
        </li>
      `).join('')}
    </ol>
  `;
}

function wireEvents(draft) {
  // Tabs
  root.querySelectorAll('.bd-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      root.querySelectorAll('.bd-tab').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
      btn.classList.add('active'); btn.setAttribute('aria-selected', 'true');
      root.querySelectorAll('.bd-tab-panel').forEach(p => p.hidden = true);
      root.querySelector(`#bd-tab-${btn.dataset.tab}`).hidden = false;
    });
  });

  // Provenance hover link: highlight span + evidence
  root.querySelectorAll('.fl-prov-sup').forEach(sup => {
    const ev = sup.dataset.evidence;
    const activate = () => {
      root.querySelectorAll('.bd-claim').forEach(m => m.classList.toggle('highlighted', m.dataset.evidence === ev));
      root.querySelectorAll('.bd-ev-item').forEach(li => li.classList.toggle('highlighted', li.dataset.ev === ev));
      // switch to evidence tab
      root.querySelector('.bd-tab[data-tab="evidence"]')?.click();
    };
    sup.addEventListener('mouseenter', activate);
    sup.addEventListener('focus', activate);
    sup.addEventListener('click', activate);
  });

  // Actions
  root.querySelector('[data-act="approve"]')?.addEventListener('click', () => {
    bus.emit('draft:approved', { id: draft.id });
    alert('Draft aprobado (mock).');
  });
  root.querySelector('[data-act="reject"]')?.addEventListener('click', () => openFeedbackModal(draft.id));
  root.querySelector('[data-act="edit"]')?.addEventListener('click', () => openFeedbackModal(draft.id));
  root.querySelector('[data-act="consolidate"]')?.addEventListener('click', () => {
    location.hash = '#/skills/sk_cotizar';
  });
}

function injectStyles() {
  if (document.getElementById('bd-styles')) return;
  const s = document.createElement('style');
  s.id = 'bd-styles';
  s.textContent = `
    .bd-wrap { max-width: 1400px; margin: 0 auto; }
    .bd-header {
      display: flex; justify-content: space-between; align-items: center;
      padding-bottom: var(--space-4);
      border-bottom: 1px solid var(--stroke-default);
      margin-bottom: var(--space-5);
      flex-wrap: wrap; gap: var(--space-3);
    }
    .bd-crumbs { display: flex; align-items: center; gap: var(--space-2); color: var(--text-muted); }
    .bd-crumbs a { color: var(--text-secondary); text-decoration: none; }
    .bd-crumbs a:hover { color: var(--accent-primary); text-decoration: underline; }
    .bd-meta { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; }

    .bd-grid {
      display: grid; grid-template-columns: 1.4fr 1fr;
      gap: var(--space-5);
      align-items: flex-start;
    }
    @media (max-width: 1080px) { .bd-grid { grid-template-columns: 1fr; } }

    .bd-draft { padding: var(--space-8); }
    .bd-envelope {
      border-bottom: 1px solid var(--stroke-default);
      padding-bottom: var(--space-4);
      margin-bottom: var(--space-5);
      display: flex; flex-direction: column; gap: var(--space-2);
    }
    .bd-env-row { display: grid; grid-template-columns: 70px 1fr; align-items: baseline; gap: var(--space-3); }
    .bd-env-row .t-label-sm { color: var(--text-muted); }
    .bd-subject { margin: 0; line-height: 1.25; }
    .bd-body { color: var(--text-primary); line-height: 1.75; }
    .bd-body .bd-claim { background: transparent; color: var(--text-primary); border-bottom: 1px dashed var(--text-evidence); padding: 0; }
    .bd-body .bd-claim.highlighted { background: var(--accent-primary-soft); }

    .bd-actions {
      display: flex; gap: var(--space-2); flex-wrap: wrap;
      padding-top: var(--space-5); margin-top: var(--space-6);
      border-top: 1px solid var(--stroke-default);
    }

    .bd-panel { padding: 0; overflow: hidden; position: sticky; top: calc(var(--topbar-h) + var(--space-4)); max-height: calc(100vh - var(--topbar-h) - var(--space-8)); display: flex; flex-direction: column; }
    .bd-tabs { display: flex; border-bottom: 1px solid var(--stroke-default); padding: 0 var(--space-3); flex-shrink: 0; }
    .bd-tab {
      padding: var(--space-3) var(--space-4);
      font-size: 13px; font-weight: 500;
      color: var(--text-muted);
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
      min-height: 44px;
    }
    .bd-tab:hover { color: var(--text-primary); }
    .bd-tab.active { color: var(--accent-primary); border-bottom-color: var(--accent-primary); }
    .bd-tab-panel { padding: var(--space-5); overflow-y: auto; flex: 1; }

    .bd-evidence-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--space-3); counter-reset: ev; }
    .bd-ev-item {
      padding: var(--space-3);
      border: 1px solid var(--stroke-default);
      border-radius: var(--radius-md);
      background: var(--bg-surface);
      transition: border-color var(--dur-fast), background var(--dur-fast);
    }
    .bd-ev-item.highlighted {
      border-color: var(--accent-primary);
      background: var(--accent-primary-soft);
    }
    .bd-ev-head { display: flex; align-items: center; gap: var(--space-2); margin-bottom: var(--space-2); flex-wrap: wrap; }
    .bd-ev-badge {
      display: inline-flex; align-items: center; justify-content: center;
      min-width: 26px; height: 20px; padding: 0 6px;
      background: var(--text-evidence); color: #fff;
      border-radius: var(--radius-sm); font-family: var(--font-mono);
    }
    .bd-ev-meta { display: flex; gap: var(--space-3); margin-bottom: var(--space-2); color: var(--text-muted); flex-wrap: wrap; }

    .bd-prov-tree { display: flex; flex-direction: column; gap: var(--space-3); }
    .bd-prov-node {
      display: grid; grid-template-columns: auto auto 1fr auto auto;
      gap: var(--space-2); align-items: center;
      padding: var(--space-2) var(--space-3);
      background: var(--bg-subtle); border-radius: var(--radius-md);
      font-size: 12px;
    }
    .bd-prov-claim, .bd-prov-span { display: flex; align-items: center; gap: var(--space-1); flex-direction: column; }
    .bd-prov-arrow { color: var(--text-muted); font-size: 16px; }
    .bd-prov-source { text-align: right; }

    .bd-risk-grid {
      display: grid; grid-template-columns: auto 1fr;
      gap: var(--space-3) var(--space-5);
      margin: 0;
    }
    .bd-risk-grid dt { color: var(--text-muted); }
    .bd-risk-grid dd { margin: 0; }

    .bd-trace { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--space-3); position: relative; }
    .bd-trace::before { content: ''; position: absolute; top: 12px; bottom: 12px; left: 8px; width: 1px; background: var(--stroke-default); }
    .bd-trace-step { display: flex; gap: var(--space-3); align-items: flex-start; position: relative; z-index: 1; }
    .bd-trace-dot {
      width: 18px; height: 18px; border-radius: var(--radius-pill);
      display: inline-flex; align-items: center; justify-content: center;
      background: var(--bg-surface); border: 2px solid var(--status-success);
      color: var(--status-success); font-size: 10px; font-weight: 700;
      flex-shrink: 0; margin-top: 1px;
    }
    .bd-trace-dot.fail { border-color: var(--status-danger); color: var(--status-danger); }
    .bd-trace-body { display: flex; flex-direction: column; gap: 2px; }
  `;
  document.head.appendChild(s);
}
