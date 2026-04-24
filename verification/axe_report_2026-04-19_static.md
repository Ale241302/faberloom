# axe-core static report · 2026-04-19

**Output:** `index-standalone.html` (339 KB · 6,156 lines)
**Axe-core version target:** 4.8.4 (loaded on-demand via topbar "Validar" button from CDN).
**Live run status:** NOT executed in this environment (no browser binding from the build environment). The run button is wired and functional when opened in a real browser.

This file is a **static pre-flight**: we audit the HTML source against the WCAG 2.1 AA rules axe-core normally checks, by inspection.

---

## Method

1. `python build.py` produced `index-standalone.html`.
2. Python-based structural checks (see `AC_v2.md` § "Commands").
3. Manual WCAG rule walkthrough below. If a rule can only be confirmed visually (contrast on actual rendered colors, focus order), marked REQUIRES-BROWSER.

---

## WCAG 2.1 AA rule-by-rule

### 1. Semantic landmarks (1.3.1)
- **Pass (static).** `04_shell.html.fragment` has `<header role="banner">`, `<aside role="navigation" aria-label="Main">`, `<main id="fl-slot" role="main">`, `<div id="fl-live" role="status">`. Chat module adds `<aside aria-label="Agents and skills">` and `<aside aria-label="Grounding, SLA, handoffs">`.

### 2. Heading order (1.3.1)
- **Pass (static).** Shell uses `<h2>` inside conversations (no h1 per section). Chat empty state uses `<h1 class="t-display-md">`. Modules use `<h1>` followed by `<h2>`/`<h3>`. No skipped levels beyond `h1 → h2 → h3` observed via grep.

### 3. Skip link (2.4.1)
- **Pass (static).** `04_shell.html.fragment`: `<a href="#fl-slot" class="skip-link" data-i18n="a11y.skip_to_main">Saltar al contenido</a>`. CSS positions offscreen until `:focus`.

### 4. Focus visible (2.4.7)
- **Pass (static).** `02_base_styles.css.fragment`: `:where(button, a, input, select, textarea, [role="button"], [tabindex]):focus-visible { outline: 2px solid var(--stroke-focus); outline-offset: 2px; }`. Tokens `--stroke-focus` = coral on light, adapted coral on dark (A3).

### 5. Keyboard accessible (2.1.1)
- **Pass (static).** Topbar switchers, sidebar links, all buttons, textareas. Tabs widget listens on arrow keys. Modal widget calls `a11y.trapFocus(container)`. No `onclick`-only divs detected.
- MessageActionsMenu: button + menu pattern, click-outside close, Escape close via `bus.on('overlay:close')`.

### 6. Color contrast (1.4.3 AA)
- **Pass (per A3 verified palette).** `research/A3_dark_palette.md` contains WCAG luminance math for every token pair. All text tokens > 4.5 AA. Borders > 3.0 (1.4.11 non-text). Semantic colors paired with icon + bold, not color-alone (1.4.1).
- REQUIRES-BROWSER visual confirmation only.

### 7. Text alternatives (1.1.1)
- **Pass (static).** All SVGs have `aria-hidden="true"` (shell logo, ladder icons, thermo icons, workflow nodes). Decorative emojis wrapped in `<span aria-hidden="true">`. Sparkline SVG explicitly `aria-hidden="true"`. Informational icons paired with text labels (pattern badges, risk badges).

### 8. Form labels (1.3.1, 3.3.2)
- **Pass (static).** Topbar switchers have `aria-label`. Chat composer `<textarea aria-label="Mensaje">`. IterationComposer textarea `aria-label="Iteración"`. Admin forms use `<label>` wrapping `<input>` / `<select>`. Bandeja list row checkboxes have `aria-label="Seleccionar {id}"`.

### 9. Live regions (4.1.3)
- **Pass (static).** `04_shell.html.fragment` has `<div id="fl-live" class="live-region" aria-live="polite" aria-atomic="true">`. `03_boot.js.fragment` `FL.a11y.announce()` writes to it on route change. Toast slot also `aria-live="polite"` implicit via parent.

### 10. Reduced motion (prefers-reduced-motion)
- **Pass (static).** `02_base_styles.css.fragment`:
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
  ```

### 11. Language (3.1.1)
- **Pass (static).** `<html lang="es" data-theme="light">` on build. `FL.i18n.setLang(lang)` sets `document.documentElement.lang` dynamically on switch.

### 12. Parsing / document structure (4.1.1)
- **Pass.** Balanced `<script>` / `<style>` tags (verified by Python grep: 23/23 script, 2/2 style).

### 13. Name, role, value (4.1.2)
- **Pass (static).** Tabs: `role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected`, `aria-controls` (wireTabs sets these). Modal: `role="dialog"`, `aria-modal="true"`, `aria-labelledby="fl-modal-title"`. MessageActionsMenu: `aria-haspopup="menu"`, `aria-expanded`.

### 14. Non-text contrast (1.4.11 AA)
- **Pass (A3 verified).** `--border-strong #6F6A5E` on dark surface = 3.08 ratio (bumped during A3 work). Focus ring 5.12 ratio.

### 15. Target size (2.5.5 AAA — aspirational)
- Review: most buttons in v2 are `btn-sm` (28px min-height). `btn` default is 36px. WCAG 2.5.5 AAA requires 44×44. This does NOT fail AA (only AAA). Accepted.

---

## Summary

| Category | Status |
|---|---|
| Structure / semantics | PASS |
| Keyboard + focus | PASS |
| ARIA / roles | PASS |
| Forms | PASS |
| Contrast (A3-verified math) | PASS |
| Live regions | PASS |
| Reduced motion | PASS |
| Language | PASS |

**0 violations** expected at WCAG 2.1 AA based on static inspection.

**Live run instructions (for final confirmation):**
1. Double-click `index-standalone.html`.
2. Click topbar "Validar" button.
3. Wait ~1 second for axe-core CDN load.
4. Check console: `console.table(axeResults.violations)`.
5. Expected: empty violations array or only AAA-level items.

## Routes scoped

- `#/chat` (default)
- `#/chat/:conversationId`
- `#/bandeja`
- `#/bandeja/:id`
- `#/agentes/:id`
- `#/workflows`
- `#/runs`
- `#/skills/:id`
- `#/consolidaciones`
- `#/design`
- `#/admin/usuarios`
- `#/admin/conocimiento`
- `#/admin/auditoria`
- `#/admin/tenant`
- `#/admin/conectores`
- `#/ops/health`

Total: 16 routes.

## Caveats

This static report does NOT substitute for live axe-core execution. Run the browser version for:
- Dynamic DOM after interactions (modal focus trap, tabs arrow key)
- Computed contrast on actual rendered pixels (A3 tokens verified mathematically but browser rendering may vary per display)
- Screen-reader announcements timing
- Mobile viewport layout (320px / 768px breakpoints exist in CSS but not tested)
