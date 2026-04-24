/* ============================================================
   Widgets reusables — todos en un archivo por economía
   ============================================================ */

import { i18n, bus, a11y } from '../core/boot.js';

// ─── Learning Thermometer ─────────────────────────────────────
export function thermometer(state /* 'cold'|'warm'|'hot' */, count = 0) {
  const map = {
    cold: { color: 'var(--status-info)', bg: 'var(--status-info-soft)', icon: '🔵', label: i18n.t('skill.learned.cold') },
    warm: { color: 'var(--status-warning)', bg: 'var(--status-warning-soft)', icon: '🟡', label: i18n.t('skill.learned.warm') },
    hot:  { color: 'var(--status-danger)', bg: 'var(--status-danger-soft)', icon: '🔴', label: i18n.t('skill.learned.hot') }
  };
  const c = map[state] || map.cold;
  return `
    <span class="fl-thermometer" style="background:${c.bg}; color:${c.color}; border-color: transparent;"
          role="status" aria-label="${c.label} · ${count}">
      <span aria-hidden="true">${c.icon}</span>
      <span style="font-weight:600;">${c.label}</span>
      ${count > 0 ? `<span style="opacity:0.85;">· ${count}</span>` : ''}
    </span>`;
}

// ─── Autonomy Ladder ──────────────────────────────────────────
export function autonomyLadder(currentLevel /* 0-4 */, opts = {}) {
  const levels = [0, 1, 2, 3, 4];
  return `
    <div class="fl-ladder" role="group" aria-label="${i18n.t('autonomy.label')}">
      ${levels.map(L => {
        const isActive = L === currentLevel;
        const isCompleted = L < currentLevel;
        const isLocked = L > currentLevel;
        const stateClass = isActive ? 'active' : isCompleted ? 'completed' : 'locked';
        const help = i18n.t(`autonomy.L${L}.help`);
        const name = i18n.t(`autonomy.L${L}.name`);
        return `
          <div class="fl-ladder-step ${stateClass}" title="${help}">
            <div class="fl-ladder-dot" aria-hidden="true">
              ${isLocked ? '🔒' : isCompleted ? '✓' : `L${L}`}
            </div>
            <div class="fl-ladder-label">
              <div class="t-label-sm">L${L}</div>
              <div class="t-body-sm" style="font-weight:500; color: var(--text-primary);">${name}</div>
            </div>
          </div>
        `;
      }).join('<div class="fl-ladder-bar" aria-hidden="true"></div>')}
    </div>`;
}

// ─── Action-risk badge ────────────────────────────────────────
export function riskBadge(level /* low|medium|high|critical */) {
  const map = {
    low: { chip: 'chip-success', icon: '◔', text: i18n.t('bandeja.detail.risk.levels.low') },
    medium: { chip: 'chip-warning', icon: '◑', text: i18n.t('bandeja.detail.risk.levels.medium') },
    high: { chip: 'chip-danger', icon: '◕', text: i18n.t('bandeja.detail.risk.levels.high') },
    critical: { chip: 'chip-danger', icon: '●', text: i18n.t('bandeja.detail.risk.levels.critical') },
    none: { chip: '', icon: '○', text: i18n.t('bandeja.detail.risk.levels.none') }
  };
  const c = map[level] || map.none;
  return `<span class="chip ${c.chip}" role="status" aria-label="${i18n.t('bandeja.detail.risk.class')}: ${c.text}"><span aria-hidden="true">${c.icon}</span> ${c.text}</span>`;
}

// ─── Provenance superscript ───────────────────────────────────
export function provenanceSup(claimId, evidenceSpanId, label) {
  return `<sup class="fl-prov-sup" data-claim="${claimId}" data-evidence="${evidenceSpanId}" tabindex="0" role="button" aria-label="Evidencia ${label}">${label}</sup>`;
}

// ─── Empty state ──────────────────────────────────────────────
export function emptyState({ title, subtitle, cta, ctaHref, icon = '○' }) {
  return `
    <div class="fl-empty" role="status">
      <div class="fl-empty-icon" aria-hidden="true">${icon}</div>
      <h3 class="t-heading-md" style="margin: 0 0 var(--space-2) 0;">${title}</h3>
      <p class="t-body-md" style="color: var(--text-muted); margin: 0 0 var(--space-4) 0;">${subtitle}</p>
      ${cta ? `<a href="${ctaHref || '#'}" class="btn btn-primary">${cta}</a>` : ''}
    </div>`;
}

