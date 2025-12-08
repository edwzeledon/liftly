'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, Utensils, LogOut, Home, Plus, Calendar, Settings } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { getLogs, getUserSettings, updateUserSettings, updateLog, getDailyStats, updateDailyStats } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import Dashboard from '@/components/Dashboard';
import AddFood from '@/components/AddFood';
import HistoryView from '@/components/HistoryView';
import EditFoodModal from '@/components/EditFoodModal';
import LandingPage from '@/components/landing-page/LandingPage';
import OnboardingForm from '@/components/OnboardingForm';

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
  const [loading, setLoading] = useState(true);
  const [dailyGoal, setDailyGoal] = useState(2000);
  const [macroGoals, setMacroGoals] = useState({ protein: 150, carbs: 200, fats: 65 });
  const [editingLog, setEditingLog] = useState(null);
  const [scanCount, setScanCount] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // --- Auth & Data Fetching ---
  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
      });

      return () => subscription.unsubscribe();
    };
    initAuth();
  }, []);

  const fetchData = async () => {
    if (!user) return;
    try {
      const [fetchedLogs, settings, dailyStats] = await Promise.all([
        getLogs(user.id),
        getUserSettings(user.id),
        getDailyStats(new Date().toISOString().split('T')[0])
      ]);
      setLogs(fetchedLogs);
      if (settings) {
        if (settings.is_new_user) {
          setShowOnboarding(true);
        }
        if (settings.daily_goal) setDailyGoal(settings.daily_goal);
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
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    } else {
      setLogs([]);
      setScanCount(0);
    }
  }, [user]);

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
                date: new Date().toISOString().split('T')[0],
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
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Utensils className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-linear-to-r from-indigo-600 to-purple-600">
              SnapCal
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
                onLogDeleted={fetchData}
                onUpdateGoal={handleUpdateGoal}
                onEditLog={setEditingLog}
                onLogAdded={fetchData}
                onAddMeal={() => setActiveTab('add')}
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
                user={user}
                onLogDeleted={fetchData}
                onEditLog={setEditingLog}
              />
            )}
            {activeTab === 'settings' && (
              <OnboardingForm 
                isEditing={true}
                onComplete={(data) => {
                  handleOnboardingComplete(data);
                  setActiveTab('home');
                }}
                onCancel={() => setActiveTab('home')}
              />
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
            active={activeTab === 'history'} 
            onClick={() => setActiveTab('history')} 
            icon={Calendar} 
            label="History" 
          />
          
          <div className="-mt-12">
            <button 
              onClick={() => setActiveTab(activeTab === 'add' ? 'home' : 'add')}
              className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 ${
                activeTab === 'add' 
                  ? 'bg-slate-800 text-white' 
                  : 'bg-indigo-600 text-white'
              }`}
            >
              <Plus className={`w-8 h-8 ${activeTab === 'add' ? 'rotate-45 transition-transform' : 'transition-transform'}`} />
            </button>
          </div>

          <NavButton 
            active={activeTab === 'settings'} 
            onClick={() => setActiveTab('settings')} 
            icon={Settings} 
            label="Settings" 
          />
          <NavButton 
            active={false} 
            onClick={handleLogout} 
            icon={LogOut} 
            label="Logout" 
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

      </div>
    </div>
  );
}
