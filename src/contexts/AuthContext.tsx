import { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

// Tipos de role conforme app_role enum no banco
type AppRole = "admin" | "manager" | "vendedor";

// Interface do Profile
export interface Profile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;           // Campo legado - mantido por compatibilidade
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
  // Role do user_roles (fonte principal)
  role: AppRole | null;
  // Helpers de permissão baseados em user_roles
  isAdmin: boolean;
  isManager: boolean;
  isSeller: boolean;
  canManage: boolean;           // admin ou manager
  isAuthenticated: boolean;
  // Métodos
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Guards contra race conditions (#4) — usando Promise para coordenar chamadores
  const fetchPromiseRef = useRef<Promise<void> | null>(null);
  const mountedRef = useRef(true);

  const fetchUserData = useCallback(async (userId: string) => {
    // Se já existe um fetch em andamento para este userId, aguardar ao invés de ignorar
    if (fetchPromiseRef.current) {
      await fetchPromiseRef.current;
      return;
    }
    
    const doFetch = async () => {
      try {
        // Buscar profile e role em paralelo
        const [profileResult, roleResult] = await Promise.all([
          supabase
            .from("profiles")
            .select("*")
            .eq("user_id", userId)
            .single(),
          supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", userId)
            .single()
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

        if (roleResult.error) {
          if (import.meta.env.DEV) {
            console.error("Error fetching user role:", roleResult.error);
          }
          setUserRole("vendedor");
        } else if (roleResult.data) {
          setUserRole(roleResult.data.role as AppRole);
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("Error fetching user data:", error);
        }
        if (mountedRef.current) {
          setUserRole("vendedor");
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
          // Defer Supabase calls with setTimeout to avoid deadlocks
          setTimeout(() => {
            fetchUserData(session.user.id);
            // Pre-warm external DB to avoid cold starts
            import('@/lib/external-db-prewarm').then(m => m.prewarmExternalDb());
          }, 0);
        } else {
          setProfile(null);
          setUserRole(null);
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
      } else {
        setIsLoading(false);
      }
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [fetchUserData]);

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
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setUserRole(null);
  };

  const refreshProfile = async () => {
    if (user) {
      fetchPromiseRef.current = null; // Forçar refresh
      await fetchUserData(user.id);
    }
  };

  // Helpers de permissão baseados em user_roles (fonte principal)
  const isAdmin = userRole === "admin";
  const isManager = userRole === "manager";
  const isSeller = userRole === "vendedor";
  const canManage = isAdmin || isManager;

  const value: AuthContextType = {
    user,
    session,
    profile,
    isLoading,
    role: userRole,
    isAdmin,
    isManager,
    isSeller,
    canManage,
    isAuthenticated: !!user,
    signUp,
    signIn,
    signOut,
    refreshProfile,
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
