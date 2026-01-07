import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// Tipos de role conforme especificação
type AppRole = "admin" | "manager" | "seller" | "viewer";

// Interface do Profile atualizada conforme especificação
export interface Profile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;           // TEXT direto - "admin" | "seller" | "manager" | "viewer"
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
  // Helpers de permissão
  isAdmin: boolean;
  isManager: boolean;
  isSeller: boolean;
  isViewer: boolean;
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
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      // Buscar profile - profiles.id = auth.users.id (são o mesmo UUID)
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();
      
      if (error) {
        if (import.meta.env.DEV) {
          console.error("Error fetching profile:", error);
        }
        return;
      }

      if (profileData) {
        setProfile(profileData as Profile);
        
        // Atualizar last_login_at
        await supabase
          .from("profiles")
          .update({ last_login_at: new Date().toISOString() })
          .eq("user_id", userId);
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error fetching profile:", error);
      }
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer Supabase calls with setTimeout to avoid deadlocks
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
        
        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

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
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  // Helpers de permissão baseados em profile.role (TEXT direto)
  const role = profile?.role || null;
  const isAdmin = role === "admin";
  const isManager = role === "manager";
  const isSeller = role === "seller" || role === "vendedor"; // Suporte para ambos
  const isViewer = role === "viewer";
  const canManage = ["admin", "manager"].includes(role || "");

  const value: AuthContextType = {
    user,
    session,
    profile,
    isLoading,
    isAdmin,
    isManager,
    isSeller,
    isViewer,
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
