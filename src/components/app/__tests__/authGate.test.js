import { render, screen, waitFor, act } from '@testing-library/react';

// --- RT5 carry item ---
// RT3's logout-race fix (loggingOutRef, see AppProvider.jsx) has no live-Supabase
// environment to click through in this sandbox. This test drives the REAL
// AppProvider + the REAL app-layout auth gate (src/app/(app)/layout.jsx,
// unmodified) through a simulated SIGNED_OUT auth-state transition, proving:
//   1. An intentional logout (handleLogout) suppresses the gate's redirect —
//      only handleLogout's own replace('/') fires.
//   2. An involuntary sign-out (session expiry / another tab) is NOT masked by
//      the flag — the gate still bounces to the auth-preserving `next` URL.
// This is the empirical confirmation the brief asks for, short of real OAuth.

let authStateCallback;
const mockSignOut = jest.fn(() => {
  // Mirrors real supabase-js ordering (per RT3's trace): the SIGNED_OUT event
  // reaches subscribers synchronously within the signOut() call, BEFORE the
  // caller's `await` continuation runs its next line.
  authStateCallback?.('SIGNED_OUT', null);
  return Promise.resolve({ error: null });
});
const mockGetSession = jest.fn(() =>
  Promise.resolve({ data: { session: { user: { id: 'user-1' } } } })
);
const mockUnsubscribe = jest.fn();

jest.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: (...args) => mockGetSession(...args),
      onAuthStateChange: (cb) => {
        authStateCallback = cb;
        return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
      },
      signOut: (...args) => mockSignOut(...args),
    },
  },
}));

// AppProvider's data-fetch path is irrelevant to the auth-gate race; stub it
// so no real network/fetch calls happen once `user` is set.
jest.mock('@/lib/api', () => ({
  getLogs: jest.fn(() => Promise.resolve([])),
  getUserSettings: jest.fn(() => Promise.resolve(null)),
  updateUserSettings: jest.fn(() => Promise.resolve({})),
  updateLog: jest.fn(() => Promise.resolve({})),
  getDailyStats: jest.fn(() => Promise.resolve(null)),
  updateDailyStats: jest.fn(() => Promise.resolve({})),
  getWorkoutLogs: jest.fn(() => Promise.resolve([])),
  getActiveWorkoutLogs: jest.fn(() => Promise.resolve(null)),
}));

// Sheet uses framer-motion; swap in inert passthroughs so no animation/portal
// machinery (and no window.matchMedia) is exercised — it's not under test here.
jest.mock('framer-motion', () => {
  const React = require('react');
  const passthrough = ({ children, ...props }) => React.createElement('div', props, children);
  return {
    motion: new Proxy({}, { get: () => passthrough }),
    AnimatePresence: ({ children }) => children,
    useReducedMotion: () => false,
    useDragControls: () => ({}),
  };
});

const mockReplace = jest.fn();
const mockPush = jest.fn();
let mockPathname = '/today';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
  usePathname: () => mockPathname,
}));

jest.mock('next/link', () => {
  const React = require('react');
  return function Link({ href, children, ...props }) {
    return React.createElement('a', { href, ...props }, children);
  };
});

// Import AFTER the mocks above are registered.
import AppLayout from '@/app/(app)/layout';

describe('auth gate — logout race (RT3 fix, RT5 empirical confirmation)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authStateCallback = undefined;
    mockPathname = '/today';
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } });
  });

  it('intentional logout: gate does not redirect to /?auth=1, only handleLogout replaces "/"', async () => {
    render(<AppLayout><div>app screen</div></AppLayout>);

    // Wait for the gate to resolve past loading and render authed content.
    await screen.findByText('app screen');
    expect(mockReplace).not.toHaveBeenCalled();

    // Both the desktop Sidebar and the mobile header render a "Sign out"
    // button in jsdom (no CSS breakpoints applied) — either drives the same
    // app.handleLogout, so click the first.
    const [signOutButton] = await screen.findAllByRole('button', { name: /sign out/i });
    await act(async () => {
      signOutButton.click();
      // flush the handleLogout microtask chain (await signOut(); router.replace)
      await Promise.resolve();
      await Promise.resolve();
    });

    // handleLogout's own navigation fired exactly once, to '/'.
    expect(mockReplace).toHaveBeenCalledWith('/');
    // The gate effect must NOT have separately fired the auth-redirect variant.
    expect(mockReplace).not.toHaveBeenCalledWith(expect.stringContaining('/?auth=1'));
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });

  it('involuntary sign-out (session expiry): gate still redirects preserving next', async () => {
    render(<AppLayout><div>app screen</div></AppLayout>);
    await screen.findByText('app screen');
    expect(mockReplace).not.toHaveBeenCalled();

    // Fire SIGNED_OUT directly (NOT via handleLogout) — loggingOutRef stays false.
    await act(async () => {
      authStateCallback('SIGNED_OUT', null);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/?auth=1&next=%2Ftoday');
    });
  });
});
