/**
 * AI Prompts for Gemini API
 * Centralized prompt management for easy updates and maintenance
 */

export const prompts = {
  /**
   * Image analysis prompt for food identification
   */
  imageAnalysis: `Identify the food in this image and provide a calorie estimate AND macronutrients (protein, carbs, fats in grams) for the serving size shown. Return ONLY raw JSON in this format: { "foodItem": "Food Name", "calories": number, "protein": number, "carbs": number, "fats": number }. If it's not food, return { "foodItem": "Unknown", "calories": 0, "protein": 0, "carbs": 0, "fats": 0 }. Do not include markdown formatting or backticks.`,

  /**
   * Meal suggestion prompt
   * @param {Object} data - User's nutrition data
   * @param {string} data.history - Formatted list of meals eaten today
   * @param {number} data.dailyGoal - User's daily calorie goal
   * @param {number} data.remaining - Remaining calories in budget
   */
  mealSuggestion: ({ history, dailyGoal, remaining }) => `
    I am a user tracking my calories. 
    My daily goal is ${dailyGoal} calories. 
    So far today I have eaten: ${history}. 
    I have ${remaining} calories remaining in my budget. 
    
    Please suggest ONE specific, tasty, and healthy meal or snack option that fits perfectly into my remaining calorie budget. 
    Do not suggest something that exceeds the limit significantly.
    If I have very few calories left (less than 100), suggest a tea or very light snack.
    
    Keep the response friendly and formatted like this:
    "🍽️ [Meal Name] ([Approx Calories] cal)
    
    [Short appetizing description of why this is good for me right now]"
  `,

  /**
   * Daily overview/analysis prompt
   * @param {Object} data - User's nutrition data
   * @param {string} data.history - Formatted list of meals eaten today
   * @param {number} data.dailyGoal - User's daily calorie goal
   * @param {number} data.caloriesToday - Total calories consumed today
   */
  dailyOverview: ({ history, dailyGoal, caloriesToday }) => `
    Act as a friendly, encouraging nutritionist coach.
    Analyze my food log for today: ${history}.
    My goal is ${dailyGoal} calories and I have consumed ${caloriesToday}.
    
    Provide a 2-3 sentence summary. 
    1. Give me positive reinforcement.
    2. Give me one specific nutritional tip based on what I ate (e.g., "Great protein, but watch the sugar" or "Good job staying under, try to eat more fiber").
    Use emojis. Be concise.
  `,

  /**
   * Weekly cross-domain review (training + nutrition)
   * @param {Object} s - computed weekly summary stats
   */
  weeklyReview: (s) => `
    Act as a pragmatic strength coach reviewing a lifter's week.
    This week's data:
    - Training volume: ${s.volume} lb (last week: ${s.prevVolume} lb)
    - Workouts completed: ${s.sessions}
    - PRs: ${s.prList || 'none'}
    - Avg daily protein: ${s.avgProtein} g (target ${s.proteinGoal} g)
    - Avg daily calories: ${s.avgCalories} (goal ${s.dailyGoal})
    - Days with food logged: ${s.daysLogged}/7

    Return ONLY raw JSON, no markdown, in this exact shape:
    { "training": "1-2 sentences on volume/PRs trend", "fuel": "1-2 sentences on protein and calorie adherence, reference training days", "win": "one specific stat-backed highlight", "focus": "one actionable instruction for next week" }
    Be direct and specific with the numbers given. No emojis.
  `,
};
