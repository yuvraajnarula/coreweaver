# DESIGN.md — Dark Surface Design System

A minimal, dark, single-accent design system built on **nested hairline surfaces** and **ambient motion**. It is meant to be applied to any product screen (editors, agents, dashboards, forms), not to one page.

> **Provenance:** The values were derived by eye from a single reference screenshot, so treat the numbers as a calibrated starting point, not extracted tokens. Anything about motion (the Aura primitive) is reconstructed from a verbal description. Validate against the real product before locking.

---

## 1. Principles

1. **One focal surface per view.** Each screen has one dominant interactive object. Everything else is quieter than it.
2. **Depth from borders and tone, never shadow.** Elevation is expressed by a tonal step plus a 1px hairline. Drop shadows are not part of this system.
3. **One accent, used for action and atmosphere only.** Saturated color marks the primary action and ambient light. It is never used for body text or decoration.
4. **Space is structure.** Prefer whitespace and alignment over boxes, dividers, and fills.
5. **Motion is atmosphere, not feedback noise.** Ambient effects are slow, irregular, and removable without losing meaning.

---

## 2. Foundations (tokens)

All tokens are CSS custom properties. Components consume **semantic** tokens only, never raw values.

### 2.1 Color

**Neutrals (cool-tinted dark)**

| Token | Value | Role |
|---|---|---|
| `--bg-0` | `#09090b` | App canvas |
| `--bg-1` | `#0e0d11` | Raised container (level 1) |
| `--bg-2` | `#17151b` | Raised container (level 2, interactive field) |
| `--bg-3` | `#201e26` | Hover / selected fill |

**Strokes (white at alpha, so they adapt to whatever is behind them)**

| Token | Value | Role |
|---|---|---|
| `--stroke-1` | `rgba(255,255,255,.07)` | Level-1 container border |
| `--stroke-2` | `rgba(255,255,255,.11)` | Level-2 / field border |
| `--stroke-3` | `rgba(255,255,255,.18)` | Hover / emphasis border |

**Text**

| Token | Value | Role |
|---|---|---|
| `--text-1` | `#f5f5f7` | Primary |
| `--text-2` | `#a8a4b0` | Secondary, icons, labels |
| `--text-3` | `#6f6b78` | Placeholder, disabled |

**Accent**

| Token | Value | Role |
|---|---|---|
| `--accent` | `#b012e0` | Primary action fill |
| `--accent-hi` | `#c026f0` | Hover, aura highlight |
| `--accent-lo` | `#7c3aed` | Aura secondary |
| `--accent-soft` | `#e879f9` | Aura tertiary |
| `--on-accent` | `#ffffff` | Text/icons on accent |

**Atmosphere**

| Token | Value | Role |
|---|---|---|
| `--haze` | `rgba(120,20,180,.35)` | Top-edge radial glow on the canvas |

**Semantic status** (not present in the reference; add as needed): define `--success`, `--warning`, `--danger` as desaturated hues at the same luminance as `--text-2`, so they don't compete with the accent.

### 2.2 Typography

- **Family:** clean neo-grotesque / geometric sans (Inter, Google Sans or equivalent). Mono for code.
- **Weights:** 400 default, 500 for emphasis and filled-button labels. Avoid 600+.
- **Tracking:** slightly tight on large sizes (`-0.01em`), default on body.

| Token | Size / line | Use |
|---|---|---|
| `--t-display` | 28 / 1.25 | Greeting, empty-state headline |
| `--t-body` | 16 / 1.6 | Input text, paragraphs |
| `--t-ui` | 14 / 1.4 | Chips, toolbar labels, buttons |
| `--t-caption` | 12 / 1.4 | Hints, metadata |

### 2.3 Spacing (4px base)

`--s-1: 4` · `--s-2: 8` · `--s-3: 12` · `--s-4: 16` · `--s-5: 20` · `--s-6: 24` · `--s-8: 32` · `--s-12: 48`

Default gaps: icon-to-label `s-2`, sibling controls `s-4` to `s-5`, container padding `s-4`, bezel gap `s-1` to `s-2`.

### 2.4 Radius

