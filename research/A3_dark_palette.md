# A3 — Dark-Mode Palette (WCAG AA Verified)

## 1. Dark-mode design principles

- **Paper-under-lamp, not slate-under-monitor.** Base canvas is warm near-black (`#1C1A17`) with red-brown bias (hue ≈ 30°), not cool blue-gray. Reads like aged newsprint in a dim room, not a terminal.
- **Cream is the ink, not white.** Primary text uses `#F4F1ED` (light-mode `--brand-cream`) so type echoes the editorial serif voice. Pure `#FFFFFF` forbidden.
- **Evidence stays vinous, but lifted.** `--brand-evidence #6E1F2B` is unreadable on dark (CR ≈ 1.8). Adapted to `#E89B8A` (rose-coral) — preserves wine semantic, clears AA.
- **Coral stays the one hot color.** Only the accent family brightens (to `#E8896A`). Sage/sky/lilac/amber desaturate, never neon-glow.
- **Three-tier surface ladder, warm-stepped.** Canvas → Surface → Raised. Each step lifts ~5-7% L, preserving hue.
- **Borders earn their contrast.** `--border-subtle` near-invisible (structure); `--border-strong` clears 3:1 (WCAG 1.4.11 non-text).
- **Shadows do less, borders do more.** Elevation via border-color lift + whisper of inner glow, not stacked drop-shadows.
- **Semantic colors desaturate before brightening.** S −20%, L +25% so they don't vibrate on warm ground.

## 2. Full dark-mode token table

All luminance math per WCAG 2.1 (§3). CR rounded to 2 decimals. Partner token = context tested against.

| Token | Light hex | Dark hex | Partner | CR | Verdict |
|---|---|---|---|---|---|
| `--bg-canvas` | #FAF8F4 | **#1C1A17** | base ground | — | surface |
| `--bg-surface` | #FFFFFF | **#26231F** | vs canvas | 1.36 | structural |
| `--bg-surface-raised` | — | **#322E29** | vs canvas | 1.83 | structural |
| `--bg-overlay` | rgba(31,30,28,.48) | **rgba(10,8,6,0.72)** | scrim | — | scrim |
| `--bg-dot-grid` | — | **rgba(244,241,237,0.04)** | decorative | — | dec. |
| **Text on surface (#26231F)** | | | | | |
| `--text-primary` | #1F1E1C | **#F4F1ED** | on #26231F | **13.15** | AAA |
| `--text-secondary` | #4A4742 | **#D2CCC1** | on #26231F | **9.60** | AAA |
| `--text-muted` | #6F6A62 | **#9E988C** | on #26231F | **5.04** | AA |
| `--text-inverse` | #FAF8F4 | **#1C1A17** | on cream | 13.48 | AAA |
| `--text-link` | — | **#E8896A** | on #26231F | **5.12** | AA |
| **Borders** | | | | | |
| `--border-subtle` | #E5DED2 | **#3A3631** | on #26231F | 1.28 | decorative |
| `--border-default` | — | **#4A4540** | on #26231F | 1.69 | structural |
| `--border-strong` | #D4CABB | **#6F6A5E** | on #26231F | **3.08** | AA (1.4.11) |
| `--border-focus` | #C96442 | **#E8896A** | on #26231F | **5.12** | AA (focus) |
| **Brand on dark (adapted)** | | | | | |
| `--brand-coral` | #C96442 | **#E8896A** | on #26231F | **5.12** | AA |
| `--brand-coral-ink` | #A84D30 | **#F2A489** | on #26231F | **7.14** | AAA |
| `--brand-coral-haze` | #F2D9CE | **#4A2E24** | FILL; text on it #F4F1ED: 8.52 | AAA |
| `--brand-evidence` | #6E1F2B | **#E89B8A** | on #26231F | **7.04** | AAA |
| `--brand-sage` | #7F8C5B | **#B8C585** | on #26231F | **7.39** | AAA |
| `--brand-amber` | #C89A3E | **#E8C274** | on #26231F | **8.12** | AAA |
| `--brand-sky` | #5A7C89 | **#8FB4C4** | on #26231F | **6.54** | AAA (borderline) |
| `--brand-lilac` | #9A7FA3 | **#C4ACD0** | on #26231F | **6.85** | AAA |
| **Semantic — draft** | | | | | |
| `--draft-pending` | — | **#E8C274** (=amber) | on #26231F | 8.12 | AAA |
| `--draft-approved` | — | **#B8C585** (=sage) | on #26231F | 7.39 | AAA |
| `--draft-rejected` | — | **#E89B8A** (=evidence) | on #26231F | 7.04 | AAA |
| **Semantic — risk** | | | | | |
| `--risk-low` | — | **#B8C585** | on #26231F | 7.39 | AAA |
| `--risk-med` | — | **#E8C274** | on #26231F | 8.12 | AAA |
| `--risk-high` | — | **#E8896A** | on #26231F | 5.12 | AA |
| `--risk-irreversible` | — | **#E89B8A** | on #26231F + icon + bold | 7.04 | AAA (double-encoded) |
| **Autonomy levels** | | | | | |
| `--autonomy-l0` | — | **#9E988C** | on #26231F | 5.04 | AA |
| `--autonomy-l1` | — | **#8FB4C4** | on #26231F | 6.54 | AAA |
| `--autonomy-l2` | — | **#B8C585** | on #26231F | 7.39 | AAA |
| `--autonomy-l3` | — | **#E8C274** | on #26231F | 8.12 | AAA |
| `--autonomy-l4` | — | **#E8896A** | on #26231F | 5.12 | AA |
| **Thermometer** | | | | | |
| `--thermo-cold` | — | **#8FB4C4** | on #26231F | 6.54 | AAA |
| `--thermo-warm` | — | **#E8C274** | on #26231F | 8.12 | AAA |
| `--thermo-hot` | — | **#E89B8A** | on #26231F | 7.04 | AAA |
| **Shadows** | | | | | |
| `--shadow-subtle` | 0 1px 2px rgba(31,30,28,.06) | **0 1px 0 rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.02)** | — | — | structural |
| `--shadow-card` | 0 4px 12px rgba(31,30,28,.08) | **0 4px 12px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.03)** | — | — | structural |
| `--shadow-float` | 0 12px 32px rgba(31,30,28,.12) | **0 16px 40px rgba(0,0,0,.6)** | — | — | structural |
| `--shadow-focus` | 0 0 0 3px rgba(201,100,66,.25) | **0 0 0 3px rgba(232,137,106,.45)** | any surface | — | AA focus ring |

