# Data guide — editing clothes, rules and colors

All outfit logic is driven by plain JSON in `src/data/`. You can add clothes, places or rules without touching TypeScript. `npm test` validates every file (schema, unique ids, references, translations) and runs ~340 weather × occasion × style scenarios, so a broken edit is caught immediately.

```
src/data/
  places.json              Jordan locations (74)
  climate.json             monthly climate averages per place (generated)
  occasions.json           occasion formality, color moods, indoor share
  fabrics.json             fabrics and their warmth
  clothing/male.json       men: standard + traditional
  clothing/female.json     women: standard + modest
  clothing/shared.json     socks, sports shoes, sunglasses, bags, extras
  rules/occasion.json      dress codes, modesty, kit for gym/hiking
  rules/weather.json       rain, cold, heat, sun, dust, wind
  colors/                  (color engine — see below)
```

## Occasions

`occasions.json`: `id`, `icon`, `formality` range, color `moods` (`classic`, `muted`, `fresh`, `bright`, `earthy`, `somber`), `indoor` share (0–1, pulls clothes toward room temperature) and optional `includes` (other occasions whose items also work here, e.g. the beach includes casual clothes for cool days). Add the occasion's name under `occasion.*` and its reason under `reason.*` in both language files.

## Places

```json
{ "id": "dead-sea", "name": { "en": "Dead Sea", "ar": "البحر الميت" },
  "lat": 31.7171, "lon": 35.5881, "elevation": -400, "zone": "rift-valley",
  "type": "tourist", "governorate": "balqa",
  "aliases": ["Sweimeh", "سويمة"] }
```

- `elevation` (metres) is sent to the weather API: it matters a lot in Jordan (Amman alone spans ~770–1040 m). Take it from Open-Meteo's terrain model: `https://api.open-meteo.com/v1/elevation?latitude=..&longitude=..`.
- `zone`: `highland`, `northern-highland`, `highland-desert`, `steppe`, `desert`, `rift-valley`, `red-sea`.
- `type`: `city`, `town`, `neighbourhood`, `tourist`, `campus`, `transport` (sets the icon and the order inside a governorate).
- `governorate`: one of the 12 (`amman`, `zarqa`, `irbid`, `balqa`, `madaba`, `jerash`, `ajloun`, `mafraq`, `karak`, `tafilah`, `maan`, `aqaba`); the picker groups by it.
- `aliases`: other spellings and nearby landmarks in either language, so search finds the place.

After adding places, rebuild their climate averages (next section).

## Climate averages

`src/data/climate.json` holds monthly averages for every place, used when there's no forecast (offline with nothing saved, or a date beyond the 16-day forecast). Each month is `[tMax, tMin, feelsMax, feelsMin, rainDayShare, precipMm, windMaxKmh, humidity%]`, averaged from Open-Meteo's historical archive (ERA5, elevation-corrected).

```bash
node scripts/build-climate.mjs              # fetch missing places
node scripts/build-climate.mjs wadi-rum     # refresh specific places
```

The script pauses between requests to stay within the free API limits (~10 s per place).

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
| `patterns` | optional: `stripes`, `check`, `floral`, `embroidery`. The second outfit option may show one patterned piece; items tagged `embroidered` always show their trim |

Common tags: `waterproof`, `water-resistant`, `windproof`, `warm`, `breathable`, `loose`, `flowy`, `closed`, `boots`, `sandals`, `open-toe`, `slip-on`, `heels`, `sneakers`, `sporty`, `formal`, `tailored`, `suit`, `collared`, `short-sleeve`, `long-sleeve`, `sleeveless`, `shorts`, `skirt`, `dress`, `hijab`, `head-cover`, `shemagh`, `thobe`, `abaya`, `hood`, `sun-protect`, `dust-protect`, `bag`, `beret`, `tie`, `over-robe` (a mid or outer piece that can go over a thobe or abaya, e.g. the sedeyree — other mid layers are skipped over a robe).

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

**`when`** — every field must match (AND); `any` matches if one branch does. Tests: `eq`, `ne`, `in`, `nin` (not in), `gte`, `lte`, `gt`, `lt`. Fields:

- weather over the stay: `feelsMin`, `feelsMax`, `feelsAvg`, `swing`, `rainProb`, `precipMm`, `snowCm`, `wind`, `gust`, `humidity`, `uvMax`, `dust` (`none`/`moderate`/`severe`), `condition`, `isNight`, `coolsAfterDark`, `zone`, `hours`
- added in v1.1: `shadeMin` and `sunGap` (sun vs shade), `fog`, `dryWind` (sharqiya), `dewPointMax`, `snowOnGround`, `freezingNear`, `lessCertain`, `source` (`forecast`/`climate`)
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
| `carry` | slots to suggest as "take along" (e.g. `["outer"]` for strong office air conditioning) |

