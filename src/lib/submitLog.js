import { supabase } from './supabaseClient'
import { calculatePoints, calculateStagePoints, applyStatSplit } from './scoring'
import { applyCompletion } from './streaks'

async function advanceLinkedStreak(userId, template) {
  if (!template.streak_habit) return null
  const { data: streakRow } = await supabase
    .from('streaks')
    .select('*')
    .eq('user_id', userId)
    .eq('habit_name', template.streak_habit)
    .maybeSingle()

  const nextStreak = applyCompletion(
    streakRow ?? { current_streak: 0, freezes_available: 1, last_completed_date: null }
  )

  await supabase.from('streaks').upsert(
    {
      user_id: userId,
      habit_name: template.streak_habit,
      current_streak: nextStreak.current_streak,
      freezes_available: nextStreak.freezes_available,
      last_completed_date: nextStreak.last_completed_date,
    },
    { onConflict: 'user_id,habit_name' }
  )

  return nextStreak
}

/**
 * Logs a completed 'duration' | 'count' | 'words' task end-to-end.
 * @param {{ userId: string, template: object, amount: number, difficulty: number, evidenceUrl?: string }} args
 */
export async function submitLog({ userId, template, amount, difficulty, evidenceUrl }) {
  // Look up the linked streak first (if any) so its *current* count feeds
  // the consistency bonus; the streak itself is advanced after scoring.
  let priorStreak = null
  if (template.streak_habit) {
    const { data } = await supabase
      .from('streaks')
      .select('*')
      .eq('user_id', userId)
      .eq('habit_name', template.streak_habit)
      .maybeSingle()
    priorStreak = data
  }
  const previewNextStreak = template.streak_habit
    ? applyCompletion(priorStreak ?? { current_streak: 0, freezes_available: 1, last_completed_date: null })
    : null

  const { points, breakdown } = calculatePoints({
    basePoints: template.base_points,
    amount,
    optimalMin: template.optimal_min,
    optimalMax: template.optimal_max,
    difficulty,
    consecutiveDays: previewNextStreak?.current_streak ?? 0,
  })

  const statDeltas = applyStatSplit(points, template.stat_split)

  const { error: logError } = await supabase.from('logs').insert({
    user_id: userId,
    task_template_id: template.id,
    task_name: template.name,
    metric_type: template.metric_type,
    amount,
    unit_label: template.unit_label,
    difficulty,
    points_awarded: points,
    stat_split_applied: statDeltas,
    evidence_url: evidenceUrl ?? null,
  })
  if (logError) throw logError

  await Promise.all(
    Object.entries(statDeltas).map(([statName, delta]) =>
      supabase.rpc('increment_stat_points', { p_stat_name: statName, p_delta: delta })
    )
  )

  const streakAdvanced = await advanceLinkedStreak(userId, template)

  return { points, breakdown, statDeltas, streakAdvanced }
}

/**
 * Logs a 'stage' (milestone/project) task: awards the point delta between
 * the previously-reached stage and the newly-reached one, then advances the
 * template's stored progress so re-logging the same or an earlier stage is
 * a no-op.
 * @param {{ userId: string, template: object, newStageIndex: number, difficulty?: number }} args
 */
export async function submitStageLog({ userId, template, newStageIndex, difficulty = 3 }) {
  const stages = template.stages ?? []
  if (newStageIndex < 0 || newStageIndex >= stages.length) {
    throw new Error('Invalid stage.')
  }

  const previousIndex = template.stage_index ?? -1
  const { points, stageName } = calculateStagePoints(stages, previousIndex, newStageIndex)
  const statDeltas = applyStatSplit(points, template.stat_split)

  const { error: logError } = await supabase.from('logs').insert({
    user_id: userId,
    task_template_id: template.id,
    task_name: template.name,
    metric_type: 'stage',
    stage_name: stageName,
    difficulty,
    points_awarded: points,
    stat_split_applied: statDeltas,
  })
  if (logError) throw logError

  if (points > 0) {
    await Promise.all(
      Object.entries(statDeltas).map(([statName, delta]) =>
        supabase.rpc('increment_stat_points', { p_stat_name: statName, p_delta: delta })
      )
    )
  }

  if (newStageIndex > previousIndex) {
    await supabase.from('task_templates').update({ stage_index: newStageIndex }).eq('id', template.id)
  }

  const streakAdvanced = await advanceLinkedStreak(userId, template)

  return { points, stageName, statDeltas, streakAdvanced }
}
