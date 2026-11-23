---
name: frontend-design-impeccable
description: Enforces distinct art direction, typographic scale, and design thesis preservation. Use this skill whenever planning, architecting, or creating frontend interfaces, web apps, components, landing pages, or dashboards to avoid generic templates and ensure strict CSS custom property design systems before writing JSX/HTML.
---

# Frontend Design: Impeccable (Art Direction & Design Thesis)

Enforces distinct aesthetic identity and structural design discipline before any UI code is written.

## Core Directives

### 1. Establish the Design Thesis First
Never jump directly into generic Tailwind or unprincipled utility classes. Before writing JSX or layout templates, define:
- **Visual Identity / Art Direction**: Editorial, Swiss brutalism, technical instrument, high-density minimal, or tactile luxury. Pick an unapologetic tone.
- **Typographic Scale**: Define explicit font-size, line-height, letter-spacing, and weight pairings using a strict mathematical ratio (e.g. 1.25 Major Third or 1.333 Perfect Fourth).
- **CSS Custom Properties**: Always map colors, spacing tokens, and border radii to semantic CSS variables rather than scattered hardcoded hex codes.

### 2. Eradicate Generic Dashboard Tropes
- **No cookie-cutter card grids**: Stop wrapping everything in identical rounded cards with subtle drop shadows.
- **Deliberate Whitespace**: Balance rhythm with purposeful density. Avoid loose, airy, empty space that makes interfaces look like mockups rather than functional tools.
- **Intentional Contrast**: Use background value hierarchies (base, surface, elevated) with precise border contrasts (`1px solid var(--border)`).
- **Surface Geometry**: Enforce sharp or intentional radius standards consistent across buttons, inputs, pills, and windows.

## Implementation Checklist
1. Declare system CSS variables (`--bg`, `--surface`, `--text-primary`, `--text-secondary`, `--border`, `--radius`).
2. Establish rhythm (`font-feature-settings: "cv02", "cv03", "cv04", "cv11"` or appropriate tabular figure rules).
3. Ensure crisp contrast ratios (WCAG AAA for body text, AA for secondary accents).
