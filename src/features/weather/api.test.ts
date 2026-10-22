import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Place } from '@/engine/types'
import { getPlace } from '@/features/places/places'
import { fetchForecast } from './api'

/** Calls fetchForecast with fetch stubbed out and returns the requested URLs. */
async function requestedUrls(place: Place): Promise<string[]> {
  const urls: string[] = []
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    urls.push(String(url))
    throw new Error('offline')
  }))
  await fetchForecast(place).catch(() => undefined)
  return urls
}

describe('forecast requests', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('rounds the user’s own location to about 1 km', async () => {
    const amman = getPlace('amman')!
    const here: Place = { ...amman, id: 'current', lat: 31.953949, lon: 35.910635 }
    const urls = await requestedUrls(here)
    expect(urls.length).toBeGreaterThan(0)
    for (const u of urls) {
      const q = new URL(u).searchParams
      expect(q.get('latitude')).toBe('31.95')
      expect(q.get('longitude')).toBe('35.91')
    }
  })

  it('keeps the exact coordinates of known places', async () => {
    const petra = getPlace('petra')!
    const [u] = await requestedUrls(petra)
    expect(Number(new URL(u).searchParams.get('latitude'))).toBe(petra.lat)
  })
})
