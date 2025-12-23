export async function addLog(userId, logData) {
  const payload = {
    ...logData,
    localDate: new Date().toLocaleDateString('en-CA')
  };
  const response = await fetch('/api/logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error('Failed to add log');
  return response.json();
}

export async function updateLog(logId, userId, logData) {
  const response = await fetch(`/api/logs/${logId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(logData)
  });
  if (!response.ok) throw new Error('Failed to update log');
  return response.json();
}

export async function deleteLog(logId, userId) {
  const response = await fetch(`/api/logs/${logId}`, {
    method: 'DELETE'
  });
  if (!response.ok) throw new Error('Failed to delete log');
  return true;
}

export async function getLogs(userId) {
  const response = await fetch('/api/logs');
  if (!response.ok) throw new Error('Failed to fetch logs');
  return response.json();
}

export async function getUserSettings(userId) {
  const response = await fetch('/api/user/settings');
  if (!response.ok) throw new Error('Failed to fetch settings');
  return response.json();
}

export async function updateUserSettings(userId, settings) {
  const response = await fetch('/api/user/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  });
  if (!response.ok) throw new Error('Failed to update settings');
  return response.json();
}

export async function callGeminiText(data) {
  const payload = {
    ...data,
    localDate: new Date().toLocaleDateString('en-CA')
  };
  const response = await fetch('/api/gemini/text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const result = await response.json();
  if (result.error) throw new Error(result.error);
  return result.text;
}

export async function analyzeImageWithGemini(base64Data, mimeType) {
  const response = await fetch('/api/gemini/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      base64Data, 
      mimeType,
      localDate: new Date().toLocaleDateString('en-CA')
    })
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return data;
}

export async function getDailyStats(date) {
  const response = await fetch(`/api/daily-stats?date=${date}`);
  if (!response.ok) throw new Error('Failed to fetch daily stats');
  return response.json();
}

export async function getWeightHistory(range) {
  const cacheKey = `snapcal_weight_history_${range}`;
  const cached = localStorage.getItem(cacheKey);
  
  // Use cached data if available (persists until new weight logged)
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      console.error("Error parsing cached weight history", e);
    }
  }
  
  // Fetch from API and cache
  const response = await fetch(`/api/daily-stats?range=${range}`);
  if (!response.ok) throw new Error('Failed to fetch weight history');
  const data = await response.json();
  localStorage.setItem(cacheKey, JSON.stringify(data));
  return data;
}

export async function updateDailyStats(data) {
  const response = await fetch('/api/daily-stats', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Failed to update daily stats');
  const result = await response.json();
  
  // Invalidate weight history cache only if weight was updated
  if (data.weight !== undefined) {
    ['week', 'month', '90days'].forEach(range => {
      localStorage.removeItem(`snapcal_weight_history_${range}`);
    });
  }
  
  return result;
}

export async function getWorkoutLogs() {
  const response = await fetch('/api/workouts/logs?status=completed');
  if (!response.ok) throw new Error('Failed to fetch workout logs');
  return response.json();
}

export async function getActiveWorkoutLogs() {
  const response = await fetch('/api/workouts/logs'); // Defaults to active
  if (!response.ok) throw new Error('Failed to fetch active workout logs');
  return response.json();
}

export async function deleteWorkoutLog(logId) {
  const response = await fetch(`/api/workouts/logs/${logId}`, {
    method: 'DELETE'
  });
  if (!response.ok) throw new Error('Failed to delete workout log');
  return true;
}

export async function getExercises() {
  const response = await fetch('/api/exercises');
  if (!response.ok) throw new Error('Failed to fetch exercises');
  return response.json();
}
