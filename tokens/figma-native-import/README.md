# Figma native import (Collections → Import)

## Why imports fail (and what we use now)

1. **Wrong keys** — Figma expects **`$type`** and **`$value`** (not `type` / `value`).
2. **Hyphens in names** — Use nested keys: `color/akqa/dove`, not `color.akqa-dove`.
3. **Plain hex strings** — Many importers (W3C / DTCG) **reject** `"$value": "#ffffff"` for colors. **All 11 tokens failing** usually means every color token was invalid.  
   **Current files** use the **color object** with `colorSpace`, `components` (0–1), and `hex`.

If it still errors, see **`TROUBLESHOOTING.md`** and try **`single-token-test.tokens.json`** (one red token).

Files under **`tokens/tokens-studio/`** use legacy `value`/`type` — for **Tokens Studio** only, not native Import.

## Steps

1. In Figma, open **Local variables** for your file.
2. Create a collection **AKQA Retro** (or use an existing one) with **two modes**: **Light** and **Dark**.
3. **Import `light.tokens.json`**  
   - Select the **Light** mode in the variables UI (or in the import flow, if asked which mode to apply).  
   - **Collections → … → Import** (or drag the JSON in, depending on your Figma version).
4. **Import `dark.tokens.json`**  
   - Switch to / select the **Dark** mode, then import so values apply to **Dark**.

If your build only allows one import per collection, import once, then use **Export** from Figma to confirm structure, or import into separate passes as your UI allows.

## Paths in Figma (after import)

| In JSON / Figma | Maps to code token |
|-----------------|-------------------|
| `color/background` | `--background` |
| `color/foreground` | `--foreground` |
| `color/akqa/dove` | `--akqa-dove` |
| `color/akqa/dusty` | `--akqa-dusty` |
| `color/akqa/muted` | `--akqa-muted` |
| `color/akqa/border` | `--akqa-border` |
| `color/akqa/white` | `--akqa-white` |
| `color/surface/elevated` | surface-elevated |
| `color/surface/input` | surface-input |
| `color/overlay/scrim` | overlay (set opacity in UI) |
| `color/destructive` | destructive |

## Scrim token

`color/overlay/scrim` is **`#000000`** (solid). Set **opacity** on the fill in Figma if you need a 50% scrim.

## File reference

| File | Use |
|------|-----|
| **`light.tokens.json`** | Values for **Light** mode |
| **`dark.tokens.json`** | Values for **Dark** mode |
