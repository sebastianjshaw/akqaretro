# If import still fails

Figma often gives **no per-token error detail** — only a count (e.g. “11 tokens”).

## What we changed (latest)

1. **No hyphens** in JSON keys — use nested groups (`color/akqa/dove`).
2. **Color as DTCG objects** — not plain `"#rrggbb"` strings. Each color uses:
   - `"colorSpace": "srgb"`
   - `"components": [r, g, b]` (0–1)
   - `"hex": "#..."` (for readability; some builds ignore this)

Importers aligned with [W3C Design Tokens](https://www.designtokens.org/) often **reject** hex-only strings.

## Next checks

1. **Update Figma** — native token import improved in recent releases.
2. **One-token test** — Import `single-token-test.tokens.json` (one red swatch).  
   - If **1** fails → format still wrong for your build.  
   - If **1** works → compare with full file’s `color` / nesting.
3. **Export from Figma** — Create **one** color variable manually, then **Export** / copy JSON if your Figma exposes it. **Match our JSON shape to that file** (same keys, `$type`, value shape).

## If object format fails

Try removing the `"hex"` key from each `$value` and keep only `colorSpace` + `components`.

## If nothing works

Use **`tokens/akqa-retro-variables.csv`** and enter variables by hand, or **Tokens Studio** plugin with `tokens/tokens-studio/light.json` (legacy `value`/`type`).
