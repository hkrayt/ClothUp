import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { Lang } from '@/engine/types'
import { useApp } from '@/app/store'
import { useHydrated } from '@/app/nav'
import { getOccasion } from '@/features/questions/occasions'
import { resolvePlace } from '@/features/questions/HomeScreen'
import { getForecast, readCachedForecast } from '@/features/weather/cache'
import { cancelReminders, reminderSupported, scheduleReminders } from './reminder'

/**
 * Keeps the morning reminders up to date: rescheduled when the app opens and whenever the
 * reminder, the profile, the last place or occasion, or the language change.
 */
export function useReminderSync() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language as Lang
  const reminder = useApp((s) => s.reminder)
  const profile = useApp((s) => s.profile)
  const place = useApp((s) => s.plan.place)
  const occasion = useApp((s) => s.plan.occasion)
  const closet = useApp((s) => s.closet)
  // Wait for saved settings, so a reminder that is on is not cancelled at startup.
  const hydrated = useHydrated()

  useEffect(() => {
    if (!hydrated || !reminderSupported() || !profile) return
    if (!reminder.enabled) {
      void cancelReminders().catch(() => undefined)
      return
    }
    let cancelled = false
    const p = resolvePlace(place)
    void (async () => {
      // The saved forecast is enough; fetch only if there's none. Without any, typical weather is used.
      const forecast = (await readCachedForecast(p)) ?? (await getForecast(p).then((r) => r.forecast).catch(() => null))
      if (cancelled) return
      const { itemPrefs } = useApp.getState()
      const owned = closet.enabled && closet.owned.length > 0 ? closet.owned : undefined
      await scheduleReminders({ time: reminder.time, place: p, forecast, profile, occasion: getOccasion(occasion), owned, prefs: itemPrefs, t, lang })
    })().catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [hydrated, reminder.enabled, reminder.time, profile, place, occasion, closet, t, lang])
}
