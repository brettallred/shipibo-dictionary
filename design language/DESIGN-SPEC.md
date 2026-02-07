# onanti Design Language Specification

**Version 1.0.0** — A design system for the onanti Shipibo icaro learning platform.

---

## 1. Design Principles

**Function First** — Learning is the priority. Every element serves a clear purpose. The interface becomes invisible when the student is focused on an icaro.

**Cultural Respect** — Shipibo kené patterns appear as subtle accents, never decorative noise. The geometric traditions of the Shipibo-Conibo people deserve understated reverence, not appropriation. Kené motifs are used sparingly: low-opacity backgrounds, section dividers, empty states.

**Warm Clarity** — Earth tones and ample whitespace create a calm learning environment. Typography is highly legible with generous line height, especially for displaying icaro lyrics alongside translations.

**Progressive Depth** — New users see a simple, welcoming interface. Advanced features (spaced repetition stats, pronunciation tools, detailed lineage context) reveal themselves as the learner progresses.

---

## 2. Color System

The palette draws from Amazonian earth tones: mahogany bark (burgundy), river clay (earth), forest canopy (sage), and the purple/magenta tones found in traditional Shipibo dye work (plum). Neutrals are warm-tinted rather than cool gray.

### Primary Palette

| Role | Token | Hex | Usage |
|------|-------|-----|-------|
| Primary | `--color-primary` | #7a3333 | Buttons, links, focus rings, active states |
| Primary Hover | `--color-primary-hover` | #5e2828 | Hover state for primary actions |
| Primary Subtle | `--color-primary-subtle` | #f2e4e4 | Subtle backgrounds, badges, highlights |
| Secondary | `--color-secondary` | #967854 | Supporting UI, secondary buttons |
| Accent | `--color-accent` | #785496 | Tags, highlights, progress differentiation |
| Success | `--color-success` | #547854 | Completed items, correct answers |
| Warning | `--color-warning` | #c4882f | Caution states, streak warnings |
| Error | `--color-error` | #b83d3d | Errors, incorrect answers, destructive actions |

### Surfaces & Text

| Role | Token | Light | Dark |
|------|-------|-------|------|
| Surface Primary | `--surface-primary` | #ffffff | #141312 |
| Surface Secondary | `--surface-secondary` | #f9f8f7 | #242220 |
| Surface Tertiary | `--surface-tertiary` | #f0eee9 | #383530 |
| Text Primary | `--text-primary` | #242220 | #f9f8f7 |
| Text Secondary | `--text-secondary` | #6b6658 | #a8a392 |
| Text Tertiary | `--text-tertiary` | #a8a392 | #8a8474 |
| Border Default | `--border-default` | #e0ddd4 | #504c42 |

Dark mode is supported via `prefers-color-scheme: dark` media query and a `data-theme="dark"` attribute for manual toggle.

---

## 3. Typography

### Font Stack

| Role | Family | Fallback | Rationale |
|------|--------|----------|-----------|
| Headings | DM Serif Display | Georgia, serif | Elegant serif with cultural warmth |
| Body | Inter | system-ui, -apple-system, sans-serif | Highly legible at all sizes, excellent for UI |
| Icaro Lyrics | Noto Sans | Inter, sans-serif | Broad Unicode and diacritical support |
| Monospace | JetBrains Mono | SF Mono, Consolas | Timestamps, metadata, code |

### Type Scale

| Name | Size | Weight | Line Height | Use |
|------|------|--------|-------------|-----|
| Display | 3.75rem (60px) | 700 | 1.25 | Hero, splash |
| H1 | 2.25rem (36px) | 700 | 1.25 | Page titles |
| H2 | 1.875rem (30px) | 700 | 1.375 | Section headers |
| H3 | 1.5rem (24px) | 600 | 1.375 | Subsection headers |
| H4 | 1.25rem (20px) | 600 | 1.375 | Card titles |
| Body Large | 1.125rem (18px) | 400 | 1.625 | Introductory text |
| Body | 1rem (16px) | 400 | 1.5 | Default body text |
| Body Small | 0.875rem (14px) | 400 | 1.5 | Secondary content |
| Caption | 0.75rem (12px) | 500 | 1.5 | Metadata, labels |
| Icaro Text | 1.25rem (20px) | 400 | 1.8 | Icaro lyrics display |
| Icaro Translation | 1rem (16px) | 400 | 1.625 | Translation beneath lyrics |

### Icaro Lyric Display Rules

Icaro lyrics use the `icaro-text` style with wide letter spacing (`0.025em`) and generous line height (`1.8`) to support readability and diacritical marks. The currently active line uses a subtle highlight background (`--color-primary-subtle`). Upcoming lines use `--text-tertiary` color. Translations appear directly beneath each line in `icaro-translation` style.

---

## 4. Spacing

Built on a 4px base grid. All spacing tokens are multiples of 4px.

