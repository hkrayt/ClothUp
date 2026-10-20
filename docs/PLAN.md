# ClothUp (لبسني) — Implementation Plan

Weather-based outfit suggestions for Jordan. Very clean, simple design; a suggestion in ≤ 3 taps after first setup.

## Decisions

| Topic | Decision |
|---|---|
| Stack | React + TypeScript + Vite, Tailwind v4, Zustand, i18next |
| Android | Capacitor (system WebView, ~5–8 MB APK) |
| Desktop | Tauri 2 (WebView2 on Windows; small installers) |
| Weather | Open-Meteo forecast + air-quality (dust) APIs — free, no key; `elevation` passed per place; `timezone=Asia/Amman`; dates limited to 7 days |
| Repo | Public, `hkrayt/ClothUp`, MIT |
| Stay duration | "How long?" chip (2 h / half day / full day / into the night), default 3 h |
| Styles | Male: Standard, Traditional (thobe, shemagh + iqal, bisht). Female: Standard, Modest |
| Character | Flat, faceless, 5 skin tones (Settings), default mid tone |
| Signing | Release keystore generated locally, stored outside the repo, values in GitHub Secrets |
| Store | Maybe later, free → AAB built every release; stay on Open-Meteo free tier |
| Names | English "ClothUp", Arabic «لبسني» |
| Units | °C, km/h, Western digits |

## Architecture

```
src/
  app/        shell, router, settings, theme/dir
  features/   onboarding, questions, weather, outfit, character, settings
  engine/     pure TS: context.ts, rules.ts, outfit.ts, color.ts, explain.ts
  data/       places, occasions, fabrics, clothing/*, rules/*, colors/*
  ui/         design system
  i18n/       en.json, ar.json
  lib/        storage, geo, arabic normalization
```

Flow: answers → `fetchForecast(place)` (cached) → `buildContext(forecast, start, duration)` → `generateOutfits(context, profile, occasion)` → `applyPalette()` → render.

Caching: forecasts per place in IndexedDB, fresh for 1 h; offline shows cached data with its age, or a clear retry state.

## Data model

- **Place**: `id, name{en,ar}, lat, lon, elevation, zone, aliases[]`
- **WeatherContext** (computed): feels min/max/now over the stay, temp band, day/night swing, rain probability, precipitation, snow, wind and gusts, humidity, max UV, dust level, night, zone
- **Clothing item**: `id, slot, name{en,ar}, gender[], style[], occasions[], formality 1–5, warmth 0–5, feelsRange[min,max], tags[], coverage, fabrics[], colors[], svg{part,variant}`
- **Occasion**: `id, formality range, moods[], hard{require, requireIf, excludeTags}`
- **Rule**: `id, priority, when{field:{gte|lte|eq|in}}, then{require, exclude, prefer, add, preferFabrics}, reason`
  Priority: occasion/modesty hard rules > weather safety > comfort > style
- **Color**: `id, hex, name{en,ar}, family, tone, chroma`
- **Palette**: `id, strategy (neutral-accent | analogous | complementary | monochrome), mood, occasions[], bands[], roles{base, secondary, accent, ground}, note`

Engine: filter per slot → score (temperature fit, formality, rule preferences, user history) → beam search → 3 diverse outfits → color assignment with OKLCH checks (reject near-miss shades, at most one bright accent unless the mood is bright, light colors in strong sun).

## SVG character

One `<svg viewBox="0 0 240 640">` with a fixed anchor skeleton. Draw order (back to front):
`body → hair → socks → bottom → shoes → top → mid → outer → scarf → head → eyewear → bag → umbrella`.
Garments are TSX parts painted with `--c` / `--c-shade` CSS variables. Each layer is a focusable `<g data-slot role="button">`: hovering or tapping it highlights the layer and opens its details with a **Change** action. The character is never mirrored for RTL.

## GitHub workflow

- `main` holds released code; each milestone gets `milestone/N-name` → PR → merge commit → tag `v0.N.0` (M8 = `v1.0.0`)
- Conventional commits (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`, `ci:`)
- `ci.yml`: lint, typecheck, tests, web build on every push/PR
- `release.yml` (tags): draft release with git-cliff notes → Android APK/AAB, Windows NSIS/MSI, macOS universal DMG, Linux AppImage/deb → publish

## Milestones

1. Project setup, repo, CI, design system — v0.1.0
2. Locations, weather fetching, weather card — v0.2.0
3. Question flow — v0.3.0
4. Outfit rules engine + clothing data — v0.4.0
5. Color combination engine — v0.5.0
6. SVG character with dynamic layers — v0.6.0
7. Alternatives, item swapping, saved preferences, Arabic/RTL, dark mode — v0.7.0
8. Polish, testing, builds — v1.0.0

## Risks

- Open-Meteo's free tier is non-commercial; the provider sits behind an interface so it can be swapped
- Forecasts are coarse in rugged terrain (Dead Sea, wadis); dust comes from a model and is shown as "dust risk"
- Illustration effort; kept manageable with a shared skeleton, garment templates and recoloring
- Cultural accuracy of modest and traditional styles needs native review
- Installers are unsigned (SmartScreen / Gatekeeper warnings)
- The Android keystore must be backed up; losing it blocks updates
