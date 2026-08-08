import { useState } from 'react'
import { useTaskTemplates } from '../hooks/useTaskTemplates'
import { useAuth } from '../context/AuthContext'
import { statMeta } from '../lib/statMeta'
import StatusPanel from '../components/StatusPanel'
import TemplateEditor from '../components/TemplateEditor'
import LoadingScreen from '../components/LoadingScreen'
import ThemeToggle from '../components/ThemeToggle'
import { Plus, Pencil, Archive } from 'lucide-react'

function templateSubtitle(t) {
  if (t.metric_type === 'stage') {
    return `${t.stages?.length ?? 0} stages · up to ${t.stages?.at(-1)?.points ?? 0}pts${
      t.streak_habit ? ` · streak "${t.streak_habit}"` : ''
    }`
  }
  return `base ${t.base_points}pts · optimal ${t.optimal_min}–${t.optimal_max} ${t.unit_label}${
    t.streak_habit ? ` · streak "${t.streak_habit}"` : ''
  }`
}

export default function Settings() {
  const { templates, loading, createTemplate, updateTemplate, archiveTemplate } = useTaskTemplates()
  const { user, signOut } = useAuth()
  const [editing, setEditing] = useState(null) // null | 'new' | template object

  if (loading) return <LoadingScreen label="Loading settings…" />

  async function handleSave(values) {
    if (editing === 'new') {
      await createTemplate(values)
    } else {
      await updateTemplate(editing.id, values)
    }
    setEditing(null)
  }

  return (
    <div className="max-w-xl mx-auto px-4 pt-8 pb-28">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="eyebrow mb-1">Settings</p>
          <h1 className="font-display text-2xl text-fg">Task templates</h1>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {editing === null && (
            <button
              onClick={() => setEditing('new')}
              className="flex items-center gap-1.5 bg-gold/15 text-gold text-sm px-3 py-2 rounded-md hover:bg-gold/25 transition-colors"
            >
              <Plus size={16} /> Add
            </button>
          )}
        </div>
      </header>

      {editing !== null && (
        <div className="mb-6">
          <TemplateEditor
            initial={editing === 'new' ? null : editing}
            onSave={handleSave}
            onCancel={() => setEditing(null)}
          />
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        {templates.map((t) => (
          <StatusPanel key={t.id} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-fg font-medium">{t.name}</p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setEditing(t)}
                  className="p-1.5 text-fg-muted hover:text-gold transition-colors"
                  aria-label={`Edit ${t.name}`}
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => archiveTemplate(t.id)}
                  className="p-1.5 text-fg-muted hover:text-danger transition-colors"
                  aria-label={`Archive ${t.name}`}
                >
                  <Archive size={15} />
                </button>
              </div>
            </div>
            <p className="font-mono text-[11px] text-fg-muted mb-2">{templateSubtitle(t)}</p>
            <div className="flex flex-wrap gap-1">
              {Object.entries(t.stat_split).map(([statKey, pct]) => {
                const meta = statMeta(statKey)
                return (
                  <span
                    key={statKey}
                    className="text-[10px] px-1.5 py-0.5 rounded-full font-mono"
                    style={{ backgroundColor: `${meta.hex}1F`, color: meta.hex }}
                  >
                    {statKey} {pct}%
                  </span>
                )
              })}
            </div>
          </StatusPanel>
        ))}
      </div>

      <div className="mt-10 pt-6 border-t border-line flex items-center justify-between">
        <p className="text-xs text-fg-muted truncate">{user?.email}</p>
        <button onClick={signOut} className="text-xs text-fg-muted hover:text-danger transition-colors">
          Sign out
        </button>
      </div>
    </div>
  )
}
