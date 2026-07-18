'use client';

// App shell: auth gate + provider + chrome. Screen content renders via {children}.
// R3: nav is real <Link> navigation. NavButton/Sidebar/header derive their active
// styling from usePathname(); the [+] dock button and Log CTA open the action
// sheet, whose tiles router.push to /train | /add. The tab-key adapter is gone.
import React, { Suspense, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Utensils, Home, Plus, Calendar, Settings, Dumbbell, BarChart3 } from 'lucide-react';
import AppProvider, { useApp } from '@/components/app/AppProvider';
import Sidebar from '@/components/Sidebar';
import EditFoodModal from '@/components/EditFoodModal';
import OnboardingForm from '@/components/OnboardingForm';
import Sheet from '@/components/ui/Sheet';
import Logo from '@/components/ui/Logo';

// Mobile dock item: real <Link> with the SPA's original button look. Active +
// aria-current derive from the caller's pathname comparison.
const NavButton = ({ href, active, icon: Icon, label }) => (
  <Link
    href={href}
    aria-current={active ? 'page' : undefined}
    className={`flex flex-col items-center gap-1 p-2 min-w-16 rounded-xl transition-colors ${
      active ? 'text-training-text' : 'text-faint hover:text-muted-foreground'
    }`}
  >
    <Icon className="w-6 h-6" />
    <span className="text-xs font-medium">{label}</span>
  </Link>
);

function AppShell({ children }) {
  const app = useApp();
  const pathname = usePathname();
  const router = useRouter();

  // Auth gate: once the session resolves, bounce unauthed users to the landing
  // auth view, preserving the intended destination. Redirect lives in the effect
  // (no setState) to stay eslint-safe. Skipped during an intentional logout —
  // handleLogout sets loggingOutRef before signOut (whose auth event nulls `user`
  // ahead of handleLogout's own replace('/')) and owns that navigation.
  useEffect(() => {
    if (!app.loading && !app.user && !app.loggingOutRef.current) {
      router.replace(`/?auth=1&next=${encodeURIComponent(pathname)}`);
    }
  }, [app.loading, app.user, app.loggingOutRef, pathname, router]);

  // Shell skeleton while auth is unresolved (no user yet — the route's real
  // content can't render). The rail placeholder sits exactly where SidebarRail
  // lands (4rem resting width) so the real shell replaces it without a jump;
  // content blocks are generic since the route is unknown pre-auth.
  if (app.loading && !app.user) {
    return (
      <div className="flex h-screen bg-background overflow-hidden" role="status">
        <span className="sr-only">Loading</span>
        <div aria-hidden="true" className="flex flex-1">
          <div className="hidden md:flex w-16 flex-col h-full overflow-hidden shrink-0 bg-card border-r border-border px-2 py-4">
            <div className="w-8 h-8 rounded-xl bg-muted mx-auto mb-10 animate-pulse motion-reduce:animate-none" />
            <div className="space-y-2 animate-pulse motion-reduce:animate-none">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="w-11 h-11 rounded-xl bg-muted mx-auto" />
              ))}
            </div>
          </div>
          <div className="flex-1 flex flex-col">
            <div className="md:hidden bg-card border-b border-border px-6 py-4">
              <div className="h-9 w-28 bg-muted rounded animate-pulse motion-reduce:animate-none" />
            </div>
            <div className={`flex-1 w-full ${pathname === '/today' ? 'max-w-7xl' : 'max-w-5xl'} mx-auto p-6 md:p-8 space-y-6 animate-pulse motion-reduce:animate-none`}>
              <div className="h-8 w-40 bg-muted rounded" />
              <div className="h-48 bg-card border border-border rounded-2xl" />
              <div className="h-32 bg-card border border-border rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!app.user) return null; // redirect in flight

  const settingsActive = pathname === '/settings';

  return (
    <div className="flex h-screen bg-background font-sans text-foreground overflow-hidden">

      {/* Desktop Sidebar */}
      <Sidebar onOpenLog={() => app.setShowActionSheet(true)} />

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
            <Link
              href="/settings"
              aria-label="Settings"
              aria-current={settingsActive ? 'page' : undefined}
              className={`p-2 rounded-full transition-colors min-h-11 min-w-11 flex items-center justify-center ${settingsActive ? 'text-training-text bg-training-soft' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </Link>
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
          <div className={`w-full ${pathname === '/today' ? 'max-w-7xl' : 'max-w-5xl'} mx-auto md:p-8`}>
            {children}
          </div>
        </main>

        {/* Mobile Bottom Navigation (Hidden on Desktop) */}
        <nav className="md:hidden absolute bottom-0 left-0 right-0 bg-card border-t border-border px-4 py-2 flex justify-between items-center z-20 pb-safe">
          <NavButton href="/today" active={pathname === '/today'} icon={Home} label="Today" />
          <NavButton href="/train" active={pathname === '/train'} icon={Dumbbell} label="Train" />

          <button
            onClick={() => app.setShowActionSheet(true)}
            aria-label="Quick log"
            className="w-14 h-14 rounded-2xl flex items-center justify-center bg-training text-white active:scale-95 transition-transform"
          >
            <Plus className="w-7 h-7" />
          </button>

          <NavButton href="/insights" active={pathname === '/insights'} icon={BarChart3} label="Insights" />
          <NavButton href="/history" active={pathname === '/history'} icon={Calendar} label="History" />
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
                router.push('/train');
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
                router.push('/add');
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
