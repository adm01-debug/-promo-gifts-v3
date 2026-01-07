import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const REFRESH_THRESHOLD_MS = 60 * 60 * 1000; // Refresh 1 hour before expiry
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // Check every 5 minutes

export function useSessionManager() {
  const { session, signOut } = useAuth();
  const { toast } = useToast();
  const lastActivityRef = useRef<number>(Date.now());
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateLastActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        console.error('Session refresh failed:', error);
        toast({
          title: 'Sessão expirada',
          description: 'Faça login novamente para continuar.',
          variant: 'destructive',
        });
        signOut();
      }
    } catch (error) {
      // Silently handle session refresh errors
    }
  }, [signOut, toast]);

  const checkSession = useCallback(async () => {
    if (!session) return;

    const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;

    // If session expires soon, refresh it
    if (timeUntilExpiry > 0 && timeUntilExpiry < REFRESH_THRESHOLD_MS) {
      await refreshSession();
    }

    // Check for inactivity (optional: auto-logout after 24h of inactivity)
    const inactivityDuration = now - lastActivityRef.current;
    if (inactivityDuration > SESSION_DURATION_MS) {
      toast({
        title: 'Sessão encerrada',
        description: 'Sua sessão expirou por inatividade.',
      });
      signOut();
    }
  }, [session, refreshSession, signOut, toast]);

  // Set up activity listeners
  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    
    events.forEach((event) => {
      window.addEventListener(event, updateLastActivity, { passive: true });
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, updateLastActivity);
      });
    };
  }, [updateLastActivity]);

  // Set up periodic session check
  useEffect(() => {
    if (!session) return;

    const intervalId = setInterval(checkSession, CHECK_INTERVAL_MS);
    
    // Initial check
    checkSession();

    return () => {
      clearInterval(intervalId);
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [session, checkSession]);

  return {
    updateLastActivity,
    refreshSession,
    sessionExpiresAt: session?.expires_at ? new Date(session.expires_at * 1000) : null,
  };
}
