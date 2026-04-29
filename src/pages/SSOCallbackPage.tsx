import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { PageSEO } from "@/components/seo/PageSEO";
import { logger } from '@/lib/logger';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Callback do login social.
 *
 * Suporta os 3 fluxos possíveis:
 *  1. Broker Lovable (`lovable.auth.signInWithOAuth`): tokens já foram
 *     gravados via `supabase.auth.setSession(result.tokens)` antes do
 *     redirect — basta aguardar `onAuthStateChange` disparar.
 *  2. PKCE / Authorization Code do Supabase: chega `?code=...` na URL,
 *     trocamos por sessão com `exchangeCodeForSession`.
 *  3. Implicit grant legado: chega `#access_token=...` no hash — o cliente
 *     supabase detecta automaticamente em `getSession()`.
 */
export default function SSOCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshSession } = useAuth();
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    if (error) {
      logger.error('[sso-callback] provider returned error', { error, errorDescription });
      navigate('/login?error=' + encodeURIComponent(errorDescription || error), { replace: true });
      return;
    }

    // Fallback no hash (?error= dentro do fragment)
    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
    const hashParams = new URLSearchParams(hash);
    const hashError = hashParams.get('error');
    if (hashError) {
      const desc = hashParams.get('error_description') || hashError;
      logger.error('[sso-callback] hash error', { error: hashError, desc });
      navigate('/login?error=' + encodeURIComponent(desc), { replace: true });
      return;
    }

    let cancelled = false;
    let unsub: (() => void) | null = null;
    let timeoutId: number | null = null;

    const goHome = async () => {
      if (cancelled) return;
      // Força refresh do JWT + roles + AAL para o menu/permissões refletirem na hora.
      try {
        await refreshSession();
      } catch (e) {
        logger.warn('[sso-callback] refreshSession failed', { message: e instanceof Error ? e.message : String(e) });
      }
      if (cancelled) return;
      navigate('/', { replace: true });
    };

    const goLogin = (reason: string) => {
      if (cancelled) return;
      navigate('/login?error=' + encodeURIComponent(reason), { replace: true });
    };

    const run = async () => {
      try {
        const code = searchParams.get('code');

        // (2) Fluxo PKCE — troca o code por sessão
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            logger.error('[sso-callback] exchangeCodeForSession failed', { message: exchangeError.message });
            goLogin(exchangeError.message);
            return;
          }
          await goHome();
          return;
        }

        // (1) e (3) Verifica se já existe sessão (broker Lovable já chamou setSession,
        // ou supabase-js já parseou o hash fragment automaticamente).
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await goHome();
          return;
        }

        // Caso a sessão ainda não tenha sido aplicada, escuta onAuthStateChange.
        const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
          if (newSession) {
            void goHome();
          }
        });
        unsub = () => data.subscription.unsubscribe();

        // Timeout de segurança: 8s sem sessão → volta para login.
        timeoutId = window.setTimeout(() => {
          supabase.auth.getSession().then(({ data: { session: s } }) => {
            if (s) {
              goHome();
            } else {
              logger.warn('[sso-callback] no session after timeout');
              goLogin('Sessão não estabelecida. Tente novamente.');
            }
          });
        }, 8000);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro inesperado';
        logger.error('[sso-callback] unexpected error', { message });
        goLogin(message);
      }
    };

    run();

    return () => {
      cancelled = true;
      if (unsub) unsub();
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <PageSEO title="Autenticação SSO" description="Processando autenticação via SSO." path="/auth/callback" noIndex />
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Processando autenticação...</p>
      </div>
    </div>
  );
}
