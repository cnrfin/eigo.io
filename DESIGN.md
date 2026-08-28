# eigo.io — DESIGN.md

A British online English school for Japanese learners. Founded 2021, UK-based, one-to-one lessons plus self-study courses, pronunciation training and mock exams. The interface is bilingual Japanese and English throughout.

---

## 1. Visual Theme & Atmosphere

Calm, warm and quietly premium. This is a small independent school, not a corporate platform, and the interface should feel like a considered product made by one person who cares, rather than an enterprise dashboard.

**Dark is the default.** The canvas is a near-black `#0a0a0f` with teal accents. Light mode is an override, not the primary. Design dark first and derive light from it. This is deliberate and is the single most commonly reversed assumption.

Density is generous. Small type, lots of air, wide margins. The dashboard is predominantly 13 to 16px text with substantial spacing rather than large type packed tightly. Nothing shouts.

Surfaces are soft and rounded, always squircles rather than plain rounded rectangles. Motion is present but restrained: gentle entrances, a small press response, no bounce or spring overshoot except on one celebratory element.

The mood words are: warm, unhurried, precise, tactile. Avoid: corporate, clinical, playful, gamified, high-contrast.

Because the audience is Japanese and the product teaches English, English text is used deliberately as a stylistic signal in places, including headlines on Japanese pages. English reads as fashionable and signals a real English environment rather than a typical Japanese 英会話 school.

---

## 2. Color Palette & Roles

Dark is `:root`, light is the override. Every light surface carries a slight warm tint (R minus B of roughly +2 to +6). **If a light colour has more blue than red, it is wrong.** The palette was deliberately neutralised away from an earlier blue-violet grey ramp.

### Core

| Role | Variable | Dark | Light |
|---|---|---|---|
| Page background | `--bg` | `#0a0a0f` | `#f7f6f5` |
| Card / panel | `--card`, `--panel` | `#16161d` | `#ffffff` |
| Secondary surface | `--surface` | `#16161d` | `#f0efed` |
| Surface hover | `--surface-hover` | `#2a2a38` | `#dfe0db` |
| Surface alt | `--surface-alt` | `#2a2a36` | `#d2d3cc` |
| Inset (inputs, wells) | `--inset` | `#20202a` | `#f0efed` |
| Inset on cards | `--card-inset` | `#20202a` | `#f3f3f3` |
| Modal scrim | `--overlay` | `rgba(0,0,0,0.85)` | `rgba(247,246,245,0.93)` |

Note the light scrim is a near-opaque **white-out**, not a dim. Light modals suppress the page by washing it out.

Cards are **pure white** in light mode against a warm off-white page. That contrast is what carries the layout, because light mode has no card borders.

### Text

| Role | Variable | Dark | Light |
|---|---|---|---|
| Primary | `--text` | `#e8e8ed` | `#151414` |
| Secondary | `--text-secondary` | `#9d9daa` | `#515155` |
| Muted | `--text-muted` | `#6b6b7a` | `#707075` |
| Subtle | `--text-subtle` | `#4a4a58` | `#9fa0a2` |
| Disabled | `--text-disabled` | `#353540` | `#c9c9cb` |
| On accent / selected | `--selected-text` | `#0a0a0f` | `#f7f6f5` |
| Selected fill | `--selected-bg` | `#e8e8ed` | `#3a3a3e` |

`--selected-text` is the text colour on an accent fill. In light mode that is `#f7f6f5`, **not pure white**.

### Accent and semantic

| Role | Variable | Dark | Light |
|---|---|---|---|
| Accent | `--accent` | `#00c2b8` | `#00a89f` |
| Accent hover | `--accent-hover` | `#2ed8d0` | `#008f88` |
| Accent light | `--accent-light` | `#5eeae4` | `#5eeae4` |
| Accent tint | `--accent-bg` | `#003d3a` | `#d4f6f4` |
| Danger | `--danger` | `#f06060` | `#e55050` |
| Warning | `--warning` | `#f0b040` | `#e0a030` |
| Success | `--success` | `#00c2b8` | `#00a89f` |

