import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';

describe('useDebouncedSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with empty search term', () => {
    const onSearch = vi.fn();
    const { result } = renderHook(() => useDebouncedSearch({ onSearch }));
    
    expect(result.current.searchTerm).toBe('');
  });

  it('should update search term immediately', () => {
    const onSearch = vi.fn();
    const { result } = renderHook(() => useDebouncedSearch({ onSearch }));
    
    act(() => {
      result.current.setSearchTerm('test');
    });

    expect(result.current.searchTerm).toBe('test');
  });

  it('should clear search term', () => {
    const onSearch = vi.fn();
    const { result } = renderHook(() => useDebouncedSearch({ onSearch }));
    
    act(() => {
      result.current.setSearchTerm('test');
    });
    
    act(() => {
      result.current.clearSearch();
    });

    expect(result.current.searchTerm).toBe('');
  });
});
