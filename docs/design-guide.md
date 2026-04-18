# Landing Theme — Design System Reference

> This guide describes the design of the landing page (`frontend/src/pages/Landing/page.tsx`), served at the root route `/`. Use it as the canonical styling reference when adding new sections or components.

---

## Color Palette

### Light Mode (default)

| Token | Value | Usage |
|---|---|---|
| `--landing-bg` | `#F4F5F0` | Page background |
| `--landing-bg-soft` | `#ECEEE6` | Alternate section background |
| `--landing-surface` | `rgba(255,255,255, 0.55)` | Glassmorphic surface layer 1 |
| `--landing-surface-alt` | `rgba(255,255,255, 0.42)` | Glassmorphic surface layer 2 (chips) |
| `--landing-border` | `rgba(10,14,12, 0.10)` | Subtle border |
| `--landing-border-strong` | `rgba(10,14,12, 0.22)` | Emphasized border |
| `--landing-text` | `#0A0E0C` | Primary text |
| `--landing-text-muted` | `rgba(10,14,12, 0.62)` | Body copy, descriptions |
| `--landing-text-dim` | `rgba(10,14,12, 0.42)` | Labels, metadata |
| `--landing-accent` | `#1F7A3D` | Primary brand accent (forest green) |
| `--landing-accent-soft` | `rgba(31,122,61, 0.10)` | Accent-tinted fills |
| `--landing-accent-muted` | `rgba(31,122,61, 0.32)` | Accent borders and midtones |
| `--landing-accent-warm` | `#C85A2E` | Secondary accent (terracotta orange) |
| `--landing-button-foreground` | `#FFFFFF` | Text on accent buttons |

### Dark Mode (`html.dark`)

| Token | Value | Usage |
|---|---|---|
| `--landing-bg` | `#0A0E0C` | Near-black green-tinted background |
| `--landing-bg-soft` | `#0F1513` | Alternate section background |
| `--landing-text` | `#ECEFE9` | Primary text |
| `--landing-text-muted` | `rgba(236,239,233, 0.58)` | Body copy |
| `--landing-text-dim` | `rgba(236,239,233, 0.38)` | Labels, metadata |
| `--landing-accent` | `#A6F754` | Primary accent shifts to neon lime-green |
| `--landing-accent-soft` | `rgba(166,247,84, 0.12)` | Accent-tinted fills |
| `--landing-accent-muted` | `rgba(166,247,84, 0.35)` | Accent borders |
| `--landing-accent-warm` | `#FF8C5A` | Secondary accent shifts to bright orange |
| `--landing-button-foreground` | `#0A0E0C` | Dark text on lime buttons |

---

## Typography

Four distinct font roles. Never substitute or mix these with other font variables.

| Role | CSS class / var | Font stack | Use case |
|---|---|---|---|
| Display | `.landing-display`, `var(--landing-font-display)` | `Geist`, `Inter Tight`, system-ui | All headings, logo, stat numbers |
| Body | `var(--landing-font-body)` | Same as display (`Geist`) | Body paragraphs, button labels |
| Italic accent | `.landing-italic`, `var(--landing-font-italic)` | `Instrument Serif` italic | Accent phrases inside headings |
| Mono | `.landing-mono-sm`, `.landing-mono`, `var(--landing-font-mono)` | `Geist Mono`, `JetBrains Mono` | Section labels, chips, metadata |

### Display Scale

- **`.landing-hero`** (Hero H1): weight 400, `letter-spacing: -0.055em`, `line-height: 0.88`, fluid `clamp(3.2rem, 10.5vw, 10.5rem)`
- **`.landing-display`**: weight 400, `letter-spacing: -0.045em`, `line-height: 0.92`
- **Section H2s**: `clamp(2rem–2.4rem, 4.4–5.5vw, 3.6–4.8rem)`, tracking `-0.035em` to `-0.04em`
- **`.landing-italic`**: `Instrument Serif` italic, weight 400 — renders slightly smaller (~94% size) and with slight positive tracking
- **`.landing-mono-sm`**: `0.62rem`, uppercase, `letter-spacing: 0.14em`
- **`.landing-number`** (stats): display font, weight 300, fluid `clamp(2.2rem, 3.4vw, 3.4rem)`, gradient text clip (solid → 40% opacity)

