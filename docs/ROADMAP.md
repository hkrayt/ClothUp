# ClothUp roadmap after v1.0

Same workflow as before: one branch per release, small conventional commits, PR + CI, merge, tagged release with builds.

| Version | Focus | Status |
|---|---|---|
| **v1.1** | Weather data: 74 places incl. Amman neighbourhoods, more weather variables, "feels in the sun", hourly chart, 16-day forecast, monthly climate averages, faster caching | released |
| **v1.2** | Clothes: 58 new items (188 total), patterns, 8 new occasions (beach, condolence visit, Friday prayer, job interview, dinner, Eid, iftar, shopping), office-AC and wind rules, new character parts, tests on real past weather | in review |
| **v1.3** | Personal: My closet (suggest only what you own), "I run cold / hot", saved and shared outfits | planned |
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

## Open questions for later releases

1. Niqab: left out for now (decided for v1.2).
2. Beach occasion with swimwear: added in v1.2 (burkini for modest style).
3. OK to ask for notification permission on Android (morning reminder, v1.4)?
4. Modest/traditional styling and Arabic names: reviewed by the owner (v1.2).
5. Will the app stay free? (affects the weather provider)
