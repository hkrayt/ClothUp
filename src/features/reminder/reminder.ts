/**
 * Morning reminder (Android): one notification each morning with that day's suggested outfit.
 * Notifications are scheduled ahead for the next week from the saved forecast, and rescheduled
 * whenever the app opens, so the text follows the latest forecast.
 */
import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import type { TFunction } from 'i18next'
import type { Forecast, Lang, Occasion, Place, Profile, WeatherContext } from '@/engine/types'
import type { Outfit } from '@/engine/outfit-types'
import { DATA } from '@/engine/catalog'
import { generateOutfits } from '@/engine/outfit'
import { addHours, ammanMoment, ammanNow, atHour, dateOf } from '@/engine/time'
import { dayWindow } from '@/engine/trip'
import { sortPieces } from '@/features/outfit/OutfitList'
import { stayContext } from '@/features/weather/stay'

/** Notification ids used for the reminders (one per day ahead). */
const BASE_ID = 7100
export const REMINDER_DAYS = 7

export const reminderSupported = () => Capacitor.isNativePlatform()

/** Parses "HH:MM" (defaults to 07:30). */
export function parseTime(time: string): { hour: number; minute: number } {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time)
  const hour = m ? Math.min(23, Number(m[1])) : 7
  const minute = m ? Math.min(59, Number(m[2])) : 30
  return { hour, minute }
}

/** The mornings to schedule: today if the time hasn't passed yet, then the following days. */
export function reminderDays(time: string, now: Date = new Date(), days = REMINDER_DAYS): Array<{ id: number; date: string; at: Date }> {
  const { hour, minute } = parseTime(time)
  const today = dateOf(ammanNow(now))
  const out: Array<{ id: number; date: string; at: Date }> = []
  for (let i = 0; out.length < days && i <= days; i++) {
    const date = dateOf(addHours(atHour(today, 12), 24 * i))
    const at = ammanMoment(date, hour, minute)
    if (at.getTime() > now.getTime()) out.push({ id: BASE_ID + out.length, date, at })
  }
  return out
}

/** Title and body for one morning, e.g. "Amman today: 8°–14°" / "Rain likely. Wear: wool coat, jeans, boots. Take: umbrella". */
export function reminderText(t: TFunction, lang: Lang, placeName: string, ctx: WeatherContext | null, outfit: Outfit | null): { title: string; body: string } {
  if (!ctx || !outfit) return { title: t('reminder.genericTitle'), body: t('reminder.genericBody') }
  const title = t('reminder.title', { place: placeName, min: Math.round(ctx.feelsMin), max: Math.round(ctx.feelsMax) })
  const pieces = sortPieces(outfit.pieces)
  const wear = pieces.filter((p) => !p.carry && !['accessory', 'eyewear', 'socks'].includes(p.slot)).map((p) => p.item.name[lang])
  const take = pieces.filter((p) => p.carry || p.slot === 'accessory').map((p) => p.item.name[lang])
  const parts: string[] = []
  if (ctx.rainProb >= 50) parts.push(t('reminder.rain', { p: ctx.rainProb }))
  parts.push(t('reminder.wear', { items: wear.join(lang === 'ar' ? '، ' : ', ') }))
  if (take.length) parts.push(t('reminder.take', { items: take.slice(0, 3).join(lang === 'ar' ? '، ' : ', ') }))
  return { title, body: parts.join(' ') }
}

export interface ReminderInput {
  time: string
  place: Place
  forecast: Forecast | null
  profile: Profile
  occasion: Occasion
  owned?: string[]
  prefs?: Record<string, number>
  t: TFunction
  lang: Lang
}

/** The notifications for the coming mornings. Pure, so it can be tested without a device. */
export function buildReminders(input: ReminderInput, now: Date = new Date()) {
  return reminderDays(input.time, now).map(({ id, date, at }) => {
    const { start, hours } = dayWindow(date, atHour(date, 8))
    const ctx = stayContext(input.forecast, input.place, start, hours)
    const [outfit] = ctx ? generateOutfits(ctx, input.profile, input.occasion, DATA, { prefs: input.prefs, owned: input.owned, count: 1 }) : []
    const { title, body } = reminderText(input.t, input.lang, input.place.name[input.lang], ctx, outfit ?? null)
    return { id, title, body, schedule: { at, allowWhileIdle: false } }
  })
}

/** Asks for notification permission if needed. */
export async function requestReminderPermission(): Promise<boolean> {
  const current = await LocalNotifications.checkPermissions()
  if (current.display === 'granted') return true
  const asked = await LocalNotifications.requestPermissions()
  return asked.display === 'granted'
}

export async function cancelReminders(): Promise<void> {
  const ids = Array.from({ length: REMINDER_DAYS + 1 }, (_, i) => ({ id: BASE_ID + i }))
  await LocalNotifications.cancel({ notifications: ids })
}

/** Replaces the scheduled reminders with fresh ones (no-op without permission). */
export async function scheduleReminders(input: ReminderInput): Promise<void> {
  const perm = await LocalNotifications.checkPermissions()
  if (perm.display !== 'granted') return
  await cancelReminders()
  await LocalNotifications.schedule({ notifications: buildReminders(input).map((n) => ({ ...n, smallIcon: 'ic_stat_clothup' })) })
}
