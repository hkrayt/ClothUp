import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useApp } from '@/app/store'
import { Switch } from '@/ui'
import { reminderSupported, requestReminderPermission } from './reminder'

/** Morning reminder switch and time (Android only). Permission is asked only when it's switched on. */
export function ReminderSettings() {
  const { t } = useTranslation()
  const reminder = useApp((s) => s.reminder)
  const setReminder = useApp((s) => s.setReminder)
  const [denied, setDenied] = useState(false)

  if (!reminderSupported()) return null

  const toggle = async (on: boolean) => {
    if (!on) return setReminder({ enabled: false })
    const ok = await requestReminderPermission().catch(() => false)
    setDenied(!ok)
    setReminder({ enabled: ok })
  }

  return (
    <div className="flex flex-col gap-3">
      <Switch checked={reminder.enabled} onChange={(on) => void toggle(on)} label={t('reminder.setting')} hint={t('reminder.settingHint')} />
      {reminder.enabled && (
        <label className="flex items-center justify-between gap-3 rounded-control border border-border bg-surface-2 px-4 py-2">
          <span className="font-medium">{t('reminder.time')}</span>
          <input type="time" value={reminder.time} onChange={(e) => e.target.value && setReminder({ time: e.target.value })} className="h-10 bg-transparent text-base font-semibold outline-none" />
        </label>
      )}
      {denied && <p className="text-sm text-danger">{t('reminder.denied')}</p>}
    </div>
  )
}
