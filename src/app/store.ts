import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Duration, OccasionId, Place, Profile, When } from '@/engine/types'
import type { OutfitPiece, Slot } from '@/engine/outfit-types'
import type { Localized } from '@/engine/types'
import { addHours, ammanNow, atHour, dateOf } from '@/engine/time'
import { kvStorage } from '@/lib/storage'

export interface Plan {
  /** A known place id, or a full Place for the current location. */
  place: string | Place
  when: When
  duration: Duration
  occasion: OccasionId
}

/** "My closet": the items the user owns. */
export interface Closet {
  /** Suggest only owned items (where something owned suits the weather). */
  enabled: boolean
  owned: string[]
}

/** A piece of a saved outfit: the item and how it was colored. */
export type SavedPiece = Pick<OutfitPiece, 'slot' | 'fabric' | 'carry' | 'color' | 'pattern' | 'patternColor'> & { itemId: string; slot: Slot }

export interface SavedOutfit {
  id: string
  savedAt: number
  placeName: Localized
  occasion: OccasionId
  /** Feels-like range during the stay, for the card. */
  feels: [number, number]
  pieces: SavedPiece[]
}

export const SAVED_LIMIT = 30

/** A multi-day trip being planned, with what's already packed. */
export interface Trip {
  place: string | Place
  /** First day, "YYYY-MM-DD". */
  startDate: string
  days: number
  occasion: OccasionId
  /** First and last days are travel days. */
  travelDays: boolean
  /** Packing-list keys (item id + color) already in the bag. */
  packed: string[]
}

/** Morning reminder (Android): a notification with the day's outfit at a set time. */
export interface Reminder {
  enabled: boolean
  /** "HH:MM", Amman time. */
  time: string
}

interface AppState {
  profile: Profile | null
  plan: Plan
  /** How often each place was used, for "frequent places" chips. */
  placeUsage: Record<string, number>
  setProfile: (profile: Profile) => void
  updateProfile: (patch: Partial<Profile>) => void
  setPlan: (patch: Partial<Plan>) => void
  /** Records that a suggestion was requested for the current plan. */
  recordUse: () => void
  /** Item id → score bonus learned from swaps (chosen items up, replaced items down). */
  itemPrefs: Record<string, number>
  recordSwap: (fromId: string, toId: string) => void
  resetPrefs: () => void
  closet: Closet
  setClosetEnabled: (enabled: boolean) => void
  /** Marks items as owned (or not). */
  setOwned: (ids: string[], owned: boolean) => void
  saved: SavedOutfit[]
  saveOutfit: (outfit: Omit<SavedOutfit, 'id' | 'savedAt'>) => string
  removeSaved: (id: string) => void
  trip: Trip | null
  setTrip: (patch: Partial<Trip>) => void
  reminder: Reminder
  setReminder: (patch: Partial<Reminder>) => void
}

/** A new trip starts tomorrow, for three days, from the last place used. */
export function newTrip(plan: Plan, today: string): Trip {
  return { place: plan.place, startDate: dateOf(addHours(atHour(today, 12), 24)), days: 3, occasion: 'casual', travelDays: true, packed: [] }
}

const clampPref = (n: number) => Math.max(-4, Math.min(4, Math.round(n * 10) / 10))

export const DEFAULT_PLAN: Plan = { place: 'amman', when: { kind: 'now' }, duration: 3, occasion: 'casual' }

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      profile: null,
      plan: DEFAULT_PLAN,
      placeUsage: {},
      setProfile: (profile) => set({ profile }),
      updateProfile: (patch) => {
        const current = get().profile
        if (current) set({ profile: { ...current, ...patch } })
      },
      setPlan: (patch) => set({ plan: { ...get().plan, ...patch } }),
      recordUse: () => {
        const { plan, placeUsage } = get()
        if (typeof plan.place !== 'string') return
        set({ placeUsage: { ...placeUsage, [plan.place]: (placeUsage[plan.place] ?? 0) + 1 } })
      },
      itemPrefs: {},
      recordSwap: (fromId, toId) => {
        const p = { ...get().itemPrefs }
        p[toId] = clampPref((p[toId] ?? 0) + 1.5)
        p[fromId] = clampPref((p[fromId] ?? 0) - 1)
        set({ itemPrefs: p })
      },
      resetPrefs: () => set({ itemPrefs: {} }),
      closet: { enabled: false, owned: [] },
      setClosetEnabled: (enabled) => set({ closet: { ...get().closet, enabled } }),
      setOwned: (ids, owned) => {
        const current = new Set(get().closet.owned)
        for (const id of ids) {
          if (owned) current.add(id)
          else current.delete(id)
        }
        set({ closet: { ...get().closet, owned: [...current].sort() } })
      },
      saved: [],
      saveOutfit: (outfit) => {
        const id = `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
        set({ saved: [{ ...outfit, id, savedAt: Date.now() }, ...get().saved].slice(0, SAVED_LIMIT) })
        return id
      },
      removeSaved: (id) => set({ saved: get().saved.filter((s) => s.id !== id) }),
      trip: null,
      setTrip: (patch) => set({ trip: { ...(get().trip ?? newTrip(get().plan, dateOf(ammanNow()))), ...patch } }),
      reminder: { enabled: false, time: '07:30' },
      setReminder: (patch) => set({ reminder: { ...get().reminder, ...patch } }),
    }),
    {
      name: 'clothup.app',
      version: 1,
      storage: createJSONStorage(() => kvStorage),
      // A specific date/time is only meaningful for one trip; next launch starts from "now".
      partialize: (s) => ({
        profile: s.profile,
        placeUsage: s.placeUsage,
        itemPrefs: s.itemPrefs,
        closet: s.closet,
        saved: s.saved,
        trip: s.trip,
        reminder: s.reminder,
        plan: { ...s.plan, when: { kind: 'now' } as When },
      }),
    },
  ),
)

export function frequentPlaces(usage: Record<string, number>, limit = 3): string[] {
  return Object.entries(usage)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id)
}
