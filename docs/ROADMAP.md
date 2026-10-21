# ClothUp roadmap after v1.0

Same workflow as before: one branch per release, small conventional commits, PR + CI, merge, tagged release with builds.

| Version | Focus | Status |
|---|---|---|
| **v1.1** | Weather data: 74 places incl. Amman neighbourhoods, more weather variables, "feels in the sun", hourly chart, 16-day forecast, monthly climate averages, faster caching | released |
| **v1.2** | Clothes: 78 new items (208 total), 10 new palettes, patterns, shading and depth on the character, 8 new occasions (beach, condolence visit, Friday prayer, job interview, dinner, Eid, iftar, shopping), office-AC and wind rules, new character parts, tests on real past weather | in review |
| **v1.3** | Personal: height, weight and age in the profile (shape the character and the suggestions), My closet (suggest only what you own), "I run cold / hot", saved and shared outfits | planned |
| **v1.4** | Planning: multi-day trip planner with packing list, morning reminder notification | planned |
| later | Android widget, family profiles, backup weather provider (MET Norway), ensemble forecast confidence | ideas |

## v1.1 — weather data

- **Places**: from 21 to ~60 — every governorate centre and large town, tourist spots with their own microclimate (Mount Nebo, Ma'in, Baptism Site, Wadi Mujib, Little Petra, Feynan, Dibeen, Disi, Tala Bay), Amman neighbourhoods across its 700–1100 m range, universities and the airport. Each place gets a `type` and `governorate`; the picker groups by governorate.
- **More variables** from Open-Meteo: wind direction, cloud cover, dew point, solar radiation, freezing level, snow depth (visibility is already used).
- **Feels like in the sun**: a sun-adjusted temperature from radiation and wind, used by the outfit engine for outdoor occasions.
- **Fog** detection from visibility (Irbid, Ajloun, Salt winter mornings).
- **Hourly chart** of feels-like and rain chance across the stay on the weather card.
- **16-day forecast**, labelled "less certain" after day 7.
- **Monthly climate averages** for every place (from Open-Meteo's historical archive, built into the app), for an offline fallback and "typical weather" when there's no forecast.
- **Caching**: show the saved forecast instantly and refresh it in the background.

## v1.3 — personal

- **Height, weight and age** (all optional, kept on the device only, never sent anywhere):
  - **Character**: drawn taller or shorter and slimmer or fuller from height and weight, so the clothes are shown on a body like yours.
  - **Age group** (e.g. under 18, 18–30, 31–50, 51–65, over 65): older people usually feel the cold more, so their outfits aim about 2 °C warmer, with extra layers and a hat sooner on cold days; comfortable flat shoes and classic cuts are preferred, very sporty or trendy pieces less so. Teenagers and young adults get more casual and trend-led pieces (sneakers, overshirts, track jackets).
  - **Body and fit**: a fuller build favours looser, flowing cuts (straight trousers, longer tops and cardigans, A-line skirts) and breathable fabrics in the heat; a slim build can take slim and layered looks.
  - **Height**: affects lengths — maxi and midi hems, long coats and abayas are chosen and drawn to suit.
  - All of this only adjusts scores; weather and occasion rules (rain, modest coverage, dress codes) still come first.
- **My closet**: mark the items you own; suggestions use only those, with a hint for what's missing.
- **"I run cold / hot"**: a personal offset on top of the age adjustment.
- **Saved and shared outfits**.

## Open questions for later releases

1. Niqab: left out for now (decided for v1.2).
2. Beach occasion with swimwear: added in v1.2 (burkini for modest style).
3. OK to ask for notification permission on Android (morning reminder, v1.4)?
4. Modest/traditional styling and Arabic names: reviewed by the owner (v1.2).
5. Will the app stay free? (affects the weather provider)
