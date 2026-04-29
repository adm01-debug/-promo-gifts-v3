import { createContext, useContext, useEffect, useState, useRef, useCallback, type ReactNode } from "react";
import { type User, type Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { createClientLogger } from "@/lib/telemetry/structuredLogger";
import { checkLoginAllowed, recordFailedAttempt, clearLoginAttempts } from "@/hooks/useLoginRateLimit";
import { toast } from "sonner";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

// Tipos de role conforme app_role enum no banco.
// 'admin', 'manager' e 'vendedor' permanecem por compatibilidade com dados legados,
// mas a nova hierarquia oficial é: dev > supervisor > agente.
export type AppRole =
  | "dev"
  | "supervisor"
  | "agente"
  | "admin"      // legado (alias de supervisor)
  | "manager"    // legado
  | "vendedor";  // legado (alias de agente)

// Interface do Profile
export interface Profile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;           // Auto-synced from user_roles via DB trigger (read-only mirror)
  avatar_url: string | null;
  phone: string | null;
  department: string | null;
  is_active: boolean | null;
  last_login_at: string | null;
  preferences: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  // Conjunto de todas as roles que o usuário possui em user_roles
  roles: AppRole[];
  // Role principal (mais alta na hierarquia) para exibição/legado
  role: AppRole | null;
  // Helpers da NOVA hierarquia (dev > supervisor > agente)
  isDev: boolean;
  isSupervisor: boolean;       // strict: apenas o nível supervisor (não inclui dev)
  isAgente: boolean;
  isSupervisorOrAbove: boolean; // dev OR supervisor — equivale ao server-side is_supervisor_or_above
  // Aliases retrocompatíveis (deprecated — preferir os acima)
  isAdmin: boolean;            // = isSupervisorOrAbove
  isManager: boolean;          // legado
  isSeller: boolean;           // = isAgente
  canManage: boolean;          // = isSupervisorOrAbove
  isAuthenticated: boolean;
  // MFA / Authenticator Assurance Level
  currentAAL: 'aal1' | 'aal2' | null;
  nextAAL: 'aal1' | 'aal2' | null;
  hasMFA: boolean;
  mfaRequired: boolean;
  refreshAAL: () => Promise<void>;
  // Métodos
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  /** Força refresh do JWT + roles + AAL — usar após login social / mudança de papéis. */
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRoles, setUserRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentAAL, setCurrentAAL] = useState<'aal1' | 'aal2' | null>(null);
  const [nextAAL, setNextAAL] = useState<'aal1' | 'aal2' | null>(null);
  const [hasMFA, setHasMFA] = useState(false);

  // Guards contra race conditions (#4) — usando Promise para coordenar chamadores
  const fetchPromiseRef = useRef<Promise<void> | null>(null);
  const mountedRef = useRef(true);

  const fetchAAL = useCallback(async () => {
    try {
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      if (!mountedRef.current) return;
      setCurrentAAL((aalData?.currentLevel ?? null) as 'aal1' | 'aal2' | null);
      setNextAAL((aalData?.nextLevel ?? null) as 'aal1' | 'aal2' | null);
      setHasMFA(!!factorsData?.totp?.some((f) => f.status === 'verified'));
    } catch (e) {
      if (import.meta.env.DEV) logger.warn('AAL fetch failed', e instanceof Error ? e.message : String(e));
    }
  }, []);

  const fetchUserData = useCallback(async (userId: string) => {
    // Se já existe um fetch em andamento para este userId, aguardar ao invés de ignorar
    if (fetchPromiseRef.current) {
      await fetchPromiseRef.current;
      return;
    }
    
    const doFetch = async () => {
      try {
        // Buscar profile e TODAS as roles em paralelo (usuário pode ter múltiplas, ex: dev+supervisor)
        const [profileResult, rolesResult] = await Promise.all([
          supabase
            .from("profiles")
            .select("*")
            .eq("user_id", userId)
            .single(),
          supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", userId)
        ]);

        if (!mountedRef.current) return;

        if (profileResult.error) {
          if (import.meta.env.DEV) {
            console.error("Error fetching profile:", profileResult.error);
          }
        } else if (profileResult.data) {
          setProfile(profileResult.data as Profile);
          
          // Atualizar last_login_at (não bloqueia)
          supabase
            .from("profiles")
            .update({ last_login_at: new Date().toISOString() })
            .eq("user_id", userId)
            .then(({ error }) => {
              if (error && import.meta.env.DEV) {
                logger.warn("Failed to update last_login_at:", error.message);
              }
            });
        }

        if (rolesResult.error) {
          if (import.meta.env.DEV) {
            console.error("Error fetching user roles:", rolesResult.error);
          }
          setUserRoles(["agente"]);
        } else if (rolesResult.data) {
          const roles = rolesResult.data.map((r) => r.role as AppRole);
          setUserRoles(roles.length > 0 ? roles : ["agente"]);
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("Error fetching user data:", error);
        }
        if (mountedRef.current) {
          setUserRoles(["agente"]);
        }
      } finally {
        fetchPromiseRef.current = null;
        // isLoading só fica false APÓS os dados carregarem (#5)
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    fetchPromiseRef.current = doFetch();
    await fetchPromiseRef.current;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Show greeting on login
          if (event === 'SIGNED_IN') {
            const displayName = session.user.user_metadata?.full_name
              || session.user.user_metadata?.name
              || session.user.email?.split('@')[0]
              || 'Usuário';
            const firstName = displayName.split(' ')[0];
            
            const flowGreetings = [
              `${getGreeting()}, ${firstName}! Que bom te ver! Estou pronto pra te ajudar a vender mais hoje. 🚀`,
              `${getGreeting()}, ${firstName}! Já separei algumas novidades do catálogo pra você! 😎`,
              `E aí, ${firstName}! Bora fazer acontecer! Estou aqui sempre que precisar. 💪`,
              `${getGreeting()}, ${firstName}! Tenho insights fresquinhos esperando por você! ✨`,
              `Fala, ${firstName}! Pronto pra mais um dia de vendas incríveis? 🎯`,
            ];
            const randomGreeting = flowGreetings[Math.floor(Math.random() * flowGreetings.length)];
            
            toast.success(`🤖 Flow`, {
              description: randomGreeting,
              duration: 3000,
              closeButton: true,
            });
          }

          // Defer Supabase calls with setTimeout to avoid deadlocks
          setTimeout(() => {
            fetchUserData(session.user.id);
            fetchAAL();
            // Pre-warm external DB + CRM bridge to avoid cold starts (1x por sessão)
            import('@/lib/external-db-prewarm').then(m => m.prewarmExternalDb({ oncePerSession: true }));
          }, 0);
        } else {
          setProfile(null);
          setUserRoles([]);
          setCurrentAAL(null);
          setNextAAL(null);
          setHasMFA(false);
          setIsLoading(false);
        }
        // NÃO seta isLoading=false aqui — espera fetchUserData terminar (#5)
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserData(session.user.id);
        fetchAAL();
      } else {
        setIsLoading(false);
      }
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [fetchUserData, fetchAAL]);

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const log = createClientLogger('auth.signIn', { base: { email_domain: email.split('@')[1] ?? 'unknown' } });
    log.info('start');

    // Client-side brute force protection
    const { allowed, remainingSeconds } = checkLoginAllowed(email);
    if (!allowed) {
      const minutes = Math.ceil(remainingSeconds / 60);
      log.warn('rate_limited_client', { remaining_seconds: remainingSeconds });
      return {
        error: {
          message: `Conta temporariamente bloqueada por excesso de tentativas. Tente novamente em ${minutes} minuto(s).`,
          name: 'RateLimitError',
          status: 429,
        } as { message: string; name: string; status: number },
      };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      const { locked, remainingSeconds: lockSecs } = recordFailedAttempt(email);
      log.warn('signin_failed', { reason: error.message, locked });
      if (locked) {
        const mins = Math.ceil(lockSecs / 60);
        return {
          error: {
            message: `Muitas tentativas de login. Conta bloqueada por ${mins} minuto(s).`,
            name: 'RateLimitError',
            status: 429,
          } as { message: string; name: string; status: number },
        };
      }
    } else {
      // Successful login — clear attempts
      clearLoginAttempts(email);
      log.info('signin_ok');
    }

    // Log attempt server-side (fire-and-forget) — propaga X-Request-Id
    supabase.functions.invoke('log-login-attempt', {
      body: {
        email,
        user_id: error ? null : undefined,
        ip_address: 'client',
        success: !error,
        failure_reason: error?.message || null,
        user_agent: navigator.userAgent,
      },
      headers: log.headers(),
    }).catch(() => {});

    return { error };
  };

  const signOut = async () => {
    const log = createClientLogger('auth.signOut');
    log.info('start');
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setProfile(null);
      setUserRoles([]);
      setCurrentAAL(null);
      setNextAAL(null);
      setHasMFA(false);
      // Permite prewarm no próximo login (mesma aba)
      import('@/lib/external-db-prewarm').then(m => m.resetPrewarmSession()).catch(() => {});
      log.info('ok');
    } catch (err) {
      log.error('failed', { err });
      throw err;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      fetchPromiseRef.current = null; // Forçar refresh
      await fetchUserData(user.id);
    }
  };

  /**
   * Força um refresh completo após login social ou mudança de papéis:
   *  1. Renova o JWT (`supabase.auth.refreshSession`) para trazer claims atuais.
   *  2. Re-busca profile + user_roles (bypassando o cache do fetchPromiseRef).
   *  3. Atualiza AAL/MFA.
   */
  const refreshSession = useCallback(async () => {
    const log = createClientLogger('auth.refreshSession');
    log.info('start');
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        log.warn('refresh_failed', { message: error.message });
      }
      const nextSession = data?.session ?? (await supabase.auth.getSession()).data.session;
      if (mountedRef.current) {
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
      }
      const uid = nextSession?.user?.id ?? user?.id;
      if (uid) {
        fetchPromiseRef.current = null;
        await Promise.all([fetchUserData(uid), fetchAAL()]);
      }
      log.info('ok');
    } catch (err) {
      log.error('failed', { err: err instanceof Error ? err.message : String(err) });
    }
  }, [user, fetchUserData, fetchAAL]);

  // Helpers da NOVA hierarquia (fonte: array userRoles).
  // 'admin' legado mapeia para supervisor; 'vendedor' legado mapeia para agente.
  const has = (r: AppRole) => userRoles.includes(r);
  const isDev = has("dev");
  const isSupervisor = has("supervisor") || has("admin"); // admin legado = supervisor
  const isAgente = has("agente") || has("vendedor");      // vendedor legado = agente
  const isSupervisorOrAbove = isDev || isSupervisor;

  // Role principal para exibição (mais alta na hierarquia)
  const primaryRole: AppRole | null = isDev
    ? "dev"
    : isSupervisor
    ? "supervisor"
    : isAgente
    ? "agente"
    : userRoles[0] ?? null;

  // Aliases legados (deprecated, mantidos para componentes ainda não migrados)
  const isAdmin = isSupervisorOrAbove;
  const isManager = has("manager");
  const isSeller = isAgente;
  const canManage = isSupervisorOrAbove;
  // MFA exigido para qualquer supervisor/dev que ainda não autenticou em aal2
  const mfaRequired = canManage && currentAAL !== 'aal2';

  const value: AuthContextType = {
    user,
    session,
    profile,
    isLoading,
    roles: userRoles,
    role: primaryRole,
    isDev,
    isSupervisor,
    isAgente,
    isSupervisorOrAbove,
    isAdmin,
    isManager,
    isSeller,
    canManage,
    isAuthenticated: !!user,
    currentAAL,
    nextAAL,
    hasMFA,
    mfaRequired,
    refreshAAL: fetchAAL,
    signUp,
    signIn,
    signOut,
    refreshProfile,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
