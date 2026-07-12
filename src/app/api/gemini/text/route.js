import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prompts } from '@/lib/prompts';
import { generateGeminiContent } from '@/lib/gemini';
import { aggregateInsights, pickWeekPair, dayKey } from '@/lib/insights';
import { startOfWeek } from '@/lib/workoutStats';

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
    } else if (type === 'weekly-review') {
      // 1/week server-enforced limit + persisted content cache. Ignores any
      // client-sent data: the server computes the week's truth from the DB.
      const { data: fullSettings } = await supabase
        .from('user_settings')
        .select('daily_goal, protein_goal, last_weekly_review, weekly_review_content')
        .eq('user_id', user.id)
        .single();

      const thisWeek = startOfWeek(today);
      // Cached same-week return: skip Gemini AND any settings write.
      if (
        fullSettings?.last_weekly_review &&
        startOfWeek(fullSettings.last_weekly_review) === thisWeek &&
        fullSettings.weekly_review_content
      ) {
        return NextResponse.json({ review: fullSettings.weekly_review_content, cached: true });
      }

      // Previous ISO-week Monday (thisWeek is already a Monday).
      const prevDate = new Date(thisWeek + 'T00:00:00');
      prevDate.setDate(prevDate.getDate() - 7);
      const prevWeek = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(prevDate.getDate()).padStart(2, '0')}`;

      // Last 14 days for this-week vs last-week comparison.
      const since = new Date();
      since.setDate(since.getDate() - 14);
      const [foodRes, workoutRes] = await Promise.all([
        supabase.from('logs').select('date, calories, protein').eq('user_id', user.id).gte('date', since.toISOString()),
        supabase.from('workout_logs').select('date, exercise_name, sets, workout_sessions!inner(status)')
          .eq('user_id', user.id).eq('workout_sessions.status', 'completed').gte('date', since.toISOString()),
      ]);

      const agg = aggregateInsights({
        foodLogs: foodRes.data || [],
        workoutLogs: workoutRes.data || [],
        dailyStats: [],
        dailyGoal: fullSettings?.daily_goal || 2000,
        weeks: 2,
      });
      // Match buckets by week-start, not array position: the most-recent bucket
      // is NOT necessarily the current week (e.g. logged last week, nothing this
      // week). pickWeekPair zero-fills any absent week. Handles 0/1/2 uniformly.
      const { thisWk, prevWk } = pickWeekPair(agg.weeks, thisWeek, prevWeek);

      if ((thisWk.daysLogged || 0) < 3 && thisWk.volume === 0) {
        return NextResponse.json({ error: 'Not enough data this week yet' }, { status: 422 });
      }

      const weekPrs = agg.prEvents.filter((p) => startOfWeek(p.date) === thisWeek);
      const sessions = new Set(
        (workoutRes.data || [])
          .filter((l) => startOfWeek(dayKey(l.date)) === thisWeek)
          .map((l) => dayKey(l.date))
      ).size;

      prompt = prompts.weeklyReview({
        volume: thisWk.volume,
        prevVolume: prevWk.volume,
        sessions,
        prList: weekPrs.map((p) => `${p.exercise} ${p.weight}x${p.reps}`).join(', '),
        avgProtein: thisWk.avgProtein,
        proteinGoal: fullSettings?.protein_goal || 0,
        avgCalories: thisWk.avgCalories,
        dailyGoal: fullSettings?.daily_goal || 2000,
        daysLogged: thisWk.daysLogged,
      });
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    const { response } = await generateGeminiContent(GEMINI_API_KEY, [{ parts: [{ text: prompt }] }]);
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't generate a response right now.";

    // Weekly review returns structured JSON and persists it (own weekly cache);
    // it does not touch the per-day daily_stats counters below.
    if (type === 'weekly-review') {
      let review;
      try {
        review = JSON.parse(text.replace(/```json|```/g, '').trim());
      } catch {
        review = { training: text, fuel: '', win: '', focus: '' };
      }
      await supabase.from('user_settings')
        .update({ last_weekly_review: today, weekly_review_content: review })
        .eq('user_id', user.id);
      return NextResponse.json({ review, cached: false });
    }

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
