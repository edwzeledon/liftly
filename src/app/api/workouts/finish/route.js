import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { advanceStreak } from '@/lib/streak';

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { ids, duration } = body;

  // 1. Update Logs to Completed - REMOVED (Redundant, status is on session)
  // We no longer update workout_logs status as it is managed via workout_sessions

  // 2. Close the Active Session
  const { error: sessionError } = await supabase
    .from('workout_sessions')
    .update({ 
        status: 'completed', 
        ended_at: new Date().toISOString(),
        duration_seconds: duration 
    })
    .eq('user_id', user.id)
    .eq('status', 'active');

  if (sessionError) {
    return NextResponse.json({ error: sessionError.message }, { status: 500 });
  }

  const today = body.localDate || new Date().toISOString().split('T')[0];
  await advanceStreak(supabase, user.id, today);

  return NextResponse.json({ success: true });
}
