import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

export function useStreaks() {
  const { user } = useAuth()
  const [streaks, setStreaks] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user) return
    const { data, error } = await supabase
      .from('streaks')
      .select('*')
      .eq('user_id', user.id)
      .order('habit_name')
    if (!error && data) setStreaks(data)
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (!user) return
    refresh()
    const channel = supabase
      .channel(`streaks-changes-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'streaks', filter: `user_id=eq.${user.id}` },
        () => refresh()
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user, refresh])

  return { streaks, loading, refresh }
}
