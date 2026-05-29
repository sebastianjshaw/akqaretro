# AKQA Retro — Figma design system (from codebase)

This document defines design tokens and component rules that match **`src/app/globals.css`**, **`docs/AKQA_BRAND_BRIEF_AI.md`**, and the retro UI in **`src/components/retro/`**. Use it to build or align the Figma file: [AKQA Retro (Figma)](https://www.figma.com/design/IsjcuyBPR6GSMfzSGXt5Sx/AKQA-Retro?node-id=0-1&p=f&t=SGxA3HwKcfsaMJFP-0).

---

## Import-ready token files (not Markdown)

Figma **cannot** import Markdown. For **Variables → Collections → Import**, use **`tokens/figma-native-import/light.tokens.json`** and **`dark.tokens.json`** (W3C **`$value`** / **`$type`**). For **Tokens Studio**, use **`tokens/tokens-studio/`** legacy JSON. Manual: **`tokens/akqa-retro-variables.csv`**. Details: **`tokens/README.md`**.

---

## 1. Figma setup (recommended)

| Step | Action |
|------|--------|
| **Variables** | Create a collection **“AKQA Retro / Theme”** with modes **Light** and **Dark** (match `html` default vs `html.dark`). |
| **Colour variables** | Map each semantic token below to a variable; assign Light/Dark values per mode. |
| **Typography** | Install **Season Sans**, **Season Serif**, **Season Mix** (Displaay) in Figma if licensed; otherwise use **Inter** + **Georgia** as stand-ins and label “dev fallback”. |
| **Grid** | Base unit **4px** (Tailwind’s default scale: 4, 8, 12, 16, 24, 32…). |
| **Radius** | **0** (sharp edges) for cards, columns, primary buttons unless a component explicitly uses a small radius (e.g. theme toggle). |
| **Pages** | Suggested pages: **🎨 Foundations**, **🧩 Components**, **📱 Screens** (Retro board, Landing, Modal). |

---

## 2. Colour tokens (CSS → Figma)

| Token / variable name | Light (`:root`) | Dark (`html.dark`) | Usage |
|----------------------|-----------------|---------------------|--------|
| `background` | `#FFFFFF` | `#1A1A1A` | Page / main surface |
| `foreground` | `#000000` | `#FFFFFF` | Primary text |
| `akqa-dove` | `#666666` | `#666666` | Primary CTA fill, links, focus ring |
| `akqa-dusty` | `#999999` | `#999999` | Muted text, icons |
| `akqa-muted` | `#666666` | `#a3a3a3` | Captions, secondary labels (WCAG-friendly on both modes) |
| `akqa-border` | `#E5E5E5` | `#404040` | Borders, dividers, inputs |
| `akqa-white` | `#FFFFFF` | — | Card surfaces on light; text on dove |
| `akqa-error` | `#DC2626` | `#F87171` | Error text, destructive confirm buttons (`.akqaretro-text-error`) |
| `surface-elevated` | `#FFFFFF` (`var(--akqa-white)`) | `#2A2A2A` | Cards, columns, elevated panels |
| `surface-input` | `#FFFFFF` (`var(--akqa-white)`) | `#1A1A1A` | Textareas, form fields |
| `overlay-scrim` | `rgba(0,0,0,0.5)` | same | Modal backdrop |

**Rules**

- Do not invent new brand primaries; **dove** is the only accent for non-destructive actions.
- **Black / white** for primary text contrast per brand brief.
- Dark mode only swaps **background**, **foreground**, **border**; dove/dusty stay stable.

---

## 3. Typography

| Style | Code class | Font | Case / notes | Size (approx.) |
|-------|------------|------|----------------|----------------|
| Headline | `.akqaretro-headline` | Season Sans | **ALL CAPS**, letter-spacing **0.02em** | `text-xl` board title, `text-lg` column titles, `text-xs`–`text-sm` for small headers |
| Subtitle | `.akqaretro-subtitle` | Season Serif | Sentence case | Body intro, prime directive |
| Body | body | Season Sans | Sentence | Default **1.6** line-height |
| Caption | `.akqaretro-caption` | Season Sans | — | **0.8rem**, line-height **1.4** |
| Card body | — | Season Sans | — | **12px** (`text-xs`) |

**Rules**

- Headlines that are “AKQA headlines” must be **uppercase** + tracking, not title case.
- Use **Serif** for narrative / reflective copy only (e.g. landing intro).

---

## 4. Spacing & layout (from components)

| Pattern | Value | Where |
|---------|-------|--------|
| Column min height | 320px | Retro column |
| Board max width | `max-w-7xl` (80rem) | Page wrap |
| Card padding | 6px (`p-1.5`) | Card inner |
| Column header padding | 16px | `p-4` |
| Modal panel max width | `max-w-2xl` | Snapshots modal |
| Icon button (card) | 44×44px min (`.akqaretro-touch-target`) | Edit, delete, vote +/-, Done |
| Vote control | 44×44px min (`.akqaretro-touch-target`) | +/- |
| Theme toggle | 44×44px min (`.akqaretro-touch-target`) | Header theme cycle |
| Gap grid columns | 24px | `gap-6` |

---

## 5. Components to build in Figma (inventory)

Build each as a **main component** with **variants** where noted. Prefix names with **`AKQA /`** to avoid clashes.

| Component | Variants / states | Notes |
|-----------|-------------------|--------|
| **Logo** | Light BG / Dark BG | Black wordmark on light; white on dark; no distortion |
| **Theme toggle** | Light / Dark / System | 44×44 target (`.akqaretro-touch-target`); border `akqa-border`; small radius allowed |
| **Button / Primary** | Default, Hover, Focus, Disabled | Dove fill, white label, `focus-visible` ring 2px dove |
| **Button / Secondary** | Default, Hover, Focus | Border `akqa-border`, transparent bg |
| **Button / Destructive (text)** | Hover | Muted → `akqa-error` |
| **Input / Text** | Default, Focus | Border `akqa-border`, 1px ring dove on focus |
| **Checkbox** | Owner toggles | Label + muted text |
| **Card / Retro** | Default, Dragging, Merge target, Done (actions) | Merge: 4px dove ring, dashed border, tint; Done: 60% opacity, strikethrough text |
| **Column** | — | Border, min-h 320px, header row with sort + actions |
| **Modal / Snapshots** | List, Detail | Scrim 50%; panel border; list rows full width |
| **Badge / Votes** | — | “Your votes: n / 6 left” bordered capsule |

---

## 6. Interaction & accessibility (must match product)

- **Focus**: Visible ring **2px** `akqa-dove` on `:focus-visible` (not on mouse-only click if mimicking web).
- **Motion**: Prefer no decorative animation; respect reduced motion in specs (no auto-play loops in Figma prototypes).
- **Touch targets**: Interactive controls use **44×44px** minimum via `.akqaretro-touch-target` (card actions, votes, modals, theme toggle, share copy).

---

## 7. Screen frames to compose

1. **Retro board** — Header (title, date, owner toggles, Snapshot, View snapshots, Add column, votes pill), 3-column grid (adjust for extra columns).
2. **Landing** — Create retro form + My retros list.
3. **Snapshots modal** — Empty state, list of dated snapshots, read-only snapshot detail (multi-column).

Use **Auto layout** + **Fill** width for columns so they match responsive `grid-cols-1 md:grid-cols-N`.

---

## 8. Source of truth

| Layer | Path |
|-------|------|
| Tokens | `src/app/globals.css` (`:root`, `html.dark`) |
| Brand rules | `docs/AKQA_BRAND_BRIEF_AI.md` |
| Components | `src/components/retro/*.tsx`, `src/components/landing/HomeClient.tsx` |

When Figma and code diverge, **update Figma to match code** unless the change is an intentional design approval.

---

## 9. Checklist before handing off

- [ ] Light and Dark modes both defined for semantic colours  
- [ ] All interactive components have Default / Hover / Focus / Disabled where applicable  
- [ ] Headlines are uppercase with tracking where the app uses `.akqaretro-headline`  
- [ ] Corner radius documented (mostly **0**)  
- [ ] Wordmark usage follows brand brief (no effects, correct black/white per background)
