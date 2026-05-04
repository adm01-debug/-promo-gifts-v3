import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useIPValidation } from './useIPValidation';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useIPValidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchCurrentIP', () => {
    it('returns IP when fetch is successful', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ ip: '1.2.3.4' }),
      });

      const { result } = renderHook(() => useIPValidation());
      const ip = await result.current.fetchCurrentIP();

      expect(ip).toBe('1.2.3.4');
      expect(mockFetch).toHaveBeenCalledWith('https://api.ipify.org?format=json');
    });

    it('returns null when fetch fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useIPValidation());
      const ip = await result.current.fetchCurrentIP();

      expect(ip).toBeNull();
    });
  });

  describe('validateIPForAuthenticatedUser', () => {
    it('returns isAllowed true when IP is whitelisted', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ ip: '1.2.3.4' }),
      });
      
      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
        data: { allowed: true, reason: 'whitelisted' },
        error: null,
      } as any);

      const { result } = renderHook(() => useIPValidation());
      
      let validationResult;
      await act(async () => {
        validationResult = await result.current.validateIPForAuthenticatedUser('user-123');
      });

      expect(validationResult).toEqual({
        isAllowed: true,
        currentIP: '1.2.3.4',
        hasRestrictions: true,
      });
    });

    it('returns isAllowed false when IP is blocked', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ ip: '1.2.3.4' }),
      });
      
      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
        data: { allowed: false, reason: 'ip_not_whitelisted' },
        error: null,
      } as any);

      const { result } = renderHook(() => useIPValidation());
      
      let validationResult;
      await act(async () => {
        validationResult = await result.current.validateIPForAuthenticatedUser('user-123');
      });

      expect(validationResult).toMatchObject({
        isAllowed: false,
        currentIP: '1.2.3.4',
        reason: 'ip_not_whitelisted',
      });
      expect(validationResult?.error).toContain('não está autorizado');
    });

    it('fails open when edge function errors', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ ip: '1.2.3.4' }),
      });
      
      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
        data: null,
        error: { message: 'Function error' },
      } as any);

      const { result } = renderHook(() => useIPValidation());
      
      let validationResult;
      await act(async () => {
        validationResult = await result.current.validateIPForAuthenticatedUser('user-123');
      });

      expect(validationResult?.isAllowed).toBe(true);
      expect(validationResult?.error).toBe('Function error');
    });
  });

  describe('logLoginAttempt', () => {
    it('calls log-login-attempt edge function', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ ip: '1.2.3.4' }),
      });
      
      const { result } = renderHook(() => useIPValidation());
      
      await act(async () => {
        await result.current.logLoginAttempt('test@example.com', 'user-123', true);
      });

      expect(supabase.functions.invoke).toHaveBeenCalledWith('log-login-attempt', expect.objectContaining({
        body: expect.objectContaining({
          email: 'test@example.com',
          user_id: 'user-123',
          success: true,
        }),
      }));
    });
  });
});
