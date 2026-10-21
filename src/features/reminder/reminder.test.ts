import { describe, expect, it } from 'vitest'
import i18n from '@/i18n'
import { DATA } from '@/engine/catalog'
import { generateOutfits } from '@/engine/outfit'
import { SCENARIOS } from '@/engine/scenarios'
import { ammanMoment } from '@/engine/time'
import { getPlace } from '@/features/places/places'
import { buildReminders, parseTime, reminderDays, reminderText, REMINDER_DAYS } from './reminder'

const casual = DATA.occasions.find((o) => o.id === 'casual')!
const male = { gender: 'male' as const, style: 'standard' as const, skinTone: 2 }

describe('reminder schedule', () => {
  it('parses times and falls back to 07:30', () => {
    expect(parseTime('06:45')).toEqual({ hour: 6, minute: 45 })
    expect(parseTime('bad')).toEqual({ hour: 7, minute: 30 })
  })

  it('converts Amman time to the real moment (UTC+3)', () => {
    expect(ammanMoment('2026-12-20', 7, 30).toISOString()).toBe('2026-12-20T04:30:00.000Z')
  })

  it('starts today while the time is still ahead, otherwise tomorrow', () => {
    const early = reminderDays('07:30', new Date('2026-12-20T03:00:00Z')) // 06:00 in Amman
    expect(early[0].date).toBe('2026-12-20')
    const late = reminderDays('07:30', new Date('2026-12-20T09:00:00Z')) // 12:00 in Amman
    expect(late[0].date).toBe('2026-12-21')
    expect(late).toHaveLength(REMINDER_DAYS)
    expect(new Set(late.map((d) => d.id)).size).toBe(REMINDER_DAYS)
    expect(late.every((d, i) => i === 0 || d.at.getTime() - late[i - 1].at.getTime() === 24 * 3600_000)).toBe(true)
  })
})

describe('reminder text', () => {
  it('names the place, the temperatures and the clothes', () => {
    const ctx = SCENARIOS.ammanWinterRain
    const [o] = generateOutfits(ctx, male, casual, DATA)
    const { title, body } = reminderText(i18n.t, 'en', 'Amman', ctx, o)
    expect(title).toBe(`Amman today: ${Math.round(ctx.feelsMin)}°–${Math.round(ctx.feelsMax)}°`)
    expect(body).toMatch(/^Rain likely/)
    const coat = o.pieces.find((p) => p.slot === 'outer')!
    expect(body).toContain(coat.item.name.en)
  })

  it('falls back to a general message without weather', () => {
    expect(reminderText(i18n.t, 'en', 'Amman', null, null).title).toBe('What to wear today')
  })

  it('builds a week of notifications from typical weather when there is no forecast', () => {
    const list = buildReminders({ time: '07:30', place: getPlace('amman')!, forecast: null, profile: male, occasion: casual, t: i18n.t, lang: 'en' }, new Date('2026-12-20T09:00:00Z'))
    expect(list).toHaveLength(REMINDER_DAYS)
    for (const n of list) {
      expect(n.title).toMatch(/^Amman today/)
      expect(n.body).toContain('Wear:')
    }
  })
})
