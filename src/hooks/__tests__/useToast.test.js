import { renderHook, act } from '@testing-library/react';
import { useToast } from '../useToast';

jest.useFakeTimers();

describe('useToast', () => {
  it('shows and auto-expires, firing onCommit once', () => {
    const onCommit = jest.fn();
    const { result } = renderHook(() => useToast());
    act(() => result.current.showToast({ message: 'Deleted', onCommit }));
    expect(result.current.toast.message).toBe('Deleted');
    act(() => jest.advanceTimersByTime(5000));
    expect(result.current.toast).toBeNull();
    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it('action cancels onCommit and fires onAction', () => {
    const onCommit = jest.fn();
    const onAction = jest.fn();
    const { result } = renderHook(() => useToast());
    act(() => result.current.showToast({ message: 'Deleted', onCommit, action: { label: 'Undo', onAction } }));
    act(() => result.current.toast.action.onAction());
    // the hook wraps onAction so it also clears the toast + cancels commit
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(result.current.toast).toBeNull();
    act(() => jest.advanceTimersByTime(6000));
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('manual dismiss commits', () => {
    const onCommit = jest.fn();
    const { result } = renderHook(() => useToast());
    act(() => result.current.showToast({ message: 'Deleted', onCommit }));
    act(() => result.current.dismissToast());
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(result.current.toast).toBeNull();
  });

  it('superseding toast commits the previous one first', () => {
    const first = jest.fn();
    const second = jest.fn();
    const { result } = renderHook(() => useToast());
    act(() => result.current.showToast({ message: 'A', onCommit: first }));
    act(() => result.current.showToast({ message: 'B', onCommit: second }));
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
    expect(result.current.toast.message).toBe('B');
  });

  it('unmount flushes the pending commit', () => {
    const onCommit = jest.fn();
    const { result, unmount } = renderHook(() => useToast());
    act(() => result.current.showToast({ message: 'Deleted', onCommit }));
    unmount();
    expect(onCommit).toHaveBeenCalledTimes(1);
  });
});
