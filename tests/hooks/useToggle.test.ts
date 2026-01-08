import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToggle, useMultiToggle } from '@/hooks/useToggle';

describe('useToggle', () => {
  it('should toggle boolean value', () => {
    const { result } = renderHook(() => useToggle(false));
    
    expect(result.current[0]).toBe(false);
    
    act(() => {
      result.current[1](); // toggle
    });
    
    expect(result.current[0]).toBe(true);
  });
  
  it('should set specific value', () => {
    const { result } = renderHook(() => useToggle(false));
    
    act(() => {
      result.current[2](true); // set
    });
    
    expect(result.current[0]).toBe(true);
  });
});

describe('useMultiToggle', () => {
  it('should toggle items in selection', () => {
    const { result } = renderHook(() => useMultiToggle<string>());
    
    act(() => {
      result.current.toggle('item1');
    });
    
    expect(result.current.isSelected('item1')).toBe(true);
  });
});
