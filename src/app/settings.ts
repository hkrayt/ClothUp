import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { kvStorage } from '@/lib/storage'

export type Language = 'en' | 'ar'
export type ThemePref = 'system' | 'light' | 'dark'

interface SettingsState {
  language: Language
  theme: ThemePref
  setLanguage: (language: Language) => void
  setTheme: (theme: ThemePref) => void
}

function defaultLanguage(): Language {
  return typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('ar') ? 'ar' : 'en'
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      language: defaultLanguage(),
      theme: 'system',
      setLanguage: (language) => set({ language }),
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'clothup.settings', storage: createJSONStorage(() => kvStorage), version: 1 },
  ),
)
