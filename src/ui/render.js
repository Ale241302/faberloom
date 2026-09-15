import { TOKENS, tokensToCss } from './tokens.js'

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

const list = (items, render) => (items && items.length ? `<ul>${items.map(render).join('')}</ul>` : '<p class="muted">—</p>')

/**
 * Consola mínima (solo lectura) que renderiza la proyección de la UI con los
 * tokens de FaberLoom. No es la aplicación final; sirve para verificar la capa de
 * proyección y los tokens sin frontend.
 */
export function renderConsole({ nav, board, settings }) {
  const user = nav ? nav.user : null
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>FaberLoom</title>
<style>
${tokensToCss(TOKENS)}
* { box-sizing: border-box }
body { margin: 0; background: var(--fl-color-bg); color: var(--fl-color-text); font-family: var(--fl-typography-family); font-size: var(--fl-typography-md) }
.layout { display: flex; min-height: 100vh }
aside { width: var(--fl-layout-sidebarWidth); background: var(--fl-color-surfaceAlt); border-right: 1px solid var(--fl-color-border); padding: var(--fl-space-lg) }
main { flex: 1; padding: var(--fl-space-xl); max-width: var(--fl-layout-maxContent) }
h1 { font-size: var(--fl-typography-xl); margin: 0 0 var(--fl-space-lg) }
h2 { font-size: var(--fl-typography-lg); margin: var(--fl-space-xl) 0 var(--fl-space-sm); color: var(--fl-color-textMuted); text-transform: uppercase; letter-spacing: .04em; font-size: var(--fl-typography-xs) }
a { color: var(--fl-color-text); text-decoration: none; display: block; padding: var(--fl-space-xs) 0 }
a.active { color: var(--fl-color-accent) }
ul { list-style: none; padding: 0; margin: 0 }
li { padding: var(--fl-space-sm); border: 1px solid var(--fl-color-border); border-radius: var(--fl-radius-md); margin-bottom: var(--fl-space-sm); background: var(--fl-color-surface) }
.badge { display: inline-block; font-size: var(--fl-typography-xs); padding: 2px 8px; border-radius: var(--fl-radius-pill); border: 1px solid var(--fl-color-borderStrong); color: var(--fl-color-textMuted); margin-left: var(--fl-space-sm) }
.muted { color: var(--fl-color-textMuted) }
.accent { color: var(--fl-color-accent) }
</style></head>
<body><div class="layout">
<aside>
  <h1>faberloom</h1>
  <a class="active">Conversar</a>
  <a>Mesa de trabajo${nav && nav.board.pending ? ` <span class="badge">${nav.board.pending}</span>` : ''}</a>
  <a>Espacios</a><a>Agentes</a><a>Rutinas</a><a>Memoria</a><a>Conexiones</a>
  <h2>Mis espacios</h2>
  ${nav && nav.personal ? `<div class="muted">${esc(nav.personal.label || nav.personal.name)}</div>` : ''}
  ${list(nav ? nav.spaces : [], (s) => `<div>${esc(s.name)}</div>`)}
  <h2>Usuario</h2>
  <div class="muted">${esc(user || 'anon')}</div>
</aside>
<main>
  <h1>Mesa de trabajo</h1>
  <h2>Necesita revisión</h2>
  ${list(board ? board.needsReview : [], (i) => `<li>${esc(i.title)}<span class="badge">${esc(i.status)}</span>${i.stale ? '<span class="badge">obsoleto</span>' : ''}</li>`)}
  <h2>En espera</h2>
  ${list(board ? board.waiting : [], (i) => `<li>${esc(i.title)}<span class="badge">${esc(i.status)}</span></li>`)}
  <h2>Completado</h2>
  ${list(board ? board.done : [], (i) => `<li>${esc(i.title)}<span class="badge">${esc(i.status)}</span></li>`)}
  <h2>Conexiones y modelo</h2>
  <div class="muted">Conexiones: ${settings ? settings.connections.length : 0} · Modelos: ${settings ? settings.models.length : 0} · Permisos: ${settings ? settings.permissions.length : 0} · Respaldos: ${settings ? settings.backups.length : 0}</div>
  <p class="muted">Aprobar no concede permiso; el efecto valida la concesión.</p>
</main></div></body></html>`
}
