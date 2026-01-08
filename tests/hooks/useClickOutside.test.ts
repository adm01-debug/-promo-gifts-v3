import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useClickOutside } from '@/hooks/useClickOutside';

describe('useClickOutside', () => {
  it('should return a ref', () => {
    const handler = vi.fn();
    const { result } = renderHook(() => useClickOutside<HTMLDivElement>(handler));
    
    expect(result.current).toBeDefined();
    expect(result.current.current).toBeNull();
  });

  it('should not call handler when disabled', () => {
    const handler = vi.fn();
    renderHook(() => useClickOutside<HTMLDivElement>(handler, false));
    
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(handler).not.toHaveBeenCalled();
  });
});
