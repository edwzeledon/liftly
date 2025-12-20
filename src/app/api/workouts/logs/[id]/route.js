import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PUT(request, { params }) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const { data, error } = await supabase
    .from('workout_logs')
    .update({ sets: body.sets })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(request, { params }) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const { data, error } = await supabase
    .from('workout_logs')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
    .select('session_id');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If this was the last log in the session, delete the session
  if (data && data.length > 0 && data[0].session_id) {
    const sessionId = data[0].session_id;
    
    const { count } = await supabase
      .from('workout_logs')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId);

    if (count === 0) {
      await supabase
        .from('workout_sessions')
        .delete()
        .eq('id', sessionId);
    }
  }

  return NextResponse.json({ success: true });
}
