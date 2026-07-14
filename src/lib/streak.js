// src/lib/streak.js
// Streak semantics: a day counts if the user logged food OR finished a workout.
// user_settings.last_log_date is the last *activity* date (either kind).

export function nextStreak({ currentStreak, lastLogDate, today }) {
  if (lastLogDate === today) {
    return { streak: currentStreak || 0, lastLogDate: today, changed: false };
  }
  const todayDate = new Date(today + 'T00:00:00');
  const yesterday = new Date(todayDate);
  yesterday.setDate(yesterday.getDate() - 1);
  const y = yesterday.getFullYear();
  const m = String(yesterday.getMonth() + 1).padStart(2, '0');
  const d = String(yesterday.getDate()).padStart(2, '0');
  const yesterdayStr = `${y}-${m}-${d}`;

  const streak = lastLogDate === yesterdayStr ? (currentStreak || 0) + 1 : 1;
  return { streak, lastLogDate: today, changed: true };
}

// Shared server-side helper: reads settings, computes, writes back. Never throws.
export async function advanceStreak(supabase, userId, today) {
  try {
    const { data: settings } = await supabase
      .from('user_settings')
      .select('current_streak, last_log_date')
      .eq('user_id', userId)
      .single();
    if (!settings) return;

    const result = nextStreak({
      currentStreak: settings.current_streak,
      lastLogDate: settings.last_log_date,
      today,
    });
    if (result.changed) {
      await supabase
        .from('user_settings')
        .update({ current_streak: result.streak, last_log_date: result.lastLogDate })
        .eq('user_id', userId);
    }
  } catch (e) {
    console.error('Error updating streak:', e);
  }
}
