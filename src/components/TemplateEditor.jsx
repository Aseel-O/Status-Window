import { useState } from 'react'
import { STATS } from '../lib/statMeta'
import StatusPanel from './StatusPanel'
import { X, Plus, Trash2 } from 'lucide-react'

const METRIC_TYPES = [
  { value: 'duration', label: 'Duration', defaultUnit: 'min', hint: 'Time spent, e.g. minutes' },
  { value: 'count', label: 'Count', defaultUnit: 'glasses', hint: 'A plain count, e.g. glasses, prayers, pages' },
  { value: 'words', label: 'Words', defaultUnit: 'words', hint: 'Word count, e.g. thesis writing output' },
  { value: 'stage', label: 'Stage', defaultUnit: '', hint: 'A milestone reached from a list of stages' },
]

const emptyTemplate = {
  name: '',
  base_points: 10,
  metric_type: 'duration',
  unit_label: 'min',
  optimal_min: 20,
  optimal_max: 60,
  streak_habit: '',
  stat_split: {},
  stages: [],
}

export default function TemplateEditor({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(() => ({
    ...emptyTemplate,
    ...initial,
    stages: initial?.stages?.length ? initial.stages : [{ name: '', points: 0 }],
  }))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const splitTotal = Object.values(form.stat_split).reduce((a, b) => a + Number(b || 0), 0)
  const isStage = form.metric_type === 'stage'

  function toggleStat(key) {
    setForm((f) => {
      const next = { ...f.stat_split }
      if (key in next) delete next[key]
      else next[key] = 0
      return { ...f, stat_split: next }
    })
  }

  function setSplitPct(key, pct) {
    setForm((f) => ({ ...f, stat_split: { ...f.stat_split, [key]: Number(pct) } }))
  }

  function setMetricType(value) {
    const meta = METRIC_TYPES.find((m) => m.value === value)
    setForm((f) => ({ ...f, metric_type: value, unit_label: meta.defaultUnit }))
  }

  function updateStage(index, patch) {
    setForm((f) => ({
      ...f,
      stages: f.stages.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    }))
  }

  function addStage() {
    setForm((f) => ({ ...f, stages: [...f.stages, { name: '', points: 0 }] }))
  }

  function removeStage(index) {
    setForm((f) => ({ ...f, stages: f.stages.filter((_, i) => i !== index) }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (!form.name.trim()) {
      setError('Name is required.')
      return
    }
    if (Object.keys(form.stat_split).length === 0) {
      setError('Pick at least one stat.')
      return
    }
    if (splitTotal !== 100) {
      setError(`Stat split must total 100% (currently ${splitTotal}%).`)
      return
    }

    let payload
    if (isStage) {
      const cleanStages = form.stages
        .filter((s) => s.name.trim())
        .map((s) => ({ name: s.name.trim(), points: Number(s.points) }))
      if (cleanStages.length < 2) {
        setError('Add at least two stages.')
        return
      }
      for (let i = 1; i < cleanStages.length; i++) {
        if (cleanStages[i].points <= cleanStages[i - 1].points) {
          setError('Each stage must be worth more points than the one before it.')
          return
        }
      }
      payload = {
        name: form.name,
        base_points: 0,
        metric_type: 'stage',
        unit_label: '',
        optimal_min: 0,
        optimal_max: 0,
        stages: cleanStages,
        streak_habit: form.streak_habit.trim() || null,
        stat_split: form.stat_split,
      }
    } else {
      payload = {
        name: form.name,
        base_points: Number(form.base_points),
        metric_type: form.metric_type,
        unit_label: form.unit_label.trim() || 'units',
        optimal_min: Number(form.optimal_min),
        optimal_max: Number(form.optimal_max),
        stages: null,
        streak_habit: form.streak_habit.trim() || null,
        stat_split: form.stat_split,
      }
    }

    setSaving(true)
    try {
      await onSave(payload)
    } catch (err) {
      setError(err.message ?? 'Could not save.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <StatusPanel className="p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="eyebrow">{initial ? 'Edit template' : 'New template'}</p>
        <button onClick={onCancel} className="text-fg-muted hover:text-fg-secondary">
          <X size={18} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="eyebrow">Name</span>
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="bg-input border border-line rounded-md px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-gold/50"
            placeholder="e.g. Thesis writing"
          />
        </label>

        <div>
          <span className="eyebrow block mb-2">Logged by</span>
          <div className="grid grid-cols-4 gap-1.5">
            {METRIC_TYPES.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMetricType(m.value)}
                className={`py-2 rounded-md text-xs border transition-colors ${
                  form.metric_type === m.value
                    ? 'border-gold/60 text-gold bg-gold/10'
                    : 'border-line text-fg-muted'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-fg-muted mt-1.5">
            {METRIC_TYPES.find((m) => m.value === form.metric_type)?.hint}
          </p>
        </div>

        {!isStage && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="eyebrow">Base pts</span>
                <input
                  type="number"
                  min={1}
                  value={form.base_points}
                  onChange={(e) => setForm((f) => ({ ...f, base_points: e.target.value }))}
                  className="bg-input border border-line rounded-md px-2 py-2 text-sm text-fg font-mono focus:outline-none focus:ring-2 focus:ring-gold/50"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="eyebrow">Unit label</span>
                <input
                  value={form.unit_label}
                  onChange={(e) => setForm((f) => ({ ...f, unit_label: e.target.value }))}
                  placeholder="min / glasses / pages / words"
                  className="bg-input border border-line rounded-md px-2 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-gold/50"
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="eyebrow">Optimal min</span>
                <input
                  type="number"
                  min={0}
                  value={form.optimal_min}
                  onChange={(e) => setForm((f) => ({ ...f, optimal_min: e.target.value }))}
                  className="bg-input border border-line rounded-md px-2 py-2 text-sm text-fg font-mono focus:outline-none focus:ring-2 focus:ring-gold/50"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="eyebrow">Optimal max</span>
                <input
                  type="number"
                  min={0}
                  value={form.optimal_max}
                  onChange={(e) => setForm((f) => ({ ...f, optimal_max: e.target.value }))}
                  className="bg-input border border-line rounded-md px-2 py-2 text-sm text-fg font-mono focus:outline-none focus:ring-2 focus:ring-gold/50"
                />
              </label>
            </div>
          </>
        )}

        {isStage && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="eyebrow">Stages (low to high)</span>
              <button
                type="button"
                onClick={addStage}
                className="flex items-center gap-1 text-xs text-gold hover:text-gold-strong"
              >
                <Plus size={13} /> Add stage
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {form.stages.map((stage, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="font-mono text-xs text-fg-muted w-4 shrink-0">{i + 1}</span>
                  <input
                    value={stage.name}
                    onChange={(e) => updateStage(i, { name: e.target.value })}
                    placeholder="Stage name"
                    className="flex-1 bg-input border border-line rounded-md px-2 py-1.5 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-gold/50"
                  />
                  <input
                    type="number"
                    min={0}
                    value={stage.points}
                    onChange={(e) => updateStage(i, { points: e.target.value })}
                    placeholder="pts"
                    className="w-20 bg-input border border-line rounded-md px-2 py-1.5 text-sm text-fg font-mono focus:outline-none focus:ring-2 focus:ring-gold/50"
                  />
                  <button
                    type="button"
                    onClick={() => removeStage(i)}
                    className="text-fg-muted hover:text-danger shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-fg-muted mt-2">
              Points are cumulative — reaching a stage awards the difference from the highest
              stage you'd already reached, so skipping ahead still works.
            </p>
          </div>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="eyebrow">Linked streak (optional)</span>
          <input
            value={form.streak_habit ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, streak_habit: e.target.value }))}
            className="bg-input border border-line rounded-md px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-gold/50"
            placeholder="e.g. exercise, thesis, water, prayer"
          />
          <span className="text-[11px] text-fg-muted">
            Templates sharing the same streak name feed the same streak counter.
          </span>
        </label>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="eyebrow">Stat split</span>
            <span className={`font-mono text-xs ${splitTotal === 100 ? 'text-success' : 'text-danger'}`}>
              {splitTotal}%
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {STATS.map((stat) => {
              const active = stat.key in form.stat_split
              return (
                <div key={stat.key} className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => toggleStat(stat.key)}
                    className={`text-xs px-2.5 py-1.5 rounded-md border w-32 shrink-0 text-left transition-colors ${
                      active ? 'border-gold/60 text-fg bg-gold/10' : 'border-line text-fg-muted'
                    }`}
                  >
                    {stat.key}
                  </button>
                  {active && (
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={form.stat_split[stat.key]}
                      onChange={(e) => setSplitPct(stat.key, e.target.value)}
                      className="flex-1 bg-input border border-line rounded-md px-2 py-1.5 text-sm text-fg font-mono focus:outline-none focus:ring-2 focus:ring-gold/50"
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="bg-gold text-gold-on font-semibold text-sm rounded-md py-2.5 hover:bg-gold-strong transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save template'}
        </button>
      </form>
    </StatusPanel>
  )
}
