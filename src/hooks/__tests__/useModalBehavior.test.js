import { renderHook, act } from '@testing-library/react';
import { useModalBehavior } from '../useModalBehavior';

const pressEscape = () => {
  act(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  });
};

describe('useModalBehavior', () => {
  it('locks body scroll while open, unlocks on close, and Escape fires onClose', () => {
    const onClose = jest.fn();
    const { rerender } = renderHook(({ open }) => useModalBehavior(open, onClose), {
      initialProps: { open: true },
    });

    expect(document.body.style.overflow).toBe('hidden');
    pressEscape();
    expect(onClose).toHaveBeenCalledTimes(1);

    rerender({ open: false });
    expect(document.body.style.overflow).toBe('unset');
  });

  it('stacked modals: Escape only closes the topmost, then the next one down', () => {
    const closeBottom = jest.fn();
    const closeTop = jest.fn();
    renderHook(({ open }) => useModalBehavior(open, closeBottom), {
      initialProps: { open: true },
    });
    const top = renderHook(({ open }) => useModalBehavior(open, closeTop), {
      initialProps: { open: true },
    });

    pressEscape();
    expect(closeTop).toHaveBeenCalledTimes(1);
    expect(closeBottom).not.toHaveBeenCalled();

    // The top modal actually closes; now the bottom one is topmost.
    top.rerender({ open: false });
    pressEscape();
    expect(closeBottom).toHaveBeenCalledTimes(1);
    expect(closeTop).toHaveBeenCalledTimes(1);
  });

  it('scroll lock is ref-counted: stays hidden until the last modal closes', () => {
    const bottom = renderHook(({ open }) => useModalBehavior(open, () => {}), {
      initialProps: { open: true },
    });
    const top = renderHook(({ open }) => useModalBehavior(open, () => {}), {
      initialProps: { open: true },
    });

    expect(document.body.style.overflow).toBe('hidden');

    top.rerender({ open: false });
    // Bottom modal still open — intermediate close must NOT unlock scroll.
    expect(document.body.style.overflow).toBe('hidden');

    bottom.rerender({ open: false });
    expect(document.body.style.overflow).toBe('unset');
  });

  it('closing the bottom modal first keeps scroll locked and Escape still hits the top', () => {
    const closeBottom = jest.fn();
    const closeTop = jest.fn();
    const bottom = renderHook(({ open }) => useModalBehavior(open, closeBottom), {
      initialProps: { open: true },
    });
    const top = renderHook(({ open }) => useModalBehavior(open, closeTop), {
      initialProps: { open: true },
    });

    bottom.rerender({ open: false });
    expect(document.body.style.overflow).toBe('hidden');

    pressEscape();
    expect(closeTop).toHaveBeenCalledTimes(1);
    expect(closeBottom).not.toHaveBeenCalled();

    top.rerender({ open: false });
    expect(document.body.style.overflow).toBe('unset');
  });

  it('onClose is ref-stabilized: Escape reads the latest closure', () => {
    const first = jest.fn();
    const second = jest.fn();
    const { rerender } = renderHook(({ open, onClose }) => useModalBehavior(open, onClose), {
      initialProps: { open: true, onClose: first },
    });

    rerender({ open: true, onClose: second });
    pressEscape();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
