/* ============================================================
   Shell — topbar + sidebar + main slot
   No business logic. Solo layout y nav.
   ============================================================ */

import { i18n, theme, store, bus, a11y } from './boot.js';

const NAV_ITEMS = [
  { id: 'dashboard',   icon: '◈', route: '#/dashboard',   key: 'nav.dashboard' },
  { id: 'bandeja',     icon: '◧', route: '#/bandeja/dr_001', key: 'nav.bandeja', primary: true },
  { id: 'agentes',     icon: '◔', route: '#/agentes/ag_cotizador', key: 'nav.agentes' },
  { id: 'skills',      icon: '◇', route: '#/skills/sk_cotizar', key: 'nav.skills' },
  { id: 'workflows',   icon: '◫', route: '#/workflows',   key: 'nav.workflows' },
  { id: 'conexiones',  icon: '◉', route: '#/conexiones',  key: 'nav.conexiones' },
  { id: 'admin',       icon: '◎', route: '#/admin',       key: 'nav.admin', divider: true },
  { id: 'settings',    icon: '◐', route: '#/settings',    key: 'nav.settings' }
];

const STATES = ['loaded', 'empty', 'loading', 'error'];

export function mountShell() {
  document.body.innerHTML = `
    <a href="#main" class="skip-link" data-i18n="a11y.skip">Saltar al contenido principal</a>

    <header class="fl-topbar" role="banner">
      <div class="fl-topbar-left">
        <button class="fl-logo" onclick="location.hash='#/bandeja/dr_001'" aria-label="FaberLoom home">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
            <rect x="2" y="2" width="6" height="6" stroke="currentColor" stroke-width="1.5"/>
            <rect x="14" y="2" width="6" height="6" stroke="currentColor" stroke-width="1.5"/>
            <rect x="2" y="14" width="6" height="6" stroke="currentColor" stroke-width="1.5"/>
            <rect x="14" y="14" width="6" height="6" stroke="currentColor" stroke-width="1.5"/>
            <line x1="8" y1="5" x2="14" y2="5" stroke="currentColor" stroke-width="1.5"/>
            <line x1="8" y1="17" x2="14" y2="17" stroke="currentColor" stroke-width="1.5"/>
            <line x1="5" y1="8" x2="5" y2="14" stroke="currentColor" stroke-width="1.5"/>
            <line x1="17" y1="8" x2="17" y2="14" stroke="currentColor" stroke-width="1.5"/>
          </svg>
          <span class="t-heading-md">FaberLoom</span>
        </button>
      </div>

      <div class="fl-topbar-center">
        <button class="fl-search-trigger" onclick="window.__faberloom.bus.emit('launcher:open')" aria-label="Open command palette">
          <span aria-hidden="true">⌘K</span>
          <span class="t-body-sm" data-i18n="topbar.search">Buscar o ejecutar (⌘K)…</span>
        </button>
      </div>

      <div class="fl-topbar-right">
        <select id="fl-state-toggle" class="fl-state-toggle" aria-label="View state demo">
          ${STATES.map(s => `<option value="${s}">${s}</option>`).join('')}
        </select>
        <select id="fl-lang" class="fl-lang" aria-label="Language">
          <option value="es">ES</option>
          <option value="en">EN</option>
          <option value="pt-BR">PT</option>
        </select>
        <button id="fl-theme" class="btn btn-ghost btn-sm" aria-label="Toggle theme">
          <span id="fl-theme-icon" aria-hidden="true">☼</span>
        </button>
        <button id="fl-validate-a11y" class="btn btn-ghost btn-sm" data-i18n-attr="aria-label:a11y.validate" aria-label="Validate accessibility">
          <span aria-hidden="true">⚲</span>
        </button>
        <button class="fl-user" aria-label="Account">
          <span class="fl-avatar" aria-hidden="true">A</span>
        </button>
      </div>
    </header>

    <div class="fl-shell">
      <nav class="fl-sidebar" aria-label="Primary">
        <ul class="fl-nav">
          ${NAV_ITEMS.map(item => `
            ${item.divider ? '<li class="fl-nav-divider" aria-hidden="true"></li>' : ''}
            <li>
              <a href="${item.route}" class="fl-nav-item" data-nav="${item.id}">
                <span class="fl-nav-icon" aria-hidden="true">${item.icon}</span>
                <span class="fl-nav-label" data-i18n="${item.key}">${item.id}</span>
              </a>
            </li>
          `).join('')}
        </ul>
        <div class="fl-sidebar-footer">
          <div class="t-label-sm" style="color:var(--text-muted); padding: 0 var(--space-3);">Workspace</div>
          <div style="padding: var(--space-2) var(--space-3); display:flex; align-items:center; gap: var(--space-2);">
            <div class="fl-ws-icon" aria-hidden="true">M</div>
            <div>
              <div class="t-body-sm" style="color:var(--text-primary); font-weight: 500;">Muito Work</div>
              <div class="t-body-sm" style="font-size: 11px; color:var(--text-muted);">4 miembros · Team</div>
            </div>
          </div>
        </div>
      </nav>

      <main id="main" class="fl-main" role="main" aria-live="polite">
        <!-- module slot -->
      </main>
    </div>

    <div id="fl-overlay-root" aria-live="polite"></div>
    <div id="fl-axe-panel" hidden></div>
  `;

  injectShellStyles();
  wireShellEvents();
  highlightActiveNav();
  // theme button initial
  document.getElementById('fl-theme-icon').textContent = theme.current() === 'dark' ? '☾' : '☼';
  document.getElementById('fl-lang').value = i18n.current();

  return document.querySelector('#main');
}

