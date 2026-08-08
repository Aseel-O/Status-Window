import StatusPanel from './StatusPanel'
import { levelProgress } from '../lib/statMeta'

export default function StatCard({ stat, points }) {
  const Icon = stat.icon
  const { level, current, needed, pct } = levelProgress(points ?? 0)

  return (
    <StatusPanel className="p-4 flex flex-col gap-3 animate-popin">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-md flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${stat.hex}1F`, color: stat.hex }}
          >
            <Icon size={18} strokeWidth={2} />
          </div>
          <div>
            <p className="font-display text-sm tracking-wide text-fg">{stat.key}</p>
            <p className="eyebrow">Lv. {level}</p>
          </div>
        </div>
        <p className="font-mono text-lg text-fg tabular-nums">{Math.round(points ?? 0)}</p>
      </div>

      <div>
        <div className="h-2 rounded-full bg-soft overflow-hidden">
          <div
            className="h-full rounded-full animate-fillbar"
            style={{ width: `${pct}%`, backgroundColor: stat.hex }}
          />
        </div>
        <p className="mt-1 font-mono text-[10px] text-fg-muted tabular-nums">
          {current} / {needed} to Lv. {level + 1}
        </p>
      </div>
    </StatusPanel>
  )
}
