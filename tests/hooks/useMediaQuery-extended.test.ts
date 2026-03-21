/**
 * Tests for useMediaQuery — hook behavior
 */
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMediaQuery } from '@/hooks/useMediaQuery';

describe('useMediaQuery', () => {
  it('returns false by default (mock matchMedia returns false)', () => {
    const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'));
    expect(result.current).toBe(false);
  });

  it('accepts different query strings', () => {
    const { result } = renderHook(() => useMediaQuery('(max-width: 640px)'));
    expect(typeof result.current).toBe('boolean');
  });

  it('re-evaluates on query change', () => {
    const { result, rerender } = renderHook(
      ({ query }) => useMediaQuery(query),
      { initialProps: { query: '(min-width: 768px)' } }
    );
    expect(result.current).toBe(false);
    rerender({ query: '(min-width: 1280px)' });
    expect(typeof result.current).toBe('boolean');
  });
});
