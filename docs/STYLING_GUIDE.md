# VPad Styling Guide

Last updated: 2026-03-10

This guide defines the current visual system and interaction styling for `apps/host-web`.

## 1. Visual Direction

- Style intent: minimal, dark, clean, utility-first UI.
- Typography: `Inter Tight` (with `Inter` fallback).
- Look and feel: muted neutral palette, soft contrast, subtle depth.

Main stylesheet: `apps/host-web/src/styles/global.css`

## 2. Color Tokens (Source of Truth)

Use the existing CSS variables in `:root`:

- `--c1: #d1d7d7`
- `--c2: #afa9b4`
- `--c3: #d7d1d1`
- `--c4: #aaafaf`
- `--c5: #424341`
- `--bg: #1e1f1f`
- `--bg-soft: #282928`
- `--panel: #2e2f2d`
- `--line: rgba(209, 215, 215, 0.22)`
- `--text: #d7d1d1`
- `--muted: #afa9b4`
- `--primary: #d1d7d7`
- `--primary-text: #424341`

Rule:
- Reuse tokens first.
- Avoid introducing ad-hoc colors unless there is a clear state need.

## 3. Typography

- Base family: `"Inter Tight", "Inter", "Segoe UI", sans-serif`
- Body text uses `--text`.
- Helper/secondary text uses `.small` with `--muted`.
- Keep labels short and explicit.

## 4. Layout Primitives

Use existing utility classes:

- `.stack`: vertical layout with standard gap.
- `.row`: horizontal flex with wrap + center alignment.
- `.card`: default panel surface.
- `.settings-grid`, `.vts-form-grid`, `.grid`, `.remote-grid`: preferred grid primitives.

Avoid:
- Creating one-off spacing systems when existing primitives can be reused.

## 5. Buttons and Interactions

Current standard:

1. All interactive controls must show pointer cursor.
2. Disabled controls must show `not-allowed`.
3. Primary action uses `button.primary`.
4. Destructive action uses `button.warn` or `.pad-menu-item.danger`.
5. Disabled buttons must be visibly dimmed.

Do not remove:
- Global cursor rules for clickable elements.
- Disabled state styling.

## 6. Soundboard Pad Pattern

Pad classes:

- Base: `.pad`
- Enabled state: `.pad-enabled`
- Disabled state: `.pad-disabled`
- Disabled text: `.pad-label-disabled`, `.pad-meta-disabled`

Interaction rules:

1. Hover lift is applied at `.pad-item` level so the pad and `⋯` tab move together.
2. Disabled pads are non-triggerable (`disabled` attribute) and visually muted.
3. Per-pad action menu trigger is top-right corner tab (`.pad-actions-trigger`).
4. Pad action menu opens by click state (`.pad-actions.open`), not hover.

## 7. Form and Validation Pattern

Use:

- `.field-invalid` for invalid input border/highlight.
- `.validation-text` for inline errors.
- Explicit required markers in labels (`*`) when field is required.
- Footer-level save-state hint when submit is disabled.

Rule:
- Never disable a primary save button without showing why.

## 8. Remote UI Pattern

Remote route design goals:

1. Dense, touch-friendly pad grid.
2. Strong connection status visibility.
3. Minimal non-essential controls on phone.

Key classes:

- `.remote-root`, `.remote-panel`, `.remote-status`, `.remote-pad`

## 9. Motion and Effects

- Keep transitions short and purposeful.
- Current defaults are around 100ms-240ms.
- Use subtle elevation changes (`box-shadow`) and small translation.
- Avoid heavy or distracting animations.

## 10. Responsive Rules

- Desktop shell collapses sidebar at small widths (`max-width: 900px`).
- Remote grid increases columns on wider viewports (`min-width: 768px`).
- Any new complex component must be checked on both desktop and phone widths.

## 11. Accessibility and UX Checks

Before merging UI changes:

1. Pointer state exists for clickables.
2. Focus states remain usable (do not remove keyboard accessibility).
3. Disabled and active states are clearly distinguishable.
4. Error states provide immediate feedback text.
5. Tap targets are comfortable on mobile.

## 12. If You Need to Evolve the Theme

1. Update tokens in `:root` first.
2. Refactor component classes to consume tokens.
3. Keep Host, Remote, and Settings visually consistent.
4. Document the new decisions in this file.

