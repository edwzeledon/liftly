# Liftly: Landing Photo Hero & Dedicated Auth View — Design Spec

**Date:** 2026-07-12
**Status:** Approved
**Branch:** `dark-athletic-redesign` (revises that branch's R10 landing)
**Supersedes:** the "landing art = dark product screenshot / photography out of scope" decisions in [`2026-07-12-dark-athletic-redesign-design.md`](2026-07-12-dark-athletic-redesign-design.md) — owner reversed after seeing R10 shipped.

## Context

The R10 landing (flat dark sections + DeviceFrame mock) lost the old landing's identity: its photographic atmosphere and staggered entrance-motion energy. It also made mobile sign-in scrollable (feature sections stack below the swapped-in auth form). Owner decisions (2026-07-12): dark gym/athlete photography returns (indigo-dominant duotone), full-bleed immersive hero with sections below, entrance motion restored, auth becomes a dedicated non-scrolling full-viewport view, DeviceFrame is removed, Pricing.jsx is deleted.

## 1. Hero — full-bleed duotone monolith

`min-h-dvh` section; photo layers (`absolute inset-0`, behind content):
1. **Photo:** next/image, committed local asset `public/landing/hero-lifter.webp` (~2400×1500, ≤250KB, WebP q~70), `fill priority sizes="100vw" placeholder="blur"` with a committed base64 `blurDataURL`; classes `object-cover object-[70%_center] md:object-center grayscale contrast-125 brightness-[.55]`.
2. **Indigo hue map:** `bg-training mix-blend-color opacity-60`.
3. **Emerald highlight lift:** `bg-protein mix-blend-soft-light opacity-25`.
4. **Legibility scrim:** `bg-gradient-to-t md:bg-gradient-to-r from-background via-background/75 via-40% to-background/10`.
5. **Seam dissolve:** bottom `h-32 bg-gradient-to-t from-background to-transparent`.

Grayscale-first means any sourced photo harmonizes. **Rule exemption (explicit):** the parent redesign banned decorative color gradients and shadows; layers 2–5 here are photo treatment and legibility scrims — overlay-class exemptions, not surface decoration. The `bg-gradient-to-*` classes in this stack (and the auth scrim in §3) are the only sanctioned gradient usages in the app. Photo sourcing by criteria, not URL: single athlete, already low-key, left-half negative space, no legible branding, strong highlight structure. Search terms: "barbell deadlift dark gym", "athlete chalk hands low key", "squat rack silhouette", "weightlifting dark moody". Never hotlink.

Content (desktop: left column `max-w-2xl`, vertically centered, over the solid scrim edge; mobile: bottom-third `justify-end pb-24` over the bottom-up scrim):
- Eyebrow: "FOR LIFTERS" — `text-protein-text text-sm font-semibold uppercase tracking-widest`.
- H1 unchanged: `font-display font-bold uppercase leading-[0.95] text-5xl md:text-7xl` — "Train hard." `text-foreground` / "Fuel right." `text-protein`.
- Subhead `text-lg text-muted-foreground max-w-md` (existing copy).
- CTAs: primary `bg-training text-white font-bold rounded-xl px-6 py-3` ("Start training"); secondary `bg-card/60 backdrop-blur-sm border border-border text-foreground` ("See how it works" → scrolls to features).
- Scroll cue: chevron, `animate={{y:[0,6,0]}}` loop 1.8s, motion-safe only.

If the chosen photo fails at 375px, an art-directed portrait crop pair (`md:hidden`/`hidden md:block`) is the sanctioned fallback — try the single crop first.

## 2. Motion system

```js
container: { hidden: {opacity:0}, visible: {opacity:1, transition:{staggerChildren:0.14, delayChildren:0.2}} }
item:      { hidden: {y:20, opacity:0}, visible: {y:0, opacity:1, transition:{duration:0.45, ease:[0.22,1,0.36,1]}} }
```
- Photo stack settles underneath: `initial={{scale:1.06, opacity:0}} animate={{scale:1, opacity:1}}` over 1.2s, same ease. Transform/opacity only.
- Sequence: photo t=0 → eyebrow 0.2 → h1 0.34 → subhead 0.48 → CTAs 0.62 → cue 0.76.
- Sections: same `item` variants via `whileInView="visible" viewport={{once:true, amount:0.3}}`; card stagger 0.08.
- `useReducedMotion()` in a variants factory collapses ALL of the above to opacity-only (no y, no scale, no loop).

## 3. Auth — dedicated non-scroll view

Architecture: the photo stack is a persistent backdrop; `AnimatePresence mode="wait"` swaps two full-viewport states (hero content ⇄ auth). Feature/CTA sections render **only when `!showAuth`** — nothing exists below auth in the DOM.

- **Mobile:** root `h-dvh flex flex-col overflow-hidden` (never 100vh). Nav row (logo + Back, 44px targets) → `flex-1 min-h-0 flex flex-col justify-center overflow-y-auto` form wrapper (keyboard-safety valve: no scroll at rest, fields scroll into view when the keyboard shrinks dvh) → `pb-safe`. No card — fields (`bg-muted border-border`) sit directly on the deepened scrim. Page root gets `overflow-hidden` while auth is open. AuthScreen verticals compressed for this context (header mb-6, inputs py-3, CTA py-3.5); input font ≥16px (iOS zoom guard).
- **Desktop:** same swap; auth card centered `max-w-md bg-card/80 backdrop-blur-md border border-border rounded-2xl p-8`.
- **Scrim deepening:** extra `absolute inset-0 bg-background/60` layer fades in (250ms) when auth opens; photo never remounts.
- **Transitions:** hero exits `{opacity:0, y:-16}` @150ms; auth enters `{opacity:0, y:16}→0` @250ms; reversed on back. Escape routes: Back button, logo click, `Esc` keydown.
- **AuthScreen token fixes (in scope):** submit `bg-indigo-600 hover:bg-indigo-700` → `bg-training hover:bg-training/90`; remove the decorative `blur-3xl` glow; toggle link color unified to `text-protein-text`.

## 4. Sections below the hero

- **Features (survives, promoted):** emerald kicker + `text-3xl md:text-4xl font-display uppercase` heading; the 3 existing cards gain one oversized Condensed tabular stat each ("2 taps" / "1×/week" / "every PR"); blur-fade scroll reveal per §2.
- **Closing CTA band (new):** full-width `bg-card border-y border-border`; "Stop guessing. Start fueling." Condensed uppercase + `bg-training` button → `setShowAuth(true)`.
- **Deletions:** `DeviceFrame.jsx` (mock UI out), `Pricing.jsx` (dead code, pre-pivot copy).
- Page = Hero (100dvh) → Features → CTA band. No padding sections.

## 5. 21st.dev references (adaptation, not lifts)

`shadcnblockscom/shadcnblocks-com-hero115` (image-hero layering) · `dillionverma/blur-fade` (scroll reveal) · `preetsuthar17/blurred-stagger-text` (optional per-word h1 texture, ≤40ms/word) · `aghasisahakyan1/sign-in-flow-1` (auth-as-state) · `ephraimduncan/login-3` (desktop card anatomy). Rejected: scroll-jacking (`sticky-scroll-reveal`), video heroes — violate motion/LCP discipline.

## Verification

- jest 25/25 + `npm run build` per commit.
- Manual 375px + desktop: auth view does not scroll at rest (keyboard closed AND open — fields reachable via inner valve only); hero legible over photo at both breakpoints; landing↔auth transition smooth; Back/logo/Esc all exit.
- Reduced-motion: opacity-only everywhere, no scroll-cue loop.
- LCP: photo `priority` + blur placeholder; check dev-tools LCP < 2.5s on throttled mobile.
- Lighthouse a11y on `/` and `/auth` stays 100.

### Out of scope
Split-screen desktop auth, video/scroll-jacked heroes, pricing/billing, art-directed crops unless the single crop fails, changes to any non-landing surface except the named AuthScreen token fixes.
