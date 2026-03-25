# Design tokens → Figma

## Figma native: **Collections → Import** (“Encountered an error importing tokens”)

Figma expects **W3C-style** keys: **`$type`** and **`$value`**, not `type` / `value`.

Use:

- **`figma-native-import/light.tokens.json`** — import for **Light** mode  
- **`figma-native-import/dark.tokens.json`** — import for **Dark** mode  

See **`figma-native-import/README.md`** for steps.

Older **`tokens-studio/light.json`** uses legacy `value`/`type` — that is for **Tokens Studio plugin JSON view**, not Figma’s native importer.

---

## Other options

**Figma’s app does not import Markdown or our custom `akqa-retro-variables.json`** (that file is for scripts only).

- **`rgba(...)`** in CSV can break some flows; prefer **hex** in Figma.

---

## Option A — Tokens Studio plugin

1. Install **[Tokens Studio for Figma](https://www.figma.com/community/plugin/843461159747378978)** (community plugin).
2. Open the plugin → create a project / token sets.
3. Add a token set named **`light`**, open **JSON view**, paste the contents of **`tokens/tokens-studio/light.json`**, save.
4. Add a token set named **`dark`**, paste **`tokens/tokens-studio/dark.json`**, save.
5. Use **Export to Figma → Variables** (or your plugin version’s “Push to Figma”) so Variables are created from those token sets.

Exact menu names change between plugin versions; look for **Export** / **Styles & Variables** / **Create or update variables**.

---

## Option B — Manual (always works)

1. In Figma: **Local variables** → create collection **AKQA Retro / Theme** with modes **Light** and **Dark**.
2. Open **`akqa-retro-variables.csv`** in Excel/Sheets.
3. Add each **variable_name** as a **Color** variable; set **Light** / **Dark** from the CSV columns (use **hex only**, no `rgba` in cells if Figma complains).

---

## Option C — Code / API

Use **`akqa-retro-variables.json`** only for your own scripts or the [Figma REST API](https://www.figma.com/developers/api) — not for a built-in Figma menu.

---

## File reference

| File | Purpose |
|------|--------|
| **`figma-native-import/light.tokens.json`** | **Figma native Import** — Light mode (`$value` / `$type`) |
| **`figma-native-import/dark.tokens.json`** | **Figma native Import** — Dark mode |
| **`tokens-studio/light.json`** | Tokens Studio legacy JSON (**Light** values) |
| **`tokens-studio/dark.json`** | Tokens Studio legacy JSON (**Dark** values) |
| **`akqa-retro-variables.csv`** | Manual copy-paste into Figma |
| **`akqa-retro-variables.json`** | Custom schema for tooling (not Figma UI import) |
| **`akqa-retro-w3c.tokens.json`** | W3C format for Style Dictionary / pipelines |
