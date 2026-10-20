import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import type { StateStorage } from 'zustand/middleware'

/**
 * Key-value storage for small persisted state (settings, profile, last query).
 * Android uses Capacitor Preferences (survives WebView data resets);
 * desktop and web use localStorage.
 */
const webStorage: StateStorage = {
  getItem: (key) => {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value)
    } catch {
      /* storage full or blocked: keep running in memory */
    }
  },
  removeItem: (key) => {
    try {
      localStorage.removeItem(key)
    } catch {
      /* ignore */
    }
  },
}

// Native writes are mirrored to localStorage so index.html can read the theme before first paint.
const nativeStorage: StateStorage = {
  getItem: async (key) => (await Preferences.get({ key })).value,
  setItem: async (key, value) => {
    webStorage.setItem(key, value)
    await Preferences.set({ key, value })
  },
  removeItem: async (key) => {
    webStorage.removeItem(key)
    await Preferences.remove({ key })
  },
}

export const kvStorage: StateStorage = Capacitor.isNativePlatform() ? nativeStorage : webStorage
