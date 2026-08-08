import { useStreaks } from '../hooks/useStreaks'
import { streakStatus } from '../lib/streaks'
import StatusPanel from '../components/StatusPanel'
import LoadingScreen from '../components/LoadingScreen'
import { Flame, Snowflake, AlertTriangle } from 'lucide-react'

export default function Streaks() {
  const { streaks, loading } = useStreaks()

  if (loading) return <LoadingScreen label="Checking streaks…" />

  return (
    <div className="max-w-xl mx-auto px-4 pt-8 pb-28">
      <header className="mb-6">
        <p className="eyebrow mb-1">Streaks</p>
        <h1 className="font-display text-2xl text-fg">Consistency</h1>
      </header>

      {!streaks.length && (
        <p className="text-fg-muted text-sm">
          No streak-linked habits yet. Link a task template to a streak in Settings.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {streaks.map((s) => {
          const { gapDays, inGrace, isBroken } = streakStatus(s)
          const dimmed = isBroken || s.current_streak === 0

          return (
            <StatusPanel key={s.id} className="p-4 flex items-center gap-4">
              <div
                className={`w-11 h-11 rounded-md flex items-center justify-center shrink-0 ${
                  dimmed ? 'bg-soft text-fg-muted' : 'bg-stat-strength/15 text-stat-strength'
                }`}
              >
                <Flame size={20} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-display text-sm text-fg capitalize truncate">
                  {s.habit_name}
                </p>
                <p className="eyebrow mt-0.5">
                  {s.last_completed_date
                    ? `last logged ${gapDays === 0 ? 'today' : gapDays === 1 ? 'yesterday' : `${gapDays} days ago`}`
                    : 'not started'}
                </p>
              </div>

              {inGrace && !isBroken && (
                <span title="Grace day — log today to keep it alive">
                  <AlertTriangle size={16} className="text-gold shrink-0" />
                </span>
              )}

              <div className="flex items-center gap-1 text-fg-secondary shrink-0" title="Freezes available">
                <Snowflake size={14} />
                <span className="font-mono text-xs">{s.freezes_available}</span>
              </div>

              <p className="font-mono text-xl text-gold tabular-nums w-10 text-right shrink-0">
                {s.current_streak}
              </p>
            </StatusPanel>
          )
        })}
      </div>
    </div>
  )
}
