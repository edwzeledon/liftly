# Landing Photo Hero & Dedicated Auth View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the R10 landing with a full-viewport duotone photo hero, restored entrance choreography, and a dedicated non-scrolling auth view; delete DeviceFrame and Pricing.

**Architecture:** One persistent `PhotoBackdrop` lives inside a single full-viewport container; `AnimatePresence mode="wait"` swaps `HeroContent` ⇄ `AuthView` inside it; feature/CTA sections render only when `!showAuth` so nothing exists below auth. All motion flows from one `makeVariants(reduce)` factory. The photo is a committed local WebP chosen by a multimodal implementer.

**Tech Stack:** Next.js 15 (next/image), Framer Motion 12 (`useReducedMotion`), Tailwind 4 tokens, Unsplash unauthenticated search API + CDN transforms, Jest 30.

**Spec:** `docs/superpowers/specs/2026-07-12-landing-photo-hero-design.md`

## Global Constraints

- Branch `dark-athletic-redesign`; JS only; every task ends `npx jest --watchAll=false` → 25/25 + `npm run build` clean + commit.
- Headline block is IMMUTABLE: `font-display font-bold uppercase leading-[0.95] text-5xl md:text-7xl`, "Train hard." `text-foreground` / "Fuel right." `text-protein`.
- The photo-stack and auth-scrim `bg-gradient-to-*` classes are the ONLY sanctioned gradients in the app (spec exemption); zero `shadow-*` anywhere; indigo hard rule stands (`bg-training` fills, `text-training-text` text).
- Mobile auth: `h-dvh` (never `100vh`/`min-h-screen`), root `overflow-hidden` while auth open, inner `min-h-0 overflow-y-auto` keyboard valve, inputs ≥16px font, targets ≥44px.
- Repo lint treats `react-hooks/set-state-in-effect` as a build ERROR — route reduced-motion state through rAF or `useReducedMotion` (no sync setState in effects).
- Reduced motion collapses ALL landing motion to opacity-only (no y, no scale, no loops) via the variants factory — not per-element patches.
- No new npm deps. Photo pipeline uses Unsplash CDN transforms + `sips` (macOS) only if needed.
- Landing-only blast radius: the ONLY file outside `src/components/landing-page/` + `public/landing/` you may modify is `src/components/AuthScreen.jsx` (named fixes).

---

### Task L1: Photo asset acquisition

**Files:**
- Create: `public/landing/hero-lifter.webp`, `src/components/landing-page/heroBlur.js`

**Interfaces:**
- Produces: the committed hero image; `export const HERO_BLUR = 'data:image/webp;base64,...';` (tiny, <2KB) consumed by Task L2's `next/image` `blurDataURL`. Runner-up candidates saved to the session scratchpad dir (NOT the repo) with a `candidates.md` listing ids.

- [ ] **Step 1: Search Unsplash (unauthenticated) and shortlist by metadata**

For each query — `barbell deadlift dark gym`, `athlete chalk hands low key`, `squat rack silhouette`, `weightlifting dark moody`:

```bash
curl -s "https://unsplash.com/napi/search/photos?query=<url-encoded>&per_page=12&orientation=landscape" \
  | jq -r '.results[] | [.id, .color, .width, .height, (.alt_description // "")] | @tsv'
```

Shortlist 6–8 ids where: `color` is dark (first hex digit pairs ≤ 4-ish, e.g. `#26261d`), width ≥ 2400, alt/description suggests a single lifter/barbell scene (skip group classes, bright studios, branded apparel mentions). If `napi` is blocked (403/HTML), fall back to `curl -sL "https://unsplash.com/s/photos/<query>"` and extract `photo-...` ids from the HTML; report which path worked.

- [ ] **Step 2: Download candidates and LOOK at them**

```bash
mkdir -p "$SCRATCH/landing-candidates"
curl -sL "https://images.unsplash.com/photo-<ID>?q=70&w=1200&fm=webp" -o "$SCRATCH/landing-candidates/<ID>.webp"
```

Then open EACH with the Read tool (it renders images — you are multimodal). Judge against the spec's criteria: single athlete, already low-key/dark, clear negative space on the LEFT half, no legible branding, strong highlight structure (chalk, rim light). Rank top 3 in `candidates.md` with one-line reasoning each. Pick #1.

- [ ] **Step 3: Produce the committed assets**

