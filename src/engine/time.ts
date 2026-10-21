/**
 * Time helpers. All forecast times are Amman wall-clock strings ("YYYY-MM-DDTHH:00").
 * Jordan stays on UTC+3 all year (no DST since 2022), so plain hour arithmetic is safe.
 */

export const AMMAN_TZ = 'Asia/Amman'

const pad = (n: number) => String(n).padStart(2, '0')

function fromUTCParts(ms: number): string {
  const d = new Date(ms)
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:00`
}

function toUTCms(local: string): number {
  const [date, time = '00:00'] = local.split('T')
  const [y, m, d] = date.split('-').map(Number)
  const [h] = time.split(':').map(Number)
  return Date.UTC(y, m - 1, d, h)
}

/** Current hour in Amman, e.g. "2026-10-20T14:00". */
export function ammanNow(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: AMMAN_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00'
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:00`
}

export function addHours(local: string, hours: number): string {
  return fromUTCParts(toUTCms(local) + hours * 3_600_000)
}

export function hoursBetween(a: string, b: string): number {
  return Math.round((toUTCms(b) - toUTCms(a)) / 3_600_000)
}

export function hourOf(local: string): number {
  return Number(local.slice(11, 13))
}

export function dateOf(local: string): string {
  return local.slice(0, 10)
}

/** Builds a local time string from a date ("YYYY-MM-DD") and an hour. */
export function atHour(date: string, hour: number): string {
  return `${date}T${pad(hour)}:00`
}

/** The real moment of an Amman wall-clock time (UTC+3 all year). */
export function ammanMoment(date: string, hour: number, minute = 0): Date {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, hour - 3, minute))
}
