import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts, GLOBAL_SHORTCUTS } from '@/hooks/useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
  it('should register shortcuts', () => {
    const callback = vi.fn();
    const shortcuts = [{ key: 'a', callback }];
    
    renderHook(() => useKeyboardShortcuts(shortcuts));
    
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    expect(callback).toHaveBeenCalled();
  });

  it('should export GLOBAL_SHORTCUTS', () => {
    expect(GLOBAL_SHORTCUTS.SEARCH).toBeDefined();
    expect(GLOBAL_SHORTCUTS.SEARCH.key).toBe('k');
  });
});
