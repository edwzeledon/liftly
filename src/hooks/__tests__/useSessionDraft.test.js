import { renderHook, act } from '@testing-library/react';
import { useSessionDraft } from '../useSessionDraft';

describe('useSessionDraft', () => {
  beforeEach(() => sessionStorage.clear());

  it('initializes from initialState when storage is empty', () => {
    const { result } = renderHook(() => useSessionDraft('k', { a: 1 }));
    expect(result.current[0]).toEqual({ a: 1 });
  });

  it('restores a persisted draft', () => {
    sessionStorage.setItem('k', JSON.stringify({ a: 2 }));
    const { result } = renderHook(() => useSessionDraft('k', { a: 1 }));
    expect(result.current[0]).toEqual({ a: 2 });
  });

  it('write-through persists on set (object and functional)', () => {
    const { result } = renderHook(() => useSessionDraft('k', { a: 1 }));
    act(() => result.current[1]({ a: 3 }));
    expect(JSON.parse(sessionStorage.getItem('k'))).toEqual({ a: 3 });
    act(() => result.current[1]((prev) => ({ a: prev.a + 1 })));
    expect(JSON.parse(sessionStorage.getItem('k'))).toEqual({ a: 4 });
  });

  it('clearDraft removes the key and resets state', () => {
    const { result } = renderHook(() => useSessionDraft('k', { a: 1 }));
    act(() => result.current[1]({ a: 9 }));
    act(() => result.current[2]());
    expect(sessionStorage.getItem('k')).toBeNull();
    expect(result.current[0]).toEqual({ a: 1 });
  });

  it('survives corrupted storage', () => {
    sessionStorage.setItem('k', '{not json');
    const { result } = renderHook(() => useSessionDraft('k', { a: 1 }));
    expect(result.current[0]).toEqual({ a: 1 });
  });
});
