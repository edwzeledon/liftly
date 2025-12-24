'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Utensils, LogOut, Home, Plus, Calendar, Settings, Dumbbell } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { getLogs, getUserSettings, updateUserSettings, updateLog, getDailyStats, updateDailyStats, getWorkoutLogs, getActiveWorkoutLogs } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import Dashboard from '@/components/Dashboard';
import AddFood from '@/components/AddFood';
import HistoryView from '@/components/HistoryView';
import EditFoodModal from '@/components/EditFoodModal';
import LandingPage from '@/components/landing-page/LandingPage';
import OnboardingForm from '@/components/OnboardingForm';
import WorkoutView from '@/components/workout/WorkoutView';

import SettingsView from '@/components/SettingsView';

const NavButton = ({ active, onClick, icon: Icon, label }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center gap-1 p-2 min-w-16 rounded-xl transition-colors ${
      active ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
    }`}
  >
    <Icon className="w-6 h-6" />
    <span className="text-xs font-medium">{label}</span>
  </button>
);

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [logs, setLogs] = useState([]);
  const [workoutLogs, setWorkoutLogs] = useState([]);
  const [activeWorkoutLogs, setActiveWorkoutLogs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dailyGoal, setDailyGoal] = useState(2000);
  const [macroGoals, setMacroGoals] = useState({ protein: 150, carbs: 200, fats: 65 });
  const [editingLog, setEditingLog] = useState(null);
  const [scanCount, setScanCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [streakStatus, setStreakStatus] = useState('broken'); // 'safe', 'at_risk', 'broken'
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isRetakingAssessment, setIsRetakingAssessment] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);

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
      if (settings) {
        if (settings.is_new_user) {
          setShowOnboarding(true);
        }
        if (settings.daily_goal) setDailyGoal(settings.daily_goal);

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

  const handleUpdateGoal = async (updates) => {
    if (!user) return;
    
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

  const handleUpdateLog = async (logId, data) => {
    if (!user) return;
    try {
      await updateLog(logId, user.id, data);
      fetchData(); // Refresh logs
    } catch (e) {
      console.error("Error updating log", e);
      alert("Failed to update log.");
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
    await supabase.auth.signOut();
  };

  // --- Derived State ---
  const today = new Date();

  const todaysLogs = logs.filter(log => {
    const logDate = new Date(log.date);
    return logDate.toDateString() === today.toDateString();
  });

  const caloriesToday = todaysLogs.reduce((acc, log) => acc + (parseInt(log.calories) || 0), 0);
  const percentComplete = Math.min(100, Math.round((caloriesToday / dailyGoal) * 100));

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
      days.push({
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        date: d,
        calories: total,
        height: (total / dailyGoal) * 100
      });
    }
    return days;
  }, [logs, dailyGoal]);

  // --- Render ---

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LandingPage />;
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      
      {/* Desktop Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />

      {/* Main Content Container */}
      <div className="flex-1 flex flex-col h-full relative overflow-hidden">
        
        {/* Mobile Header (Hidden on Desktop) */}
        <header className="md:hidden bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10 sticky top-0">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-indigo-600">
              <svg width="20" height="20" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M 75 18 H 35 C 22 18, 15 25, 15 38 V 62 C 15 75, 22 82, 35 82 H 65 C 78 82, 85 75, 85 62 V 38" stroke="#EBE9E4" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="56" cy="50" r="14" fill="#EBE9E4" style={{ opacity: 0.25 }} />
                <circle cx="50" cy="50" r="14" fill="#EBE9E4" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-indigo-600">
              Liftly
            </h1>
          </div>
          <button 
            onClick={handleLogout}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto pb-24 md:pb-0 scroll-smooth bg-slate-50">
          <div className="w-full max-w-5xl mx-auto md:p-8"> 
            {activeTab === 'home' && (
              <Dashboard 
                caloriesToday={caloriesToday} 
                dailyGoal={dailyGoal} 
                macroGoals={macroGoals}
                percentComplete={percentComplete}
                weeklyData={weeklyData}
                todaysLogs={todaysLogs}
                user={user}
                streak={streak}
                streakStatus={streakStatus}
                onLogDeleted={fetchData}
                onUpdateGoal={handleUpdateGoal}
                onEditLog={setEditingLog}
                onLogAdded={fetchData}
                onAddMeal={() => setActiveTab('add')}
              />
            )}
            {activeTab === 'workouts' && (
              <WorkoutView 
                user={user} 
                onWorkoutComplete={fetchData} 
                initialLogs={activeWorkoutLogs || []}
                onUpdateLogs={setActiveWorkoutLogs}
              />
            )}
            {activeTab === 'add' && (
              <AddFood 
                user={user} 
                initialScanCount={scanCount}
                onSuccess={() => {
                  fetchData();
                  setActiveTab('home');
                }}
                onCancel={() => setActiveTab('home')}
              />
            )}
            {activeTab === 'history' && (
              <HistoryView 
                logs={logs}
                workoutLogs={workoutLogs}
                user={user}
                onLogDeleted={fetchData}
                onEditLog={setEditingLog}
              />
            )}
            {activeTab === 'settings' && (
              isRetakingAssessment ? (
                <OnboardingForm 
                  isEditing={true}
                  onComplete={(data) => {
                    handleOnboardingComplete(data);
                    setIsRetakingAssessment(false);
                    setActiveTab('home');
                  }}
                  onCancel={() => {
                    setIsRetakingAssessment(false);
                  }}
                />
              ) : (
                <SettingsView onRetakeAssessment={() => setIsRetakingAssessment(true)} />
              )
            )}
          </div>
        </main>

        {/* Mobile Bottom Navigation (Hidden on Desktop) */}
        <nav className="md:hidden absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-2 flex justify-between items-center z-20 pb-safe">
          <NavButton 
            active={activeTab === 'home'} 
            onClick={() => setActiveTab('home')} 
            icon={Home} 
            label="Home" 
          />
          <NavButton 
            active={activeTab === 'workouts'} 
            onClick={() => setActiveTab('workouts')} 
            icon={Dumbbell} 
            label="Workouts" 
          />
          
          <div className="-mt-12">
            <button 
              onClick={() => setShowActionSheet(true)}
              className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 bg-indigo-600 text-white"
            >
              <Plus className="w-8 h-8" />
            </button>
          </div>

          <NavButton 
            active={activeTab === 'history'} 
            onClick={() => setActiveTab('history')} 
            icon={Calendar} 
            label="History" 
          />
          <NavButton 
            active={activeTab === 'settings'} 
            onClick={() => setActiveTab('settings')} 
            icon={Settings} 
            label="Settings" 
          />
        </nav>
        
        {/* Render Edit Modal if active */}
        {editingLog && (
          <EditFoodModal 
            log={editingLog} 
            onClose={() => setEditingLog(null)} 
            onUpdate={handleUpdateLog}
          />
        )}

        {/* Onboarding Modal */}
        {showOnboarding && (
          <OnboardingForm onComplete={handleOnboardingComplete} />
        )}

        {/* Log Action Sheet */}
        <AnimatePresence>
        {showActionSheet && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowActionSheet(false)}
            />

            {/* Menu */}
            <motion.div 
              initial={{ opacity: 0, y: 100, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full sm:w-auto sm:min-w-[400px] sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4 sm:hidden" />
              <h3 className="text-lg sm:text-xl font-bold text-slate-800 mb-5 sm:mb-6 text-center">Quick Log</h3>

              <div className="grid grid-cols-2 gap-4 sm:gap-5">
                {/* Log Meal */}
                <button
                  onClick={() => {
                    setShowActionSheet(false);
                    setActiveTab('add');
                  }}
                  className="flex flex-col items-center gap-3 sm:gap-4 p-6 sm:p-8 rounded-2xl bg-purple-50 border-2 border-purple-100 hover:bg-purple-100 hover:border-purple-200 transition-all active:scale-95 hover:shadow-lg"
                >
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-linear-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
                    <Utensils className="w-7 h-7 sm:w-8 sm:h-8" />
                  </div>
                  <span className="font-semibold text-slate-700 text-base sm:text-lg">Log Meal</span>
                  <span className="text-xs sm:text-sm text-slate-500 text-center">Scan or add food</span>
                </button>

                {/* Log Workout */}
                <button
                  onClick={() => {
                    setShowActionSheet(false);
                    setActiveTab('workouts');
                  }}
                  className="flex flex-col items-center gap-3 sm:gap-4 p-6 sm:p-8 rounded-2xl bg-indigo-50 border-2 border-indigo-100 hover:bg-indigo-100 hover:border-indigo-200 transition-all active:scale-95 hover:shadow-lg"
                >
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-linear-to-br from-indigo-600 to-indigo-700 flex items-center justify-center text-white shadow-lg">
                    <Dumbbell className="w-7 h-7 sm:w-8 sm:h-8" />
                  </div>
                  <span className="font-semibold text-slate-700 text-base sm:text-lg">Log Workout</span>
                  <span className="text-xs sm:text-sm text-slate-500 text-center">Track exercises</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
        </AnimatePresence>

      </div>
    </div>
  );
}