Success and accent are the same teal. There is no separate green.

### Lines

| Role | Variable | Dark | Light |
|---|---|---|---|
| Card rim | `--hairline` | `rgba(255,255,255,0.08)` | **`transparent`** |
| Control border on cards | `--edge` | `rgba(255,255,255,0.08)` | `rgba(0,0,0,0.08)` |
| List separator | `--divider` | `rgba(255,255,255,0.08)` | `rgba(0,0,0,0.06)` |
| Solid outline | `--border` | `#2a2a36` | `#d6d6d2` |
| Item hover | `--item-hover` | `rgba(255,255,255,0.06)` | `rgba(0,0,0,0.04)` |
| Item pressed | `--item-active` | `rgba(255,255,255,0.10)` | `rgba(0,0,0,0.07)` |

### Brand accents (identical in both themes)

Used for category identity on marketing surfaces: pronunciation `#00a89f`, level check `#e85d8a`, IELTS `#f0992e`, speech bubble `#fae1d8` with ink `#151414`.

### Category chips (background / foreground)

greeting `#0e2b27`/`#4fd8c9` · `#d7f2ef`/`#0a857c`
phrase `#16243d`/`#7ba9e8` · `#e2ecfb`/`#3567b6`
feeling `#35191f`/`#e88aa8` · `#fbe1ea`/`#bd4a70`
business `#26262b`/`#b6b6bc` · `#ecebe8`/`#6b6b70`
adjective `#241c38`/`#b79ae8` · `#ece4fb`/`#7358bd`
verb `#2e2410`/`#d8b25f` · `#fbeed6`/`#a9741f`
travel `#13281a`/`#6bd88f` · `#dcf3e2`/`#2c9350`

---

## 3. Typography Rules

**Fonts.** Outfit for Latin, Noto Sans JP for Japanese. Both are on Google Fonts, so no substitution is needed. On Apple platforms Hiragino Sans is preferred over Noto Sans JP for Japanese.

Mixed strings must keep Latin glyphs in Outfit and let only kana and kanji fall to the Japanese face, so brand text like `eigo.io は…` stays on brand. Order the stack Outfit first, Japanese face second.

Weights: 400, 500, 600, 700, 800. Never 300 or 900.

**Japanese and English are different type systems.** Branch on locale:

| Property | English | Japanese |
|---|---|---|
| Heading weight | 500 | 600 |
| Letter spacing | `-0.02em` | `-0.01em` |
| Body line height | 1.7 | 1.85 |
| Heading line height | 1.12 | 1.3 |

Japanese needs more weight and more air at the same optical size, because kanji at Latin weight looks lighter and denser.

**Type scale**, in px:

| Role | Size | Weight |
|---|---|---|
| Hero display | 34 to 72, fluid | 500 en / 600 ja |
| Section heading | 30 to 52, fluid | 500 en / 600 ja |
| Sub-heading | 23 to 36, fluid | 500 en / 600 ja |
| Screen title | 28 | 600 |
| Lead paragraph | 15 to 20, fluid | 400 |
| Body | 15 to 19, fluid | 400 |
| UI default | 16 | 400 / 500 |
| Secondary / label | 13 to 15 | 500 |
| Caption / chip | 11 to 12 | 500 / 600 |

**Japanese punctuation: apply `palt` to headings only.** `palt` switches Japanese glyphs to proportional metrics, which halves full-width 。 and 、 from 1.0em to 0.5em. At display sizes that tightening is correct. In body copy it removes the visible pause after every sentence and reads cramped. Scope it to h1, h2, h3 and display text; never to paragraphs.

Japanese line breaking must be phrase-aware (`word-break: auto-phrase`, `line-break: strict`, or budoux). Naive wrapping breaks mid-phrase and reads badly.

---

## 4. Component Stylings

### Buttons

Three variants.

