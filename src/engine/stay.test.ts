import { describe, expect, it } from 'vitest'
import { durationHours, resolveStart } from './stay'

describe('stay', () => {
  it('resolves now and snaps past times to now', () => {
    expect(resolveStart({ kind: 'now' }, '2026-10-20T14:00')).toBe('2026-10-20T14:00')
    expect(resolveStart({ kind: 'at', time: '2026-10-20T09:00' }, '2026-10-20T14:00')).toBe('2026-10-20T14:00')
    expect(resolveStart({ kind: 'at', time: '2026-10-21T09:00' }, '2026-10-20T14:00')).toBe('2026-10-21T09:00')
  })

  it('computes "into the night" until 1 AM, at least 4 hours', () => {
    expect(durationHours(3, '2026-10-20T14:00')).toBe(3)
    expect(durationHours('night', '2026-10-20T16:00')).toBe(9)
    expect(durationHours('night', '2026-10-20T23:00')).toBe(4)
  })
})
