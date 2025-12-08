import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || { is_new_user: true, daily_goal: 2000 });
}

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  let updates = {};

  // If raw profile data is provided, calculate goals
  if (body.age && body.weight && body.height) {
    const { age, weight, height, gender, activity, goal } = body;
    
    // Constants
    const ACTIVITY_FACTORS = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      extra: 1.9
    };

    const GOAL_ADJUSTMENTS = {
      lose: -500,
      maintain: 0,
      gain: 300
    };

    // Mifflin-St Jeor Equation
    // Weight in kg, Height in cm
    let bmr = (10 * weight) + (6.25 * height) - (5 * age);
    if (gender === 'male') {
      bmr += 5;
    } else {
      bmr -= 161;
    }

    const tdee = bmr * (ACTIVITY_FACTORS[activity] || 1.2);
    const targetCalories = Math.round(tdee + (GOAL_ADJUSTMENTS[goal] || 0));

    // Macro Split based on Goal
    let ratios = { p: 0.3, c: 0.35, f: 0.35 }; // Default (Maintain)

    if (goal === 'lose') {
      // High Protein (40%) for satiety and muscle preservation
      ratios = { p: 0.4, c: 0.3, f: 0.3 };
    } else if (goal === 'gain') {
      // Higher Carbs (45%) for training energy
      ratios = { p: 0.3, c: 0.45, f: 0.25 };
    }

    if (goal === 'custom') {
      updates = {
        daily_goal: parseInt(body.customCalories),
        protein_goal: parseInt(body.customProtein),
        carbs_goal: parseInt(body.customCarbs),
        fats_goal: parseInt(body.customFats)
      };
    } else {
      updates = {
        daily_goal: targetCalories,
        protein_goal: Math.round((targetCalories * ratios.p) / 4),
        carbs_goal: Math.round((targetCalories * ratios.c) / 4),
        fats_goal: Math.round((targetCalories * ratios.f) / 9)
      };
    }
  } else {
    // Manual updates
    if (body.dailyGoal) updates.daily_goal = body.dailyGoal;
    if (body.proteinGoal) updates.protein_goal = body.proteinGoal;
    if (body.carbsGoal) updates.carbs_goal = body.carbsGoal;
    if (body.fatsGoal) updates.fats_goal = body.fatsGoal;
  }

  const { data, error } = await supabase
    .from('user_settings')
    .upsert({ 
      user_id: user.id, 
      ...updates
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
