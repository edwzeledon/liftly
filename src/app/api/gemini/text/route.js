import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prompts } from '@/lib/prompts';
import { generateGeminiContent } from '@/lib/gemini';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(request) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: "Gemini API Key not configured" }, { status: 500 });
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { type, todaysLogs, dailyGoal, caloriesToday, remaining } = await request.json();

    // Check Limits
    const { data: settings } = await supabase
      .from('user_settings')
      .select('timezone')
      .eq('user_id', user.id)
      .single();

    const userTimezone = settings?.timezone || 'UTC';
    const today = new Date().toLocaleDateString('en-CA', { timeZone: userTimezone });

    const { data: stats } = await supabase
      .from('daily_stats')
      .select('overview_count, suggestion_count')
      .eq('user_id', user.id)
      .eq('date', today)
      .single();

    if (type === 'overview') {
      if (stats && stats.overview_count >= 1) {
        return NextResponse.json({ error: 'Daily overview limit reached (1/1)' }, { status: 429 });
      }
    } else if (type === 'suggestion') {
      if (stats && stats.suggestion_count >= 1) {
        return NextResponse.json({ error: 'Daily suggestion limit reached (1/1)' }, { status: 429 });
      }
    }

    // Build prompt on server side
    let prompt = '';
    if (type === 'suggestion') {
      const history = todaysLogs?.map(l => `${l.food_item} (${l.calories} cal)`).join(', ') || 'nothing yet';
      prompt = prompts.mealSuggestion({ history, dailyGoal, remaining });
    } else if (type === 'overview') {
      const history = todaysLogs?.map(l => `${l.food_item} (${l.calories} cal)`).join(', ') || 'nothing logged yet';
      prompt = prompts.dailyOverview({ history, dailyGoal, caloriesToday });
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    const { response } = await generateGeminiContent(GEMINI_API_KEY, [{ parts: [{ text: prompt }] }]);
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't generate a response right now.";
    
    // Increment Usage
    const updates = {};
    if (type === 'overview') updates.overview_count = (stats?.overview_count || 0) + 1;
    if (type === 'suggestion') updates.suggestion_count = (stats?.suggestion_count || 0) + 1;

    if (Object.keys(updates).length > 0) {
      if (stats) {
        await supabase.from('daily_stats').update(updates).eq('user_id', user.id).eq('date', today);
      } else {
        await supabase.from('daily_stats').insert({ user_id: user.id, date: today, ...updates });
      }
    }

    return NextResponse.json({ text });
  } catch (error) {
    console.error("Gemini Text Error:", error);
    return NextResponse.json({ error: error.message || "Failed to process request" }, { status: 500 });
  }
}