| Token | Value | Use |
|---|---|---|
| `--r-sm` | 8px | Hover fills on ghost buttons, chips |
| `--r-md` | 14px | Menus, popovers |
| `--r-lg` | 22px | Level-2 field |
| `--r-xl` | 28px | Level-1 container |
| `--r-full` | 999px | Pills, icon buttons |

**Concentric rule:** child radius = parent radius − the padding between them. This is non-negotiable (see §4).

### 2.5 Motion

| Token | Value | Use |
|---|---|---|
| `--dur-fast` | 120ms | Hover, press |
| `--dur-base` | 200ms | Fades, border changes |
| `--dur-slow` | 500–600ms | Aura in/out |
| `--ease-out` | `cubic-bezier(.2,.8,.2,1)` | Entrances |
| `--ease-io` | `ease-in-out` | Ambient loops |

---

## 3. Layout system

### 3.1 Page structure

A view is composed of three layers:

1. **Canvas:** `--bg-0` plus an optional `--haze` radial at the top edge. It never holds content directly.
2. **Stage:** a centered column. Content is horizontally centered with a max width and gutters.
3. **Overlay:** fixed elements (update banners, toasts, menus) pinned to viewport edges, outside the stage flow.

```
┌───────────────────────────────────────────┐
│ Overlay (fixed, edges)             [pill] │
│                                           │
│ Stage ── centered column                  │
│   Context  (identity, greeting, logo)     │  ← quiet, upper area
│                                           │
│   … flexible empty space …                │
│                                           │
│   Primary surface (docked)                │  ← the one focal object
└───────────────────────────────────────────┘
```

### 3.2 Rules

- **Stage width:** `width: min(var(--stage-max), 100% - 2 * var(--gutter))`, `margin-inline: auto`. Reference: `--stage-max ≈ 960px`, `--gutter = 24px`. Wide screens get more empty space, never a wider stage.
- **Anchoring:** the primary surface is docked to the bottom of the stage; context sits in the upper-middle. The gap between them is flexible (`flex: 1`), not fixed.
- **Vertical rhythm inside a surface:** stack meta row, then field, then toolbar. Rows separate by padding, not dividers.
- **Horizontal rhythm in a row:** `display: flex; justify-content: space-between`, with groups on the left (context actions) and on the right (mode, voice, submit). The primary action is always last on the right.
- **Overlays never push layout.** They are `position: fixed` and may clip to the viewport edge.
- **Responsive:** below ~640px the stage becomes full-bleed with `--s-3` gutters, the toolbar collapses secondary controls into one overflow menu, and radii step down one level (`xl` to `lg`, `lg` to `md`).

---

## 4. Surfaces and borders

This is the structural core of the system. Surfaces are **nested bezels**: a level-1 container holding a level-2 field, each with its own hairline.

### 4.1 Elevation model

| Level | Fill | Stroke | Radius | Role |
|---|---|---|---|---|
| 0 | `--bg-0` | none | n/a | Canvas |
| 1 | `--bg-1` | `--stroke-1` | `--r-xl` | Container / card |
| 2 | `--bg-2` | `--stroke-2` | `--r-lg` | Interactive field inside a container |
| Pop | `--bg-2` | `--stroke-3` | `--r-md` | Menus, popovers (the only place stroke-3 rests) |

Each step up is **one tonal step brighter fill + one stroke tier brighter**. Never skip tiers.

### 4.2 Border rules

1. **Always 1px.** Never 2px for structure. (1.5px is allowed only for the Aura ring.)
2. **White-alpha, never opaque gray.** Alpha strokes absorb the haze and aura color behind them.
3. **Concentric radii.** `inner = outer − gap`. With a 6px gap: 28px outer, 22px inner.
4. **Consistent bezel gap.** The padding between a level-1 container and its level-2 field is a single value (`s-1` to `s-2`) everywhere.
5. **Only containers and fields get borders.** Chips, toolbar buttons, labels, and icon buttons are borderless and rely on whitespace plus a hover fill.
6. **No shadows.** Not at rest, not on hover, not on focus. Focus uses stroke brightening and Aura (§6).
7. **Filled shapes are rare.** Only the primary action and a global notification pill use `--accent` fill. If a third filled element appears, one of them is wrong.

### 4.3 Structure template

