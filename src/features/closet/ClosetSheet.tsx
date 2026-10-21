import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Search } from 'lucide-react'
import type { Lang, Profile } from '@/engine/types'
import type { ClothingItem, Slot } from '@/engine/outfit-types'
import { DATA } from '@/engine/catalog'
import { useApp } from '@/app/store'
import { SLOT_ORDER } from '@/features/outfit/OutfitList'
import { Sheet, Switch, cx } from '@/ui'

/** Items this profile can be offered: their own style first, then standard pieces the engine may fall back to. */
export function closetItems(profile: Pick<Profile, 'gender' | 'style'>): ClothingItem[] {
  return DATA.items.filter(
    (i) => i.gender.includes(profile.gender) && (i.style.includes(profile.style) || i.style.includes('standard')) && !i.tags.includes('reminder'),
  )
}

export function ClosetSheet({ open, onClose, profile }: { open: boolean; onClose: () => void; profile: Profile }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language as Lang
  const { closet, setClosetEnabled, setOwned } = useApp()
  const [query, setQuery] = useState('')
  const owned = useMemo(() => new Set(closet.owned), [closet.owned])

  const items = useMemo(() => closetItems(profile), [profile])
  const q = query.trim().toLowerCase()
  const shown = q ? items.filter((i) => i.name.en.toLowerCase().includes(q) || i.name.ar.includes(query.trim())) : items
  const groups = SLOT_ORDER.map((slot) => ({ slot, items: shown.filter((i) => i.slot === slot) })).filter((g) => g.items.length > 0)
  const count = items.filter((i) => owned.has(i.id)).length

  const slotTitle = (slot: Slot) => t(`slot.${slot}`)

  return (
    <Sheet open={open} onClose={onClose} title={t('closet.title')} closeLabel={t('common.close')}>
      <div className="flex flex-col gap-4 py-3">
        <Switch checked={closet.enabled} onChange={setClosetEnabled} label={t('closet.only')} hint={t('closet.onlyHint', { count })} />
        <label className="flex items-center gap-2 rounded-control border border-border bg-surface-2 px-3 focus-within:border-primary">
          <Search size={18} className="text-muted" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('closet.search')}
            aria-label={t('closet.search')}
            className="h-11 w-full bg-transparent outline-none"
          />
        </label>
        {groups.map((g) => {
          const all = g.items.every((i) => owned.has(i.id))
          return (
            <section key={g.slot} className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted">{slotTitle(g.slot)}</h3>
                <button
                  type="button"
                  className="min-h-10 px-2 text-sm font-medium text-primary"
                  onClick={() => setOwned(g.items.map((i) => i.id), !all)}
                >
                  {all ? t('closet.clearAll') : t('closet.selectAll')}
                </button>
              </div>
              <ul className="flex flex-wrap gap-2">
                {g.items.map((i) => {
                  const on = owned.has(i.id)
                  return (
                    <li key={i.id}>
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={on}
                        onClick={() => setOwned([i.id], !on)}
                        className={cx(
                          'inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors',
                          on ? 'border-primary bg-primary-soft' : 'border-border bg-surface',
                        )}
                      >
                        {on && <Check size={14} strokeWidth={3} aria-hidden />}
                        {i.name[lang]}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
        {groups.length === 0 && <p className="py-6 text-center text-muted">{t('closet.noMatch')}</p>}
      </div>
    </Sheet>
  )
}