// ─── Skeleton ─────────────────────────────────────────────────
export function skeleton({ rows = 3, height = 18 } = {}) {
  return `
    <div class="fl-skeleton" aria-hidden="true">
      ${Array.from({length: rows}).map((_, i) => `
        <div class="fl-skeleton-row" style="height: ${height}px; width: ${100 - i * 8}%; margin-bottom: var(--space-2);"></div>
      `).join('')}
    </div>`;
}

// ─── Loading state ────────────────────────────────────────────
export function loadingState() {
  return `<div class="card" aria-busy="true">${skeleton({ rows: 4 })}</div>`;
}

// ─── Error state ──────────────────────────────────────────────
export function errorState(msg) {
  return `<div class="card" role="alert" style="border-left: 3px solid var(--status-danger);">
    <h3 class="t-heading-md" style="margin: 0 0 var(--space-2) 0;">${i18n.t('error.boundary.title')}</h3>
    <p class="t-body-sm" style="margin: 0;">${msg || i18n.t('error.boundary.subtitle')}</p>
  </div>`;
}

// ─── Modal helpers ────────────────────────────────────────────
let activeOverlay = null;
let activeUntrap = null;
export function openModal(html, opts = {}) {
  closeModal();
  const root = document.getElementById('fl-overlay-root');
  root.innerHTML = `
    <div class="fl-overlay-backdrop" data-fl-overlay role="dialog" aria-modal="true" aria-labelledby="fl-modal-title">
      <div class="fl-overlay-card card" style="max-width: ${opts.width || 560}px; width: 100%;">
        ${html}
      </div>
    </div>`;
  activeOverlay = root.querySelector('[data-fl-overlay]');
  activeOverlay.addEventListener('click', (e) => {
    if (e.target === activeOverlay) closeModal();
  });
  activeUntrap = a11y.trapFocus(activeOverlay);
  i18n.applyToDom(activeOverlay);
}
export function closeModal() {
  if (activeUntrap) { activeUntrap(); activeUntrap = null; }
  const root = document.getElementById('fl-overlay-root');
  if (root) root.innerHTML = '';
  activeOverlay = null;
}
bus.on('overlay:close', closeModal);

// ─── Feedback Modal (5 razones) ───────────────────────────────
export function openFeedbackModal(draftId) {
  const t = (k) => i18n.t(k);
  const reasons = ['claim','tone','data','risk','other'];
  openModal(`
    <h2 id="fl-modal-title" class="t-heading-lg" style="margin: 0 0 var(--space-2) 0;">${t('feedback.title')}</h2>
    <p class="t-body-sm" style="margin: 0 0 var(--space-5) 0; color: var(--text-muted);">${t('feedback.subtitle')}</p>
    <div class="fl-feedback-list">
      ${reasons.map((r, i) => `
        <label class="fl-feedback-item">
          <input type="radio" name="fb-reason" value="${r}" ${i === 0 ? 'checked' : ''}/>
          <div>
            <div class="t-heading-sm">${t('feedback.reasons.' + r + '.title')}</div>
            <div class="t-body-sm">${t('feedback.reasons.' + r + '.help')}</div>
          </div>
        </label>
      `).join('')}
    </div>
    <label class="t-label-sm" style="display: block; margin: var(--space-5) 0 var(--space-2) 0; color: var(--text-muted);">${t('feedback.note')}</label>
    <textarea class="textarea" rows="3" id="fb-note" aria-label="${t('feedback.note')}"></textarea>
    <div style="display: flex; justify-content: flex-end; gap: var(--space-2); margin-top: var(--space-5);">
      <button class="btn" data-action="cancel">${t('feedback.cancel')}</button>
      <button class="btn btn-primary" data-action="submit">${t('feedback.submit')}</button>
    </div>
  `, { width: 540 });
  document.querySelector('[data-action="cancel"]').addEventListener('click', closeModal);
  document.querySelector('[data-action="submit"]').addEventListener('click', () => {
    const reason = document.querySelector('input[name="fb-reason"]:checked').value;
    bus.emit('feedback:submitted', { draftId, reason, note: document.getElementById('fb-note').value });
    a11y.announce('Feedback enviado.');
    closeModal();
  });
}

