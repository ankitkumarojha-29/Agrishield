---
name: AgriShield
colors:
  surface: '#f9f9f7'
  surface-dim: '#dadad8'
  surface-bright: '#f9f9f7'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f4f2'
  surface-container: '#eeeeec'
  surface-container-high: '#e8e8e6'
  surface-container-highest: '#e2e3e1'
  on-surface: '#1a1c1b'
  on-surface-variant: '#3f493f'
  inverse-surface: '#2f3130'
  inverse-on-surface: '#f1f1ef'
  outline: '#6f7a6e'
  outline-variant: '#becabc'
  surface-tint: '#026d32'
  primary: '#00602b'
  on-primary: '#ffffff'
  primary-container: '#1b7a3d'
  on-primary-container: '#abffb8'
  inverse-primary: '#80da92'
  secondary: '#964900'
  on-secondary: '#ffffff'
  secondary-container: '#ff8927'
  on-secondary-container: '#642f00'
  tertiary: '#39593f'
  on-tertiary: '#ffffff'
  tertiary-container: '#517256'
  on-tertiary-container: '#d0f5d3'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#9bf7ac'
  primary-fixed-dim: '#80da92'
  on-primary-fixed: '#00210a'
  on-primary-fixed-variant: '#005224'
  secondary-fixed: '#ffdcc6'
  secondary-fixed-dim: '#ffb786'
  on-secondary-fixed: '#311400'
  on-secondary-fixed-variant: '#723600'
  tertiary-fixed: '#c7ecca'
  tertiary-fixed-dim: '#abd0af'
  on-tertiary-fixed: '#02210c'
  on-tertiary-fixed-variant: '#2e4e35'
  background: '#f9f9f7'
  on-background: '#1a1c1b'
  surface-variant: '#e2e3e1'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-margin: 16px
  gutter: 16px
  tap-target-min: 48px
  card-padding: 20px
---

## Brand & Style
The design system is rooted in the concepts of **growth, protection, and reliability**. It is tailored specifically for Indian farmers, ensuring the interface feels approachable and familiar while maintaining the precision of an AI-powered tool.

The style is a blend of **Modern Corporate and Tactile** design. It prioritizes legibility in high-glare outdoor environments and provides a sense of physical stability through soft, rounded surfaces. The interface should evoke a sense of calm and competence, reassuring users that their livelihoods are protected by sophisticated yet simple technology.

Key pillars:
- **Trustworthy:** Solid colors and clear data visualization.
- **Agricultural:** A palette inspired by fertile earth and healthy crops.
- **Inclusive:** Large hit areas and clear labeling to accommodate varying levels of digital literacy and multi-language support.

## Colors
The color strategy focuses on high contrast and natural tones. The **Deep Green** (Primary) represents the core of agriculture and stability. The **Warm Orange** (Secondary) is used sparingly for calls-to-action and critical alerts, providing a high-visibility contrast against the greens. 

The background uses a warm **Off-White** to reduce eye strain compared to pure white, especially in sunlight. Text is set in a near-black green to maintain a softer but highly legible contrast ratio.

## Typography
This design system utilizes **Inter** for its exceptional legibility and neutral character, which allows the brand's colors and shapes to take center stage. 

For multi-language support (Hindi/English), the line heights are intentionally generous to accommodate the vertical height of Devanagari script without clipping. Headings are bold and concise to facilitate quick scanning while working in the field. Body text is sized slightly larger than standard (16px-18px) to ensure accessibility for older demographics.

## Layout & Spacing
The layout follows a **fluid grid** model optimized for mobile-first usage. 
- **Mobile:** 4-column grid with 16px margins. 
- **Tablet/Desktop:** 12-column grid with 24px margins and a max-content width of 1200px.

A strict 8px spatial rhythm is used for all internal spacing. To ensure ease of use for farmers who may be outdoors or wearing gloves, a minimum tap target of 48px is enforced for all interactive elements. Content is grouped into logical "cards" to separate different types of information (e.g., Weather, Policy Status, Farm Health).

## Elevation & Depth
The design system uses **Tonal Layers** and **Subtle Shadows** to create a sense of hierarchy.
- **Base Layer:** The off-white background (#F9F9F7).
- **Surface Layer:** White cards with a very soft, diffused shadow (0px 4px 12px rgba(0,0,0,0.05)).
- **Interactive Layer:** Elements like primary buttons or active chips use a slightly deeper shadow on hover/press to provide tactile feedback.

Avoid heavy blacks in shadows; instead, use a slight tint of the primary deep green (e.g., rgba(27, 122, 61, 0.08)) to maintain a cohesive, organic feel.

## Shapes
The shape language is **Rounded and Organic**, echoing the curves found in nature and the brand's ladybug motif. 
- Standard components (buttons, inputs) use a **0.5rem (8px)** radius.
- Container cards use **rounded-lg (16px)** or **rounded-xl (24px)** to emphasize protection and friendliness.
- Icons should always feature rounded caps and corners to match the UI's soft aesthetic.

## Components

### Buttons
Primary buttons are solid Deep Green (#1B7A3D) with white text, featuring 16px vertical padding to exceed the 48px tap target requirement. Secondary buttons use a Deep Green outline with a subtle 1px stroke.

### Input Fields
Inputs use a white background with a light grey border. Upon focus, the border thickens to 2px in Deep Green. Labels are always visible above the field (not floating) to maintain clarity in multi-language contexts.

### Cards
Cards are the primary organizational unit. They feature 20px internal padding, 16px corner radius, and a subtle shadow. When used for PMFBY policy details, use a colored top-border (Deep Green for active, Orange for pending) to indicate status at a glance.

### Chips & Tags
Used for farm categories or insurance status. These use highly rounded (pill-shaped) backgrounds with low-opacity tints of the semantic colors (e.g., light green background with dark green text).

### Multi-language Toggles
A prominent, easy-to-reach toggle at the top of the interface or within the sidebar to switch between Hindi and English instantly, ensuring the UI remains accessible to all users.

### Status Indicators
Large, high-contrast icons for "Protected," "Action Required," or "Claim Processed" to provide immediate visual feedback without requiring heavy reading.