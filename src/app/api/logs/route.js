import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { advanceStreak } from '@/lib/streak';

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

  const today = body.localDate || new Date().toISOString().split('T')[0];
  await advanceStreak(supabase, user.id, today);

  return NextResponse.json(data);
}
