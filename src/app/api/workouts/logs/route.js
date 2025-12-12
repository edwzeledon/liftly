import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const status = searchParams.get('status');

  // 1. Get Active Session ID first
  let sessionId = null;
  if (!date && (!status || status === 'active')) {
      const { data: activeSession } = await supabase
        .from('workout_sessions')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();
      
      if (activeSession) {
        sessionId = activeSession.id;
      } else {
        // If no active session exists, return empty array for active view
        if (!date) return NextResponse.json([]);
      }
  }

  let query = supabase
    .from('workout_logs')
    .select('*, workout_sessions!inner(status, duration_seconds)')
    .eq('user_id', user.id)
    .order('date', { ascending: true });

  if (date) {
    // Filter by date (start and end of day in UTC)
    const startISO = `${date}T00:00:00.000Z`;
    const endISO = `${date}T23:59:59.999Z`;
    query = query.gte('date', startISO).lte('date', endISO);
  } else if (sessionId) {
    // Filter by session ID
    query = query.eq('session_id', sessionId);
  } else if (status) {
    // Filter by SESSION status
    query = query.eq('workout_sessions.status', status);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Map session data to top level for frontend compatibility
  const enrichedData = data.map(log => ({
    ...log,
    duration: log.workout_sessions?.duration_seconds || log.duration, // Prefer session duration
    status: log.workout_sessions?.status || log.status
  }));

  return NextResponse.json(enrichedData);
}

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  
  // 1. Find or Create Active Session
  let sessionId = null;
  
  // Use limit(1) to handle potential duplicates
  const { data: activeSessions } = await supabase
    .from('workout_sessions')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1);

  const activeSession = activeSessions?.[0];

  if (activeSession) {
    sessionId = activeSession.id;
  } else {
    // Create new session
    const { data: newSession, error: sessionError } = await supabase
        .from('workout_sessions')
        .insert([{ user_id: user.id, status: 'active' }])
        .select()
        .single();
    
    if (sessionError) {
        return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
    }
    sessionId = newSession.id;
  }

  const { data, error } = await supabase
    .from('workout_logs')
    .insert([
      { 
        user_id: user.id,
        session_id: sessionId,
        exercise_name: body.exercise,
        category: body.category,
        sets: body.sets || [],
        date: body.date || new Date().toISOString()
        // status removed - relies on session status
      }
    ])
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
