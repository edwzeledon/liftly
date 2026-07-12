import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { aggregateInsights } from '@/lib/insights';

export async function GET(request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const weeks = Math.min(parseInt(searchParams.get('weeks')) || 4, 12);
  const since = new Date();
  since.setDate(since.getDate() - weeks * 7);
  const sinceIso = since.toISOString();
  const sinceDay = sinceIso.split('T')[0];

  const [foodRes, workoutRes, statsRes, settingsRes] = await Promise.all([
    supabase.from('logs').select('date, calories, protein').eq('user_id', user.id).gte('date', sinceIso),
    supabase.from('workout_logs')
      .select('date, exercise_name, sets, workout_sessions!inner(status)')
      .eq('user_id', user.id).eq('workout_sessions.status', 'completed').gte('date', sinceIso),
    supabase.from('daily_stats').select('date, weight').eq('user_id', user.id).gte('date', sinceDay),
    supabase.from('user_settings').select('daily_goal').eq('user_id', user.id).single(),
  ]);

  const firstError = foodRes.error || workoutRes.error || statsRes.error;
  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 500 });
  }

  const result = aggregateInsights({
    foodLogs: foodRes.data || [],
    workoutLogs: workoutRes.data || [],
    dailyStats: statsRes.data || [],
    dailyGoal: settingsRes.data?.daily_goal || 2000,
    weeks,
  });

  return NextResponse.json({ ...result, dailyGoal: settingsRes.data?.daily_goal || 2000 });
}
