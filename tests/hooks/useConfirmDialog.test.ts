import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';

describe('useConfirmDialog', () => {
  it('initializes with dialog closed', () => {
    const { result } = renderHook(() => useConfirmDialog());
    
    expect(result.current.isOpen).toBe(false);
    expect(result.current.options).toBeNull();
  });

  it('can show dialog with options', async () => {
    const { result } = renderHook(() => useConfirmDialog());
    
    act(() => {
      result.current.show({
        title: 'Test',
        message: 'Test message'
      });
    });

    expect(result.current.isOpen).toBe(true);
  });
});
