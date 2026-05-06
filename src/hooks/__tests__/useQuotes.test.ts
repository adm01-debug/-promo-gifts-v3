import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useQuotes } from '../useQuotes';
import { supabase } from '../integrations/supabase/client';

const mockSupabaseQuery = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  or: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  range: vi.fn().mockReturnThis(),
  then: vi.fn((cb) =>
    cb({ data: [{ id: 'q1', quote_number: 'Q-001', status: 'draft' }], error: null, count: 1 }),
  ),
};

vi.mock('../integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => mockSupabaseQuery),
    functions: { invoke: vi.fn() },
    auth: {
      getSession: vi.fn(() =>
        Promise.resolve({ data: { session: { access_token: 'tk' } }, error: null }),
      ),
    },
  },
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-123' } }),
}));

vi.mock('../contexts/OrganizationContext', () => ({
  useOrganization: () => ({ currentOrg: { id: 'org-123' } }),
}));

vi.mock('../lib/auth/visibility-scope', () => ({
  useSalesScope: () => 'self',
}));

vi.mock('../lib/auth/apply-seller-scope', () => ({
  applySellerScope: vi.fn((q) => q),
}));

vi.mock('../lib/external-db', () => ({
  invokeExternalDb: vi.fn(() => Promise.resolve({ records: [], error: null })),
}));

describe('useQuotes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call supabase to fetch quotes', async () => {
    const filters = { search: 'Acme', status: 'approved', page: 1, pageSize: 15 };
    renderHook(() => useQuotes(filters));

    // Simple check that it calls supabase.from
    await waitFor(
      () => {
        expect(supabase.from).toHaveBeenCalledWith('quotes');
      },
      { timeout: 3000 },
    );
  });
});