**Primary (inverted):** fill `--text`, label `--bg`, fully rounded, height 44 to 54, padding 0 26 to 40px, weight 400 to 500. This is the main CTA on marketing surfaces and reads as high contrast without using the accent.

**Accent:** fill `--accent`, label `--selected-text`, radius 12.

**Panel (secondary):** fill `--panel`, label `--text`, 1px `--edge`, card shadow, radius 12.

All buttons: `transform 0.12s ease-out`, hover `scale(1.02)`, **press `scale(0.95)`**. Disabled drops to `opacity 0.5` and cancels the scale.

Icon buttons are 40 to 44px square, transparent, `--text-muted`, fully rounded, with a stronger response: hover `1.08`, press `0.9`.

### Pill tabs

The most reused control.

| State | Fill | Label | Border |
|---|---|---|---|
| Inactive, both themes | `transparent` | `--text-muted` | 1px `--edge` |
| Active, dark | `--accent-bg` | `--accent` | 1px `--accent` |
| Active, light | `--accent` | `--selected-text` | 1px `--accent` |

Dark active is **tinted, not solid**, because solid accent glares on dark panels. Inactive is transparent so tabs recede onto any surface; the faint border alone carries the shape. Geometry `padding: 6px 16px`, fully rounded, 15px, weight 500.

### Cards

Squircle, `cornerSmoothing 0.8`, radius 20 (16 for stat tiles, 22 for feature cards). Fill `--card`. In dark, a 1px `--hairline` rim plus a tight shadow. In light, **no border**, fill plus a wide soft shadow.

### Inputs

Fill `--card-inset`, text `--text`, `inset 0 0 0 1px --edge`, squircle radius 12, padding 12px 16px, placeholder `--text-muted`. Social sign-in buttons reuse this exact surface so auth stays on one token set.

### Modals

Scrim `--overlay`, fading in over 0.2s. Card is a squircle radius 20, fill `--card`, `inset 0 0 0 1px --border`, max width 400px, padding 24 to 32px. The card animates opacity 0 to 1, **blur 6px to 0**, and scale 0.98 to 1 over 0.25s ease-out. The blur-in is the signature detail.

### List rows

Hover and selected share one shade (`--item-hover`); pressed is stronger (`--item-active`). No transition, so the highlight tracks the pointer instantly. Separator is 1px `--divider`.

### Chips and badges

Fully rounded, 11 to 12px, weight 600, padding 4px 11px. Category chips use the palette above; status chips use accent, warning or danger tints.

### Spinner

Circle, 2px `currentColor` border, transparent top edge, rotating 360 degrees every 0.7s linear. Sizes 12, 16, 20, 48.

### Progress

Bars are 6px tall, fully rounded, track `--card-inset`, fill `--accent`. Rings are 48px with the same colours.

---

## 5. Layout Principles

**Spacing scale:** 4, 8, 16, 24, 32, 48. Section padding on marketing pages is fluid, roughly 96 to 200px vertical.

**Containers:** 1240px is the standard maximum width and sets the page gutter. Reading-width content narrows to 620 to 820px. Gutters are 16px on mobile, 24 to 32px on desktop.

**Rhythm:** generous vertical space between sections, tight grouping within a component. Related items sit 8 to 12px apart; unrelated groups 24 to 48px.

**Alignment:** marketing sections centre their headings and lead paragraphs; app surfaces are left-aligned. Numbers use tabular figures wherever they are compared in a column.

**Density:** app screens are comfortable rather than compact. Rows are 44px minimum. Never pack a dashboard to the edges.

---

## 6. Depth & Elevation

Depth is carried by fill and shadow, almost never by borders.

| Level | Dark | Light |
|---|---|---|
| Page | `--bg`, flat | `--bg`, flat |
| Card | `--card` + 1px hairline + `0 1px 2px rgba(0,0,0,0.5)` | `--card` + no border + `0 1px 6px rgba(0,0,0,0.04)` |
| Raised / marketing card | same fill, `0 30px 80px rgba(0,0,0,0.06)` | same |
| Modal | card treatment plus the scrim | same |

