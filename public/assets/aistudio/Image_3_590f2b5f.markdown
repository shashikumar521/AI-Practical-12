---
name: Preference AI
colors:
  surface: '#0f131d'
  surface-dim: '#0f131d'
  surface-bright: '#353944'
  surface-container-lowest: '#0a0e18'
  surface-container-low: '#171b26'
  surface-container: '#1c1f2a'
  surface-container-high: '#262a35'
  surface-container-highest: '#313540'
  on-surface: '#dfe2f1'
  on-surface-variant: '#c2c6d6'
  inverse-surface: '#dfe2f1'
  inverse-on-surface: '#2c303b'
  outline: '#8c909f'
  outline-variant: '#424754'
  surface-tint: '#adc6ff'
  primary: '#adc6ff'
  on-primary: '#002e6a'
  primary-container: '#4d8eff'
  on-primary-container: '#00285d'
  inverse-primary: '#005ac2'
  secondary: '#d0bcff'
  on-secondary: '#3c0091'
  secondary-container: '#571bc1'
  on-secondary-container: '#c4abff'
  tertiary: '#4cd7f6'
  on-tertiary: '#003640'
  tertiary-container: '#009eb9'
  on-tertiary-container: '#002f38'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a42'
  on-primary-fixed-variant: '#004395'
  secondary-fixed: '#e9ddff'
  secondary-fixed-dim: '#d0bcff'
  on-secondary-fixed: '#23005c'
  on-secondary-fixed-variant: '#5516be'
  tertiary-fixed: '#acedff'
  tertiary-fixed-dim: '#4cd7f6'
  on-tertiary-fixed: '#001f26'
  on-tertiary-fixed-variant: '#004e5c'
  background: '#0f131d'
  on-background: '#dfe2f1'
  surface-variant: '#313540'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 3rem
    fontWeight: '700'
    lineHeight: 3.5rem
    letterSpacing: -0.025em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 2rem
    fontWeight: '700'
    lineHeight: 2.5rem
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 2rem
    fontWeight: '600'
    lineHeight: 2.5rem
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: 2rem
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: 2rem
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.25rem
    fontWeight: '600'
    lineHeight: 1.75rem
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 1.125rem
    fontWeight: '400'
    lineHeight: 1.75rem
  body-md:
    fontFamily: Inter
    fontSize: 0.9375rem
    fontWeight: '400'
    lineHeight: 1.5rem
  body-sm:
    fontFamily: Inter
    fontSize: 0.8125rem
    fontWeight: '400'
    lineHeight: 1.25rem
  label-lg:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '600'
    lineHeight: 1.25rem
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: '500'
    lineHeight: 1rem
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 0.6875rem
    fontWeight: '600'
    lineHeight: 0.875rem
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system establishes an intelligent, high-precision dark atmosphere tailored for technical product teams, ML researchers, and enterprise AI strategists. The emotional posture is calculated, calm, and effortlessly authoritative—evoking deep-focus intelligence rather than neon gamer aesthetics.

The visual style blends **Deep-Dark Minimalism** with restrained **Glassmorphism & Luminous Edge Accents**. Complex ML transparency tools (such as KNN preference maps, vector distance graphs, and multi-tier decision trees) sit on deep nocturnal foundations where luminescence serves functional differentiation rather than ornament. The interface prioritizes crisp structural delineations, micro-interactions with immediate feedback, and rich, subdued layer tiers that keep eye fatigue minimal across long analytic sessions.

## Colors

The palette operates on three nocturnal foundation tiers paired with precision emissive accents:

- **Foundational Neutrals:**
  - Base canvas (`#0B0F19`): Deepest dark navy, creates a void-like canvas.
  - Surface Tier 1 (`#111827`): Used for primary navigation rails, background panels, and resting card containers.
  - Surface Tier 2 (`#1E293B`): Elevated states, hovering nodes, split panes, and modal sheets.
  - Border/Stroke (`rgba(148, 163, 184, 0.12)`): Low-contrast structural delimiters preventing visual harshness.
  - Content High-Contrast (`#F8FAFC`): Primary text and critical metrics; guarantees WCAG AAA legibility against the charcoal baseline.
  - Content Muted (`#94A3B8`): Contextual labels, secondary vectors, and metadata.

- **Spectral Accents & Semantic Signals:**
  - Primary Electric Blue (`#3B82F6`): Signifies active selection, core system actions, model training triggers, and primary graph nodes.
  - Secondary Violet (`#8B5CF6`): Represents inference runs, target user segments, and model decision thresholds.
  - Tertiary Cyan (`#06B6D4`): Highlights real-time scoring, live incoming tokens, and KNN centroid anchors.
  - Linear Gradients: Confined strictly to directional flow cues, progress states, and border sheen highlights (e.g., `linear-gradient(135deg, #3B82F6 0%, #8B5CF6 50%, #06B6D4 100%)`).

## Typography

The pairing combines the architectural, contemporary geometry of **Plus Jakarta Sans** for structural hierarchy with the neutral, hyper-legible matrix of **Inter** for dense tabular data, model parameters, and high-frequency UI elements.

- **Headlines & Display:** Set tightly with negative tracking to enforce crisp, deliberate structure across dashboard headers and model comparison readouts.
- **Body & Data:** Maintained with standard Inter proportional spacing, ensuring continuous readability across multi-line JSON logs, token sequences, and probability matrices.
- **Labels & Micro-copy:** Formatted with slightly tracked, uppercase or medium-weight treatments for high distinction in badges, score indices, and node connectors.