### Global Rules

- `-webkit-font-smoothing: antialiased` on body
- `font-feature-settings: "ss01", "ss02", "cv11"` on `.landing-theme` root
- All section labels are prefixed with `§` and include a sequential number: `§ Premise — 01`, `§ Sequence — 02`, etc.

---

## Layout

- **Max-width**: `1440px`, centered with `mx-auto`
- **Horizontal padding**: `px-4` (mobile) → `sm:px-6` → `lg:px-10`
- **Section vertical padding**: `py-24 lg:py-32`
- **Section header grid**: asymmetric `lg:grid-cols-[0.32fr_0.68fr]` — narrow left column holds the `§` label + rule line; wide right column holds the heading
- **Content grids**: `md:grid-cols-2`, `lg:grid-cols-3`, `lg:grid-cols-4`
- **Hero grid**: `lg:grid-cols-[1.02fr_0.98fr]` (near 50/50, copy left, map right)
- **Card gap**: `gap-5`
- **Layout column gap**: `gap-8 lg:gap-14`

Sections alternate between `var(--landing-bg)` and `var(--landing-bg-soft)` backgrounds, separated by `border-y` using `var(--landing-border)`.

---

## Navigation

- Fixed, `inset-x-0 top-0`, `z-50`
- Height: `72px`
- Glassmorphic: `backdrop-filter: blur(22px) saturate(160%)`
- Background transitions from near-transparent on load → `color-mix(in srgb, var(--landing-bg) 78%, transparent)` on scroll
- Bottom border appears only on scroll
- **Logo**: 28×28px square with `border-radius: 7px`, `var(--landing-accent)` fill, `Leaf` icon; brand name in `.landing-display` at `1.35rem`, tracking `-0.03em`
- **Nav links**: `.landing-link-underline` — accent underline sweeps left→right on hover (`0.5s cubic-bezier(0.65,0,0.35,1)`)
- **CTA button**: pill (999px radius), height `40px`, accent fill, with `ArrowUpRight` icon

---

## Cards (`.landing-card`)

- `border-radius: 14px`
- Background: glassmorphic gradient (light-to-transparent white in light / dark-to-transparent in dark)
- `backdrop-filter: blur(22px) saturate(170%)`
- 1px border: `var(--landing-border)`
- Inner highlight: `inset 0 1px 0 rgba(255,255,255,0.8)` light / `rgba(255,255,255,0.06)` dark
- **Hover state**: lifts `translateY(-4px)`, border strengthens to `var(--landing-border-strong)`, `::before` pseudo-element fades in a diagonal gradient border-glow (accent green → warm terracotta)
- Internal padding: `p-7`
- Internal layout: `flex flex-col gap-5`

---

## Buttons

### Primary (`.landing-btn-primary`)

- Pill shape (`border-radius: 999px`)
- Height: `3rem`, padding: `0 1.6rem`
- Fill: `var(--landing-accent)`, text: `var(--landing-button-foreground)`
- Font: body, weight 500, `0.82rem`, `letter-spacing: 0.02em`
- Hover: `translateY(-2px)` + accent glow shadow `0 18px 45px -15px var(--landing-accent)`

### Ghost (`.landing-btn-ghost`)

- Same dimensions as primary
- Background: transparent
- Border: `1px solid var(--landing-border-strong)`
- Text: `var(--landing-text)`
- Hover: border turns accent green, background fills with `var(--landing-accent-soft)`

---

## Background Effects

### 1. Grain Overlay (`.landing-grain`)

Fixed, full-screen, `z-50`, SVG fractalNoise pattern:
- Light: `4%` opacity, blend-mode `multiply`
- Dark: `6%` opacity, blend-mode `overlay`

### 2. Mesh Gradient (`.landing-mesh`)

Absolute, `inset: -10%`, three overlapping radial gradients in accent green and warm terracotta, blurred `40px`. Used in hero and alternate sections (at `opacity: 0.6` in the "How it works" section).

### 3. Section Background Rhythm

Sections alternate between:
- `var(--landing-bg)` — default page color
- `var(--landing-bg-soft)` — slightly darker/more saturated