// ─── Consolidation Modal ──────────────────────────────────────
export function openConsolidationModal(consolidation) {
  const t = (k) => i18n.t(k);
  openModal(`
    <h2 id="fl-modal-title" class="t-heading-lg" style="margin: 0 0 var(--space-2) 0; display: flex; align-items: center; gap: var(--space-2);">
      ${thermometer(consolidation.thermometer, consolidation.patternCount)}
      <span>${t('consolidation.title')}</span>
    </h2>
    <p class="t-body-sm" style="margin: 0 0 var(--space-5) 0; color: var(--text-muted);">
      ${consolidation.patternCount} ${t('consolidation.accumulated')} ${consolidation.accumulatedSince}
    </p>

    <section class="fl-cons-section">
      <h3 class="t-label-md">${t('consolidation.sections.learned')}</h3>
      <p class="t-body-md">${consolidation.suggestedRule}</p>
    </section>

    <section class="fl-cons-section">
      <h3 class="t-label-md">${t('consolidation.sections.applies')}</h3>
      <div class="fl-cons-applies">
        <div><span class="t-label-sm">Tipo</span><div class="chip chip-info">${consolidation.learnType}</div></div>
        <div><span class="t-label-sm">Alcance</span><div class="chip chip-accent">${consolidation.scope}</div></div>
        <div><span class="t-label-sm">${t('consolidation.crossSkill')}</span><div class="chip ${consolidation.crossSkill ? 'chip-success' : ''}">${consolidation.crossSkill ? '✓ Sí' : '— No'}</div></div>
      </div>
    </section>

    <section class="fl-cons-section">
      <h3 class="t-label-md">${t('consolidation.sections.impact')}</h3>
      <div class="fl-cons-impact">
        <div>
          <div class="t-label-sm">${t('consolidation.before')}</div>
          <div class="t-body-md" style="background: var(--bg-sunken); padding: var(--space-3); border-radius: var(--radius-md); font-style: italic; color: var(--text-muted);">${consolidation.impactPreview.before}</div>
        </div>
        <div>
          <div class="t-label-sm" style="color: var(--accent-primary);">${t('consolidation.after')}</div>
          <div class="t-body-md" style="background: var(--accent-primary-soft); padding: var(--space-3); border-radius: var(--radius-md); border-left: 3px solid var(--accent-primary);">${consolidation.impactPreview.after}</div>
        </div>
      </div>
    </section>

    <div style="display: flex; justify-content: flex-end; gap: var(--space-2); margin-top: var(--space-6); padding-top: var(--space-4); border-top: 1px solid var(--stroke-default);">
      <button class="btn" data-action="discard">${t('consolidation.discard')}</button>
      <button class="btn btn-primary" data-action="confirm">${t('consolidation.confirm')}</button>
    </div>
  `, { width: 640 });
  document.querySelector('[data-action="discard"]').addEventListener('click', closeModal);
  document.querySelector('[data-action="confirm"]').addEventListener('click', () => {
    bus.emit('consolidation:confirmed', { id: consolidation.id });
    a11y.announce('Aprendizaje indexado como overlay aprendido.');
    closeModal();
  });
}

