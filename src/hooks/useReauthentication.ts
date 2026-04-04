import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type SensitiveAction = 
  | 'change_password'
  | 'change_email'
  | 'configure_mfa'
  | 'admin_action'
  | 'delete_account';

const REAUTH_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export function useReauthentication() {
  const { user } = useAuth();
  const [lastReauthAt, setLastReauthAt] = useState<number | null>(null);
  const [isReauthenticating, setIsReauthenticating] = useState(false);

  const needsReauthentication = useCallback((action: SensitiveAction): boolean => {
    // All sensitive actions require recent authentication
    const sensitiveActions: SensitiveAction[] = [
      'change_password',
      'change_email', 
      'configure_mfa',
      'admin_action',
      'delete_account'
    ];

    if (!sensitiveActions.includes(action)) {
      return false;
    }

    // Check if re-authenticated recently
    if (lastReauthAt && Date.now() - lastReauthAt < REAUTH_TIMEOUT_MS) {
      return false;
    }

    return true;
  }, [lastReauthAt]);

  const reauthenticate = useCallback(async (password: string): Promise<{ success: boolean; error?: string }> => {
    if (!user?.email) {
      return { success: false, error: 'Usuário não autenticado' };
    }

    setIsReauthenticating(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });

      if (error) {
        return { success: false, error: 'Senha incorreta' };
      }

      setLastReauthAt(Date.now());
      return { success: true };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
    } finally {
      setIsReauthenticating(false);
    }
  }, [user?.email]);

  const clearReauth = useCallback(() => {
    setLastReauthAt(null);
  }, []);

  return {
    needsReauthentication,
    reauthenticate,
    clearReauth,
    isReauthenticating,
    isRecentlyAuthenticated: lastReauthAt !== null && Date.now() - lastReauthAt < REAUTH_TIMEOUT_MS,
  };
}
