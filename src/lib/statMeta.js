import {
  Brain,
  Coins,
  Sparkles,
  HeartHandshake,
  HeartPulse,
  Dumbbell,
  Wind,
  Moon,
} from 'lucide-react'

// Single source of truth for the 8 stats. Order here drives display order
// everywhere (dashboard, radar chart, settings stat-split editor, etc).
export const STATS = [
  { key: 'Intelligence', color: 'stat-intelligence', hex: '#5B8DEF', icon: Brain,
    blurb: 'Thesis work, self-directed study, new tools' },
  { key: 'Wealth', color: 'stat-wealth', hex: '#E0A93E', icon: Coins,
    blurb: 'Freelance delivery, proposals, invoicing' },
  { key: 'Creativity', color: 'stat-creativity', hex: '#B389F0', icon: Sparkles,
    blurb: 'Thesis ideation, side-projects, hobbies' },
  { key: 'Mentality', color: 'stat-mentality', hex: '#4FC3B0', icon: HeartHandshake,
    blurb: 'Reflection, rest, discipline, meditation' },
  { key: 'Religion', color: 'stat-religion', hex: '#3FA66B', icon: Moon,
    blurb: 'Prayer, Quran, faith practice' },
  { key: 'Health', color: 'stat-health', hex: '#F0708A', icon: HeartPulse,
    blurb: 'Diet, sleep, water, general wellbeing' },
  { key: 'Strength', color: 'stat-strength', hex: '#E15D4C', icon: Dumbbell,
    blurb: 'Strength training, resistance exercise' },
  { key: 'Agility', color: 'stat-agility', hex: '#A8D65C', icon: Wind,
    blurb: 'Cardio, mobility, sport-based exercise' },
]

export const STAT_KEYS = STATS.map((s) => s.key)

export function statMeta(key) {
  return STATS.find((s) => s.key === key) ?? STATS[0]
}

// Sqrt-shaped level curve: leveling slows down as points grow, which feels
// more "RPG-like" than a flat points-per-level ladder. Tunable via LEVEL_DIVISOR.
const LEVEL_DIVISOR = 25

export function levelFromPoints(points) {
  return 1 + Math.floor(Math.sqrt(Math.max(0, points) / LEVEL_DIVISOR))
}

export function pointsForLevel(level) {
  return Math.pow(level - 1, 2) * LEVEL_DIVISOR
}

// Returns { level, current, needed, pct } for a progress bar toward next level.
export function levelProgress(points) {
  const level = levelFromPoints(points)
  const floor = pointsForLevel(level)
  const ceil = pointsForLevel(level + 1)
  const span = ceil - floor || 1
  const current = points - floor
  return {
    level,
    current: Math.round(current),
    needed: Math.round(span),
    pct: Math.min(100, Math.max(0, (current / span) * 100)),
  }
}