// ─── Inject widget styles ─────────────────────────────────────
export function injectWidgetStyles() {
  if (document.getElementById('fl-widget-styles')) return;
  const s = document.createElement('style');
  s.id = 'fl-widget-styles';
  s.textContent = `
    .fl-thermometer {
      display: inline-flex; align-items: center; gap: var(--space-2);
      padding: 4px var(--space-3);
      border-radius: var(--radius-pill);
      font-size: 12px;
      border: 1px solid;
      min-height: 24px;
    }

    .fl-ladder {
      display: flex; align-items: center; gap: 0;
      padding: var(--space-3) var(--space-4);
      background: var(--bg-subtle); border-radius: var(--radius-lg);
      flex-wrap: wrap;
    }
    .fl-ladder-step { display: flex; align-items: center; gap: var(--space-2); }
    .fl-ladder-dot {
      width: 32px; height: 32px; border-radius: var(--radius-pill);
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 600;
      background: var(--bg-surface); color: var(--text-muted);
      border: var(--stroke-md) solid var(--stroke-default);
    }
    .fl-ladder-step.active .fl-ladder-dot {
      background: var(--accent-primary); color: #fff; border-color: var(--accent-primary);
    }
    .fl-ladder-step.completed .fl-ladder-dot {
      background: var(--status-success-soft); color: var(--status-success); border-color: var(--status-success);
    }
    .fl-ladder-step.locked { opacity: 0.55; }
    .fl-ladder-label { display: flex; flex-direction: column; gap: 2px; min-width: 70px; }
    .fl-ladder-bar { width: 24px; height: 2px; background: var(--stroke-default); margin: 0 var(--space-1); }

    .fl-prov-sup {
      color: var(--text-evidence);
      font-family: var(--font-mono);
      font-size: 10px;
      font-weight: 700;
      padding: 0 3px;
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: background var(--dur-fast);
      vertical-align: super;
      margin-left: 1px;
      text-decoration: underline;
      text-decoration-style: dotted;
      text-underline-offset: 2px;
    }
    .fl-prov-sup:hover, .fl-prov-sup:focus-visible {
      background: var(--accent-primary-soft);
      outline: none;
    }
    .fl-prov-sup.highlighted {
      background: var(--accent-primary-soft);
    }

    .fl-empty {
      padding: var(--space-12) var(--space-6);
      text-align: center;
      max-width: 480px; margin: 0 auto;
    }
    .fl-empty-icon {
      font-size: 40px; color: var(--text-muted); opacity: 0.5;
      margin-bottom: var(--space-4);
    }

    .fl-skeleton-row {
      background: linear-gradient(90deg, var(--bg-subtle) 0%, var(--bg-sunken) 50%, var(--bg-subtle) 100%);
      background-size: 200% 100%;
      animation: fl-shimmer 1.4s infinite;
      border-radius: var(--radius-sm);
    }
    @keyframes fl-shimmer { from {background-position: 200% 0;} to {background-position: -200% 0;} }

    .fl-overlay-backdrop {
      position: fixed; inset: 0; background: var(--bg-overlay);
      display: flex; align-items: center; justify-content: center;
      padding: var(--space-6); z-index: 80;
      animation: fl-fade-in var(--dur-base) var(--ease-out);
    }
    @keyframes fl-fade-in { from { opacity: 0; } to { opacity: 1; } }
    .fl-overlay-card { max-height: 90vh; overflow-y: auto; box-shadow: var(--shadow-overlay); }

    .fl-feedback-list { display: flex; flex-direction: column; gap: var(--space-2); }
    .fl-feedback-item {
      display: flex; align-items: flex-start; gap: var(--space-3);
      padding: var(--space-3);
      border: var(--stroke-md) solid var(--stroke-default);
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: border-color var(--dur-fast), background var(--dur-fast);
    }
    .fl-feedback-item:hover { background: var(--bg-subtle); }
    .fl-feedback-item:has(input:checked) {
      border-color: var(--accent-primary);
      background: var(--accent-primary-soft);
    }
    .fl-feedback-item input { margin-top: 4px; accent-color: var(--accent-primary); }

    .fl-cons-section {
      padding: var(--space-4) 0;
      border-bottom: 1px solid var(--stroke-default);
    }
    .fl-cons-section:last-of-type { border-bottom: 0; }
    .fl-cons-section h3 { color: var(--text-muted); margin: 0 0 var(--space-2) 0; }
    .fl-cons-applies { display: flex; gap: var(--space-4); flex-wrap: wrap; }
    .fl-cons-applies > div { display: flex; flex-direction: column; gap: var(--space-1); }
    .fl-cons-impact { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); }
    .fl-cons-impact > div { display: flex; flex-direction: column; gap: var(--space-1); }
    @media (max-width: 700px) {
      .fl-cons-impact { grid-template-columns: 1fr; }
    }
  `;
  document.head.appendChild(s);
}

injectWidgetStyles();
