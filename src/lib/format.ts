import type { Lang } from '@/engine/types'
import { addHours, ammanNow, dateOf } from '@/engine/time'

/** Locales with Western (Latin) digits, which most people in Jordan use day to day. */
const LOCALE: Record<Lang, string> = { en: 'en-US', ar: 'ar-JO-u-nu-latn' }

function asUTCDate(local: string): Date {
  const [d, t = '00:00'] = local.split('T')
  return new Date(`${d}T${t.slice(0, 5)}:00Z`)
}

export function formatTemp(t: number): string {
  return `${Math.round(t)}°`
}

export function formatHour(local: string, lang: Lang): string {
  return new Intl.DateTimeFormat(LOCALE[lang], { hour: 'numeric', timeZone: 'UTC' }).format(asUTCDate(local))
}

export function formatWeekday(local: string, lang: Lang): string {
  return new Intl.DateTimeFormat(LOCALE[lang], { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
    asUTCDate(local),
  )
}

/** "today", "tomorrow" or null for later days. */
export function relativeDay(local: string): 'today' | 'tomorrow' | null {
  const today = dateOf(ammanNow())
  if (dateOf(local) === today) return 'today'
  if (dateOf(local) === dateOf(addHours(`${today}T12:00`, 24))) return 'tomorrow'
  return null
}

export function minutesAgo(ts: number, now = Date.now()): number {
  return Math.max(0, Math.round((now - ts) / 60_000))
}