```bash
curl -sL "https://images.unsplash.com/photo-<WINNER>?q=70&w=2400&fm=webp" -o public/landing/hero-lifter.webp
ls -la public/landing/hero-lifter.webp   # must be ≤ 250KB; if over, retry with q=60 or w=2000; sips fallback
curl -sL "https://images.unsplash.com/photo-<WINNER>?q=50&w=16&fm=webp" -o /tmp/hero-blur.webp
base64 -i /tmp/hero-blur.webp            # → HERO_BLUR value
```

```js
// src/components/landing-page/heroBlur.js
// Photo: Unsplash photo-<WINNER-ID> — <photographer name if available from the API payload>.
// Unsplash License. Chosen per spec criteria (single athlete, low-key, left negative space).
export const HERO_BLUR = 'data:image/webp;base64,<paste>';
```

- [ ] **Step 4: Verify + commit**

`npx jest --watchAll=false` (25/25 — nothing imports these yet), `npm run build`.
```bash
git add public/landing/hero-lifter.webp src/components/landing-page/heroBlur.js
git commit -m "feat(landing): commit duotone-ready hero photograph and blur placeholder"
```

---

### Task L2: Photo backdrop, hero content, motion factory, new page structure

**Files:**
- Create: `src/components/landing-page/motionVariants.js`, `PhotoBackdrop.jsx`, `HeroContent.jsx`
- Rewrite: `src/components/landing-page/LandingPage.jsx`
- Delete: `src/components/landing-page/Hero.jsx`, `DeviceFrame.jsx` (feature data moves in Task L4; carry the `FEATURES` array temporarily into a new `sections.jsx` stub in THIS task so nothing breaks — see Step 4)

**Interfaces:**
- Consumes: `HERO_BLUR` (L1).
- Produces: `makeVariants(reduce) -> {container, item, photo}`; `<PhotoBackdrop deepen={bool} />` (deepen = auth scrim layer); `<HeroContent onCtaClick onSecondaryClick />`; LandingPage owns `showAuth` and renders the swap. Auth state renders an INTERIM full-viewport wrapper around the existing `<AuthScreen embedded />` (Task L3 replaces it with the real AuthView — the interim must already unmount sections + lock overflow).

- [ ] **Step 1: `motionVariants.js`**

```js
// Single source for landing motion. reduce=true collapses everything to opacity-only.
export function makeVariants(reduce) {
  return {
    container: {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: reduce ? {} : { staggerChildren: 0.14, delayChildren: 0.2 } },
    },
    item: {
      hidden: reduce ? { opacity: 0 } : { y: 20, opacity: 0 },
      visible: { y: 0, opacity: 1, transition: { duration: reduce ? 0.2 : 0.45, ease: [0.22, 1, 0.36, 1] } },
    },
    photo: {
      hidden: reduce ? { opacity: 0 } : { scale: 1.06, opacity: 0 },
      visible: { scale: 1, opacity: 1, transition: { duration: reduce ? 0.3 : 1.2, ease: [0.22, 1, 0.36, 1] } },
    },
  };
}
```

- [ ] **Step 2: `PhotoBackdrop.jsx`**

```jsx
'use client';

import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { makeVariants } from './motionVariants';
import { HERO_BLUR } from './heroBlur';

// Layers 2-5 are photo treatment / legibility scrims — the app's only sanctioned gradients (spec exemption).
export default function PhotoBackdrop({ deepen = false }) {
  const reduce = useReducedMotion();
  const v = makeVariants(reduce);
  return (
    <motion.div className="absolute inset-0 overflow-hidden" aria-hidden="true"
      initial="hidden" animate="visible" variants={v.photo}>
      <Image src="/landing/hero-lifter.webp" alt="" fill priority sizes="100vw"
        placeholder="blur" blurDataURL={HERO_BLUR}
        className="object-cover object-[70%_center] md:object-center grayscale contrast-125 brightness-[.55]" />
      <div className="absolute inset-0 bg-training mix-blend-color opacity-60" />
      <div className="absolute inset-0 bg-protein mix-blend-soft-light opacity-25" />
      <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-background via-background/75 via-40% to-background/10" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />
      <div className={`absolute inset-0 bg-background/60 transition-opacity duration-300 ${deepen ? 'opacity-100' : 'opacity-0'}`} />
    </motion.div>
  );
}
```

- [ ] **Step 3: `HeroContent.jsx`**

