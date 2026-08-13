---
name: Luminous Minimalist
colors:
  surface: '#f8f9ff'
  surface-dim: '#ccdbf4'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e6eeff'
  surface-container-high: '#dde9ff'
  surface-container-highest: '#d5e3fd'
  on-surface: '#0d1c2f'
  on-surface-variant: '#514535'
  inverse-surface: '#233144'
  inverse-on-surface: '#ebf1ff'
  outline: '#847563'
  outline-variant: '#d6c4af'
  surface-tint: '#825500'
  primary: '#825500'
  on-primary: '#ffffff'
  primary-container: '#fbb03b'
  on-primary-container: '#6c4500'
  inverse-primary: '#ffb953'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#5e5e5e'
  on-tertiary: '#ffffff'
  tertiary-container: '#bfbfbe'
  on-tertiary-container: '#4d4e4d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffddb4'
  primary-fixed-dim: '#ffb953'
  on-primary-fixed: '#291800'
  on-primary-fixed-variant: '#633f00'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#e3e2e1'
  tertiary-fixed-dim: '#c7c6c5'
  on-tertiary-fixed: '#1a1c1c'
  on-tertiary-fixed-variant: '#464746'
  background: '#f8f9ff'
  on-background: '#0d1c2f'
  surface-variant: '#d5e3fd'
typography:
  headline-xl:
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
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  headline-xl-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 36px
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  unit: 8px
  container-max: 1200px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style
The design system is built around the concept of "Illumination." It serves as a quiet, focused sanctuary for creative expression, mimicking the experience of writing by a single light source in a calm environment. The personality is warm, intentional, and inviting, avoiding the coldness often associated with productivity tools.

The style is a refined **Minimalism** blended with **Soft-UI** elements. It prioritizes generous white space to allow thoughts to breathe. Depth is achieved through tonal layering rather than aggressive shadows, creating a UI that feels like physical stationery illuminated by a soft glow.

## Colors
The palette is centered on the contrast between the "Glow" and the "Atmosphere."

- **Primary (Glow):** #fbb03b (Amber). Used for calls to action, focus states, and key brand moments. It represents the flame.
- **Secondary (Atmosphere):** #0f172a (Midnight). Provides deep contrast and structure.
- **Tertiary (Surface):** #fdfcfb (Parchment). A soft off-white that reduces eye strain compared to pure white.
- **Neutral:** #334155 (Slate). Used for secondary text, borders, and UI scaffolding.

In Dark Mode, the primary amber should be used sparingly to maintain the "focus" metaphor—like a lantern in the woods.

## Typography
Hanken Grotesk is the sole typeface, chosen for its high legibility and contemporary humanist geometry. 

- **Headlines:** Use tighter letter-spacing and heavier weights to create a strong visual anchor.
- **Body:** Use a slightly increased line-height (1.5x - 1.6x) to facilitate a comfortable, long-form journaling experience.
- **Labels:** Use Medium or SemiBold weights with slight tracking (0.02em - 0.05em) for clarity at small sizes.

In Dark Mode, reduce the font-weight of body text by one increment (e.g., from 400 to 300) if needed to prevent "glow" bleeding on high-resolution screens.

## Layout & Spacing
This design system utilizes a **Fluid Grid** based on an 8px square rhythm. 

- **Desktop:** 12-column grid with 24px gutters. Center the main journaling area (max-width 720px) to maintain focus and prevent horizontal eye fatigue.
- **Mobile:** 4-column grid with 16px margins. 
- **Rhythm:** Use multiples of 8px for all padding and margins. Vertical rhythm is critical; spacing between journal entries should be generous (48px or 64px) to emphasize the passage of time and distinct thoughts.

## Elevation & Depth
The system avoids heavy, muddy shadows. Depth is communicated through:

1.  **Tonal Layers:** In Light Mode, the base is #FDFCFB. Elevated elements (like cards) use a pure white background with a very subtle 1px border (#E2E8F0).
2.  **Inner Glow:** For active states or "focused" inputs, use a soft inner glow using the primary amber at 10% opacity.
3.  **Dark Mode Depth:** Use lighter shades of navy (e.g., #1E293B) to represent higher surfaces.
4.  **Shadows:** When necessary, use a "Soft Ambient" shadow: `0px 4px 20px rgba(15, 23, 42, 0.04)` in Light Mode and `0px 4px 20px rgba(0, 0, 0, 0.25)` in Dark Mode.

## Shapes
Shapes are friendly, approachable, and highly organic. The standard corner radius is **16px** (Level 3).

- **Standard Elements:** Buttons, input fields, and cards use the 16px radius to feel soft and welcoming.
- **Selection States:** Use a 8px radius for smaller indicators or nested chips to maintain the rounded language at scale.
- **Interactive Icons:** Pill-shaped or circular containers are used throughout to distinguish interactive elements from content containers.

## Components
- **Buttons:** Primary buttons are pill-shaped and solid Amber (#FBB03B) with charcoal text. Secondary buttons are ghost-style with a 1px border and a matching 16px radius.
- **Chips/Tags:** Used for categorization (e.g., "Gratitude," "Idea"). These should have a subtle background tint (5% of Primary) and a pill-shaped (16px) radius.
- **Input Fields:** Large, underline-only or minimal border style to mimic a real notebook. The cursor (caret) should be the primary amber color.
- **Cards:** Used for journal previews. They should use a subtle 1px border (#E2E8F0 in light, #334155 in dark) and a 16px corner radius instead of a shadow.
- **The "Lantern" Progress Bar:** A thin, glowing amber line at the top of the editor that fills as the user reaches their daily word count goal.
- **Focus Mode:** A component state that fades all UI elements except the active text line to 20% opacity.