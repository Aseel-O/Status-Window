import { useMemo } from 'react'
import { useStats } from '../hooks/useStats'
import { useStreaks } from '../hooks/useStreaks'
import { STATS, levelFromPoints } from '../lib/statMeta'
import StatCard from '../components/StatCard'
import StatRadar from '../components/StatRadar'
import StatusPanel from '../components/StatusPanel'
import LoadingScreen from '../components/LoadingScreen'
import ThemeToggle from '../components/ThemeToggle'
import { Flame } from 'lucide-react'

export default function Dashboard() {
  const { stats, loading } = useStats()
  const { streaks } = useStreaks()

  const totalLevel = useMemo(() => {
    if (!stats) return 0
    return STATS.reduce((sum, s) => sum + levelFromPoints(stats[s.key] ?? 0), 0)
  }, [stats])

  const topStreak = useMemo(() => {
    if (!streaks?.length) return null
    return [...streaks].sort((a, b) => b.current_streak - a.current_streak)[0]
  }, [streaks])

  if (loading || !stats) return <LoadingScreen label="Loading status window…" />

  return (
    <div className="max-w-xl mx-auto px-4 pt-8 pb-28">
      <header className="mb-6 flex items-start justify-between">
        <div>
          <p className="eyebrow mb-1">Status Window</p>
          <h1 className="font-display text-2xl text-fg">Character Sheet</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="eyebrow mb-1">Combined level</p>
            <p className="font-mono text-2xl text-gold tabular-nums">{totalLevel}</p>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {topStreak && topStreak.current_streak > 0 && (
        <StatusPanel className="mb-6 px-4 py-3 flex items-center gap-3">
          <Flame size={20} className="text-stat-strength shrink-0" />
          <p className="text-sm text-fg-secondary">
            <span className="text-fg font-medium capitalize">{topStreak.habit_name}</span>{' '}
            streak: <span className="font-mono text-gold">{topStreak.current_streak}</span> day
            {topStreak.current_streak === 1 ? '' : 's'}
          </p>
        </StatusPanel>
      )}

      <div className="mb-6">
        <StatRadar stats={stats} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {STATS.map((stat) => (
          <StatCard key={stat.key} stat={stat} points={stats[stat.key]} />
        ))}
      </div>
    </div>
  )
}