```jsx
'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { makeVariants } from './motionVariants';

export default function HeroContent({ onCtaClick, onSecondaryClick }) {
  const reduce = useReducedMotion();
  const v = makeVariants(reduce);
  return (
    <motion.div initial="hidden" animate="visible" exit={{ opacity: 0, y: reduce ? 0 : -16, transition: { duration: 0.15 } }}
      variants={v.container}
      className="relative z-10 flex h-full flex-col justify-end pb-24 md:justify-center md:pb-0 px-6 max-w-7xl mx-auto w-full">
      <div className="max-w-2xl">
        <motion.p variants={v.item} className="text-protein-text text-sm font-semibold uppercase tracking-widest mb-3">
          For lifters
        </motion.p>
        <motion.h1 variants={v.item}
          className="font-display font-bold uppercase leading-[0.95] text-5xl md:text-7xl text-foreground">
          Train hard.
          <br />
          <span className="text-protein">Fuel right.</span>
        </motion.h1>
        <motion.p variants={v.item} className="mt-4 text-lg text-muted-foreground max-w-md">
          The lifting app where nutrition serves your training. Log protein in two taps, see how fuel drives your PRs.
        </motion.p>
        <motion.div variants={v.item} className="mt-8 flex flex-wrap gap-4">
          <button onClick={onCtaClick}
            className="bg-training text-white font-bold rounded-xl px-6 py-3 min-h-11 transition-colors hover:bg-training/90 active:scale-95">
            Start training
          </button>
          <button onClick={onSecondaryClick}
            className="bg-card/60 backdrop-blur-sm border border-border text-foreground font-bold rounded-xl px-6 py-3 min-h-11 transition-colors hover:bg-card/80 active:scale-95">
            See how it works
          </button>
        </motion.div>
      </div>
      <motion.div variants={v.item} className="absolute bottom-6 left-1/2 -translate-x-1/2 hidden md:block">
        <motion.div animate={reduce ? undefined : { y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.8 }}>
          <ChevronDown className="w-6 h-6 text-muted-foreground" />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
```

- [ ] **Step 4: Rewrite `LandingPage.jsx` + temporary `sections.jsx` stub**

LandingPage becomes the owner of the whole composition:

```jsx
'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import PhotoBackdrop from './PhotoBackdrop';
import HeroContent from './HeroContent';
import Sections from './sections';
import AuthScreen from '../AuthScreen';

export default function LandingPage() {
  const [showAuth, setShowAuth] = useState(false);

  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className={`bg-background text-foreground ${showAuth ? 'h-dvh overflow-hidden' : 'min-h-screen'}`}>
      {/* Nav (unchanged markup except Sign In hidden during auth — existing behavior) */}
      <nav className="absolute top-0 left-0 right-0 z-50 p-6 flex justify-between items-center max-w-7xl mx-auto w-full">
        {/* logo block UNCHANGED from current file (bg-indigo-600 fill allowed); onClick={() => setShowAuth(false)} */}
        {/* Sign In button UNCHANGED, rendered only when !showAuth */}
      </nav>

      {/* The one full-viewport room: photo persists, content swaps */}
      <section className={`relative ${showAuth ? 'h-dvh' : 'min-h-dvh'}`}>
        <PhotoBackdrop deepen={showAuth} />
        <AnimatePresence mode="wait">
          {showAuth ? (
            /* INTERIM auth wrapper — Task L3 replaces with <AuthView/>. Must already be full-viewport. */
            <motion.div key="auth" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }} transition={{ duration: 0.25 }}
              className="relative z-10 h-full flex items-center justify-center px-6">
              <div className="w-full max-w-md"><AuthScreen embedded={true} /></div>
            </motion.div>
          ) : (
            <motion.div key="hero" className="absolute inset-0">
              <HeroContent onCtaClick={() => setShowAuth(true)} onSecondaryClick={scrollToFeatures} />
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Nothing below auth — sections unmount entirely */}
      {!showAuth && <Sections onCtaClick={() => setShowAuth(true)} />}
    </div>
  );
}
```

`sections.jsx` STUB for this task (Task L4 rebuilds it): move the current `FEATURES` array + feature-strip JSX out of Hero.jsx verbatim into `export default function Sections({ onCtaClick })` with the `id="features"` wrapper — restyling comes later. Then `git rm src/components/landing-page/Hero.jsx src/components/landing-page/DeviceFrame.jsx` and fix any imports (`grep -rn "HeroSection\|DeviceFrame" src/` → only LandingPage should have referenced them).

- [ ] **Step 5: Verify + commit**

