import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const exerciseName = searchParams.get('exercise');

  if (!exerciseName) {
    return NextResponse.json({ error: 'Exercise name required' }, { status: 400 });
  }

  // Fetch all completed logs for this exercise to find the best set
  const { data, error } = await supabase
    .from('workout_logs')
    .select('sets, workout_sessions!inner(status)')
    .eq('user_id', user.id)
    .eq('exercise_name', exerciseName)
    .eq('workout_sessions.status', 'completed');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json(null);
  }

  // Calculate 1RM or Volume to determine "Best Set"
  // Simple logic: Max Weight, then Max Reps for that weight
  let bestSet = { weight: 0, reps: 0 };

  data.forEach(log => {
    if (log.sets && Array.isArray(log.sets)) {
      log.sets.forEach(set => {
        const weight = parseFloat(set.weight) || 0;
        const reps = parseFloat(set.reps) || 0;

        if (weight > bestSet.weight) {
          bestSet = { weight, reps };
        } else if (weight === bestSet.weight && reps > bestSet.reps) {
          bestSet = { weight, reps };
        }
      });
    }
  });

  return NextResponse.json(bestSet.weight > 0 ? bestSet : null);
}
