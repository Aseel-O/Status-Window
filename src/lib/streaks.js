/**
 * Streak rules (Phase 1):
 *  - Logging a habit on a new day (not already logged today) advances the streak.
 *  - Missing 1 day is "grace" — the streak stays alive but dims in the UI.
 *  - Missing 2+ consecutive days resets the streak to 0, UNLESS a freeze is
 *    spent to cover one of the missed days.
 *  - Freezes are earned at a rate of ~1 per 7-day run of consistency and are
 *    spent automatically (oldest streak first) when a gap would otherwise
 *    reset it, if any are available.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000

function toDateOnly(d) {
  const date = typeof d === 'string' ? new Date(d) : d
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function daysBetween(a, b) {
  return Math.round((toDateOnly(b) - toDateOnly(a)) / MS_PER_DAY)
}

/**
 * Given a streak row and "today", returns the streak state used for display:
 * gap in days since last completion, and whether it's in the grace window.
 */
export function streakStatus(streak, today = new Date()) {
  if (!streak?.last_completed_date) {
    return { gapDays: null, inGrace: false, isBroken: false }
  }
  const gapDays = daysBetween(streak.last_completed_date, today)
  return {
    gapDays,
    inGrace: gapDays === 1,
    isBroken: gapDays >= 2,
  }
}

/**
 * Computes the next state of a streak row after logging a completion "today".
 * Pure function — caller persists the result via Supabase.
 *
 * @param {{current_streak:number, freezes_available:number, last_completed_date:string|null}} streak
 * @param {Date} today
 * @returns {{current_streak:number, freezes_available:number, last_completed_date:string, freeze_spent:boolean}}
 */
export function applyCompletion(streak, today = new Date()) {
  const todayStr = toDateOnly(today).toISOString().slice(0, 10)

  if (!streak?.last_completed_date) {
    return { current_streak: 1, freezes_available: streak?.freezes_available ?? 0, last_completed_date: todayStr, freeze_spent: false }
  }

  const gap = daysBetween(streak.last_completed_date, today)

  if (gap === 0) {
    // Already logged today — no change other than staying put.
    return { ...streak, last_completed_date: todayStr }
  }

  if (gap === 1) {
    // Consecutive day — streak grows.
    const newStreak = streak.current_streak + 1
    const earnedFreeze = newStreak % 7 === 0 ? 1 : 0
    return {
      current_streak: newStreak,
      freezes_available: streak.freezes_available + earnedFreeze,
      last_completed_date: todayStr,
      freeze_spent: false,
    }
  }

  // gap >= 2: broken unless a freeze covers it.
  if (streak.freezes_available > 0) {
    return {
      current_streak: streak.current_streak + 1,
      freezes_available: streak.freezes_available - 1,
      last_completed_date: todayStr,
      freeze_spent: true,
    }
  }

  // No freeze available — reset and start a fresh streak today.
  return {
    current_streak: 1,
    freezes_available: streak.freezes_available,
    last_completed_date: todayStr,
    freeze_spent: false,
  }
}
