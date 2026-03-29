# Design System Specification: High-Performance Editorial

## 1. Overview & Creative North Star
**Creative North Star: The Precision Curator**
This design system rejects the "cluttered marketplace" aesthetic in favor of a high-performance, editorial utility. It is designed for users who value speed, data density, and clarity over decorative imagery. By utilizing **intentional asymmetry** and **tonal layering**, we move away from the rigid "boxed" look of standard e-commerce. The goal is to make 150+ products feel like a curated, breathable list rather than a spreadsheet, using typography as the primary structural element.

---

## 2. Colors & Surface Logic
We move beyond flat UI by using a sophisticated spectrum of blues and functional ambers. Color is not a decoration; it is a status indicator and a navigational anchor.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to section off content. Traditional "dividers" create visual noise that slows down data processing. Instead, boundaries must be defined through:
*   **Background Shifts:** Transitioning from `surface` (#f9f9ff) to `surface-container-low` (#f2f3fd).
*   **Tonal Nesting:** Placing a `surface-container-lowest` (#ffffff) card against a `surface-container` (#ecedf7) background.

### Surface Hierarchy & Glassmorphism
*   **Layering:** Use the `surface-container` tiers (Lowest to Highest) to create "nested" depth. High-priority data (like a checkout summary) should sit on `surface-bright`, while background utility areas sit on `surface-dim`.
*   **The Glass Rule:** For floating elements (modals, dropdowns, or "Quick View" panels), use semi-transparent `surface` colors with a 12px-20px backdrop-blur. This allows the product data to "bleed" through, maintaining the user’s context.
*   **Signature Textures:** For primary CTAs, do not use flat hex codes. Apply a subtle linear gradient from `primary` (#005bbf) to `primary_container` (#1a73e8) at a 135-degree angle to give the action "weight" and professional polish.

---

## 3. Typography: The Structural Backbone
Typography is the primary vehicle for brand identity. We utilize **Inter** for its mathematical precision and exceptional readability at small scales.

*   **Display & Headline (The Editorial Hook):** Use `display-md` and `headline-lg` with tight letter-spacing (-0.02em). These are for category headers and significant data milestones.
*   **Title & Body (The Utility):** `title-md` (1.125rem) is reserved for product names. `body-md` (0.875rem) handles the bulk of product specifications.
*   **Labels (The Metadata):** `label-sm` (0.6875rem) should be used for SKU numbers, expiry dates, and technical attributes. 

**Hierarchy Principle:** Contrast is achieved through scale and weight, not just color. A `headline-sm` in `on_surface` paired with a `label-md` in `on_surface_variant` creates an authoritative, organized information architecture.

---

## 4. Elevation & Depth
We eschew traditional "box shadows" in favor of **Tonal Layering** to convey importance.

*   **The Layering Principle:** Place a `surface-container-lowest` card on a `surface-container-low` section to create a "soft lift." This mimics the way fine paper sits on a desk.
*   **Ambient Shadows:** When a float is required (e.g., a "sticky" cart), use a shadow with a 40px blur and 6% opacity. The shadow color must be a tinted version of `on_surface` (#191c23), never pure black.
*   **The "Ghost Border" Fallback:** If a border is essential for accessibility (e.g., input fields), use the `outline_variant` token at 20% opacity. **100% opaque borders are strictly forbidden.**

---

## 5. Components & Data Patterns

### Buttons
*   **Primary:** Gradient of `primary` to `primary_container`. Roundedness: `md` (0.375rem). No border.
*   **Secondary:** Ghost style. Transparent background with `on_surface` text. On hover, transition to `surface-container-high`.
*   **Tertiary:** `label-md` uppercase text with a subtle `primary` underline.

### Cards & Lists (The Core Grid)
*   **The Forbid Rule:** No divider lines between products.
*   **Implementation:** Use the Spacing Scale `8` (1.75rem) to separate items. Distinguish product rows by alternating background tones (`surface` and `surface-container-low`) or by using a `surface-container-highest` highlight on hover.

### Inputs & Fields
*   **The Functional State:** Use `outline` (#727785) for the inactive state. Upon focus, the label should shift to `primary` (#005bbf) with a 2px `surface-tint` glow.
*   **Data Density:** Use "Compact" variants for text inputs in 150+ product lists, utilizing `body-sm` for user input.

### Status Indicators (Expiry Logic)
*   **Nearing Expiry:** Use a `secondary_container` (#febf0d) chip with `on_secondary_container` (#6d5000) text.
*   **Expired:** Use a `tertiary_container` (#df3429) background. This high-contrast red signals immediate action without breaking the "clean" aesthetic.

---

## 6. Do’s and Don’ts

### Do
*   **DO** use white space as a structural element. If a section feels cluttered, increase the spacing to `12` (2.75rem) instead of adding a line.
*   **DO** use `full` (9999px) roundedness for chips and status indicators to contrast against the `md` (0.375rem) roundedness of functional cards.
*   **DO** prioritize typography. If the information isn't clear in black and white, color won't fix it.

### Don't
*   **DON’T** use "Drop Shadows" for standard cards. Let the background color shifts do the work.
*   **DON’T** use high-contrast borders. They fragment the user's eye-line and increase cognitive load.
*   **DON’T** scale imagery to fill space. This is a utility-first system; if an image isn't available, use a beautifully typeset `surface-container` placeholder with the product initials.