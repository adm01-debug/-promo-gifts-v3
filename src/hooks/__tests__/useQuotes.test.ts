import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useQuotes } from '../useQuotes';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        then: vi.fn((cb) => cb({ data: [], error: null, count: 0 })),
      })),
    })),
    functions: {
      invoke: vi.fn(),
    },
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: '123' } }),
}));

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => ({ currentOrg: { id: 'org-123' } }),
}));

describe('useQuotes', () => {
  it('should initialize correctly', () => {
    const { result } = renderHook(() => useQuotes());
    expect(result.current.quotes).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });
});
