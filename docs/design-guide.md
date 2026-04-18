# Verdify Design Guide

> This guide reflects the current design system implemented across the root experience: the landing page at `/`, the shared shell in `frontend/src/layouts/root-layout.tsx`, the navbar/footer, and the auth modal. Treat this as the canonical reference for extending the existing visual language.

---

## Scope

The current UI is not a generic product dashboard. It is an editorial, campaign-style product surface built around the Johor-Singapore corridor story.

The design language is shared across:

- `frontend/src/pages/Landing/page.tsx`
- `frontend/src/components/Navbar.tsx`
- `frontend/src/components/Footer.tsx`
- `frontend/src/components/auth-modal.tsx`
- `frontend/src/components/RouteMap.tsx`
- `frontend/src/index.css`

The route planner page is a separate, older visual treatment and should not be used as the source of truth for this guide.

---

## Design Direction

The live design is best described as:

- Editorial product storytelling
- Calm environmental branding
- Glassmorphic overlays on top of paper-like backgrounds
- Tight typography with deliberate contrast between sans display and serif italics
- Motion used as reveal and state feedback, not decoration

The tone is restrained and premium, not playful. Surfaces are soft, spacing is generous, and the accent color is used with discipline.

---

## Color System

### Core landing tokens

| Token | Light | Dark | Role |
|---|---|---|---|
| `--landing-bg` | `#F4F5F0` | `#0A0E0C` | Main page background |
| `--landing-bg-soft` | `#ECEEE6` | `#0F1513` | Alternate section background |
| `--landing-surface` | `rgba(255,255,255,0.55)` | `#141A17` | Elevated surface fill |
| `--landing-surface-alt` | `rgba(255,255,255,0.42)` | `#1A221F` | Secondary elevated fill |
| `--landing-border` | `rgba(10,14,12,0.10)` | `rgba(236,239,233,0.10)` | Standard border |
| `--landing-border-strong` | `rgba(10,14,12,0.22)` | `rgba(236,239,233,0.22)` | Emphasized border |
| `--landing-text` | `#0A0E0C` | `#ECEFE9` | Primary text |
| `--landing-text-muted` | `rgba(10,14,12,0.62)` | `rgba(236,239,233,0.58)` | Paragraph and support copy |
| `--landing-text-dim` | `rgba(10,14,12,0.42)` | `rgba(236,239,233,0.38)` | Metadata and section labels |
| `--landing-accent` | `#1F7A3D` | `#A6F754` | Main action color |
| `--landing-accent-soft` | `rgba(31,122,61,0.10)` | `rgba(166,247,84,0.12)` | Accent wash |
| `--landing-accent-muted` | `rgba(31,122,61,0.32)` | `rgba(166,247,84,0.35)` | Accent border and hover state |
| `--landing-accent-warm` | `#C85A2E` | `#FF8C5A` | Secondary warm accent |
| `--landing-button-foreground` | `#FFFFFF` | `#0A0E0C` | Text on primary accent buttons |

### Extended surface tokens

These are already implemented and should be reused instead of inventing new ones:

- `--landing-cta-bg`
- `--landing-cta-shadow`
- `--landing-card-bg`
- `--landing-card-border-glow`
- `--landing-card-inner-highlight`
- `--landing-map-surface`
- `--landing-map-shadow`
- `--landing-accent-glow`
- `--landing-mesh-a`
- `--landing-mesh-b`
- `--landing-mesh-c`

### Usage rules

- Accent green is the primary action and status color.
- Warm terracotta is for contrast, stress, or emphasis inside messaging.
- Borders are low-contrast and should stay soft.
- Large surfaces should derive from existing landing tokens rather than hardcoded grays.

---

## Typography

### Font roles

| Role | Token / class | Stack | Usage |
|---|---|---|---|
| Landing display | `--landing-font-display`, `.landing-display`, `.landing-hero` | `Geist`, `Inter Tight`, system-ui | Headlines, logo, emphasis |
| Landing body | `--landing-font-body` | `Geist`, `Inter Tight`, system-ui | Paragraphs, buttons, body copy |
| Landing italic | `--landing-font-italic`, `.landing-italic` | `Instrument Serif`, Georgia | Short accent phrases inside headlines |
| Landing mono | `--landing-font-mono`, `.landing-mono`, `.landing-mono-sm` | `Geist Mono`, `JetBrains Mono` | Labels, chips, metadata |