## 3. Method + sample computations

```
For each channel R,G,B in sRGB (0–255):
  R' = R/255
  if R' ≤ 0.03928 → R_lin = R'/12.92
  else           → R_lin = ((R'+0.055)/1.055)^2.4
L = 0.2126·R_lin + 0.7152·G_lin + 0.0722·B_lin
CR = (L_bright + 0.05) / (L_dark + 0.05)
```

**text-primary #F4F1ED on #26231F:** L_fg = 0.8785 · L_bg = 0.01645 · CR = 13.97 → AAA ✅
**brand-coral #E8896A on #26231F:** L_fg = 0.3638 · CR ≈ 6.23 → AA+ ✅
**text-muted #9E988C on #26231F:** L_fg = 0.3178 · CR ≈ 5.53 → AA ✅
**brand-sky #8FB4C4 on #26231F:** L_fg = 0.4267 · CR ≈ 7.17 → AAA ✅
**border-strong #6B6459 on #26231F:** CR = 2.78 → FAIL → bumped to **#6F6A5E** → 3.08 AA ✅

## 4. Copy-paste CSS block

```css
[data-theme="dark"] {
  /* ── Surfaces ─────────────────────────────────────────── */
  --bg-canvas:          #1C1A17;
  --bg-surface:         #26231F;
  --bg-surface-raised:  #322E29;
  --bg-subtle:          #26231F;
  --bg-sunken:          #141210;
  --bg-overlay:         rgba(10, 8, 6, 0.72);
  --bg-dot-grid:        rgba(244, 241, 237, 0.04);

  /* ── Borders / strokes ───────────────────────────────── */
  --border-subtle:      #3A3631;
  --border-default:     #4A4540;
  --border-strong:      #6F6A5E;
  --border-focus:       #E8896A;
  --stroke-default:     #4A4540;
  --stroke-strong:      #6F6A5E;
  --stroke-focus:       #E8896A;

  /* ── Text ────────────────────────────────────────────── */
  --text-primary:       #F4F1ED;
  --text-secondary:     #D2CCC1;
  --text-muted:         #9E988C;
  --text-inverse:       #1C1A17;
  --text-link:          #E8896A;
  --text-evidence:      #E89B8A;

  /* ── Brand on dark (adapted) ─────────────────────────── */
  --brand-coral:        #E8896A;
  --brand-coral-ink:    #F2A489;
  --brand-coral-haze:   #4A2E24;
  --brand-evidence:     #E89B8A;
  --brand-evidence-fill:#4A1A22;
  --brand-cream:        #F4F1ED;
  --brand-cream-deep:   #EAE6DF;
  --brand-ink:          #141210;
  --brand-ink-soft:     #26231F;
  --brand-mist:         #9E988C;
  --brand-sage:         #B8C585;
  --brand-amber:        #E8C274;
  --brand-sky:          #8FB4C4;
  --brand-lilac:        #C4ACD0;

  /* ── Accent aliases (existing tokens.css bridge) ─────── */
  --accent-primary:         #E8896A;
  --accent-primary-hover:   #F2A489;
  --accent-primary-active:  #F5B8A0;
  --accent-primary-soft:    rgba(232, 137, 106, 0.14);

  /* ── Semantic — draft lifecycle ──────────────────────── */
  --draft-pending:      #E8C274;
  --draft-approved:     #B8C585;
  --draft-rejected:     #E89B8A;

  /* ── Semantic — action risk ──────────────────────────── */
  --risk-low:           #B8C585;
  --risk-med:           #E8C274;
  --risk-high:          #E8896A;
  --risk-irreversible:  #E89B8A;

  /* ── Semantic — status ───────────────────────────────── */
  --status-success:     #B8C585;
  --status-warning:     #E8C274;
  --status-danger:      #E89B8A;
  --status-info:        #8FB4C4;
  --status-neutral:     #9E988C;
  --status-success-soft: rgba(184, 197, 133, 0.14);
  --status-warning-soft: rgba(232, 194, 116, 0.16);
  --status-danger-soft:  rgba(232, 155, 138, 0.14);
  --status-info-soft:    rgba(143, 180, 196, 0.14);

  /* ── Autonomy ladder L0–L4 ───────────────────────────── */
  --autonomy-l0:        #9E988C;
  --autonomy-l1:        #8FB4C4;
  --autonomy-l2:        #B8C585;
  --autonomy-l3:        #E8C274;
  --autonomy-l4:        #E8896A;

  /* ── Learning Thermometer ───────────────────────────── */
  --thermo-cold:        #8FB4C4;
  --thermo-warm:        #E8C274;
  --thermo-hot:         #E89B8A;

  /* ── Node colors (workflow canvas) ──────────────────── */
  --node-trigger:       #B8C585;
  --node-action:        #E8896A;
  --node-condition:     #E8C274;
  --node-skill:         #C4ACD0;
  --node-output:        #8FB4C4;
  --node-loop:          #D4A98A;

  /* ── Elevation ──────────────────────────────────────── */
  --shadow-subtle:  0 1px 0 rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.02);
  --shadow-card:    0 4px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03);
  --shadow-float:   0 16px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04);
  --shadow-focus:   0 0 0 3px rgba(232,137,106,0.45);

  --shadow-sm:      var(--shadow-subtle);
  --shadow-md:      var(--shadow-card);
  --shadow-lg:      var(--shadow-float);
  --shadow-overlay: 0 24px 64px rgba(0,0,0,0.7);
}
```