Separated by `border-y` (`var(--landing-border)`).

---

## Section-Specific Patterns

### Hero

- Status row: pulsing `.landing-accent-dot` (8px circle, animated expanding ring) + mono label
- Chips (`.landing-chip`): pill, glassmorphic, monospaced uppercase, `0.64rem`, `letter-spacing: 0.16em`
- Stat block: 3-column grid below `border-t`, values in `.landing-number` (gradient clipped display text)
- Map card: `aspect-[5/5]` desktop, `rounded-[18px]`, floating mono labels, live indicator dot with accent glow (`box-shadow: 0 0 10px var(--landing-accent)`)

### Ticker

- Horizontal auto-scrolling marquee, 42s loop
- Items in `.landing-italic` at `1.35rem`
- Separated by 4px accent bullet dots
- Semi-transparent glassmorphic background

### Section Headers (all sections)

Always follow the `[0.32fr | 0.68fr]` asymmetric grid:
1. Left col: `§ Label — NN` in `.landing-mono-sm` dim color + `.landing-rule` (3.5rem gradient line, accent → transparent)
2. Right col: large display heading with an italic accent phrase

### Stack Section Rows

Full-width bordered rows (`border-b`), grid `md:grid-cols-[1fr_2fr_0.3fr]`:
- Left: icon badge + large display stack name (`clamp(2rem, 3.8vw, 3.2rem)`)
- Center: heading + description
- Right: `ArrowUpRight` icon animates `(-1px, +1px)` on hover

### Footer

- Giant `Verdify.` wordmark at `clamp(3rem, 10vw, 9rem)`, accent period
- Top section: brief copy + tech metadata grid
- Copyright in `.landing-mono-sm` bottom-right

---

## Icon Badges

Lucide icons throughout:
- **strokeWidth**: `1.4` decorative / `1.6` badges / `2.4` logo
- **Badge container**: 40–44px circle or rounded square (`border-radius: 10px`)
- Fill: `var(--landing-accent-soft)`, border: `var(--landing-accent-muted)`, icon color: `var(--landing-accent)`
- Hover: `scale(1.1)` transition on stack section icons

---

## Animations

| Element | Animation | Details |
|---|---|---|
| Hero H1 characters (`.landing-char`) | Blur + slide in | `translateY(0.3em) blur(10px)` → clear, staggered 24ms/char, starts at 80ms |
| Scroll-reveal sections | Fade + slide | `opacity:0, y:28` → `opacity:1, y:0`, 0.9s, easing `[0.2,0.7,0.2,1]`, once at 20% viewport |
| Card stagger | Delayed reveal | 0.06–0.1s per card |
| Accent dot (`.landing-accent-dot`) | Pulse ring | Ring scales `0.6→1.8`, fades, 2s infinite |
| Nav underline | Sweep | Left→right, 0.5s `cubic-bezier(0.65,0,0.35,1)` |
| Primary button hover | Lift + glow | `translateY(-2px)` + accent shadow |
| Card hover | Lift + border glow | `translateY(-4px)`, border-glow pseudo fades in |
| Theme toggle | Circle reveal | View transition API, cross-fade disabled; custom circle-reveal animation owns the frame |

---

## Rules & Design Vocabulary

The design is a **modern editorial tech** aesthetic — editorial magazine structure meets developer tooling precision. Follow these rules strictly:

- **Tight negative tracking** on all headings — never use default or positive tracking on display text
- **Serif italic as accent only** — `.landing-italic` is used for 2–3 words max inside sans-serif headlines, never for full paragraphs
- **Glassmorphism** on all surfaces that float above the background (cards, nav, chips, map, ticker)
- **Accent green is the single dominant accent** — use for CTAs, highlights, active states, and section rules
- **Warm terracotta is a stress/warning accent** — used sparingly for tension (e.g. "energy crunch" callout)
- **Section numbering** with `§` signals editorial rigor — every new section needs its label
- **No decorative imagery** — all visuals are functional (route map, icon badges, gradient meshes)
- **Micro-animations are polish, not decoration** — every animation has a clear reveal or feedback purpose
- **Alternate section backgrounds** to create visual rhythm without adding dividers
- **Max-width 1440px** on all content — never full-bleed text
