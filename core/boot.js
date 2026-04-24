/* ============================================================
   FaberLoom v2 — Core boot
   Bus + Store + Router + i18n + a11y. Single-purpose, no surprises.
   ============================================================ */

// ─── Event Bus (pub/sub) ──────────────────────────────────────
export const bus = (() => {
  const listeners = new Map();
  return {
    on(event, fn) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event).add(fn);
      return () => listeners.get(event)?.delete(fn);
    },
    emit(event, payload) {
      listeners.get(event)?.forEach(fn => {
        try { fn(payload); } catch (e) { console.error(`[bus:${event}]`, e); }
      });
    }
  };
})();

// ─── Store (versioned localStorage adapter) ───────────────────
const STORE_VERSION = 'v1';
export const store = {
  _key(k) { return `faberloom.${STORE_VERSION}.${k}`; },
  get(k, fallback = null) {
    try {
      const raw = localStorage.getItem(this._key(k));
      return raw == null ? fallback : JSON.parse(raw);
    } catch { return fallback; }
  },
  set(k, v) {
    try { localStorage.setItem(this._key(k), JSON.stringify(v)); }
    catch (e) { console.warn('store.set failed', e); }
  },
  remove(k) { try { localStorage.removeItem(this._key(k)); } catch {} }
};

// ─── i18n ─────────────────────────────────────────────────────
let dict = {};
let currentLang = 'es';

export const i18n = {
  async load(lang) {
    try {
      const m = await import(`../i18n/${lang}.js`);
      dict = m.default;
      currentLang = lang;
      document.documentElement.lang = lang;
      store.set('lang', lang);
      this.applyToDom();
      bus.emit('i18n:changed', lang);
    } catch (e) {
      console.error('i18n.load failed', e);
    }
  },
  t(key, fallback = '') {
    const parts = key.split('.');
    let cur = dict;
    for (const p of parts) {
      if (cur == null) return fallback || key;
      cur = cur[p];
    }
    return (cur == null) ? (fallback || key) : cur;
  },
  applyToDom(root = document) {
    root.querySelectorAll('[data-i18n]').forEach(el => {
      const k = el.getAttribute('data-i18n');
      const v = this.t(k, el.textContent);
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        if (el.placeholder !== undefined) el.placeholder = v;
      } else {
        el.textContent = v;
      }
    });
    root.querySelectorAll('[data-i18n-attr]').forEach(el => {
      // format: "attr:key,attr2:key2"
      const map = el.getAttribute('data-i18n-attr');
      map.split(',').forEach(pair => {
        const [a, k] = pair.split(':');
        el.setAttribute(a.trim(), this.t(k.trim()));
      });
    });
  },
  current() { return currentLang; }
};

// ─── Theme ────────────────────────────────────────────────────
export const theme = {
  apply(t) {
    document.documentElement.setAttribute('data-theme', t);
    store.set('theme', t);
    bus.emit('theme:changed', t);
  },
  current() {
    return document.documentElement.getAttribute('data-theme') || 'light';
  },
  toggle() { this.apply(this.current() === 'light' ? 'dark' : 'light'); }
};

// ─── A11y helpers ─────────────────────────────────────────────
let liveRegion;
export const a11y = {
  announce(msg, priority = 'polite') {
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.className = 'live-region';
      liveRegion.setAttribute('aria-live', priority);
      liveRegion.setAttribute('aria-atomic', 'true');
      document.body.appendChild(liveRegion);
    }
    liveRegion.textContent = '';
    setTimeout(() => liveRegion.textContent = msg, 50);
  },
  trapFocus(container) {
    const selector = 'button,a[href],input,select,textarea,[tabindex]:not([tabindex="-1"])';
    const focusable = () => Array.from(container.querySelectorAll(selector)).filter(el => !el.disabled && el.offsetParent !== null);
    const handler = (e) => {
      if (e.key !== 'Tab') return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    container.addEventListener('keydown', handler);
    setTimeout(() => focusable()[0]?.focus(), 50);
    return () => container.removeEventListener('keydown', handler);
  }
};

// ─── Router (hash + lazy import + error boundary) ─────────────
const routes = new Map();   // pattern -> { loader, meta }
let currentMod = null;
let currentSlot = null;
const FAILED = new Set();   // module ids that crashed (feature-flag off)

