import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

// ── Supabase mock ────────────────────────────────────────────────────────────
let authStateCallback: ((event: string, session: any) => void) | null = null;
const mockUnsubscribe = vi.fn();

const mockSupabase = {
  auth: {
    onAuthStateChange: vi.fn((cb: any) => {
      authStateCallback = cb;
      return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
    }),
    getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn().mockResolvedValue({}),
  },
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
    update: vi.fn().mockReturnThis(),
    then: vi.fn((cb: any) => cb({ error: null })),
  })),
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));

// ── Test consumer ────────────────────────────────────────────────────────────
function AuthConsumer() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(auth.isLoading)}</span>
      <span data-testid="authenticated">{String(auth.isAuthenticated)}</span>
      <span data-testid="role">{auth.role ?? 'none'}</span>
      <span data-testid="isAdmin">{String(auth.isAdmin)}</span>
      <span data-testid="canManage">{String(auth.canManage)}</span>
      <span data-testid="isSeller">{String(auth.isSeller)}</span>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authStateCallback = null;
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null } });
  });

  it('throws error when useAuth is used outside AuthProvider', () => {
    // Suppress console.error for this test
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<AuthConsumer />)).toThrow('useAuth must be used within an AuthProvider');
    spy.mockRestore();
  });

  it('starts with isLoading=true and sets to false when no session', async () => {
    await act(async () => {
      render(
        <AuthProvider><AuthConsumer /></AuthProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
    expect(screen.getByTestId('role').textContent).toBe('none');
  });

  it('sets up auth state listener and calls getSession', async () => {
    await act(async () => {
      render(
        <AuthProvider><AuthConsumer /></AuthProvider>
      );
    });

    expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalledTimes(1);
    expect(mockSupabase.auth.getSession).toHaveBeenCalledTimes(1);
  });

  it('cleans up subscription on unmount', async () => {
    let unmount: () => void;
    await act(async () => {
      const result = render(
        <AuthProvider><AuthConsumer /></AuthProvider>
      );
      unmount = result.unmount;
    });

    act(() => { unmount!(); });
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('computes role helpers correctly for admin', async () => {
    const mockUser = { id: 'user-1', email: 'admin@test.com' };
    const mockSession = { user: mockUser };

    // Mock profile and role queries
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: 'p1', user_id: 'user-1', email: 'admin@test.com', full_name: 'Admin' },
            error: null,
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              then: vi.fn((cb: any) => cb({ error: null })),
            }),
          }),
        };
      }
      if (table === 'user_roles') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { role: 'admin' },
            error: null,
          }),
        };
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null, error: null }) };
    });

    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: mockSession } });

    await act(async () => {
      render(
        <AuthProvider><AuthConsumer /></AuthProvider>
      );
    });

    // Trigger auth state change
    await act(async () => {
      authStateCallback?.('SIGNED_IN', mockSession);
      // Wait for setTimeout in AuthProvider
      await new Promise(r => setTimeout(r, 50));
    });

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    }, { timeout: 3000 });

    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('true');
    });

    await waitFor(() => {
      expect(screen.getByTestId('isAdmin').textContent).toBe('true');
      expect(screen.getByTestId('canManage').textContent).toBe('true');
      expect(screen.getByTestId('isSeller').textContent).toBe('false');
    });
  });

  it('defaults to vendedor role when role fetch fails', async () => {
    const mockUser = { id: 'user-2', email: 'seller@test.com' };
    const mockSession = { user: mockUser };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: 'p2', user_id: 'user-2', email: 'seller@test.com' },
            error: null,
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              then: vi.fn((cb: any) => cb({ error: null })),
            }),
          }),
        };
      }
      if (table === 'user_roles') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'not found' },
          }),
        };
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null, error: null }) };
    });

    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: mockSession } });

    await act(async () => {
      render(
        <AuthProvider><AuthConsumer /></AuthProvider>
      );
    });

    await act(async () => {
      authStateCallback?.('SIGNED_IN', mockSession);
      await new Promise(r => setTimeout(r, 50));
    });

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    }, { timeout: 3000 });

    await waitFor(() => {
      expect(screen.getByTestId('role').textContent).toBe('vendedor');
      expect(screen.getByTestId('isSeller').textContent).toBe('true');
    });
  });
});