| Token | Value | Common Use |
|-------|-------|------------|
| `--space-1` | 4px | Inline gaps, icon padding |
| `--space-2` | 8px | Tight component padding |
| `--space-3` | 12px | Button internal padding |
| `--space-4` | 16px | Default card padding, input padding |
| `--space-6` | 24px | Section padding, card padding |
| `--space-8` | 32px | Component spacing |
| `--space-12` | 48px | Section margins |
| `--space-16` | 64px | Page section spacing |
| `--space-24` | 96px | Hero/feature spacing |

---

## 5. Border Radius

| Token | Value | Use |
|-------|-------|-----|
| `--radius-sm` | 4px | Small badges, tags |
| `--radius-md` | 8px | Buttons (small), inputs |
| `--radius-lg` | 12px | Cards, modals |
| `--radius-xl` | 16px | Feature cards, containers |
| `--radius-2xl` | 24px | Mobile phone frames |
| `--radius-full` | 9999px | Avatars, pills, dots |

---

## 6. Elevation (Shadows)

Shadows use warm-tinted rgba values derived from the neutral palette rather than pure black, creating a more natural feel.

| Token | Value | Use |
|-------|-------|-----|
| `--shadow-xs` | 0 1px 2px rgba(36,34,32,0.05) | Subtle depth |
| `--shadow-sm` | 0 1px 3px rgba(36,34,32,0.1) | Buttons, badges |
| `--shadow-md` | 0 4px 6px rgba(36,34,32,0.07) | Dropdowns |
| `--shadow-lg` | 0 10px 15px rgba(36,34,32,0.08) | Modals, popups |
| `--shadow-xl` | 0 20px 25px rgba(36,34,32,0.1) | Floating panels |
| `--shadow-card` | 0 2px 8px rgba(36,34,32,0.08) | Card resting state |
| `--shadow-card-hover` | 0 8px 24px rgba(36,34,32,0.12) | Card hover state |

---

## 7. Animation

| Token | Value | Use |
|-------|-------|-----|
| `--duration-fast` | 150ms | Button hover, color changes |
| `--duration-normal` | 250ms | Card transitions, fades |
| `--duration-slow` | 350ms | Modal open/close |
| `--duration-gentle` | 500ms | Progress bar fill |
| `--duration-card-flip` | 400ms | Flashcard flip |
| `--ease-default` | cubic-bezier(0.4, 0, 0.2, 1) | General transitions |
| `--ease-bounce` | cubic-bezier(0.34, 1.56, 0.64, 1) | Celebratory, playful |
| `--ease-spring` | cubic-bezier(0.175, 0.885, 0.32, 1.275) | Flashcard flip |

---

## 8. Layout & Grid

### Responsive Breakpoints

| Name | Width | Columns | Gutter | Margin |
|------|-------|---------|--------|--------|
| Mobile | < 640px | 4 | 16px | 16px |
| Tablet | 640–1024px | 8 | 24px | 32px |
| Desktop | 1024–1280px | 12 | 24px | 48px |
| Wide | > 1280px | 12 | 24px | auto (centered) |

### Content Widths

| Token | Value | Use |
|-------|-------|-----|
| `--max-w-content` | 720px | Reading/lesson content |
| `--max-w-wide` | 1024px | Library grid, flashcard decks |
| `--max-w-page` | 1280px | Full page max |

### Navigation

**Desktop**: Top navbar (64px height) with logo left, nav links center, avatar right. Optional left sidebar (280px) for lesson navigation, collapsible to 72px.

**Mobile**: Bottom tab bar (56px) with 4 tabs — Learn, Practice, Library, Profile. Active state uses primary color dot indicator beneath icon.

---

## 9. Component Specifications

### Buttons

| Property | Primary | Secondary | Ghost | Accent |
|----------|---------|-----------|-------|--------|
| Background | `--color-primary` | `--surface-secondary` | transparent | `--color-accent` |
| Text Color | white | `--color-earth-700` | `--text-secondary` | white |
| Border | none | 1.5px solid earth-300 | none | none |
| Radius | `--radius-md` | `--radius-md` | `--radius-md` | `--radius-md` |
| Min Height | 36px (sm), 40px (md), 48px (lg) | — | — | — |
| Min Touch Target | 44x44px on mobile | — | — | — |

### Form Inputs

Text inputs use a 1.5px border that transitions from `--border-default` to `--border-focus` (primary color) on focus with a 3px focus ring at 10% opacity. Error state uses `--color-error` border. Labels are 13px/500 weight above the input. Helper text is 12px in `--text-tertiary`.

### Cards

Resting state: `--shadow-card` with 1px `--border-default` border, `--radius-lg` corners. Hover: lifts 2px (`translateY(-2px)`) with `--shadow-card-hover`. Transition: 250ms ease. Padding: 24px default, adjustable.

### Audio Player

The audio player is the centerpiece of the learning experience. It consists of a waveform visualizer (thin 2-3px bars), play/pause button (40x40 circle, primary color), speed controls (0.5x / 0.75x / 1x / 1.5x pill buttons), and a time display in monospace. Below the player, a lyrics panel shows synchronized text with the current line highlighted.

