import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

// --- RT5 carry: AddFood draft matrix ---
// /add is auth-gated (real-routes), so a live logged-in click-through isn't
// drivable in this environment. useSessionDraft itself is already unit-tested
// (src/hooks/__tests__/useSessionDraft.test.js: init/restore/write-through/
// clear/corrupted-storage). What's untested is that AddFood WIRES the hook
// correctly end-to-end: typing persists across a real unmount/remount (the
// tab-switch/navigation case this whole feature exists for), Cancel clears,
// and Save clears. This test exercises the real AddFood component (manual
// mode, forced via initialScanCount >= MAX_DAILY_SCANS to skip camera APIs)
// against real sessionStorage in jsdom.

jest.mock('@/lib/api', () => ({
  addLog: jest.fn(() => Promise.resolve({ id: 'log-1' })),
  analyzeImageWithGemini: jest.fn(),
  getDailyStats: jest.fn(() => Promise.resolve(null)),
}));

const { addLog } = require('@/lib/api');
import AddFood from '@/components/AddFood';

const DRAFT_KEY = 'snapcal_addfood_draft';
const user = { id: 'user-1' };

describe('AddFood draft persistence (manual mode)', () => {
  beforeEach(() => {
    sessionStorage.clear();
    jest.clearAllMocks();
  });
  afterEach(() => cleanup());

  it('survives unmount/remount (tab switch / navigation)', () => {
    const { unmount } = render(
      <AddFood user={user} onSuccess={jest.fn()} onCancel={jest.fn()} initialScanCount={5} />
    );

    fireEvent.change(screen.getByPlaceholderText('e.g., Grilled Chicken Salad'), {
      target: { value: 'Grilled Chicken' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g., 450'), {
      target: { value: '420' },
    });

    expect(JSON.parse(sessionStorage.getItem(DRAFT_KEY))).toMatchObject({
      foodItem: 'Grilled Chicken',
      calories: '420',
    });

    // Simulate navigating away (tab switch) and back: unmount, then mount a
    // fresh instance — this is exactly what happens crossing /add <-> /today.
    unmount();

    render(<AddFood user={user} onSuccess={jest.fn()} onCancel={jest.fn()} initialScanCount={5} />);

    expect(screen.getByPlaceholderText('e.g., Grilled Chicken Salad').value).toBe('Grilled Chicken');
    expect(screen.getByPlaceholderText('e.g., 450').value).toBe('420');
  });

  it('refresh (full remount) restores the draft too', () => {
    sessionStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ foodItem: 'Oatmeal', calories: '300', protein: '10', carbs: '50', fats: '5', mealType: 'breakfast' })
    );

    render(<AddFood user={user} onSuccess={jest.fn()} onCancel={jest.fn()} initialScanCount={5} />);

    expect(screen.getByPlaceholderText('e.g., Grilled Chicken Salad').value).toBe('Oatmeal');
    expect(screen.getByPlaceholderText('e.g., 450').value).toBe('300');
  });

  it('Cancel (X) clears the draft', () => {
    const onCancel = jest.fn();
    render(<AddFood user={user} onSuccess={jest.fn()} onCancel={onCancel} initialScanCount={5} />);

    fireEvent.change(screen.getByPlaceholderText('e.g., Grilled Chicken Salad'), {
      target: { value: 'Steak' },
    });
    expect(sessionStorage.getItem(DRAFT_KEY)).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '' })); // the X close button (no accessible name)
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(DRAFT_KEY)).toBeNull();
  });

  it('successful Save clears the draft', async () => {
    const onSuccess = jest.fn();
    render(<AddFood user={user} onSuccess={onSuccess} onCancel={jest.fn()} initialScanCount={5} />);

    fireEvent.change(screen.getByPlaceholderText('e.g., Grilled Chicken Salad'), {
      target: { value: 'Rice Bowl' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g., 450'), {
      target: { value: '600' },
    });
    expect(sessionStorage.getItem(DRAFT_KEY)).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /save entry/i }));

    await waitFor(() => expect(addLog).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(sessionStorage.getItem(DRAFT_KEY)).toBeNull();
  });
});
