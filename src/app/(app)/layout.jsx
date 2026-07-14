'use client';

// App shell: auth gate + provider + chrome. Screen content renders via {children}.
// Chrome JSX is MOVED from src/app/page.jsx (R2). The nav wiring is a thin router
// adapter this task: dock/sidebar/action-sheet call router.push(path); active
// styling derives from usePathname(). R3 swaps these for real <Link>s and deletes
// page.jsx.
import React, { Suspense, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2, Utensils, LogOut, Home, Plus, Calendar, Settings, Dumbbell, BarChart3 } from 'lucide-react';
import AppProvider, { useApp } from '@/components/app/AppProvider';
import Sidebar from '@/components/Sidebar';
import EditFoodModal from '@/components/EditFoodModal';
import OnboardingForm from '@/components/OnboardingForm';
import Sheet from '@/components/ui/Sheet';
import Logo from '@/components/ui/Logo';

// Copied verbatim from page.jsx — the mobile dock button look.
const NavButton = ({ active, onClick, icon: Icon, label }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center gap-1 p-2 min-w-16 rounded-xl transition-colors ${
      active ? 'text-training-text' : 'text-faint hover:text-muted-foreground'
    }`}
  >
    <Icon className="w-6 h-6" />
    <span className="text-xs font-medium">{label}</span>
  </button>
);

// Nav adapter: the SPA's chrome speaks in tab keys ('home', 'workouts', ...).
// Map those to routes so the existing Sidebar/dock components work unchanged
// while we push real navigation.
const TAB_TO_PATH = {
  home: '/today',
  workouts: '/train',
  insights: '/insights',
  history: '/history',
  settings: '/settings',
  add: '/add',
};
const PATH_TO_TAB = Object.fromEntries(Object.entries(TAB_TO_PATH).map(([tab, path]) => [path, tab]));

function AppShell({ children }) {
  const app = useApp();
  const pathname = usePathname();
  const router = useRouter();

  // Auth gate: once the session resolves, bounce unauthed users to the landing
  // auth view, preserving the intended destination. Redirect lives in the effect
  // (no setState) to stay eslint-safe.
  useEffect(() => {
    if (!app.loading && !app.user) {
      router.replace(`/?auth=1&next=${encodeURIComponent(pathname)}`);
    }
  }, [app.loading, app.user, pathname, router]);

  if (app.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 text-training-text animate-spin" />
      </div>
    );
  }

  if (!app.user) return null; // redirect in flight

  // Tab-key equivalence for active styling + push-based nav.
  const activeTab = PATH_TO_TAB[pathname] ?? 'home';
  const goToTab = (tab) => router.push(TAB_TO_PATH[tab] ?? '/today');

  return (
    <div className="flex h-screen bg-background font-sans text-foreground overflow-hidden">

      {/* Desktop Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={goToTab} onLogout={app.handleLogout} onOpenLog={() => app.setShowActionSheet(true)} />

      {/* Main Content Container */}
      <div className="flex-1 flex flex-col h-full relative overflow-hidden">

        {/* Mobile Header (Hidden on Desktop) */}
        <header className="md:hidden bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10 sticky top-0">
          <div className="flex items-center gap-2">
            <Logo size={36} />
            <h1 className="text-xl font-bold text-training-text">
              Liftly
            </h1>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => goToTab('settings')}
              aria-label="Settings"
              className={`p-2 rounded-full transition-colors min-h-11 min-w-11 flex items-center justify-center ${activeTab === 'settings' ? 'text-training-text bg-training-soft' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={app.handleLogout}
              aria-label="Sign out"
              className="text-muted-foreground hover:text-foreground p-2 rounded-full hover:bg-muted transition-colors min-h-11 min-w-11 flex items-center justify-center"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Stale-data banner — persists until a successful refetch clears it. */}
        {app.staleData && (
          <div className="bg-destructive/15 border-b border-destructive/30 text-sm px-6 py-2 flex items-center justify-between z-10">
            <span className="text-foreground">Showing cached data</span>
            <button onClick={app.fetchData} className="font-bold text-destructive-text px-2 py-1">
              Retry
            </button>
          </div>
        )}

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto pb-24 md:pb-0 scroll-smooth bg-background">
          <div className="w-full max-w-5xl mx-auto md:p-8">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Navigation (Hidden on Desktop) */}
        <nav className="md:hidden absolute bottom-0 left-0 right-0 bg-card border-t border-border px-4 py-2 flex justify-between items-center z-20 pb-safe">
          <NavButton active={activeTab === 'home'} onClick={() => goToTab('home')} icon={Home} label="Today" />
          <NavButton active={activeTab === 'workouts'} onClick={() => goToTab('workouts')} icon={Dumbbell} label="Train" />

          <button
            onClick={() => app.setShowActionSheet(true)}
            aria-label="Quick log"
            className="w-14 h-14 rounded-2xl flex items-center justify-center bg-training text-white active:scale-95 transition-transform"
          >
            <Plus className="w-7 h-7" />
          </button>

          <NavButton active={activeTab === 'insights'} onClick={() => goToTab('insights')} icon={BarChart3} label="Insights" />
          <NavButton active={activeTab === 'history'} onClick={() => goToTab('history')} icon={Calendar} label="History" />
        </nav>

        {/* Render Edit Modal if active */}
        {app.editingLog && (
          <EditFoodModal
            log={app.editingLog}
            onClose={() => app.setEditingLog(null)}
            onUpdate={app.handleUpdateLog}
          />
        )}

        {/* Onboarding Modal */}
        {app.showOnboarding && (
          <OnboardingForm onComplete={app.handleOnboardingComplete} />
        )}

        {/* Log Action Sheet */}
        <Sheet open={app.showActionSheet} onClose={() => app.setShowActionSheet(false)} title="Quick Log">
          <div className="grid grid-cols-2 gap-4 sm:gap-5">
            {/* Log Workout */}
            <button
              onClick={() => {
                app.setShowActionSheet(false);
                goToTab('workouts');
              }}
              className="flex flex-col items-center gap-3 sm:gap-4 p-6 sm:p-8 rounded-2xl bg-training-soft border-2 border-training-soft-border hover:bg-training-soft-border hover:border-training-soft-border transition-all active:scale-95"
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-training flex items-center justify-center text-white">
                <Dumbbell className="w-7 h-7 sm:w-8 sm:h-8" />
              </div>
              <span className="font-semibold text-foreground text-base sm:text-lg">Log Workout</span>
              <span className="text-xs sm:text-sm text-muted-foreground text-center">Track exercises</span>
            </button>

            {/* Log Meal */}
            <button
              onClick={() => {
                app.setShowActionSheet(false);
                goToTab('add');
              }}
              className="flex flex-col items-center gap-3 sm:gap-4 p-6 sm:p-8 rounded-2xl bg-ai-soft border-2 border-ai-soft-border hover:bg-ai-soft-border hover:border-ai/20 transition-all active:scale-95"
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-ai flex items-center justify-center text-background">
                <Utensils className="w-7 h-7 sm:w-8 sm:h-8" />
              </div>
              <span className="font-semibold text-foreground text-base sm:text-lg">Log Meal</span>
              <span className="text-xs sm:text-sm text-muted-foreground text-center">Scan or add food</span>
            </button>
          </div>
        </Sheet>

        {app.toastEl}

      </div>
    </div>
  );
}

export default function AppLayout({ children }) {
  return (
    <AppProvider>
      <Suspense fallback={null}>
        <AppShell>{children}</AppShell>
      </Suspense>
    </AppProvider>
  );
}
