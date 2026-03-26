// src/types/profile.ts
// Perfil do usuário - profiles.id = auth.users.id (mesmo UUID)

export type AppRole = 'admin' | 'manager' | 'seller' | 'viewer';

export interface Profile {
  id: string;                              // UUID = auth.users.id
  user_id: string;                         // Também presente, mas usar id preferencialmente
  email: string | null;
  full_name: string | null;
  role: AppRole | null;                    // Auto-synced from user_roles (read-only mirror)
  avatar_url: string | null;
  phone: string | null;
  signature_url: string | null;
  department: string | null;
  is_active: boolean | null;
  last_login_at: string | null;            // ISO datetime
  preferences: ProfilePreferences | null;   // JSONB
  created_at: string;
  updated_at: string;
}

export interface ProfilePreferences {
  theme?: 'light' | 'dark' | 'system';
  language?: string;
  notifications?: {
    email?: boolean;
    push?: boolean;
  };
  [key: string]: unknown;
}

// Helper types
export type ProfileUpdate = Partial<Omit<Profile, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