function highlightActiveNav() {
  const hash = location.hash || '#/';
  document.querySelectorAll('.fl-nav-item').forEach(el => {
    const id = el.dataset.nav;
    const matches = hash.includes('/' + id) || (id === 'bandeja' && hash.includes('/bandeja')) ||
                    (id === 'skills' && hash.includes('/skills')) ||
                    (id === 'agentes' && hash.includes('/agentes'));
    el.classList.toggle('active', matches);
    if (matches) el.setAttribute('aria-current', 'page');
    else el.removeAttribute('aria-current');
  });
}

function wireShellEvents() {
  window.addEventListener('hashchange', highlightActiveNav);

  document.getElementById('fl-theme').addEventListener('click', () => {
    theme.toggle();
    document.getElementById('fl-theme-icon').textContent = theme.current() === 'dark' ? '☾' : '☼';
  });

  document.getElementById('fl-lang').addEventListener('change', (e) => {
    i18n.load(e.target.value);
  });

  document.getElementById('fl-state-toggle').addEventListener('change', (e) => {
    bus.emit('view-state:change', e.target.value);
  });

  document.getElementById('fl-validate-a11y').addEventListener('click', runAxe);

  bus.on('i18n:changed', () => i18n.applyToDom());
}

async function runAxe() {
  const panel = document.getElementById('fl-axe-panel');
  panel.hidden = false;
  panel.innerHTML = `<div class="fl-axe-overlay" role="dialog" aria-modal="true" aria-label="A11y validation">
    <div class="fl-axe-card card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: var(--space-3);">
        <h2 class="t-heading-md" style="margin:0;">A11y validation</h2>
        <button class="btn btn-ghost btn-sm" id="fl-axe-close" aria-label="Close">✕</button>
      </div>
      <div class="t-body-sm" id="fl-axe-body">Cargando axe-core…</div>
    </div>
  </div>`;
  document.getElementById('fl-axe-close').addEventListener('click', () => panel.hidden = true);

  if (!window.axe) {
    await new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.8.4/axe.min.js';
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    }).catch(() => {});
  }
  if (!window.axe) {
    document.getElementById('fl-axe-body').textContent = 'No se pudo cargar axe-core (sin red).';
    return;
  }
  const result = await window.axe.run(document.querySelector('#main'));
  const body = document.getElementById('fl-axe-body');
  if (result.violations.length === 0) {
    body.innerHTML = `<div style="display:flex; gap: var(--space-2); align-items:center; color: var(--status-success);">✓ <span>Cero violations críticos en esta vista.</span></div>`;
  } else {
    body.innerHTML = `<div style="margin-bottom: var(--space-3); color: var(--status-warning);">${result.violations.length} violations encontradas</div>` +
      result.violations.map(v => `
        <div style="border-left: 3px solid var(--status-warning); padding: var(--space-2) var(--space-3); margin-bottom: var(--space-2); background: var(--bg-subtle); border-radius: var(--radius-sm);">
          <div class="t-heading-sm">${v.id} · <span style="font-weight:400; color:var(--text-muted);">${v.impact}</span></div>
          <div class="t-body-sm">${v.help}</div>
          <div class="t-body-sm" style="color:var(--text-muted); font-size:12px;">${v.nodes.length} nodo(s)</div>
        </div>`).join('');
  }
}

