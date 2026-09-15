/**
 * Tokens de identidad de FaberLoom. La UI (propia o embebida) los aplica; la
 * proyección `ui.tokens` los expone y `tokens.css` los convierte en variables CSS.
 */

export const TOKENS = {
  name: 'FaberLoom',
  color: {
    bg: '#0B1E3A',
    surface: '#102846',
    surfaceAlt: '#0E2340',
    border: '#1d3a5f',
    borderStrong: '#274a72',
    text: '#E8EDF3',
    textMuted: '#94A7B8',
    accent: '#13B98A',
    accentHover: '#17c997',
    accentInk: '#04231a',
    danger: '#e0576b',
    warning: '#e0b13b',
    info: '#4aa3ff',
    success: '#13B98A',
  },
  typography: {
    family: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, Consolas, monospace',
    size: { xs: '12px', sm: '13px', md: '14px', lg: '16px', xl: '18px', xxl: '24px' },
    weight: { regular: 400, medium: 500, bold: 700 },
    lineHeight: { tight: 1.25, normal: 1.5 },
  },
  space: { none: '0', xs: '4px', sm: '8px', md: '12px', lg: '16px', xl: '24px', xxl: '32px' },
  radius: { sm: '6px', md: '9px', lg: '14px', pill: '999px' },
  shadow: { card: '0 10px 40px rgba(0,0,0,.35)', focus: '0 0 0 3px rgba(19,185,138,.35)' },
  motion: { fast: '120ms', normal: '200ms', easing: 'cubic-bezier(.2,.7,.3,1)' },
  layout: { sidebarWidth: '248px', detailWidth: '360px', maxContent: '920px' },
}

export function tokensToCss(tokens = TOKENS) {
  const vars = []
  const walk = (prefix, obj) => {
    for (const [k, v] of Object.entries(obj)) {
      if (v && typeof v === 'object' && !Array.isArray(v)) walk(`${prefix}-${k}`, v)
      else vars.push(`  --fl-${prefix}-${k}: ${v};`)
    }
  }
  walk('', tokens)
  return `:root {\n${vars.join('\n')}\n}\n`
}
