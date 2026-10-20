import type { Duration, When } from './types'
import { addHours, ammanNow, hourOf, hoursBetween } from './time'

/** The start hour for a "when" answer. Past times snap to now. */
export function resolveStart(when: When, now = ammanNow()): string {
  if (when.kind === 'now') return now
  return when.time < now ? now : when.time
}

/** Number of forecast hours to cover. 'night' runs until 1 AM (at least 4 hours). */
export function durationHours(duration: Duration, start: string): number {
  if (duration !== 'night') return duration
  const h = hourOf(start)
  // Hours until 01:00 the following night; starting after midnight counts to 01:00 that same night.
  const target = h < 1 ? addHours(start, 1 - h) : addHours(start, 25 - h)
  return Math.max(4, hoursBetween(start, target))
}