export const router = {
  register(pattern, loader, meta = {}) {
    routes.set(pattern, { loader, meta });
  },
  resolve(hash) {
    const path = (hash || '#/').replace(/^#/, '') || '/';
    // exact match first, then prefix match for :id routes
    if (routes.has(path)) return { pattern: path, params: {} };
    for (const [pat] of routes) {
      const re = new RegExp('^' + pat.replace(/:[^/]+/g, '([^/]+)') + '$');
      const m = path.match(re);
      if (m) {
        const keys = (pat.match(/:[^/]+/g) || []).map(k => k.slice(1));
        const params = Object.fromEntries(keys.map((k, i) => [k, m[i + 1]]));
        return { pattern: pat, params };
      }
    }
    return null;
  },
  async navigate(hash) {
    const slot = currentSlot;
    if (!slot) return;
    const match = this.resolve(hash);
    if (!match) {
      slot.innerHTML = `<div class="card"><h2 class="t-display-sm">404</h2><p>${hash}</p></div>`;
      return;
    }
    const route = routes.get(match.pattern);
    if (FAILED.has(match.pattern)) {
      slot.innerHTML = renderDegradedCard(match.pattern);
      return;
    }
    // unmount previous
    if (currentMod?.unmount) {
      try { currentMod.unmount(); } catch (e) { console.warn('unmount failed', e); }
    }
    slot.innerHTML = '<div class="card" aria-busy="true"><div class="t-body-sm">Cargando…</div></div>';
    try {
      const mod = await route.loader();
      const ctx = { bus, store, i18n, a11y, theme, params: match.params, slot, navigate: h => this.navigate(h) };
      currentMod = await mod.mount(slot, ctx);
      i18n.applyToDom(slot);
      a11y.announce(i18n.t(`nav.${match.pattern.replace(/[^a-z]/gi, '_')}`, match.pattern));
      bus.emit('route:mounted', { pattern: match.pattern, params: match.params });
    } catch (e) {
      console.error(`[route ${match.pattern}] mount failed`, e);
      FAILED.add(match.pattern);
      slot.innerHTML = renderDegradedCard(match.pattern, e);
      bus.emit('route:failed', { pattern: match.pattern, error: e });
    }
  },
  init(slot) {
    currentSlot = slot;
    window.addEventListener('hashchange', () => this.navigate(location.hash));
    this.navigate(location.hash || '#/bandeja/dr_001');
  },
  retry(pattern) {
    FAILED.delete(pattern);
    if (location.hash.includes(pattern.replace(':id', ''))) {
      this.navigate(location.hash);
    }
  }
};

function renderDegradedCard(pattern, err) {
  const t = i18n.t.bind(i18n);
  return `
    <section class="card" role="alert" style="border-left: 3px solid var(--status-warning); max-width: 560px; margin: var(--space-12) auto;">
      <div style="display:flex; gap: var(--space-3); align-items: flex-start;">
        <div style="font-size: 24px;" aria-hidden="true">⚠</div>
        <div style="flex:1;">
          <h2 class="t-heading-md" style="margin: 0 0 var(--space-2) 0;">${t('error.module.title')}</h2>
          <p class="t-body-sm" style="margin: 0 0 var(--space-3) 0;">${t('error.module.subtitle')}</p>
          ${err ? `<pre class="t-mono" style="background:var(--bg-sunken); padding: var(--space-2) var(--space-3); border-radius: var(--radius-sm); margin: 0 0 var(--space-3) 0; overflow:auto; max-height: 120px; font-size: 11px;">${(err.stack || err.message || String(err)).slice(0, 400)}</pre>` : ''}
          <div style="display: flex; gap: var(--space-2);">
            <button class="btn btn-primary btn-sm" onclick="location.reload()">${t('error.module.retry')}</button>
            <code>${pattern}</code>
          </div>
        </div>
      </div>
    </section>`;
}

// ─── Boot ─────────────────────────────────────────────────────
export async function boot() {
  const savedTheme = store.get('theme', matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  theme.apply(savedTheme);
  const savedLang = store.get('lang', 'es');
  await i18n.load(savedLang);

  // mount shell first
  const { mountShell } = await import('./shell.js');
  const slot = mountShell();

  // register modules (lazy)
  router.register('/bandeja/:id', () => import('../modules/bandeja-detail.js'));
  router.register('/skills/:id',  () => import('../modules/skill-studio.js'));
  router.register('/agentes/:id', () => import('../modules/agent-console.js'));
  router.register('/workflows',   () => import('../modules/workflows.js'));
  router.register('/',            () => import('../modules/bandeja-detail.js')); // default to crit demo

  router.init(slot);

  // global keyboard
  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); bus.emit('launcher:open'); }
    if (e.key === 'Escape') bus.emit('overlay:close');
  });
}

window.__faberloom = { bus, store, i18n, theme, router };
boot();
