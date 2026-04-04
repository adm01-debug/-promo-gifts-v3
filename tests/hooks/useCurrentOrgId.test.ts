import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { createElement } from 'react';

// Mock the OrganizationContext
const mockCurrentOrg = { id: 'org-123', name: 'Test Org' };

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => ({
    currentOrg: mockCurrentOrg,
    organizations: [mockCurrentOrg],
    currentRole: 'member',
    isLoading: false,
    switchOrganization: vi.fn(),
    createOrganization: vi.fn(),
    refetch: vi.fn(),
  }),
}));

import { useCurrentOrgId } from '@/hooks/useCurrentOrgId';

describe('useCurrentOrgId', () => {
  it('returns current org id', () => {
    const { result } = renderHook(() => useCurrentOrgId());
    expect(result.current).toBe('org-123');
  });

  it('returns null when no org selected', () => {
    // Override mock for this test
    const mod = vi.mocked(require('@/contexts/OrganizationContext'));
    mod.useOrganization = () => ({
      currentOrg: null,
      organizations: [],
      currentRole: null,
      isLoading: false,
      switchOrganization: vi.fn(),
      createOrganization: vi.fn(),
      refetch: vi.fn(),
    });

    const { result } = renderHook(() => useCurrentOrgId());
    expect(result.current).toBeNull();
  });
});