### Flashcard

Cards use a Y-axis flip animation (400ms, spring easing). Front shows the Shipibo word in `icaro-text` style. Back shows the English translation with pronunciation guide. Below the card, four difficulty buttons (Again / Hard / Good / Easy) with color coding and next-review interval labels. Full card area is tappable.

### Progress Bars

8px height with `--radius-sm` corners. Background: `--surface-tertiary`. Fill: `--color-primary` (default) or any semantic color. Label and percentage displayed inline above the bar.

### Badges/Tags

Pill-shaped (`--radius-full`), 11px font, 600 weight. Five variants mapping to semantic colors: primary, secondary, accent, success, neutral. Use for lesson status, difficulty level, and content categorization.

---

## 10. Kené Pattern Library

Shipibo kené geometric patterns are used as a subtle cultural layer throughout the app. These are abstracted, respectful interpretations of traditional motifs — not reproductions of sacred designs. The full library is implemented in `kene-patterns.jsx` as reusable React/SVG components.

### Pattern Families

**Diamond Patterns (Quene Kené)** — Classic interlocking diamond motifs for hero backgrounds and feature sections.

| Component | Description | Default Cell Size |
|-----------|-------------|-------------------|
| `KeneDiamondGrid` | Foundational kené motif with interlocking diamonds and cross accents | 40px |
| `KeneDiamondLattice` | Denser woven variant with horizontal/vertical internal bars | 32px |
| `KeneStackedDiamonds` | Nested concentric diamonds creating depth and focus | 56px |

**River Line Patterns (Nete Kené)** — Flowing, serpentine paths for organic backgrounds and transitions.

| Component | Description | Default Cell Size |
|-----------|-------------|-------------------|
| `KeneRiverFlow` | Undulating parallel waves with rhythmic vertical marks | 48px |
| `KeneMazePath` | Right-angle meander pattern evoking ceremonial pathways | 36px |
| `KeneSpiralVine` | Organic spiraling curves paired in symmetry | 50px |

**Border Patterns (Cano Kené)** — Repeating linear patterns for section dividers, card frames, and navigation accents.

| Component | Description | Default Height |
|-----------|-------------|----------------|
| `KeneBorderZigzag` | Classic zigzag with diamond accents at peaks | 20px |
| `KeneBorderStep` | Geometric stepped meander band | 24px |
| `KeneBorderWave` | Smooth sinusoidal wave with dot accents | 20px |
| `KeneBorderCrossChain` | Linked cross-and-diamond chain motif | 18px |

### Utility Components

| Component | Description |
|-----------|-------------|
| `KeneBackground` | Wraps any area pattern as a positioned background layer. Accepts `pattern` prop: `"diamond"`, `"lattice"`, `"stacked"`, `"river"`, `"maze"`, `"spiral"` |
| `KeneDivider` | Section divider using any border variant. Accepts `variant` prop: `"zigzag"`, `"step"`, `"wave"`, `"cross"` |
| `KeneFramedCard` | Card component with a kené border accent at the top |

### Shared Props

All pattern components accept: `color` (hex string), `opacity` (0–1), `width`, `height`, and `style`. Area patterns also accept `cellSize` to control pattern density.

### Usage Guidelines

**Allowed uses**: Hero section backgrounds (5–8% opacity), section dividers as decorative borders, empty states, loading placeholders, achievement/celebration screens, onboarding illustrations.

**Not allowed**: Behind text-heavy content where it reduces readability, on interactive elements like buttons or inputs, as dense all-over patterns that compete with learning content, direct reproduction of sacred patterns.

### Color Variants

Any pattern can be rendered in any palette color. On dark backgrounds, use the lighter shade (e.g., `#d09e9e` for burgundy, `#c9b89e` for earth). On light backgrounds, use the primary shade at low opacity.

---

## 11. Iconography

Use Lucide Icons (or Phosphor Icons) in outlined style with 1.5px stroke weight. Sizes: 16px (inline), 20px (buttons), 24px (navigation), 32px (features), 48px (hero/empty states). Icons should feel lightweight and not compete with content.

---

## 12. Accessibility

All color combinations meet WCAG AA contrast requirements (4.5:1 for body text, 3:1 for large text). Focus rings use `--border-focus` with a 3px outline offset. Touch targets are minimum 44x44px on mobile. Audio player controls are keyboard-navigable. Flashcard flip works with both click/tap and keyboard (Space/Enter).

---

## Files Included

| File | Description |
|------|-------------|
| `design-tokens.json` | Complete token definitions in JSON format |
| `tokens.css` | CSS custom properties ready for implementation |
| `onanti-design-language.jsx` | Interactive visual reference (React component) |
| `kene-patterns.jsx` | Reusable React/SVG kené pattern component library |
| `kene-patterns.svg` | Static SVG reference showcasing all patterns |
| `onanti-design-language.pdf` | Visual reference PDF (9 pages) |
| `DESIGN-SPEC.md` | This document — the full specification |
