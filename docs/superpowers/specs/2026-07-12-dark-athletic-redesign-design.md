# Liftly: Dark-Athletic Redesign — Design Spec

**Date:** 2026-07-12
**Status:** Approved
**Branch:** `dark-athletic-redesign` (off `lifter-first-repositioning`)
**Prior specs:** [`2026-07-11-lifter-first-repositioning-design.md`](2026-07-11-lifter-first-repositioning-design.md)

## Context

The lifter-first repositioning (shipped 2026-07-11) deliberately kept the light "soft SaaS" visual language, deferring the ui-ux-pro-max-recommended dark athletic direction. This redesign executes that deferred direction: a full re-skin plus targeted layout refresh, on top of the now-fixed lifter-first IA (`Today · Train · [+] · Insights · History`, protein-hero ring, Quick Protein, Insights, weekly review).

A fresh ui-ux-pro-max design pass (with final-say authority, granted by the owner) confirmed dark-athletic on merit: the fitness-indexed Barlow Condensed pairing and gym palette records are dark; emerald-500 rises from 2.3:1 (decorative-only on white) to 7.2:1 (text-capable on dark); and the current emerald-600-on-white small text is 3.77:1 — an existing AA failure this redesign fixes. Gym context (dim lighting, phone at arm's length) favors dark + high-chroma + huge numerals.

**Owner decisions (2026-07-12):** re-skin + layout refresh, IA fixed · dark-athletic, dark-only shipped, theme-capable build · big-bang single branch with structured commits · Barlow body font added · `[+]` docked in nav bar (FAB deleted) · 16px card radius · landing art = dark product screenshot · 21st.dev = targeted pulls only.

## 1. Visual system

### Surfaces & text (dark, on `:root`)
| Token | Hex | Role | Contrast note |
|---|---|---|---|
| `--background` | `#0B0B0F` | app canvas (never pure #000 — OLED smear) | |
| `--card` | `#15151B` | cards, nav dock, header | |
| `--muted` | `#1C1C24` | chips, inputs, insets, tooltips | |
| `--border` | `#26262E` | 1px hairlines (decorative) | |
| `--foreground` | `#F4F4F5` | primary text | 16.5:1 on card |
| `--muted-foreground` | `#A1A1AA` | secondary text, axis ticks | 7.1:1 on card |
| `--faint-foreground` | `#71717A` | tertiary/disabled; ≥18px or non-essential only | 3.8:1 |

### Accents
| Token | Hex | Role | Ratio on card |
|---|---|---|---|
| `--protein` | `#10B981` | ring stroke, bars, fills — unchanged signature | 7.2:1 |
| `--protein-text` | `#34D399` | protein text/labels (replaces protein-strong role) | 9.5:1 |
| `--training` | `#4F46E5` | FILLS ONLY (buttons, active pill, `[+]` tile) w/ white fg 6.3:1 | text FAILS 2.9:1 |
| `--training-text` | `#818CF8` | training text/icons/chart lines on dark | 6.1:1 |
| `--ai` | `#C084FC` | AI accent (weekly review, Analyze) | 6.9:1 |
| `--streak` | `#FBBF24` | streak flame, PR dots/trophies | 10.9:1 |
| `--deficit` / `--surplus` | `#60A5FA` / `#FB923C` | balance bars | 7.2 / 8.0:1 |
| `--carb` / `--fat` | `#F59E0B` / `#FB7185` | macro bars (replace raw amber-500/rose-500) | 8.5 / 6.8:1 |
| `--destructive` | text `#FB7185`, fill `#DC2626`+white | delete, streak-at-risk | 6.8:1 |

**Hard rule:** indigo-600 never renders as text/icon on dark surfaces — fills only.

### Typography
- **Body:** Barlow 400/500/600 via next/font joins Barlow Condensed (completes the athletic pairing, ~30KB, display:swap). Body min 16px mobile, labels 500, line-height 1.5.
- **Display (Barlow Condensed):** hero protein numeral 700 at 60–72px `tabular-nums leading-none`; session timer + screen titles 700 at 24–30px (timer tabular, replaces font-mono); card titles 600 `text-lg` (unchanged); ALL stat values (sets, kcal, weight) move to Condensed 600 tabular.

### Radius / elevation / motion
- `--radius: 0.75rem`; cards `rounded-2xl` (16px, down from 24), chips/pills `rounded-full`, sheets `rounded-t-3xl`.
- **Zero shadows.** Every `shadow-*` and colored glow deleted. Depth = surface steps + `border-border` hairlines. Modal scrim `bg-black/60` + blur.
- Motion system unchanged (150–300ms, spring sheets, `active:scale-95`, `motion-reduce` guards). No new choreography.

### globals.css / layout restructure
1. `@theme`: add `--color-protein-text`, `--color-training`, `--color-training-text`, `--color-ai`, `--color-streak`, `--color-deficit`, `--color-surplus`, `--color-carb`, `--color-fat`, `--color-chart-grid`, `--color-chart-axis` (keep `--color-protein`).
2. `:root` gets dark values under the standard shadcn semantic names; current light values move to an unexposed `.light {}` block. Delete dead `--foreground-rgb`/gradient vars and the `prefers-color-scheme` block. `color-scheme: dark`.
3. `layout.jsx`: `<meta name="theme-color" content="#0B0B0F">`, `statusBarStyle: 'black-translucent'`, Barlow via next/font.
4. **Component sweep:** replace all hardcoded `bg-white / text-slate-* / border-slate-* / bg-slate-*` with semantic classes (`bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-muted`, accent tokens). After the sweep, theme changes never touch components.

## 2. Layout refresh (per screen)

**Three headline moves:** de-card the Today hero · flat dark nav dock with docked `[+]` · sticky Train session header.

- **Today:** hero leaves its card — full-bleed on `--background`, edge-to-edge mobile: status row (training pill + streak flame) → ring w/ 72px numeral → macro bars → Quick Protein chips (thumb zone). WeeklyReviewCard → slim full-width AI banner (`--ai` left rule on `--card`; read state stays 48px row). WeeklyTrend + MealFeed stay cards; hydration stays a demoted single row. Desktop keeps 2/3+1/3 grid. **Unchanged:** ring geometry + ghost-notch invariant, chip stepper + undo, AI modal flow.
- **Nav (mobile):** `bg-card border-t border-border` dock; active tab `text-training-text`; `[+]` = 56px indigo-600 square-round tile docked IN the bar (delete `-mt-12` float + halo). Labels kept.
- **Train:** sticky session header on `bg-background/90 backdrop-blur` — Condensed tabular timer, exercise count, Finish CTA — cards scroll under it. Completed sets: emerald tint (`bg-protein/10` + `text-protein-text`) instead of `opacity-50` (read-only ≠ disabled). PR amber, plate calculator, templates, confetti unchanged.
- **Insights:** structure unchanged (3 cards + WeightEntry). Range switcher → shared SegmentedControl (`bg-muted` track, `bg-card` thumb). Locked-card ghost sparkline stroke `#3F3F46`. Charts per §3.
- **History:** list + toggle unchanged; toggle uses the shared SegmentedControl; sticky date headers → `bg-background/90 backdrop-blur`.
- **Landing:** full rework. Dark full-bleed hero; uppercase Barlow Condensed headline "TRAIN HARD. / FUEL RIGHT." (emerald on line 2); art = product screenshot of the dark dashboard; flat color-blocked stat tiles; auth flow slides in-place as today; pricing restyled to tokens.

## 3. Chart re-skin

New shared `src/components/insights/chartTheme.js` exports all chart constants (grid, axis, series hexes); all four chart files (3 insight cards + WeeklyTrend) import it — removes WeeklyTrend's duplicated constants. Existing rules survive unchanged (≤2 series, no dual visible y-axes, mark-type differentiation, shared InsightTooltip, no animation).

| Element | Dark value |
|---|---|
| Grid | `#27272A`, dashed 3 3, vertical off |
| Axis ticks | `#A1A1AA` |
| ReferenceLine (goal/zero) | `#52525B` |
| Tooltip | `bg-muted` + `border-border`, no shadow |
| WeeklyTrend bars | indigo-500 `#6366F1` full opacity (600 fails 3:1); empty `#26262E`; dumbbell markers `--training-text` |
| Volume bars | `#3F3F46` (recede behind protein line) |
| Protein line | `var(--color-protein)` unchanged |
| Weight line | `#818CF8` |
| Deficit/surplus | same hues, fillOpacity 0.85 |
| PR dots | `#FBBF24`, halo stroke = card `#15151B` (not white) |
| Calories context line | `#71717A` |

## 4. Components & 21st.dev (targeted pulls, restyled to tokens)

| Pull (registry id) | Becomes | Restyle |
|---|---|---|
| Bottom Menu `[10458]` | nav dock base | flatten to card/border tokens, docked `[+]` |
| Reshaped Tabs `[18328]` | shared `SegmentedControl` (Insights range + History toggle) | muted track / card thumb |
| Bottom Drawers `[6034]` | ONE Sheet primitive unifying action sheet, WeeklyReview sheet, AI modal | card bg, black/60 scrim, keep spring values |
| Statistics Card `[4243]` | workout summary tiles | no shadows, muted tiles, Condensed tabular |
| Animated Counter `[1844]` | hero numeral count-up | ≤400ms settle, `prefers-reduced-motion` guard |
| Hero Section Dark `[19]` | landing hero base | flat emerald/indigo blocks, product screenshot |

**Not replaced (ours are better):** DualRing (ghost-notch invariant + a11y center button), Quick Protein chips, macro bars, meal feed, workout set grid.

## 5. Implementation shape & verification

Big-bang on `dark-athletic-redesign`, structured commits: (a) tokens + semantic sweep — visually identical checkpoint; (b) dark flip + shell/nav/layout.jsx; (c) per-screen layout commits (Today hero → Train header → Insights/History controls); (d) landing rework; (e) 21st.dev pulls slotted where each lands.

**Verification:** jest (25 tests) green at every commit; `npm run build` per commit; final manual pass at 375px + desktop against the §1 contrast table (spot-check every text-bearing pair); `prefers-reduced-motion` on ring/counter/sheets; keyboard pass on nav dock, SegmentedControl, sheets; Lighthouse a11y run on Today + Train.

### Out of scope
Light-theme shipping/toggle (tokens parked only), IA/nav-order changes, new features, TypeScript, chart-rule changes, ~~athlete photography~~.

> **Amendment (2026-07-12):** after seeing the shipped R10 landing, the owner reversed the landing-art decision — athlete photography returns and the DeviceFrame product mock is removed. See [`2026-07-12-landing-photo-hero-design.md`](2026-07-12-landing-photo-hero-design.md), which supersedes this spec's landing section.