Jest + build; `npm run dev` → logged-out `/`: photo hero renders with duotone + stagger; Sign In swaps to interim auth with NO sections below (inspect DOM); Back-via-logo works.
```bash
git add -A && git commit -m "feat(landing): duotone photo hero with persistent backdrop and state-swap architecture"
```

---

### Task L3: AuthView — dedicated non-scroll view + AuthScreen fixes

**Files:**
- Create: `src/components/landing-page/AuthView.jsx`
- Modify: `src/components/landing-page/LandingPage.jsx` (swap interim wrapper for AuthView; add Esc handler), `src/components/AuthScreen.jsx` (named fixes only)

**Interfaces:**
- Consumes: `PhotoBackdrop deepen` (already wired), `AuthScreen embedded`.
- Produces: `<AuthView onBack />` — full-viewport, keyboard-safe, with its own back affordance.

- [ ] **Step 1: `AuthView.jsx`**

```jsx
'use client';

import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import AuthScreen from '../AuthScreen';

export default function AuthView({ onBack }) {
  return (
    <motion.div key="auth" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }} transition={{ duration: 0.25 }}
      className="relative z-10 h-dvh flex flex-col">
      {/* Top row: back — the nav's logo also exits, this is the explicit affordance */}
      <div className="flex items-center p-4 pt-6">
        <button onClick={onBack} aria-label="Back to landing"
          className="flex items-center gap-2 min-h-11 px-3 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-semibold">Back</span>
        </button>
      </div>
      {/* Keyboard-safety valve: no scroll at rest; scrolls only when the keyboard shrinks dvh */}
      <div className="flex-1 min-h-0 flex flex-col justify-center overflow-y-auto px-6 pb-safe">
        <div className="w-full max-w-md mx-auto md:bg-card/80 md:backdrop-blur-md md:border md:border-border md:rounded-2xl md:p-8">
          <AuthScreen embedded={true} compact={true} />
        </div>
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 2: Wire into LandingPage + Esc**

Replace the interim auth wrapper with `<AuthView onBack={() => setShowAuth(false)} />`. Add the Esc handler (top-level effect, guard the lint rule — listener only, no setState-in-effect issue since it's event-driven):

```jsx
  useEffect(() => {
    if (!showAuth) return;
    const onKey = (e) => e.key === 'Escape' && setShowAuth(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showAuth]);
```

- [ ] **Step 3: AuthScreen named fixes (surgical)**

1. Submit button: `bg-indigo-600 ... hover:bg-indigo-700` → `bg-training hover:bg-training/90` (line ~139).
2. Delete the decorative `blur-3xl` glow div (lines ~66-68, non-embedded branch).
3. New `compact` prop (default false): when true, header wrapper `mb-8`→`mb-6`, h1 `text-3xl`→`text-2xl`, submit `py-4`→`py-3.5`, Google button `py-3`→`py-3`, bottom section `mt-6 space-y-4`→`mt-5 space-y-3`. Inputs stay `py-3` and base font size (≥16px — verify no `text-sm` on inputs).
4. Toggle link stays `text-training-text` (already correct — verify, don't churn).
No other changes to AuthScreen — auth logic untouched.

- [ ] **Step 4: Verify + commit**

Jest + build. Dev pass: mobile viewport — open auth: document does NOT scroll (check `document.body.scrollHeight <= innerHeight` in console), fields visible, Back + logo + Esc all exit with reverse transition, photo never flickers (no remount). Desktop: centered blur card.
```bash
git add -A && git commit -m "feat(landing): dedicated non-scroll auth view with keyboard-safe layout"
```

---

### Task L4: Sections rebuild + Pricing deletion

**Files:**
- Rewrite: `src/components/landing-page/sections.jsx` (from the L2 stub)
- Delete: `src/components/landing-page/Pricing.jsx`

**Interfaces:**
- Consumes: `makeVariants` factory; `Sections({ onCtaClick })` signature from L2.

- [ ] **Step 1: Rebuild `sections.jsx`**

```jsx
'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Trophy, Beef, Brain } from 'lucide-react';
import { makeVariants } from './motionVariants';

const FEATURES = [
  { icon: Trophy, tile: 'bg-training-soft', iconClass: 'text-training-text', stat: 'every PR',
    title: 'PR detection', description: 'Automatically flags new personal records the moment you log a set.' },
  { icon: Beef, tile: 'bg-protein-soft', iconClass: 'text-protein-text', stat: '2 taps',
    title: 'Quick protein', description: 'Log the protein sources you eat most in two taps, no typing required.' },
  { icon: Brain, tile: 'bg-ai-soft', iconClass: 'text-ai', stat: '1×/week',
    title: 'AI review', description: 'A once-a-week AI breakdown of how your fueling tracked with training.' },
];

export default function Sections({ onCtaClick }) {
  const reduce = useReducedMotion();
  const v = makeVariants(reduce);
  const cardStagger = { ...v.container, visible: { ...v.container.visible, transition: reduce ? {} : { staggerChildren: 0.08 } } };

  return (
    <>
      <section id="features" className="max-w-7xl mx-auto px-6 py-20 md:py-28">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={v.container}>
          <motion.p variants={v.item} className="text-protein-text text-sm font-semibold uppercase tracking-widest mb-2">
            Built around the bar
          </motion.p>
          <motion.h2 variants={v.item} className="font-display font-bold uppercase text-3xl md:text-4xl text-foreground mb-10">
            Fuel that follows your training
          </motion.h2>
        </motion.div>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={cardStagger}
          className="grid sm:grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Icon, tile, iconClass, stat, title, description }) => (
            <motion.div key={title} variants={v.item} className="bg-card border border-border rounded-2xl p-5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${tile}`}>
                <Icon className={`w-5 h-5 ${iconClass}`} />
              </div>
              <p className="font-display font-bold text-3xl text-foreground tabular-nums leading-none mb-1">{stat}</p>
              <h3 className="font-display font-bold text-lg text-foreground mb-1">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section className="bg-card border-y border-border">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.4 }} variants={v.container}
          className="max-w-7xl mx-auto px-6 py-16 flex flex-col md:flex-row items-center justify-between gap-6">
          <motion.h2 variants={v.item} className="font-display font-bold uppercase text-3xl md:text-4xl text-foreground">
            Stop guessing. Start fueling.
          </motion.h2>
          <motion.button variants={v.item} onClick={onCtaClick}
            className="bg-training text-white font-bold rounded-xl px-8 py-4 min-h-11 transition-colors hover:bg-training/90 active:scale-95">
            Start training
          </motion.button>
        </motion.div>
      </section>
    </>
  );
}
```

- [ ] **Step 2: Delete Pricing + hygiene**

`git rm src/components/landing-page/Pricing.jsx`; `grep -rn "Pricing\|DeviceFrame\|HeroSection" src/` → zero hits.

- [ ] **Step 3: Verify + commit**

Jest + build; dev: scroll from hero → features blur-fade in once → CTA band; secondary CTA scrolls to features; CTA band button opens auth.
```bash
git add -A && git commit -m "feat(landing): stat-numeral feature section and closing CTA band; drop dead Pricing"
```

---

### Task L5: Verification pass

**Files:** small fixes only, as findings dictate.

- [ ] **Step 1: DOM/scroll audit** — dev server: at 375×667 and desktop, with auth open: `document.body.scrollHeight <= window.innerHeight` true; sections absent from DOM (`document.getElementById('features') === null`); at rest the auth inner wrapper does not scroll (`scrollHeight <= clientHeight` on the valve div).
- [ ] **Step 2: Hero legibility** — screenshot via headless Chrome (R11 precedent) at both widths over the ACTUAL chosen photo; verify headline/subhead contrast visually; if the photo's left half fights the text, adjust `object-[70%_center]` positioning or scrim stop (`via-40%` → `via-50%`) — smallest change wins, document it.
- [ ] **Step 3: Reduced-motion** — emulate `prefers-reduced-motion`: no y/scale/loops anywhere on the landing (photo fades, type fades, no scroll-cue bounce).
- [ ] **Step 4: Performance** — throttled mobile LCP < 2.5s (photo has `priority` + blur); confirm hero-lifter.webp ≤250KB; no CLS from the swap (AnimatePresence `mode="wait"` + absolute layers).
- [ ] **Step 5: Lighthouse a11y** on `/` — must stay 100 (heading order: h1 hero → h2 sections → h3 card titles is valid).
- [ ] **Step 6: Fix small findings inline; commit**
```bash
git add -A && git commit -m "chore(landing): verification pass fixes"
```

---

## Verification (end-to-end)

1. `npx jest --watchAll=false` → 25/25; `npm run build` clean.
2. Landing: photo hero with duotone + full stagger choreography; scroll journey hero→features→CTA band.
3. Auth: single-viewport on mobile (nothing below, no document scroll, keyboard valve only), desktop blur card, photo persistence across the swap, Back/logo/Esc exits.
4. Reduced-motion opacity-only; LCP < 2.5s throttled; Lighthouse a11y 100.