**`priority`**: occasion/modesty 100, safety 80–90, comfort 50–60, style 20. **`reason`** is a key under `reason.*` in `src/i18n/en.json` and `ar.json` (add both).

## Colors and palettes

`src/data/colors/colors.json` holds the named colors and groups:

```json
{ "id": "navy", "hex": "#1F2B47", "name": { "en": "Navy", "ar": "كحلي" }, "chroma": "muted" }
```

`chroma: "bright"` marks attention-grabbing colors (outfits allow one, two for "bright" moods). `fixed: true` is for patterns like the red-and-white shemagh, which are never recolored. `groups` (`@neutral`, `@earth`, `@denim`, `@pastel`, `@jewel`, `@bright`, `@leather`) can be used in an item's `colors`.

`src/data/colors/palettes.json` holds curated palettes:

```json
{ "id": "navy-white-camel", "strategy": "neutral-accent", "moods": ["classic", "muted"],
  "base": "navy", "secondary": "white", "accent": "camel", "ground": "brown", "outer": "camel",
  "bands": ["mild", "warm"] }
```

- **strategy**: `neutral-accent`, `analogous`, `complementary` or `monochrome` (drives the explanation shown to the user)
- **moods**: matched against the occasion's `moods` (`classic`, `muted`, `fresh`, `bright`, `earthy`)
- **roles**: bottoms and dresses take `base`; tops `secondary`; coats `outer`; warm layers, hijabs and scarves `accent`; shoes, bags and gloves `ground` (an evening clutch takes `accent`)
- **bands** (optional): temperature bands the palette suits

For each outfit the engine tries every palette, gives each piece its role color (or the nearest color the item comes in), and scores the result on mood, how many pieces got exact colors, dark colors in strong sun, near-miss shades (e.g. navy next to black), too many bright colors and top/bottom contrast. Each alternative outfit gets a different palette.

## How an outfit is built

1. Weather is summarized over the whole stay (start → start + duration).
2. Personal details shift the weather and add preferences (see below), then matching rules are merged into needs, requirements, exclusions and preferences.
3. Layers: an outer layer is used below 17 °C feels-like (marked *take along* if only the evening is cold), and a warm mid layer below ~9 °C.
4. Each slot's candidates are scored on temperature fit, formality, rule preferences, fabric and the user's past choices. With *My closet* on, only owned items are candidates unless none of them suits the weather; then other items are used and marked "not in your closet" (accessories and eyewear are always offered, reminders like sunscreen are never marked).
5. Top + bottom (or a one-piece) pairs are combined with the best outer, mid, shoes, socks, head and extras, with a coherence penalty for clashing formality.
6. The best three outfits that differ in at least two main pieces are returned, with the reasons.

## Personal details

All optional and stored on the device only (`src/engine/personal.ts`):

| Detail | Effect |
|---|---|
| "I feel the cold / the heat" | dresses for a feels-like 2.5 °C colder / warmer than the forecast |
| Age 51–65 / over 65 | +1 °C / +2.5 °C warmer; comfortable shoes (`slip-on`, `closed`, `grip`) up, `sporty` down; no `heels` over 65 |
| Age under 31 | `sneakers`, `layer` (and `hood` for teens) up; teens less `tailored` / `formal` |
| Fuller build (BMI ≥ 27) | `loose`, `flowy`, `long-top`, `breathable` up; `fitted` down |
| Slim build (BMI < 18.5) | `layer` up |
| Height | the `long` tag a little up for tall people, down for petite; the character is drawn taller or shorter |

Rules and the explanations still use the real forecast; only the scoring and the layer choice use the shifted temperature. The character is scaled from height (vertically) and build (horizontally) within fixed limits.

## Trips

`src/engine/trip.ts` plans one outfit per day for 08:00–22:00 (today: from now). The first and last day can be travel days. Days after the first keep its palette, items already packed in reusable slots (outer, mid, bottom, shoes, head, accessories) get +2 and tops already packed −1, so the bag stays small but tops change. The packing list counts tops and socks once per day worn and everything else once, one line per item and color. Beyond the 16-day forecast, days use typical weather for the month.

## Morning reminder

On Android, `src/features/reminder` schedules a local notification for each of the next 7 mornings with that day's outfit for the last place and occasion used, from the saved forecast (or typical weather). They are rescheduled every time the app opens, so the text follows the latest forecast. Permission is asked only when the reminder is switched on.

## Tuning

```powershell
$env:CASES="aqabaSummer,modest,casual;ammanSnow,male,work"; npx vitest run src/engine/print.test.ts --reporter=dot
```

prints the generated outfits for named scenarios in `src/engine/scenarios.ts`.