```
.surface-1                  ← bg-1, stroke-1, r-xl, padding s-2
  ├─ .surface-meta          ← row of ghost controls, no border
  └─ .surface-2             ← bg-2, stroke-2, r-lg, padding s-4
       ├─ .field            ← transparent, borderless input
       └─ .toolbar          ← ghost controls + primary action
```

```css
.surface-1 {
  background: var(--bg-1);
  border: 1px solid var(--stroke-1);
  border-radius: var(--r-xl);
  padding: var(--s-2);
}
.surface-2 {
  position: relative;
  isolation: isolate;
  background: var(--bg-2);
  border: 1px solid var(--stroke-2);
  border-radius: var(--r-lg);
  padding: var(--s-4);
  transition: border-color var(--dur-base) var(--ease-out);
}
.surface-2:hover { border-color: var(--stroke-3); }
```

---

## 5. Components

### 5.1 Ghost control (chip, picker, icon button)
- No fill, no border, `--text-2`, `--t-ui`.
- Hover: `background: --bg-3; border-radius: --r-sm; color: --text-1`.
- Pickers: label followed by a chevron (down opens below, up opens above when docked to the bottom).
- Min hit area 32×32.

### 5.2 Primary action
- Circle (`--r-full`), 36px, `--accent` fill, `--on-accent` icon.
- Hover: `--accent-hi`. Pressed: scale `.96`. Disabled: 40% opacity, no hover.
- Exactly one per surface.

### 5.3 Notification pill
- `--accent` fill, `--t-ui` weight 500, trailing arrow, `--r-full`, padding `8px 14px`.
- Fixed to the viewport edge, never in the document flow.

### 5.4 Field
- Transparent background, no border, no outline (focus is expressed by the parent surface, see §6).
- `--t-body`, `--text-1`, placeholder `--text-3`.
- Auto-grows to a max height, then scrolls internally.

### 5.5 Menu / popover
- Pop-level surface (§4.1), padding `s-2`, items use the ghost-control hover.
- Appears with `--dur-base` fade plus 4px translate, `--ease-out`.

### 5.6 Brand mark
- Large, low-contrast glyph (`rgba(255,255,255,.06)` to transparent). Present as atmosphere and discoverable on inspection, never a call to action.

---

## 6. Motion primitive: Aura

**Aura** is the system's focus effect: slow, fluid gradients that linger around the focused level-2 surface. It's intermittent by design.

### 6.1 Anatomy

| Layer | Where | What |
|---|---|---|
| Bloom | `::before`, behind the surface, `inset: -14px`, blurred | 2–3 drifting radial blobs in `--accent-hi`, `--accent-lo`, `--accent-soft` |
| Ring | `::after`, masked to a 1.5px border ring | A rotating conic gradient, so the stroke itself carries color |
| Timing | Per layer | Different durations and irregular opacity keyframes, so nothing syncs |

### 6.2 Rules

- **Trigger:** `:focus-within` on a level-2 surface. Fades in over `--dur-slow`, out over ~400ms.
- **Intermittent, not constant.** Peak opacity is brief and uneven (e.g. 0 to .55 to .2 to .7 to .15 to 0). A steady glow reads as an error or an upsell.
- **Behind, never over.** The bloom is `z-index: -1`, and the surface fill stays opaque so text never loses contrast.
- **Animate cheap properties only:** `opacity` and registered custom properties (`@property`). Never animate `filter: blur()`.
- **Use durations with no common multiple** (e.g. 7s, 9s, 11s, 13s) so the pattern doesn't visibly repeat.
- **Independent of meaning.** Focus must still be legible when Aura is disabled (the stroke goes from `--stroke-2` to `--stroke-3`).

### 6.3 Reference implementation