## Layout & Spacing

The layout model uses a disciplined 12-column responsive fluid grid structured around 8px base units, adapting strictly across device form factors:

- **Desktop (>= 1280px):** 12-column grid, `margin: 2rem`, `gutter: 1.5rem`. Accommodates side-by-side split inspectors: model config on the left, interactive decision tree or scatter matrix in center-right, output tokens on the dock.
- **Tablet (768px - 1279px):** 8-column grid, `margin: 1.5rem`, `gutter: 1rem`. Ancillary toolbars collapse into slide-over sheets; data visualizations reduce auxiliary parameter columns.
- **Mobile (< 768px):** 4-column grid, `margin: 1rem`, `gutter: 1rem`. Complex visualizations fold into tabbed sub-views; tree branches become vertically expandable accordions.

Internal component gaps, card paddings, and parameter stacks follow strict multiples of `space-xs` through `space-xl`.

## Elevation & Depth

Visual hierarchy does not rely on opaque drop shadows. Depth is achieved via **Tonal Stacking**, **Glassmorphism**, and **Luminous Boundaries**:

- **Layer 0 (Canvas):** `#0B0F19`, pure flat baseline.
- **Layer 1 (Card & Section):** Background `rgba(17, 24, 39, 0.7)` paired with `backdrop-filter: blur(16px)` and a stroke of `1px solid rgba(148, 163, 184, 0.08)`.
- **Layer 2 (Elevated & Active):** Background `rgba(30, 41, 59, 0.85)` with `backdrop-filter: blur(20px)` and border `1px solid rgba(59, 130, 246, 0.25)`.
- **Luminous Edge Glows:** Active cards or focused decision nodes emit an outer ambient spread of `0 0 24px -4px rgba(59, 130, 246, 0.15)` or `0 0 32px -6px rgba(139, 92, 246, 0.18)`, rendering an illuminated glass contour rather than a dark physical shadow.

## Shapes

The design system employs a calibrated medium-radius baseline (`0.5rem` / `8px` default). This maintains crisp, technical boundaries on major framing containers while softening interactive items:

- **Containers & Panels:** `0.5rem` (`rounded-md`) to `1rem` (`rounded-lg`), ensuring clear structural alignment.
- **Inputs & Standard Buttons:** `0.5rem` for predictable ergonomics.
- **Specialized Pill Elements:** Status indicators, ML model tags, vector weights, and answer style tags use fully rounded pill closures (`rounded-full` / `9999px`) to create strong contextual contrast against rectangular data cards.

## Components

- **Buttons:**
  - *Primary:* Solid fill using a gradient transition from `#3B82F6` to `#2563EB`, text `#F8FAFC`, subtle internal top highlight stroke `rgba(255, 255, 255, 0.2)`. On hover, expands an outer blue glow (`0 0 20px rgba(59, 130, 246, 0.35)`).
  - *Secondary / Glass:* Background `rgba(30, 41, 59, 0.6)`, border `1px solid rgba(148, 163, 184, 0.15)`, text `#F8FAFC`. Active state incorporates border color `#3B82F6`.
  - *Ghost / Minimal:* Transparent surface, text `#94A3B8`, hover text `#F8FAFC` with surface `rgba(255, 255, 255, 0.04)`.

- **Pill Badges (Answer Styles & Attributes):**
  - Fully rounded geometry (`border-radius: 9999px`), internal padding `0.25rem 0.75rem`.
  - Translucent fill `rgba(139, 92, 246, 0.12)`, border `1px solid rgba(139, 92, 246, 0.35)`, label text `#C4B5FD` (for violet class), or corresponding cyan/electric blue variants.
  - Used systematically to denote generation parameters (e.g., `Deterministic`, `Creative`, `Top-P 0.9`, `KNN Centroid A`).

- **Input Fields & Search Bars:**
  - Background `rgba(17, 24, 39, 0.9)`, border `1px solid rgba(148, 163, 184, 0.15)`.
  - Height `2.5rem`, text `#F8FAFC`, placeholder text `#64748B`.
  - Focus state: border shifts to `#3B82F6` accompanied by an immediate `0 0 0 1px #3B82F6` and ambient cyan wash `0 0 16px rgba(6, 182, 212, 0.15)`.

- **Selection Controls (Checkboxes & Radio Buttons):**
  - Size `1rem x 1rem`. Resting border `rgba(148, 163, 184, 0.3)` on dark navy fill.
  - Checked state: primary blue gradient fill `#3B82F6`, crisp white vector mark, light glow halo.

- **Data Cards:**
  - Frosted glass construction with dark charcoal surface (`rgba(17, 24, 39, 0.75)`).
  - Resting low-contrast edge (`rgba(148, 163, 184, 0.1)`). On hover, smooth 200ms transition to a subtle electric gradient border sheen and micro-scale transform (`translateY(-2px)`).

- **ML Decision Tree & Graph Visualizations:**
  - Branch lines: `rgba(148, 163, 184, 0.2)` default stroke, transitioning to `#3B82F6` (1.5px) for activated logic paths.
  - Decision nodes: Glass cards with pill metric badges indicating probability split thresholds.
  - Centroid and KNN scatter plots: Dots feature radial glow cores (`#06B6D4` or `#8B5CF6`) with proximity fields defined via variable opacity rings.