function injectShellStyles() {
  if (document.getElementById('fl-shell-styles')) return;
  const s = document.createElement('style');
  s.id = 'fl-shell-styles';
  s.textContent = `
    .fl-topbar {
      position: sticky; top: 0; z-index: 50;
      height: var(--topbar-h);
      display: grid; grid-template-columns: 240px 1fr auto; align-items: center;
      padding: 0 var(--space-4);
      background: var(--bg-surface);
      border-bottom: var(--stroke-thin) solid var(--stroke-default);
      gap: var(--space-4);
    }
    .fl-topbar-left { display: flex; align-items: center; }
    .fl-logo { display: inline-flex; align-items: center; gap: var(--space-2); padding: var(--space-1) var(--space-2); border-radius: var(--radius-md); color: var(--text-primary); }
    .fl-logo:hover { background: var(--bg-subtle); }
    .fl-topbar-center { max-width: 480px; }
    .fl-search-trigger {
      width: 100%;
      display: flex; align-items: center; gap: var(--space-2);
      padding: var(--space-2) var(--space-3);
      border-radius: var(--radius-md);
      background: var(--bg-subtle);
      color: var(--text-muted);
      border: var(--stroke-thin) solid transparent;
      text-align: left;
    }
    .fl-search-trigger:hover { background: var(--bg-sunken); border-color: var(--stroke-default); }
    .fl-search-trigger > span:first-child {
      font-family: var(--font-mono); font-size: 11px;
      padding: 1px 6px; background: var(--bg-surface);
      border: 1px solid var(--stroke-default); border-radius: var(--radius-sm);
      color: var(--text-secondary);
    }
    .fl-topbar-right { display: flex; align-items: center; gap: var(--space-2); }
    .fl-state-toggle, .fl-lang {
      padding: var(--space-1) var(--space-2);
      border-radius: var(--radius-md);
      border: var(--stroke-thin) solid var(--stroke-default);
      background: var(--bg-surface); color: var(--text-secondary);
      font-size: 12px; min-height: 28px;
    }
    .fl-user {
      display: inline-flex; align-items: center; justify-content: center;
      width: 32px; height: 32px;
      border-radius: var(--radius-pill);
      background: var(--accent-primary-soft); color: var(--accent-primary);
    }
    .fl-avatar { font-weight: 600; font-size: 13px; }

    .fl-shell { display: grid; grid-template-columns: var(--sidebar-w) 1fr; min-height: calc(100vh - var(--topbar-h)); }

    .fl-sidebar {
      border-right: var(--stroke-thin) solid var(--stroke-default);
      background: var(--bg-canvas);
      display: flex; flex-direction: column;
      padding: var(--space-3) 0;
    }
    .fl-nav { list-style: none; padding: 0 var(--space-2); margin: 0; flex: 1; }
    .fl-nav-divider { height: 1px; background: var(--stroke-default); margin: var(--space-3) var(--space-2); }
    .fl-nav-item {
      display: flex; align-items: center; gap: var(--space-3);
      padding: var(--space-2) var(--space-3);
      border-radius: var(--radius-md);
      color: var(--text-secondary); text-decoration: none;
      font-size: 14px; font-weight: 500;
      margin-bottom: 2px;
      transition: background var(--dur-fast) var(--ease-out), color var(--dur-fast);
      min-height: 36px;
    }
    .fl-nav-item:hover { background: var(--bg-subtle); color: var(--text-primary); }
    .fl-nav-item.active { background: var(--accent-primary-soft); color: var(--accent-primary); font-weight: 600; }
    .fl-nav-icon { width: 18px; text-align: center; font-size: 14px; opacity: 0.85; }
    .fl-sidebar-footer { padding-top: var(--space-3); border-top: var(--stroke-thin) solid var(--stroke-default); margin-top: var(--space-3); }
    .fl-ws-icon {
      width: 28px; height: 28px; border-radius: var(--radius-md);
      background: var(--accent-primary); color: #fff;
      display: inline-flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 12px;
    }

    .fl-main { padding: var(--space-6); overflow-y: auto; max-height: calc(100vh - var(--topbar-h)); }

    .fl-axe-overlay {
      position: fixed; inset: 0; background: var(--bg-overlay);
      display: flex; align-items: flex-start; justify-content: center;
      padding: var(--space-12) var(--space-4); z-index: 100;
      overflow-y: auto;
    }
    .fl-axe-card { width: 100%; max-width: 640px; max-height: 70vh; overflow-y: auto; }

    @media (max-width: 980px) {
      .fl-topbar { grid-template-columns: auto 1fr auto; }
      .fl-topbar-left .t-heading-md { display: none; }
      .fl-shell { grid-template-columns: var(--sidebar-w-collapsed) 1fr; }
      .fl-nav-label { display: none; }
      .fl-sidebar-footer { display: none; }
      .fl-state-toggle { display: none; }
    }
  `;
  document.head.appendChild(s);
}