**The light shadow is deliberately wide and nearly invisible.** A tight, darker shadow in light mode concentrates into a line along the bottom edge and reads as a border, which breaks the borderless intent.

Glass surfaces (sticky headers, floating bars) use `blur(24px)` over `rgba(22,22,29,0.6)` dark or `rgba(255,255,255,0.55)` light.

---

## 7. Do's and Don'ts

**Do**

- Design dark first; derive light from it.
- Keep light mode borderless. Separate cards with fill and a soft wide shadow.
- Keep every light neutral warm. Red should be greater than or equal to blue.
- Use squircles with `cornerSmoothing 0.8` everywhere.
- Apply `scale(0.95)` on press to everything tappable.
- Branch typography on locale: Japanese gets more weight, looser tracking, looser leading.
- Use pure white cards in light mode.
- Respect reduced-motion by disabling loops and snapping reveals.

**Don't**

- Don't draw card borders in light mode.
- Don't use a tight or dark shadow in light mode.
- Don't use cool or blue-violet greys.
- Don't fill inactive pill tabs. The border alone defines them.
- Don't use solid accent for the active tab in dark mode; use the tint.
- Don't apply `palt` or proportional kerning to Japanese body copy.
- Don't use pure white on an accent fill; use `#f7f6f5`.
- Don't add bounce, spring overshoot or gamified motion.
- Don't use em dashes in any copy, in either language.
- Don't use gradients as surface fills. The one mesh gradient is a hover flourish, not a pattern.

---

## 8. Responsive Behavior

**Breakpoints:** 640, 768, 1024, 1240. The 1240 container is the outer bound; below it the page is fluid with gutters.

**Touch targets:** minimum 44px. Icon buttons 40 to 44px square.

**Collapse behaviour:**

- Sidebar navigation collapses to icons below 1024 and becomes a drawer below 768.
- Two-column splits stack to one column below 900, content first.
- A sticky side rail becomes a sticky horizontal scrolling strip on mobile.
- Marketing grids drop from five columns to two below 768, shedding lower-priority cells rather than shrinking all of them.
- Tab rows become a 2x2 grid on mobile rather than scrolling.

**Type:** all display sizes are fluid between a mobile minimum and a desktop maximum. Body text does not scale below 15px.

**Motion on mobile:** scroll-driven sequences get a longer runway. Hover states have no mobile equivalent, so the pressed state must carry the whole interaction.

---

## 9. Agent Prompt Guide

Reusable prompts for staying on-system.

**Establishing context**

> Use the eigo.io design system. Dark mode is the default and light is the override. The palette is warm-neutral teal-accented. Light mode is borderless: cards are pure white on a warm off-white page, separated by a wide soft shadow. Everything is a squircle with 0.8 corner smoothing.

**New screen**

> Build [screen] using eigo.io tokens. Dark by default. Cards `--card` with a hairline rim in dark and no border in light. Body text 15 to 16px, secondary text `--text-secondary`. Every tappable element presses to `scale(0.95)` over 0.12s. Minimum 44px touch targets.

**Bilingual content**

> This screen contains Japanese and English. Japanese headings take weight 600, tracking `-0.01em` and line height 1.3; English takes 500, `-0.02em` and 1.12. Japanese body line height is 1.85. Apply `palt` to headings only, never body copy. Break Japanese lines at phrase boundaries.

**Light variant**

> Produce the light variant. Remove all card borders. Cards become pure white, the page becomes `#f7f6f5`, and the shadow becomes `0 1px 6px rgba(0,0,0,0.04)`. Keep every neutral warm; no blue-tinted greys. Text on accent is `#f7f6f5`, not white.

**Reviewing output**

> Check against the design system: any card borders in light mode, any cool greys, any filled inactive tabs, any solid accent on a dark active tab, any `palt` on body copy, any em dashes in copy, any element missing a press state.
