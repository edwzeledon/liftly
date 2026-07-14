'use client';

// App state provider — MOVED from src/app/page.jsx (R2 of the real-routes plan).
// Holds all auth/data state, effects, handlers, and derived values that the SPA's
// tab blocks and chrome consume. Exposes them via useApp(). Copy semantics this
// task: page.jsx keeps its own copy until R3 deletes it.
import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { getLogs, getUserSettings, updateUserSettings, updateLog, getDailyStats, updateDailyStats, getWorkoutLogs, getActiveWorkoutLogs } from '@/lib/api';
import { useToast } from '@/hooks/useToast';

const AppContext = createContext(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (ctx === null) {
    throw new Error('useApp() must be used within an AppProvider');
  }
  return ctx;
}

export default function AppProvider({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [logs, setLogs] = useState([]);
  const [workoutLogs, setWorkoutLogs] = useState([]);
  const [activeWorkoutLogs, setActiveWorkoutLogs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dailyGoal, setDailyGoal] = useState(2000);
  const [macroGoals, setMacroGoals] = useState({ protein: 150, carbs: 200, fats: 65 });
  const [weightUnit, setWeightUnit] = useState('lb');
  const [waterGoal, setWaterGoal] = useState(8);
  const [editingLog, setEditingLog] = useState(null);
  const [scanCount, setScanCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [streakStatus, setStreakStatus] = useState('broken'); // 'safe', 'at_risk', 'broken'
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isRetakingAssessment, setIsRetakingAssessment] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [bumpSkipped, setBumpSkipped] = useState(false);
  const [staleData, setStaleData] = useState(false); // fetchData failed → showing cached data
  // Logout coordination: signOut() notifies onAuthStateChange subscribers (user →
  // null) BEFORE handleLogout's own replace('/') line runs, so the app layout's
  // auth gate would race in a `/?auth=1&next=...` redirect. The gate skips its
  // redirect while this flag is set; handleLogout owns the navigation. No reset
  // needed — the provider unmounts when the user leaves the app tree.
  const loggingOutRef = useRef(false);
  const { toastEl, showToast } = useToast();

  // Stable date key (en-CA => YYYY-MM-DD) for per-day training-bump skip state
  const todayStr = new Date().toLocaleDateString('en-CA');

  // --- Auth & Data Fetching ---
  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      // If no user, stop loading immediately.
      // If user exists, keep loading true until fetchData (triggered by useEffect[user]) completes.
      if (!currentUser) {
        setLoading(false);
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          setLoading(true);
        }
        setUser(session?.user ?? null);
      });

      return () => subscription.unsubscribe();
    };
    initAuth();
  }, []);

  const fetchData = async () => {
    if (!user) return;
    try {
      const [fetchedLogs, fetchedWorkoutLogs, fetchedActiveWorkoutLogs, settings, dailyStats] = await Promise.all([
        getLogs(user.id),
        getWorkoutLogs(),
        getActiveWorkoutLogs(),
        getUserSettings(user.id),
        getDailyStats(new Date().toLocaleDateString('en-CA'))
      ]);

      // Cache critical data for faster reload
      localStorage.setItem('snapcal_logs', JSON.stringify(fetchedLogs));
      localStorage.setItem('snapcal_activeWorkoutLogs', JSON.stringify(fetchedActiveWorkoutLogs));
      if (settings) localStorage.setItem('snapcal_settings', JSON.stringify(settings));

      setLogs(fetchedLogs);
      setWorkoutLogs(fetchedWorkoutLogs);
      setActiveWorkoutLogs(fetchedActiveWorkoutLogs);
      setStaleData(false); // fresh data landed — clear any stale banner
      if (settings) {
        if (settings.is_new_user) {
          setShowOnboarding(true);
        }
        if (settings.daily_goal) setDailyGoal(settings.daily_goal);
        setWeightUnit(settings.weight_unit === 'kg' ? 'kg' : 'lb');
        setWaterGoal(settings.water_goal || 8);

        // Sync Timezone
        const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (settings.timezone !== browserTimezone) {
             updateUserSettings(user.id, { timezone: browserTimezone });
        }

        // Streak Calculation
        const today = new Date().toLocaleDateString('en-CA');
        const lastLog = settings.last_log_date;
        let currentStreak = settings.current_streak || 0;
        let status = 'broken';

        if (lastLog === today) {
            status = 'safe';
        } else if (lastLog) {
            const lastLogDate = new Date(lastLog);
            const todayDate = new Date(today);
            const diffTime = todayDate - lastLogDate;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                status = 'at_risk';
            } else {
                currentStreak = 0;
                status = 'broken';
            }
        } else {
            currentStreak = 0;
            status = 'broken';
        }

        setStreak(currentStreak);
        setStreakStatus(status);

        setMacroGoals({
          protein: settings.protein_goal || Math.round((settings.daily_goal * 0.3) / 4),
          carbs: settings.carbs_goal || Math.round((settings.daily_goal * 0.4) / 4),
          fats: settings.fats_goal || Math.round((settings.daily_goal * 0.3) / 9)
        });
      }
      if (dailyStats) {
        setScanCount(dailyStats.scan_count || 0);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      // Keep whatever cached data is on screen and surface a persistent banner.
      setStaleData(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      // Try to load from cache first to avoid loading spinner on reload
      const cachedLogs = localStorage.getItem('snapcal_logs');
      const cachedActiveWorkoutLogs = localStorage.getItem('snapcal_activeWorkoutLogs');
      const cachedSettings = localStorage.getItem('snapcal_settings');

      if (cachedLogs && cachedActiveWorkoutLogs) {
        try {
          setLogs(JSON.parse(cachedLogs));
          setActiveWorkoutLogs(JSON.parse(cachedActiveWorkoutLogs));

          if (cachedSettings) {
            const settings = JSON.parse(cachedSettings);
            if (settings.daily_goal) setDailyGoal(settings.daily_goal);
            setWeightUnit(settings.weight_unit === 'kg' ? 'kg' : 'lb');
            setWaterGoal(settings.water_goal || 8);
            setMacroGoals({
              protein: settings.protein_goal || Math.round((settings.daily_goal * 0.3) / 4),
              carbs: settings.carbs_goal || Math.round((settings.daily_goal * 0.4) / 4),
              fats: settings.fats_goal || Math.round((settings.daily_goal * 0.3) / 9)
            });
          }
          // Stop loading immediately so UI shows up
          setLoading(false);
        } catch (e) {
          console.error("Error parsing cached data", e);
        }
      }

      fetchData();
    } else {
      setLogs([]);
      setScanCount(0);
    }
  }, [user]);

  useEffect(() => {
    if (user && activeWorkoutLogs !== null) {
      localStorage.setItem('snapcal_activeWorkoutLogs', JSON.stringify(activeWorkoutLogs));
    }
  }, [activeWorkoutLogs, user]);

  // Load the per-day training-bump skip flag from localStorage
  useEffect(() => {
    setBumpSkipped(localStorage.getItem('snapcal_skip_bump_' + todayStr) === '1');
  }, [todayStr]);

  const handleToggleBumpSkip = () => {
    const next = !bumpSkipped;
    setBumpSkipped(next);
    if (next) localStorage.setItem('snapcal_skip_bump_' + todayStr, '1');
    else localStorage.removeItem('snapcal_skip_bump_' + todayStr);
  };

  const handleUpdateGoal = async (updates) => {
    if (!user) return;

    // Training/rest-day offset updates: no optimistic dailyGoal change; save then
    // refetch so cached settings (and the derived offset) pick up the new value.
    if (updates.trainingDayOffset !== undefined || updates.restDayOffset !== undefined) {
      try {
        await updateUserSettings(user.id, updates);
        await fetchData();
      } catch (e) {
        console.error("Error saving offset", e);
      }
      return;
    }

    // If updates contain profile data, we can't update local state immediately with goals
    // because the server calculates them. We should refetch after update.

    // If manual updates (dailyGoal etc), update local state optimistically
    if (updates.dailyGoal) setDailyGoal(updates.dailyGoal);
    if (updates.proteinGoal || updates.carbsGoal || updates.fatsGoal) {
      setMacroGoals(prev => ({
        protein: updates.proteinGoal || prev.protein,
        carbs: updates.carbsGoal || prev.carbs,
        fats: updates.fatsGoal || prev.fats
      }));
    }

    try {
      await updateUserSettings(user.id, updates);
      // If it was a profile update (no explicit goals), refetch to get calculated goals
      if (!updates.dailyGoal) {
        fetchData();
      }
    } catch (e) {
      console.error("Error saving goal", e);
    }
  };

  const handleUpdatePreferences = async (updates) => {
    if (!user) return false;
    try {
      await updateUserSettings(user.id, updates);
      await fetchData();
      return true;
    } catch (e) {
      console.error('Error saving preference', e);
      return false;
    }
  };

  const handleUpdateLog = async (logId, data) => {
    if (!user) return;
    try {
      await updateLog(logId, user.id, data);
      fetchData(); // Refresh logs
    } catch (e) {
      console.error("Error updating log", e);
      showToast({ message: "Couldn't update log", variant: 'error' });
    }
  };

  const handleOnboardingComplete = async (data) => {
    // 1. Send profile data to settings API to calculate and save goals
    await handleUpdateGoal(data);

    // 2. Log initial weight to daily stats
    if (data.originalWeight) {
        try {
            await updateDailyStats({
                date: new Date().toLocaleDateString('en-CA'),
                weight: data.originalWeight
            });
        } catch (e) {
            console.error("Error logging initial weight", e);
        }
    }

    setShowOnboarding(false);
  };

  const handleLogout = async () => {
    try { sessionStorage.removeItem('snapcal_addfood_draft'); } catch { /* ignore */ }
    loggingOutRef.current = true; // set BEFORE signOut — its auth event nulls `user` ahead of the replace below
    try {
      await supabase.auth.signOut();
    } finally {
      // R2 behavioral addition: routed app has no LandingPage fallback of its own,
      // so send the signed-out user back to the public landing route.
      router.replace('/');
    }
  };

  // --- Derived State ---
  const today = new Date();

  const todaysLogs = logs.filter(log => {
    const logDate = new Date(log.date);
    return logDate.toDateString() === today.toDateString();
  });

  const caloriesToday = todaysLogs.reduce((acc, log) => acc + (parseInt(log.calories) || 0), 0);

  // --- Training-day-aware calorie target ---
  const trainedToday = (activeWorkoutLogs?.length > 0) || workoutLogs.some((l) => {
    const d = new Date(l.date);
    return d.toDateString() === today.toDateString();
  });

  const settingsCache = (() => {
    try { return JSON.parse(localStorage.getItem('snapcal_settings') || '{}'); } catch { return {}; }
  })();
  const trainingOffset = settingsCache.training_day_calorie_offset ?? 250;
  const restOffset = settingsCache.rest_day_calorie_offset ?? 0;
  const isTrainingDay = trainedToday && !bumpSkipped;
  const offsetSkipped = trainedToday && bumpSkipped;
  const calorieOffset = isTrainingDay ? trainingOffset : restOffset;

  const effectiveGoal = dailyGoal + calorieOffset;
  const percentComplete = Math.min(100, Math.round((caloriesToday / effectiveGoal) * 100));

  // Weekly Data Calculation
  const weeklyData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);

      const dayLogs = logs.filter(log => {
        const logDate = new Date(log.date);
        return logDate.toDateString() === d.toDateString();
      });

      const total = dayLogs.reduce((acc, log) => acc + (parseInt(log.calories) || 0), 0);
      const trained = workoutLogs.some((l) => new Date(l.date).toDateString() === d.toDateString());
      days.push({
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        date: d,
        calories: total,
        height: (total / dailyGoal) * 100,
        trained
      });
    }
    return days;
  }, [logs, dailyGoal, workoutLogs]);

  // Enumerated context interface — everything page.jsx's tab blocks and chrome consume.
  const value = {
    // Raw state
    user,
    loading,
    logs,
    workoutLogs,
    activeWorkoutLogs,
    setActiveWorkoutLogs,
    dailyGoal,
    macroGoals,
    weightUnit,
    waterGoal,
    editingLog,
    setEditingLog,
    scanCount,
    streak,
    streakStatus,
    showOnboarding,
    isRetakingAssessment,
    setIsRetakingAssessment,
    showActionSheet,
    setShowActionSheet,
    bumpSkipped,
    staleData,
    loggingOutRef,
    showToast,
    toastEl,
    // Handlers
    fetchData,
    handleToggleBumpSkip,
    handleUpdateGoal,
    handleUpdatePreferences,
    handleUpdateLog,
    handleOnboardingComplete,
    handleLogout,
    // Derived
    todaysLogs,
    caloriesToday,
    percentComplete,
    effectiveGoal,
    weeklyData,
    trainedToday,
    isTrainingDay,
    calorieOffset,
    trainingOffset,
    offsetSkipped,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