```css
@property --a1 { syntax: "<angle>"; inherits: false; initial-value: 0deg; }

.surface-2::before {
  content: ""; position: absolute; inset: -14px; z-index: -1;
  border-radius: calc(var(--r-lg) + 12px);
  opacity: 0; filter: blur(22px);
  background:
    radial-gradient(40% 70% at var(--x1, 20%) 0%,   var(--accent-hi) 0%, transparent 70%),
    radial-gradient(35% 60% at var(--x2, 80%) 100%, var(--accent-lo) 0%, transparent 70%),
    radial-gradient(30% 50% at 100% var(--y3, 40%), var(--accent-soft) 0%, transparent 70%);
  transition: opacity var(--dur-slow) ease;
}
.surface-2::after {
  content: ""; position: absolute; inset: -1px; border-radius: inherit;
  padding: 1.5px; opacity: 0; pointer-events: none;
  background: conic-gradient(from var(--a1),
    transparent 0deg, var(--accent-hi) 60deg, transparent 140deg,
    var(--accent-lo) 220deg, transparent 300deg);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude;
}
.surface-2:focus-within { border-color: var(--stroke-3); }
.surface-2:focus-within::before {
  animation: aura-x 9s ease-in-out infinite alternate,
             aura-y 13s ease-in-out infinite alternate,
             aura-breathe 11s ease-in-out infinite;
}
.surface-2:focus-within::after {
  animation: aura-spin 14s linear infinite,
             aura-ring 7s ease-in-out infinite;
}
@keyframes aura-breathe { 0%{opacity:0} 12%{opacity:.55} 40%{opacity:.2} 58%{opacity:.7} 85%{opacity:.15} 100%{opacity:0} }
@keyframes aura-ring    { 0%,100%{opacity:0} 25%{opacity:.9} 60%{opacity:.35} }
@keyframes aura-spin    { to { --a1: 360deg } }
@keyframes aura-x       { from{--x1:5%;--x2:95%} to{--x1:70%;--x2:25%} }
@keyframes aura-y       { from{--y3:10%} to{--y3:90%} }

@media (prefers-reduced-motion: reduce) {
  .surface-2:focus-within::before,
  .surface-2:focus-within::after { animation: none; opacity: .3; }
}
```

### 6.4 Tuning knobs

| Goal | Change |
|---|---|
| More fluid | Blur 22px to 30px, add a 4th blob, use prime-ish durations |
| More subtle | Cap peak opacity at .35, bleed `inset` to -8px |
| Truly liquid | Replace gradients with a small WebGL noise shader clipped to the surface's rounded rect (higher cost; only if CSS doesn't convince) |

---

## 7. Interaction states

| State | Surface-2 | Controls |
|---|---|---|
| Rest | `--stroke-2`, no Aura | `--text-2` |
| Hover | `--stroke-3` | Ghost: `--bg-3` fill, `--text-1` |
| Focus-within | `--stroke-3` + Aura fade-in | unchanged |
| Active / submitting | Aura brightens briefly, then settles | Primary: spinner replaces icon |
| Disabled | `--stroke-1`, 60% opacity | `--text-3`, no hover |
| Error | Stroke tinted `--danger` at 40% alpha; Aura suppressed | Inline caption in `--danger` |

---

## 8. Accessibility

- **Contrast:** `--text-1` on `--bg-2` is well above 7:1. `--text-2` should stay above 4.5:1; never use `--text-3` for required information.
- **Focus must not depend on Aura.** The stroke change must be visible with motion off.
- **Reduced motion:** disable Aura animation, keep a static faint bloom or none.
- **Icon-only controls** require `aria-label`. Pickers expose `aria-haspopup` and `aria-expanded`.
- **Hit targets** at least 32px; the primary action is 36px.
- **Hairline visibility:** `--stroke-1` is intentionally faint. Never use it as the only cue for an interactive boundary. Fields rely on `--stroke-2`.

---

## 9. Do / Don't

**Do**
- Nest surfaces in the order canvas, container, field, using the tonal and stroke steps.
- Keep radii concentric.
- Let whitespace separate controls.
- Reserve accent fill for one primary action per surface.

**Don't**
- Add box-shadows or glows at rest.
- Use opaque or high-contrast borders.
- Box every control.
- Introduce a second saturated hue.
- Run ambient motion continuously at full strength.
- Let the bloom sit above content.

---

## 10. Adoption checklist

- [ ] All colors, radii, and spacing come from tokens, with no raw values in components
- [ ] Every container/field pair obeys the concentric-radius rule
- [ ] No shadows anywhere
- [ ] Exactly one primary accent-filled action per surface
- [ ] Aura attached via `:focus-within`, with reduced-motion fallback
- [ ] Focus visible with Aura disabled
- [ ] Verified against the real product (token values here are estimates)