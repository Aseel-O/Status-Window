import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

export function useTaskTemplates() {
  const { user } = useAuth()
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user) return
    const { data, error } = await supabase
      .from('task_templates')
      .select('*')
      .eq('user_id', user.id)
      .eq('archived', false)
      .order('name')
    if (!error && data) setTemplates(data)
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (!user) return
    refresh()
    const channel = supabase
      .channel(`templates-changes-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'task_templates', filter: `user_id=eq.${user.id}` },
        () => refresh()
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user, refresh])

  const createTemplate = useCallback(
    async (template) => {
      const { error } = await supabase
        .from('task_templates')
        .insert({ ...template, user_id: user.id })
      if (error) throw error
    },
    [user]
  )

  const updateTemplate = useCallback(async (id, patch) => {
    const { error } = await supabase.from('task_templates').update(patch).eq('id', id)
    if (error) throw error
  }, [])

  const archiveTemplate = useCallback(async (id) => {
    const { error } = await supabase.from('task_templates').update({ archived: true }).eq('id', id)
    if (error) throw error
  }, [])

  return { templates, loading, createTemplate, updateTemplate, archiveTemplate, refresh }
}
