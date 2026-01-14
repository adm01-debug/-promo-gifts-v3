import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyPress, useKeyState } from '@/hooks/useKeyPress';

describe('useKeyPress', () => {
  it('should call handler on key press', () => {
    const handler = vi.fn();
    renderHook(() => useKeyPress('Enter', handler));
    
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(handler).toHaveBeenCalled();
  });
});

describe('useKeyState', () => {
  it('should track key state', () => {
    const { result } = renderHook(() => useKeyState('Shift'));
    expect(result.current).toBe(false);
  });
});