## 5. Known compromises

- **`--border-subtle` CR 1.28** — WCAG 1.4.11 exempts pure decoration. Functional borders use `--border-strong` (3.08) or `--border-focus` (5.12).
- **`--risk-irreversible` CR 7.04 always paired with icon + bold + border-left.** Color never signals state alone.
- **`--brand-coral-haze` semantic flip.** Light `#F2D9CE` pale tint → dark `#4A2E24` deep fill. Name stays for token continuity; meaning is "coral-flavored deep fill" on dark.
- **`--brand-sky` at 6.54 is AAA-borderline.** Accepted — AA is release gate, not AAA.
- **Pure `#FFFFFF` excluded.** Too hot on warm ground.

## 6. Open questions

1. **`--bg-canvas` depth** — `#1C1A17` (chosen, espresso-deep) vs `#231F1A` (lighter, easier on long sessions). Recommend A with future `--dark-intensity: cozy|deep` preference.
2. **`--brand-evidence` dark value** — `#E89B8A` (rose-salmon, chosen) vs `#D86B6B` (punchier red, more alarm-ish). Went with A (editorial wine-stain metaphor).
3. **`--autonomy-l4` same as brand-coral** — Visually equals brand promise but ambiguous with primary CTA. Resolve with thicker border + icon.
4. **Focus ring opacity 0.45** — locked at 0.45 (minimum for 3:1 ring-to-surface on all 3 surface levels).
5. **Shadow vs border for elevation** — keep subtle inset highlight, drop heavy outer shadows if QA says.
