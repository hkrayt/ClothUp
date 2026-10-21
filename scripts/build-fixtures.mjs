// Builds src/engine/fixtures/era5.json: real past days (ERA5 reanalysis via Open-Meteo's archive)
// used as test fixtures, so the outfit engine is checked against real Jordan weather.
//   node scripts/build-fixtures.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const CASES = [
  { id: 'amman-snow-2022', place: 'amman', date: '2022-01-26', start: '08:00', hours: 6, note: 'January 2022 snowstorm' },
  { id: 'karak-snow-2022', place: 'karak', date: '2022-01-27', start: '09:00', hours: 4, note: 'Snow on the southern highlands' },
  { id: 'aqaba-heat-2023', place: 'aqaba', date: '2023-07-17', start: '12:00', hours: 4, note: 'July 2023 heatwave' },
  { id: 'dead-sea-spring-2023', place: 'dead-sea', date: '2023-04-10', start: '11:00', hours: 3, note: 'Spring day at the Dead Sea' },
  { id: 'wadi-rum-dec-2022', place: 'wadi-rum', date: '2022-12-15', start: '15:00', hours: 10, note: 'Desert afternoon into a cold night' },
  { id: 'irbid-winter-2023', place: 'irbid', date: '2023-01-18', start: '08:00', hours: 6, note: 'Winter day in the north' },
  { id: 'amman-summer-2023', place: 'amman', date: '2023-08-01', start: '10:00', hours: 8, note: 'Summer workday in Amman' },
]
const HOURLY = [
  'temperature_2m',
  'apparent_temperature',
  'relative_humidity_2m',
  'precipitation',
  'snowfall',
  'weather_code',
  'wind_speed_10m',
  'wind_gusts_10m',
  'is_day',
  'wind_direction_10m',
  'cloud_cover',
  'dew_point_2m',
  'shortwave_radiation',
  'snow_depth',
]

const places = Object.fromEntries(JSON.parse(readFileSync('src/data/places.json', 'utf8')).map((p) => [p.id, p]))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const out = []

for (const c of CASES) {
  const p = places[c.place]
  const url =
    `https://archive-api.open-meteo.com/v1/archive?latitude=${p.lat}&longitude=${p.lon}&elevation=${p.elevation}` +
    `&start_date=${c.date}&end_date=${c.date}&hourly=${HOURLY.join(',')}&timezone=Asia%2FAmman`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${c.id}: HTTP ${res.status}`)
  const h = (await res.json()).hourly
  const n = (v) => (typeof v === 'number' ? Math.round(v * 10) / 10 : 0)
  const hours = h.time.map((time, i) => ({
    time,
    temp: n(h.temperature_2m[i]),
    feels: n(h.apparent_temperature[i]),
    humidity: n(h.relative_humidity_2m[i]),
    // The archive has no probabilities: rain that actually fell counts as a certain forecast.
    precipProb: (h.precipitation[i] ?? 0) >= 0.2 ? 90 : 0,
    precip: n(h.precipitation[i]),
    snow: n(h.snowfall[i]),
    code: h.weather_code[i] ?? 0,
    wind: n(h.wind_speed_10m[i]),
    gust: n(h.wind_gusts_10m[i]),
    // No UV in the archive: estimate it from solar radiation (~1000 W/m² ≈ UV 11).
    uv: n((h.shortwave_radiation[i] ?? 0) / 90),
    isDay: h.is_day[i] === 1,
    visibility: null,
    dust: null,
    windDir: h.wind_direction_10m[i] ?? null,
    cloud: h.cloud_cover[i] ?? null,
    dewPoint: h.dew_point_2m[i] ?? null,
    radiation: h.shortwave_radiation[i] ?? null,
    freezingLevel: null,
    snowDepth: h.snow_depth[i] ?? null,
  }))
  out.push({ ...c, elevation: p.elevation, hoursData: hours })
  console.log(`${c.id}: ${hours.length} h, ${Math.min(...hours.map((x) => x.feels))}…${Math.max(...hours.map((x) => x.feels))} °C feels, precip ${hours.reduce((a, x) => a + x.precip, 0).toFixed(1)} mm, snow ${hours.reduce((a, x) => a + x.snow, 0).toFixed(1)} cm`)
  await sleep(3000)
}

mkdirSync('src/engine/fixtures', { recursive: true })
writeFileSync('src/engine/fixtures/era5.json', JSON.stringify({ source: 'Open-Meteo historical archive (ERA5)', cases: out }) + '\n')
console.log('done')
