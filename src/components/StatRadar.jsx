import { useMemo } from 'react'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts'
import { STATS, levelFromPoints } from '../lib/statMeta'
import StatusPanel from './StatusPanel'

function AxisTick({ x, y, payload, textAnchor }) {
  const stat = STATS.find((s) => s.key === payload.value)
  if (!stat) return null
  return (
    <text
      x={x}
      y={y}
      textAnchor={textAnchor}
      className="fill-fg-secondary font-mono"
      fontSize={10.5}
      dy={4}
    >
      {stat.key}
    </text>
  )
}

export default function StatRadar({ stats }) {
  const data = useMemo(
    () =>
      STATS.map((s) => ({
        stat: s.key,
        level: levelFromPoints(stats?.[s.key] ?? 0),
      })),
    [stats]
  )

  const maxLevel = Math.max(5, ...data.map((d) => d.level)) + 1

  return (
    <StatusPanel className="p-3 pt-4">
      <div className="px-2 mb-1 flex items-center justify-between">
        <p className="eyebrow">Stat wheel</p>
      </div>
      <div className="h-64 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="72%">
            <PolarGrid stroke="rgb(var(--c-border))" />
            <PolarAngleAxis dataKey="stat" tick={<AxisTick />} />
            <PolarRadiusAxis
              angle={90}
              domain={[0, maxLevel]}
              tick={{ fontSize: 9, fill: 'rgb(var(--c-fg-muted))' }}
              tickCount={Math.min(6, maxLevel + 1)}
              axisLine={false}
            />
            <Radar
              dataKey="level"
              stroke="rgb(var(--c-accent))"
              fill="rgb(var(--c-accent))"
              fillOpacity={0.25}
              strokeWidth={2}
              isAnimationActive
              animationDuration={700}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </StatusPanel>
  )
}
