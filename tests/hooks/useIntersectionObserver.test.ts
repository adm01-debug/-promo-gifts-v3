import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

describe('useIntersectionObserver', () => {
  beforeAll(() => {
    global.IntersectionObserver = class {
      observe = vi.fn();
      disconnect = vi.fn();
      unobserve = vi.fn();
    } as any;
  });

  it('should return ref and visibility state', () => {
    const { result } = renderHook(() => useIntersectionObserver());
    
    const [ref, isVisible] = result.current;
    expect(ref).toBeDefined();
    expect(typeof isVisible).toBe('boolean');
  });
});
});
