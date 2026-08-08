import { useMemo, useState, useEffect } from 'react'
import { useTaskTemplates } from '../hooks/useTaskTemplates'
import { useStreaks } from '../hooks/useStreaks'
import { useAuth } from '../context/AuthContext'
import { calculatePoints, calculateStagePoints } from '../lib/scoring'
import { submitLog, submitStageLog } from '../lib/submitLog'
import { statMeta } from '../lib/statMeta'
import StatusPanel from '../components/StatusPanel'
import LoadingScreen from '../components/LoadingScreen'
import { CheckCircle2, Check } from 'lucide-react'

const STEP_BY_METRIC = { duration: 5, count: 1, words: 25 }
const AMOUNT_LABEL_BY_METRIC = { duration: 'Duration', count: 'Amount', words: 'Words written' }

export default function QuickLog() {
  const { user } = useAuth()
  const { templates, loading } = useTaskTemplates()
  const { streaks } = useStreaks()

  const [selectedId, setSelectedId] = useState(null)
  const [amount, setAmount] = useState(0)
  const [difficulty, setDifficulty] = useState(3)
  const [stageIndex, setStageIndex] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!selectedId && templates.length) {
      selectTemplate(templates[0])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templates, selectedId])

  const template = templates.find((t) => t.id === selectedId)
  const isStage = template?.metric_type === 'stage'

  const matchingStreak = useMemo(
    () => streaks.find((s) => s.habit_name === template?.streak_habit),
    [streaks, template]
  )

  // Approximate preview only — the authoritative consecutive-day count
  // (which accounts for freezes/grace) is computed inside submitLog().
  const previewConsecutiveDays = matchingStreak ? matchingStreak.current_streak + 1 : 0

  const preview = useMemo(() => {
    if (!template || isStage) return null
    return calculatePoints({
      basePoints: template.base_points,
      amount,
      optimalMin: template.optimal_min,
      optimalMax: template.optimal_max,
      difficulty,
      consecutiveDays: previewConsecutiveDays,
    })
  }, [template, isStage, amount, difficulty, previewConsecutiveDays])

  const stagePreview = useMemo(() => {
    if (!template || !isStage || stageIndex == null) return null
    return calculateStagePoints(template.stages, template.stage_index ?? -1, stageIndex)
  }, [template, isStage, stageIndex])

  function selectTemplate(t) {
    setSelectedId(t.id)
    setDifficulty(3)
    setResult(null)
    setError(null)
    if (t.metric_type === 'stage') {
      setStageIndex(Math.min((t.stage_index ?? -1) + 1, (t.stages?.length ?? 1) - 1))
    } else {
      setAmount(t.optimal_min)
    }
  }

  async function handleSubmit() {
    if (!template) return
    setSubmitting(true)
    setError(null)
    setResult(null)
    try {
      const res = isStage
        ? await submitStageLog({ userId: user.id, template, newStageIndex: stageIndex, difficulty })
        : await submitLog({ userId: user.id, template, amount, difficulty })
      setResult(res)
    } catch (err) {
      setError(err.message ?? 'Could not save that log.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingScreen label="Loading templates…" />

  if (!templates.length) {
    return (
      <div className="max-w-xl mx-auto px-4 pt-10 pb-28 text-center">
        <p className="text-fg-muted">No task templates yet. Add one in Settings to start logging.</p>
      </div>
    )
  }

  const step = STEP_BY_METRIC[template?.metric_type] ?? 5
  const sliderMax = template
    ? Math.max(template.optimal_max * 2, template.optimal_max + step * 4, step * 10)
    : 100

  return (
    <div className="max-w-xl mx-auto px-4 pt-8 pb-28">
      <header className="mb-6">
        <p className="eyebrow mb-1">Quick Log</p>
        <h1 className="font-display text-2xl text-fg">Record a task</h1>
      </header>

      <section className="mb-6">
        <p className="eyebrow mb-2">Task</p>
        <div className="flex flex-wrap gap-2">
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => selectTemplate(t)}
              className={`px-3.5 py-2 rounded-md text-sm border transition-colors ${
                t.id === selectedId
                  ? 'bg-gold/15 border-gold text-gold'
                  : 'bg-panel border-line text-fg-secondary hover:border-gold/30'
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
      </section>

      {template && isStage && (
        <>
          <StatusPanel className="p-5 mb-6">
            <p className="eyebrow mb-3">Reached stage</p>
            <div className="flex flex-col gap-2">
              {template.stages.map((stage, i) => {
                const reached = i <= (template.stage_index ?? -1)
                const selected = i === stageIndex
                return (
                  <button
                    key={stage.name}
                    onClick={() => setStageIndex(i)}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-md border text-left transition-colors ${
                      selected
                        ? 'border-gold bg-gold/10'
                        : reached
                        ? 'border-line/60 bg-soft/50'
                        : 'border-line'
                    }`}
                  >
                    <span className="flex items-center gap-2 text-sm text-fg">
                      {reached && <Check size={14} className="text-success shrink-0" />}
                      {stage.name}
                    </span>
                    <span className="font-mono text-xs text-fg-muted">{stage.points}pts</span>
                  </button>
                )
              })}
            </div>
            {matchingStreak && (
              <p className="text-xs text-fg-muted mt-3">
                Linked streak "<span className="capitalize text-fg-secondary">{template.streak_habit}</span>" —
                currently <span className="font-mono text-gold">{matchingStreak.current_streak}</span> day
                {matchingStreak.current_streak === 1 ? '' : 's'}.
              </p>
            )}
          </StatusPanel>

          {stagePreview && (
            <StatusPanel className="p-5 mb-6">
              <div className="flex items-baseline justify-between mb-3">
                <span className="eyebrow">Preview</span>
                <span className="font-mono text-3xl text-gold tabular-nums">+{stagePreview.points}</span>
              </div>
              <p className="text-xs text-fg-muted mb-3">
                {stagePreview.points === 0
                  ? "That stage was already reached — no additional points."
                  : `Points awarded above what "${template.stages[template.stage_index]?.name ?? 'start'}" already gave.`}
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(template.stat_split).map(([statKey, pct]) => {
                  const meta = statMeta(statKey)
                  return (
                    <span
                      key={statKey}
                      className="text-xs px-2 py-1 rounded-full font-mono"
                      style={{ backgroundColor: `${meta.hex}1F`, color: meta.hex }}
                    >
                      {statKey} {pct}%
                    </span>
                  )
                })}
              </div>
            </StatusPanel>
          )}
        </>
      )}

      {template && !isStage && (
        <>
          <StatusPanel className="p-5 mb-6 flex flex-col gap-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="eyebrow">{AMOUNT_LABEL_BY_METRIC[template.metric_type]}</span>
                <span className="font-mono text-sm text-fg tabular-nums">
                  {amount} {template.unit_label}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={sliderMax}
                step={step}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full accent-gold-strong"
              />
              <p className="mt-1 font-mono text-[10px] text-fg-muted">
                optimal window: {template.optimal_min}–{template.optimal_max} {template.unit_label}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="eyebrow">Difficulty</span>
                <span className="font-mono text-sm text-fg">{difficulty} / 5</span>
              </div>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`flex-1 py-2 rounded-md text-sm border transition-colors ${
                      d === difficulty
                        ? 'bg-gold/15 border-gold text-gold'
                        : 'bg-panel border-line text-fg-muted hover:border-gold/30'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {matchingStreak && (
              <p className="text-xs text-fg-muted">
                Linked streak "<span className="capitalize text-fg-secondary">{template.streak_habit}</span>" —
                currently <span className="font-mono text-gold">{matchingStreak.current_streak}</span> day
                {matchingStreak.current_streak === 1 ? '' : 's'}.
              </p>
            )}
          </StatusPanel>

          {preview && (
            <StatusPanel className="p-5 mb-6">
              <div className="flex items-baseline justify-between mb-3">
                <span className="eyebrow">Preview</span>
                <span className="font-mono text-3xl text-gold tabular-nums">+{preview.points}</span>
              </div>
              <dl className="grid grid-cols-3 gap-3 text-center mb-4">
                <div>
                  <dt className="eyebrow mb-0.5">Amount</dt>
                  <dd className="font-mono text-sm text-fg-secondary">×{preview.breakdown.amountFactor}</dd>
                </div>
                <div>
                  <dt className="eyebrow mb-0.5">Difficulty</dt>
                  <dd className="font-mono text-sm text-fg-secondary">
                    ×{preview.breakdown.difficultyMultiplier}
                  </dd>
                </div>
                <div>
                  <dt className="eyebrow mb-0.5">Streak</dt>
                  <dd className="font-mono text-sm text-fg-secondary">
                    ×{preview.breakdown.consistencyBonus}
                  </dd>
                </div>
              </dl>
              <div className="flex flex-wrap gap-2">
                {Object.entries(template.stat_split).map(([statKey, pct]) => {
                  const meta = statMeta(statKey)
                  return (
                    <span
                      key={statKey}
                      className="text-xs px-2 py-1 rounded-full font-mono"
                      style={{ backgroundColor: `${meta.hex}1F`, color: meta.hex }}
                    >
                      {statKey} {pct}%
                    </span>
                  )
                })}
              </div>
            </StatusPanel>
          )}
        </>
      )}

      {template && (
        <>
          {error && <p className="text-sm text-danger mb-4">{error}</p>}

          {result ? (
            <StatusPanel className="p-5 flex items-center gap-3 animate-popin">
              <CheckCircle2 className="text-success shrink-0" size={22} />
              <p className="text-sm text-fg-secondary">
                Logged! <span className="font-mono text-gold">+{result.points}</span> points awarded.
              </p>
            </StatusPanel>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting || (isStage && stageIndex == null)}
              className="w-full bg-gold text-gold-on font-semibold text-sm rounded-md py-3 hover:bg-gold-strong transition-colors disabled:opacity-50"
            >
              {submitting ? 'Saving…' : 'Log task'}
            </button>
          )}
        </>
      )}
    </div>
  )
}
