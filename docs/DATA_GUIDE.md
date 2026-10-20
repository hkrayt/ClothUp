# Data guide — editing clothes, rules and colors

All outfit logic is driven by plain JSON in `src/data/`. You can add clothes, places or rules without touching TypeScript. `npm test` validates every file (schema, unique ids, references, translations) and runs ~340 weather × occasion × style scenarios, so a broken edit is caught immediately.

```
src/data/
  places.json              Jordan locations
  occasions.json           occasion formality, color moods, indoor share
  fabrics.json             fabrics and their warmth
  clothing/male.json       men: standard + traditional
  clothing/female.json     women: standard + modest
  clothing/shared.json     socks, sports shoes, sunglasses, bags, extras
  rules/occasion.json      dress codes, modesty, kit for gym/hiking
  rules/weather.json       rain, cold, heat, sun, dust, wind
  colors/                  (color engine — see below)
```

## Places

```json
{ "id": "dead-sea", "name": { "en": "Dead Sea", "ar": "البحر الميت" },
  "lat": 31.7171, "lon": 35.5881, "elevation": -400, "zone": "rift-valley",
  "aliases": ["Sweimeh", "سويمة"] }
```

`elevation` (metres) is sent to the weather API: it matters a lot in Jordan. `zone` is one of `highland`, `northern-highland`, `highland-desert`, `steppe`, `desert`, `rift-valley`, `red-sea`. Aliases make search find the place by other names.

## Clothing items

```json
{ "id": "m-linen-shirt", "slot": "top",
  "name": { "en": "Short-sleeve linen shirt", "ar": "قميص كتان بأكمام قصيرة" },
  "gender": ["male"], "style": ["standard"],
  "occasions": ["casual", "travel", "university"],
  "formality": 2, "feels": [24, 45],
  "tags": ["collared", "short-sleeve", "breathable", "loose"],
  "coverage": { "arms": "short" },
  "fabrics": ["linen", "cotton"],
  "colors": ["white", "off-white", "sand", "sky", "@pastel"],
  "svg": { "part": "shirt", "variant": "short" } }
```

| Field | Meaning |
|---|---|
| `slot` | `head`, `eyewear`, `outer`, `mid` (warm layer), `top`, `bottom`, `socks`, `shoes`, `accessory` |
| `fills` | extra slots it covers, e.g. `["bottom"]` for a dress, thobe or closed abaya |
| `style` | `standard`, `traditional` (men), `modest` (women) |
| `formality` | 0 sporty · 1 relaxed · 2 smart casual · 3 business casual · 4 business/formal · 5 black tie |
| `feels` | comfortable feels-like °C range when wearing it |
| `tags` | free words used by rules (see below) |
| `coverage` | `arms`: none/short/long, `legs`: short/knee/long — enforced for modest style and religious visits |
| `fabrics` | candidate fabrics; the engine picks the best one for the weather |
| `colors` | allowed color ids or `@group`s from the color data |
| `svg` | which character part draws it |

Common tags: `waterproof`, `water-resistant`, `windproof`, `warm`, `breathable`, `loose`, `flowy`, `closed`, `boots`, `sandals`, `open-toe`, `slip-on`, `heels`, `sneakers`, `sporty`, `formal`, `tailored`, `suit`, `collared`, `short-sleeve`, `long-sleeve`, `sleeveless`, `shorts`, `skirt`, `dress`, `hijab`, `head-cover`, `shemagh`, `thobe`, `abaya`, `hood`, `sun-protect`, `dust-protect`, `bag`.

If the user's style has nothing wearable for a slot in the current weather (e.g. traditional style at the gym), the engine falls back to standard-style items, still respecting coverage rules.

## Rules

```json
{ "id": "rain-likely", "priority": 80,
  "when": { "any": [{ "rainProb": { "gte": 50 } }, { "precipMm": { "gte": 1 } }] },
  "then": { "need": ["outer"],
            "require": { "outer": ["waterproof", "water-resistant"], "shoes": ["closed", "boots"] },
            "prefer": { "waterproof": 3, "suede": -2 },
            "preferFabrics": { "waterproof": 3 },
            "add": ["umbrella"] },
  "reason": "rain" }
```

**`when`** — every field must match (AND); `any` matches if one branch does. Tests: `eq`, `ne`, `in`, `gte`, `lte`, `gt`, `lt`. Fields:

- weather over the stay: `feelsMin`, `feelsMax`, `feelsAvg`, `swing`, `rainProb`, `precipMm`, `snowCm`, `wind`, `gust`, `humidity`, `uvMax`, `dust` (`none`/`moderate`/`severe`), `condition`, `isNight`, `coolsAfterDark`, `zone`, `hours`
- profile and plan: `gender`, `style`, `occasion`

**`then`**

| Effect | Meaning |
|---|---|
| `need` | slots that must be filled (e.g. `outer` in rain, `head` for hijab) |
| `require` | the item in that slot must have one of these tags. Applied by priority; dropped if nothing wearable meets it |
| `exclude` | remove items with any of these tags |
| `prefer` | tag → score bonus (negative discourages) |
| `preferFabrics` | fabric → score bonus |
| `add` | accessory ids, or `#tag` for "best item with this tag" (e.g. `#bag`) |

**`priority`**: occasion/modesty 100, safety 80–90, comfort 50–60, style 20. **`reason`** is a key under `reason.*` in `src/i18n/en.json` and `ar.json` (add both).

## How an outfit is built

1. Weather is summarized over the whole stay (start → start + duration).
2. Matching rules are merged into needs, requirements, exclusions and preferences.
3. Layers: an outer layer is used below 17 °C feels-like (marked *take along* if only the evening is cold), and a warm mid layer below ~9 °C.
4. Each slot's candidates are scored on temperature fit, formality, rule preferences, fabric and the user's past choices.
5. Top + bottom (or a one-piece) pairs are combined with the best outer, mid, shoes, socks, head and extras, with a coherence penalty for clashing formality.
6. The best three outfits that differ in at least two main pieces are returned, with the reasons.

## Tuning

```powershell
$env:CASES="aqabaSummer,modest,casual;ammanSnow,male,work"; npx vitest run src/engine/print.test.ts --reporter=dot
```

prints the generated outfits for named scenarios in `src/engine/scenarios.ts`.
