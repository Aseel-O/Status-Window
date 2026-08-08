import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { STAT_KEYS } from '../lib/statMeta'

export function useStats() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user) return
    const { data, error } = await supabase.from('stats').select('*').eq('user_id', user.id)
    if (!error && data) {
      const map = {}
      for (const key of STAT_KEYS) map[key] = 0
      for (const row of data) map[row.stat_name] = Number(row.points)
      setStats(map)
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (!user) return
    refresh()

    const channel = supabase
      .channel(`stats-changes-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stats', filter: `user_id=eq.${user.id}` },
        () => refresh()
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user, refresh])

  // Called after a log is written, to atomically bump each affected stat.
  const applyPointDeltas = useCallback(async (statSplitPoints) => {
    await Promise.all(
      Object.entries(statSplitPoints).map(([statName, delta]) =>
        supabase.rpc('increment_stat_points', { p_stat_name: statName, p_delta: delta })
      )
    )
  }, [])

  return { stats, loading, refresh, applyPointDeltas }
}
