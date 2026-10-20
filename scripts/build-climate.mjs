// Builds src/data/climate.json: monthly climate averages for every place, from Open-Meteo's
// historical archive (ERA5 reanalysis, elevation-corrected). Run occasionally, not at build time:
//   node scripts/build-climate.mjs            (all places)
//   node scripts/build-climate.mjs amman ...  (only these ids, merged into the existing file)
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const START = '2022-01-01'
const END = '2024-12-31'
const DAILY = [
  'temperature_2m_max',
  'temperature_2m_min',
  'apparent_temperature_max',
  'apparent_temperature_min',
  'precipitation_sum',
  'wind_speed_10m_max',
  'relative_humidity_2m_mean',
]
const OUT = 'src/data/climate.json'
const PAUSE_MS = 9000 // stay well inside the free API's per-minute limit

const places = JSON.parse(readFileSync('src/data/places.json', 'utf8'))
const only = process.argv.slice(2)
const out = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : { source: '', places: {} }
out.source = `Open-Meteo historical archive (ERA5), ${START.slice(0, 4)}–${END.slice(0, 4)}, monthly means`

const round1 = (n) => Math.round(n * 10) / 10
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function fetchArchive(p) {
  const url =
    `https://archive-api.open-meteo.com/v1/archive?latitude=${p.lat}&longitude=${p.lon}&elevation=${p.elevation}` +
    `&start_date=${START}&end_date=${END}&daily=${DAILY.join(',')}&timezone=Asia%2FAmman`
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(url)
    if (res.ok) return res.json()
    console.warn(`  ${p.id}: HTTP ${res.status}, retrying in ${attempt * 30}s`)
    await sleep(attempt * 30000)
  }
  throw new Error(`failed for ${p.id}`)
}

/** [tMax, tMin, feelsMax, feelsMin, rainDayShare, precipMm, windMax, humidity] for each month. */
function monthly(daily) {
  const years = new Set(daily.time.map((t) => t.slice(0, 4))).size
  return Array.from({ length: 12 }, (_, m) => {
    const idx = daily.time.map((t, i) => (Number(t.slice(5, 7)) === m + 1 ? i : -1)).filter((i) => i >= 0)
    const avg = (k) => {
      const v = idx.map((i) => daily[k][i]).filter((x) => typeof x === 'number')
      return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0
    }
    const precip = idx.map((i) => daily.precipitation_sum[i] ?? 0)
    return [
      round1(avg('temperature_2m_max')),
      round1(avg('temperature_2m_min')),
      round1(avg('apparent_temperature_max')),
      round1(avg('apparent_temperature_min')),
      Math.round((precip.filter((x) => x >= 1).length / idx.length) * 100) / 100,
      round1(precip.reduce((a, b) => a + b, 0) / years),
      round1(avg('wind_speed_10m_max')),
      Math.round(avg('relative_humidity_2m_mean')),
    ]
  })
}

const todo = places.filter((p) => (only.length ? only.includes(p.id) : !out.places[p.id]))
console.log(`fetching ${todo.length} places`)
for (const [n, p] of todo.entries()) {
  const j = await fetchArchive(p)
  out.places[p.id] = monthly(j.daily)
  writeFileSync(OUT, JSON.stringify(out) + '\n')
  console.log(`${n + 1}/${todo.length} ${p.id}: Jan ${out.places[p.id][0].slice(0, 4)} Jul ${out.places[p.id][6].slice(0, 4)}`)
  if (n < todo.length - 1) await sleep(PAUSE_MS)
}
console.log('done')
