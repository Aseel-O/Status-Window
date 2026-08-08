import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

export function useLogs(limit = 100) {
  const { user } = useAuth()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user) return
    const { data, error } = await supabase
      .from('logs')
      .select('*')
      .eq('user_id', user.id)
      .order('occurred_at', { ascending: false })
      .limit(limit)
    if (!error && data) setLogs(data)
    setLoading(false)
  }, [user, limit])

  useEffect(() => {
    if (!user) return
    refresh()
    const channel = supabase
      .channel(`logs-changes-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'logs', filter: `user_id=eq.${user.id}` },
        () => refresh()
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user, refresh])

  return { logs, loading, refresh }
}