### Current type behavior

- Headlines use strong negative tracking and compact line-height.
- `.landing-hero` is the dominant display style for the top hero only.
- `.landing-display` is reused for section headings, card titles, logo lockups, and major footer statements.
- `.landing-italic` should be used sparingly inside sans headlines, usually one or two words.
- `.landing-mono-sm` is the default label style for section markers like `§ Premise — 01`.
- `.landing-mono` is used for short utility labels like live corridor indicators.

### Important constraint

Do not mix the older global serif display stack (`Fraunces`) into landing-specific work. The current landing system explicitly overrides that with `Geist` for the live page aesthetic.

---

## Layout System

### Shared shell

- Root layout uses `min-h-svh`
- Header is fixed at the top
- Footer is shared across the root layout
- Page transitions use a blur-and-slide motion between routes

### Width and spacing

- Main landing content: `max-w-[1440px]`
- Navbar content: `max-w-[1024px]`
- Horizontal padding: `px-4`, `sm:px-6`, `lg:px-10`
- Navbar padding: `px-4`, `sm:px-6`, `lg:px-8`
- Major section padding: `py-24 lg:py-32`
- Card grid gap: `gap-5`
- Large hero split: `lg:grid-cols-[1.02fr_0.98fr]`
- Section intro split: `lg:grid-cols-[0.32fr_0.68fr]`

### Section rhythm

The landing page alternates between:

- Clean background sections using `var(--landing-bg)`
- Bordered soft-background sections using `var(--landing-bg-soft)`

This alternating rhythm is one of the main compositional devices. Preserve it when adding sections.

---

## Navigation

The navbar is no longer a simple top bar. It is part of the brand expression.

### Structure

- Fixed top nav with `z-50`
- Effective nav height: `64px`
- Transparent at rest
- Gains border, background tint, and blur after light scroll or when a flyout is open
- Desktop centers a four-item navigation
- Right side holds search, theme toggle, sign-in link, and accent CTA
- Mobile uses a full-width blurred drawer below the nav bar

### Desktop flyouts

Each top-level item opens a three-column flyout:

- Column 1: prominent editorial links
- Column 2: page-local wayfinding
- Column 3: action links into the product

The flyout uses:

- `color-mix` with `var(--landing-bg)`
- strong blur and saturation
- soft drop shadow
- large display links for prominent items

### Logo

- Icon block: 24x24
- Rounded square
- Accent fill
- Leaf icon in `landing-button-foreground`
- Wordmark in `.landing-display`

---

## Buttons and Interactive Elements

### Primary buttons

Implemented as `.landing-btn-primary`:

- Full pill shape
- Accent background
- Medium body weight
- Small uppercase-adjacent feel via letter spacing, not actual uppercase
- Hover lifts upward and gains glow

### Ghost buttons

Implemented as `.landing-btn-ghost`:

- Transparent surface
- Stronger border than default cards
- Accent-tinted hover fill

### Text links

The shared inline link treatment is `.landing-link-underline`:

- underline animates from hidden to full width
- underline uses the accent color
- used for nav text actions and editorial inline CTAs

---

## Cards and Surfaces

### `landing-card`

This is the main reusable elevated surface style.

- Soft gradient background
- Backdrop blur and saturation
- Thin border
- Inner highlight
- Hidden border-glow overlay that fades in on hover
- Slight upward movement on hover
- Rounded corners at `14px`

Use this for:

- sequence cards
- capability cards
- future elevated content blocks in the landing system

### CTA panel

The final CTA section is a larger special-case surface:

- `rounded-[20px]`
- stronger blur
- richer gradient background via `--landing-cta-bg`
- soft radial accent bloom in the corner

### Auth modal shell

The auth modal uses the same language but tighter and more editorial:

- fullscreen blurred backdrop
- large central shell with border and shadow
- left brand panel with mesh and faded wordmark
- right form panel with minimal field styling

---

## Background Treatments

### Grain

Two different grain systems exist:

- global body paper grain for non-landing surfaces
- landing-specific grain overlay via `.landing-grain`

When `.landing-theme` is mounted, the body pseudo-element overlays are disabled so the landing page controls its own atmosphere.

### Mesh

`.landing-mesh` is a recurring atmospheric layer built from three blurred radial gradients. It appears:

- behind the hero
- behind the sequence section
- inside the auth modal brand panel

### Glass blur

Blur is used consistently for:

- navbar on scroll/open
- flyout menus
- landing cards
- route map shell
- ticker strip
- auth modal backdrop and shell

This is not decorative frosting. It is a core part of the interface depth model.

---

## Landing Page Composition

### Hero

The hero currently includes:

- live status row with accent dot
- corridor/date chips on desktop
- three-line animated headline
- body paragraph with italic emphasis
- primary and ghost CTAs
- three compact stats under a top border
- live route map on the right
- ticker strip beneath the hero

### Premise section

- section label on the left
- oversized editorial headline on the right
- two-column explanatory copy
- warm accent used specifically inside the phrase `energy crunch`

### Sequence section

- soft background
- mesh overlay
- four-card process flow
- visible horizontal guide line behind cards on desktop

### Capabilities section

- six-card grid
- each card labeled `Line 01` style
- icon on top right
- hover-only `learn more` affordance

### Evidence section

- soft background with border rhythm
- three full-width rows
- each row uses a left icon badge, central explanation, and right arrow affordance

### Closing CTA

- oversized display statement
- accent italic finishing word
- supporting paragraph
- two-button action row

### Footer

The footer continues the landing aesthetic rather than switching to utility UI:

- editorial headline and brief
- compact metadata grid
- large `Verdify.` wordmark
- mono copyright

---

## Route Map Visual Language

`RouteMap.tsx` is a bespoke illustration component, not a generic map embed.

### Characteristics

- abstracted corridor map, not literal cartography
- animated eco path and secondary standard path
- mono labels for origin/destination and scale
- pulsing nodes and moving route indicators
- palette variants for `light`, `warm`, and `dark`

### Guidance

- Keep the map schematic and ambient
- Avoid introducing realistic map tiles
- Preserve the signal hierarchy: eco route first, standard route second, labels third

---

## Auth Modal

The auth modal is part of the current design system and should be referenced when building account-related UI.

### Structure

- `AuthModalProvider` mounted at the root layout
- modal opens from navbar actions and flyout links
- left pane is brand/editorial
- right pane is form-driven

### Visual rules

- brand pane uses faded oversized wordmark, stats, and mesh
- tabs use understated mono numbering with animated underline
- fields are underlined rather than boxed
- borders animate from hidden to active on focus/value
- errors switch to `--landing-accent-warm`
- social buttons stay pill-shaped and understated

This modal should remain visually aligned with the landing experience, not with the older auth pages.

---

## Motion Principles

The current motion system uses `framer-motion` with a consistent easing family around `[0.2, 0.7, 0.2, 1]`.

### Current patterns

- route/page transitions: fade, vertical motion, blur
- hero text: per-character reveal
- section reveals: upward fade on scroll into view
- cards: staggered entrance on scroll
- nav: slide down on first paint
- flyouts and modal content: short opacity and y-axis transitions
- buttons/cards: restrained hover lift, not bounce
- accent dot: pulse animation
- ticker: constant marquee movement

### View transitions

The theme switcher suppresses the browser’s default root cross-fade so the custom reveal animation owns the frame. Do not reintroduce the default transition behavior.

---

## Design Rules

- Keep display typography tight and intentional.
- Use serif italics only as contrast accents inside bigger statements.
- Reuse landing tokens before inventing new colors.
- Favor glass, blur, and border layering over heavy shadows or flat boxes.
- Preserve the editorial section-label pattern with `§` markers where the page structure calls for it.
- Keep surfaces calm and premium; avoid loud gradients outside the established token set.
- Use motion to clarify hierarchy and interaction, not to add novelty.
- Maintain the contrast between wide cinematic sections and tight mono metadata.
- Treat the landing page, navbar, footer, and auth modal as one system.

---

## When Extending The Design

If you add a new section or component inside this visual system:

1. Start with existing landing tokens and utility classes.
2. Reuse `.landing-display`, `.landing-italic`, `.landing-mono-sm`, `.landing-card`, `.landing-btn-primary`, or `.landing-btn-ghost` where applicable.
3. Match the current section rhythm: generous spacing, tight headline, restrained body width.
4. Prefer editorial composition over dashboard composition.
5. Check the result in both light and dark themes.
