import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('logs')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  
  const { data, error } = await supabase
    .from('logs')
    .insert([
      { 
        user_id: user.id,
        food_item: body.foodItem,
        calories: body.calories,
        protein: body.protein || 0,
        carbs: body.carbs || 0,
        fats: body.fats || 0,
        method: body.method,
        meal_type: body.mealType || 'snack',
        image_url: body.imageUrl || null,
        date: new Date().toISOString()
      }
    ])
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // --- Streak Logic ---
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { data: settings } = await supabase
      .from('user_settings')
      .select('current_streak, last_log_date')
      .eq('user_id', user.id)
      .single();

    if (settings) {
      const lastLogDate = settings.last_log_date;
      let newStreak = settings.current_streak || 0;
      let shouldUpdate = false;

      if (lastLogDate === today) {
        // Already logged today, do nothing
      } else {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (lastLogDate === yesterdayStr) {
          newStreak += 1;
        } else {
          newStreak = 1; // Reset or start new
        }
        shouldUpdate = true;
      }

      if (shouldUpdate) {
        await supabase
          .from('user_settings')
          .update({ 
            current_streak: newStreak, 
            last_log_date: today 
          })
          .eq('user_id', user.id);
      }
    }
  } catch (e) {
    console.error("Error updating streak:", e);
    // Don't fail the request if streak update fails
  }
  // --------------------

  return NextResponse.json(data);
}
