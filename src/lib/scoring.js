/**
 * Scoring engine — Phase 1.
 *
 * Most tasks (duration, count, or word-count based) score as:
 *
 *   points = basePoints * amountFactor * difficultyMultiplier * consistencyBonus
 *
 * "amount" is generic on purpose — minutes, glasses of water, prayers, pages
 * of Quran, or words written all follow the same rise-to-optimal /
 * diminishing-returns-beyond-it shape, just with a different unit label.
 * Stage-based tasks (projects with milestones) don't fit that shape at all —
 * see calculateStagePoints() below.
 *
 * Each factor is exported separately so Phase 4 ("overdoing penalty curves")
 * can replace `amountFactor` with a full rise-then-penalty curve without
 * touching difficulty/consistency, and so the quick-log screen can show a
 * live preview as the user adjusts sliders.
 */

const UNDER_FLOOR = 0.35 // credit given at amount ~0, so small efforts aren't worthless
const SOFT_CAP = 1.25 // max multiplier reachable via "going long", diminishing returns
const TAPER_HALF_LIFE_FACTOR = 0.6 // taper distance past optimalMax, scaled to the optimal window's width

/**
 * @param {number} amount - minutes / count / words logged
 * @param {number} optimalMin - amount where full credit begins
 * @param {number} optimalMax - amount where full credit ends / taper begins
 */
export function amountFactor(amount, optimalMin, optimalMax) {
  const a = Math.max(0, amount)
  if (optimalMin > 0 && a < optimalMin) {
    // Linear ramp from UNDER_FLOOR up to 1.0 as amount approaches optimalMin.
    return UNDER_FLOOR + (1 - UNDER_FLOOR) * (a / optimalMin)
  }
  if (a <= optimalMax) {
    return 1
  }
  // Beyond the optimal window: asymptotically approach SOFT_CAP, never reach it.
  // The taper distance scales with the window's own width, so a "5 prayers/day"
  // template and a "90 minute workout" template both taper at a sensible pace.
  const windowSpan = Math.max(1, optimalMax - optimalMin, optimalMax)
  const taperHalfLife = Math.max(1, windowSpan * TAPER_HALF_LIFE_FACTOR)
  const over = a - optimalMax
  const progress = 1 - Math.exp(-over / taperHalfLife)
  return 1 + (SOFT_CAP - 1) * progress
}

/**
 * Difficulty multiplier: self-rated 1–5 maps to 0.8x–1.4x.
 * @param {number} difficulty 1-5
 */
export function difficultyMultiplier(difficulty) {
  const d = Math.min(5, Math.max(1, difficulty))
  return 0.8 + (d - 1) * 0.15
}

/**
 * Consistency bonus: same task 3+ days running adds a small multiplier,
 * capped so it nudges rather than dominates the score.
 * @param {number} consecutiveDays - consecutive days (including today) this task/streak has been logged
 */
const CONSISTENCY_THRESHOLD = 3
const CONSISTENCY_STEP = 0.03 // +3% per day past the threshold
const CONSISTENCY_CAP = 1.2

export function consistencyBonus(consecutiveDays) {
  if (!consecutiveDays || consecutiveDays < CONSISTENCY_THRESHOLD) return 1
  const bonus = 1 + (consecutiveDays - CONSISTENCY_THRESHOLD + 1) * CONSISTENCY_STEP
  return Math.min(CONSISTENCY_CAP, bonus)
}

/**
 * Full points calculation for a single duration/count/words log entry.
 * @returns {{ points: number, breakdown: object }}
 */
export function calculatePoints({
  basePoints,
  amount,
  optimalMin,
  optimalMax,
  difficulty,
  consecutiveDays,
}) {
  const af = amountFactor(amount, optimalMin, optimalMax)
  const df = difficultyMultiplier(difficulty)
  const cb = consistencyBonus(consecutiveDays)
  const raw = basePoints * af * df * cb
  const points = Math.max(0, Math.round(raw * 10) / 10)
  return {
    points,
    breakdown: {
      basePoints,
      amountFactor: Math.round(af * 100) / 100,
      difficultyMultiplier: Math.round(df * 100) / 100,
      consistencyBonus: Math.round(cb * 100) / 100,
    },
  }
}

/**
 * Stage-based scoring for milestone/project tasks: points are the
 * cumulative value assigned to a stage, so reaching stage N awards the
 * *difference* between stage N's points and the highest stage previously
 * reached — never negative, and re-logging an already-passed stage awards
 * nothing (no double-dipping).
 *
 * @param {{name:string, points:number}[]} stages - ordered, increasing points
 * @param {number} previousStageIndex - highest index previously reached, -1 if none
 * @param {number} newStageIndex - index the user is logging now
 * @returns {{ points: number, stageName: string }}
 */
export function calculateStagePoints(stages, previousStageIndex, newStageIndex) {
  const stage = stages[newStageIndex]
  const previousPoints = previousStageIndex >= 0 ? stages[previousStageIndex].points : 0
  const points = Math.max(0, Math.round((stage.points - previousPoints) * 10) / 10)
  return { points, stageName: stage.name }
}

/**
 * Splits a total points value across a stat_split map (percentages 0-100
 * that should sum to ~100) into a { StatName: points } map.
 */
export function applyStatSplit(totalPoints, statSplit) {
  const result = {}
  for (const [stat, pct] of Object.entries(statSplit ?? {})) {
    result[stat] = Math.round(((totalPoints * pct) / 100) * 10) / 10
  }
  return result
}
