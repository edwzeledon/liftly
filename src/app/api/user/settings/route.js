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
    } else if (gender === 'female') {
      bmr -= 161;
    } else {
      bmr -= 78; // unspecified: midpoint
    }

    const tdee = bmr * (ACTIVITY_FACTORS[activity] || 1.2);
    let targetCalories = Math.round(tdee + (GOAL_ADJUSTMENTS[goal] || 0));

    // Time-Based Calculation for Lose/Gain
    if ((goal === 'lose' || goal === 'gain') && body.goalWeight && body.targetDate) {
        const currentWeightKg = weight;
        const goalWeightKg = body.goalWeight;
        const weightDiffKg = currentWeightKg - goalWeightKg; // Positive if losing, Negative if gaining
        
        // 1 kg of fat approx 7700 calories
        const totalCaloriesDiff = weightDiffKg * 7700;
        
        const today = new Date();
        const target = new Date(body.targetDate);
        const diffTime = Math.abs(target - today);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

        if (diffDays > 0) {
            const dailyAdjustment = Math.round(totalCaloriesDiff / diffDays);
            // Subtract adjustment from TDEE (if losing, diff is positive, so we subtract. If gaining, diff is negative, so we add)
            targetCalories = Math.round(tdee - dailyAdjustment);
            
            // Safety Caps
            if (targetCalories < 1200 && gender === 'female') targetCalories = 1200;
            if (targetCalories < 1500 && gender === 'male') targetCalories = 1500;
            if (targetCalories < 1350 && gender !== 'male' && gender !== 'female') targetCalories = 1350; // midpoint floor for unspecified
        }
    }

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
    if (body.trainingDayOffset !== undefined) updates.training_day_calorie_offset = parseInt(body.trainingDayOffset) || 0;
    if (body.restDayOffset !== undefined) updates.rest_day_calorie_offset = parseInt(body.restDayOffset) || 0;
    if (body.timezone) updates.timezone = body.timezone;
  }

  // Preference passthroughs — outside the if/else so they apply in both
  // branches (onboarding carries weightUnit alongside profile data; the
  // Settings screen sends preferences alone).
  if (body.weightUnit) updates.weight_unit = body.weightUnit === 'kg' ? 'kg' : 'lb';
  if (body.waterGoal !== undefined) {
    updates.water_goal = Math.min(16, Math.max(4, parseInt(body.waterGoal) || 8));
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
