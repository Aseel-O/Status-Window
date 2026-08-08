import { useMemo } from 'react'
import { useLogs } from '../hooks/useLogs'
import { statMeta } from '../lib/statMeta'
import StatusPanel from '../components/StatusPanel'
import LoadingScreen from '../components/LoadingScreen'

function formatDate(iso) {
  const d = new Date(iso)
  const today = new Date()
  const isToday = d.toDateString() === today.toDateString()
  if (isToday) return `Today, ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
    ', ' + d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function formatAmount(log) {
  if (log.metric_type === 'stage') return log.stage_name
  if (log.amount == null) return null
  return `${log.amount} ${log.unit_label ?? ''}`.trim()
}

export default function History() {
  const { logs, loading } = useLogs(150)

  const grouped = useMemo(() => {
    const map = new Map()
    for (const log of logs) {
      const key = new Date(log.occurred_at).toDateString()
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(log)
    }
    return Array.from(map.entries())
  }, [logs])

  if (loading) return <LoadingScreen label="Loading history…" />

  return (
    <div className="max-w-xl mx-auto px-4 pt-8 pb-28">
      <header className="mb-6">
        <p className="eyebrow mb-1">History</p>
        <h1 className="font-display text-2xl text-fg">Log</h1>
      </header>

      {!logs.length && <p className="text-fg-muted text-sm">Nothing logged yet.</p>}

      <div className="flex flex-col gap-6">
        {grouped.map(([dateKey, dayLogs]) => (
          <div key={dateKey}>
            <p className="eyebrow mb-2">
              {new Date(dateKey).toLocaleDateString([], {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })}
            </p>
            <div className="flex flex-col gap-2">
              {dayLogs.map((log) => (
                <StatusPanel key={log.id} className="p-3.5 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-fg truncate">{log.task_name}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <span className="font-mono text-[10px] text-fg-muted">
                        {formatDate(log.occurred_at)}
                        {formatAmount(log) ? ` · ${formatAmount(log)}` : ''}
                        {log.metric_type !== 'stage' ? ` · diff ${log.difficulty}` : ''}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {Object.entries(log.stat_split_applied ?? {}).map(([statKey, pts]) => {
                        const meta = statMeta(statKey)
                        return (
                          <span
                            key={statKey}
                            className="text-[10px] px-1.5 py-0.5 rounded-full font-mono"
                            style={{ backgroundColor: `${meta.hex}1F`, color: meta.hex }}
                          >
                            {statKey} +{pts}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                  <p className="font-mono text-gold text-sm shrink-0">+{log.points_awarded}</p>
                </StatusPanel>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
