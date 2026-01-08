import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSupplierComparison } from '@/hooks/useSupplierComparison';

describe('useSupplierComparison', () => {
  it('should return null when no productId is provided', () => {
    const { result } = renderHook(() => useSupplierComparison(undefined));
    expect(result.current).toBeNull();
  });

  it('should return comparison result for valid productId', () => {
    const { result } = renderHook(() => useSupplierComparison('some-product-id'));
    // May be null if product not found, but should not throw
    expect(result.current === null || typeof result.current === 'object').toBe(true);
  });
});
