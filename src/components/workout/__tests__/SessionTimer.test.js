import { render, screen, act } from '@testing-library/react';
import SessionTimer from '../SessionTimer';

describe('SessionTimer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders elapsed time from startedAt and ticks every second without needing a re-render', () => {
    const now = Date.now();
    render(<SessionTimer startedAt={now} />);

    expect(screen.getByText('0:00')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByText('0:01')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(59000);
    });
    expect(screen.getByText('1:00')).toBeInTheDocument();
  });

  it('clamps to 0 and never shows a negative duration for a startedAt in the future', () => {
    const future = Date.now() + 10000;
    render(<SessionTimer startedAt={future} />);
    expect(screen.getByText('0:00')).toBeInTheDocument();
  });

  it('clears its interval on unmount (no leaked timers)', () => {
    const clearSpy = jest.spyOn(global, 'clearInterval');
    const { unmount } = render(<SessionTimer startedAt={Date.now()} />);
    unmount();
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });

  it('applies the passed className alongside tabular-nums', () => {
    render(<SessionTimer startedAt={Date.now()} className="text-2xl font-bold" />);
    const el = screen.getByText('0:00');
    expect(el.className).toContain('tabular-nums');
    expect(el.className).toContain('text-2xl');
    expect(el.className).toContain('font-bold');
  });
});
