---
name: Lantern Design System
colors:
  surface: '#f9f9fb'
  surface-dim: '#d9dadc'
  surface-bright: '#f9f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f5'
  surface-container: '#eeeef0'
  surface-container-high: '#e8e8ea'
  surface-container-highest: '#e2e2e4'
  on-surface: '#1a1c1d'
  on-surface-variant: '#514535'
  inverse-surface: '#2f3132'
  inverse-on-surface: '#f0f0f2'
  outline: '#847563'
  outline-variant: '#d6c4af'
  surface-tint: '#825500'
  primary: '#825500'
  on-primary: '#ffffff'
  primary-container: '#fbb03b'
  on-primary-container: '#6c4500'
  inverse-primary: '#ffb953'
  secondary: '#005cba'
  on-secondary: '#ffffff'
  secondary-container: '#5095fe'
  on-secondary-container: '#002d61'
  tertiary: '#006687'
  on-tertiary: '#ffffff'
  tertiary-container: '#51cbff'
  on-tertiary-container: '#00546f'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffddb4'
  primary-fixed-dim: '#ffb953'
  on-primary-fixed: '#291800'
  on-primary-fixed-variant: '#633f00'
  secondary-fixed: '#d7e3ff'
  secondary-fixed-dim: '#aac7ff'
  on-secondary-fixed: '#001b3e'
  on-secondary-fixed-variant: '#00458e'
  tertiary-fixed: '#c0e8ff'
  tertiary-fixed-dim: '#71d2ff'
  on-tertiary-fixed: '#001e2b'
  on-tertiary-fixed-variant: '#004d66'
  background: '#f9f9fb'
  on-background: '#1a1c1d'
  surface-variant: '#e2e2e4'
  lantern-glow: '#FBB03B'
  ink-black: '#1D1D1F'
  paper-white: '#FFFFFF'
  system-blue: '#0066CC'
typography:
  display:
    fontFamily: Hanken Grotesk
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 34px
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 30px
  body-lg:
    fontFamily: Source Sans 3
    fontSize: 19px
    fontWeight: '400'
    lineHeight: 32px
  body-md:
    fontFamily: Source Sans 3
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 26px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  margin-mobile: 20px
  margin-desktop: 40px
  gutter: 16px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
  touch-target: 44px
---

## Brand & Style

The design system for this creator-focused diary app is built on the pillars of **Mindful Expression** and **Quiet Sophistication**. It targets creators who require a focused, distraction-free environment to archive their thoughts. The brand personality is observant, calm, and premium, evoking the feeling of a high-quality physical journal illuminated by soft light.

The visual style is **Refined Minimalism**. It avoids the "heavy" container-based layouts common in modern SaaS, opting instead for a "content-first" approach inspired by high-end editorial design and the Apple Human Interface Guidelines. The interface relies on generous whitespace, precise typography hierarchy, and a restrained color palette to guide the user’s eye without causing cognitive fatigue.

## Colors

The palette is intentionally limited to maintain a stress-free environment. 

- **Primary (Lantern Glow):** A warm, amber-gold used sparingly for key actions, progress indicators, and focal points. It represents the "spark" of an idea.
- **Secondary (System Blue):** Reserved exclusively for interactive text links and standard platform affordances to maintain familiarity with iOS patterns.
- **Neutral (System Gray):** A range of off-whites and soft grays derived from `#F5F5F7` used for subtle background shifts and dividers.
- **Typography:** We use `#1D1D1F` (Ink Black) instead of pure black to reduce visual vibration and improve long-form reading comfort.

## Typography

Typography is the core of this design system. We avoid "AI-standard" looks by pairing **Hanken Grotesk** for expressive, sharp headlines with **Source Sans 3** for highly legible, utilitarian body text.

- **Scale:** All type follows a strict vertical rhythm. 
- **Body Text:** Designed for "The Great Read." 19px is the default for diary entries to ensure a comfortable distance from the screen.
- **Hierarchy:** Use weight and size rather than color to distinguish levels. Headlines should feel grounded and authoritative.
- **Legibility:** Line heights are slightly more generous than standard (1.5x - 1.6x for body) to provide "air" between thoughts.

## Layout & Spacing

The layout philosophy follows a **Fixed-Fluid Hybrid** model inspired by Apple HIG. Content is centered with a maximum readable width (approx. 680px for text) to prevent line lengths from becoming too long on wide screens.

- **Grid:** A 12-column grid is used for desktop, but the "mental model" is a single centered column for the diary experience.
- **Margins:** 20px safe-area margins on mobile to ensure content doesn't feel cramped against the bezel.
- **Touch Targets:** A strict adherence to the 44x44pt minimum for all interactive elements.
- **Rhythm:** Spacing follows a 4px/8px base unit. Use `stack-lg` (32px) to separate distinct sections or "days" in the diary timeline.

## Elevation & Depth

This design system minimizes the use of "physical" depth to keep the interface feeling light and digital-native.

- **Tonal Layers:** Depth is primarily conveyed through subtle shifts in background color (e.g., a `#FFFFFF` surface on a `#F5F5F7` background).
- **Soft Shadows:** When a shadow is necessary (e.g., a floating action button or a modal), use a "Natural Bloom" shadow: `0 4px 12px rgba(0, 0, 0, 0.05)`. It should be barely perceptible.
- **Subtle Dividers:** Use 1px borders in `#E5E5E7` instead of shadows to separate list items. Dividers should often have horizontal insets to feel "tucked in" rather than spanning the full width.

## Shapes

The shape language is **Softly Structured**. We use a 10px - 12px corner radius for most interactive elements to strike a balance between professional precision and organic comfort.

- **Standard Elements:** Buttons and input fields use a `0.5rem` (8px) radius.
- **Surface Elements:** Large focus areas or "card-like" wrappers use `1rem` (16px) to feel more protective of the content within.
- **Icons:** Should follow a medium stroke weight (approx 1.5pt - 2pt) with rounded caps to match the UI's softness.

## Components

- **Buttons:** Primary buttons use the `lantern-glow` background with `ink-black` text for high contrast. Secondary buttons are "ghost" style with a 1px `neutral` border.
- **Diary Entry List:** Avoid cards. Use a vertical list with a `stack-lg` gap, using only a light 1px divider between entries. Focus on the headline and a 2-line snippet.
- **Inputs:** Clean, bottom-border only or very light gray field backgrounds. No heavy outlines. Focus states are indicated by the `lantern-glow` color as a 2px bottom accent.
- **Chips/Tags:** Used for categorization. These should be low-impact, using a light gray fill and small `label-sm` typography.
- **Floating Action Button (FAB):** A signature circular button for "New Entry," utilizing a soft shadow and the primary accent color to stand out as the sole high-elevation element.