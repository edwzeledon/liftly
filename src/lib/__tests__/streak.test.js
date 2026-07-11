// src/lib/__tests__/streak.test.js
import { nextStreak } from '../streak';

describe('nextStreak', () => {
  it('no change when already logged today', () => {
    expect(nextStreak({ currentStreak: 4, lastLogDate: '2026-07-11', today: '2026-07-11' }))
      .toEqual({ streak: 4, lastLogDate: '2026-07-11', changed: false });
  });
  it('increments when last activity was yesterday', () => {
    expect(nextStreak({ currentStreak: 4, lastLogDate: '2026-07-10', today: '2026-07-11' }))
      .toEqual({ streak: 5, lastLogDate: '2026-07-11', changed: true });
  });
  it('resets to 1 after a gap', () => {
    expect(nextStreak({ currentStreak: 9, lastLogDate: '2026-07-08', today: '2026-07-11' }))
      .toEqual({ streak: 1, lastLogDate: '2026-07-11', changed: true });
  });
  it('starts at 1 with no history', () => {
    expect(nextStreak({ currentStreak: 0, lastLogDate: null, today: '2026-07-11' }))
      .toEqual({ streak: 1, lastLogDate: '2026-07-11', changed: true });
  });
  it('handles month boundaries', () => {
    expect(nextStreak({ currentStreak: 2, lastLogDate: '2026-06-30', today: '2026-07-01' }))
      .toEqual({ streak: 3, lastLogDate: '2026-07-01', changed: true });
  });
});
