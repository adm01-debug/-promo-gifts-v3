// src/types/onboarding.ts
// Tour/Onboarding do usuário

export interface UserOnboarding {
  id: string;
  user_id: string;              // FK profiles.id (UNIQUE)
  has_completed_tour: boolean;
  current_step: number;
  completed_steps: string[];    // JSONB array
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// Steps do tour - definido em src/hooks/useOnboarding.ts
export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  targetSelector?: string;      // Seletor CSS do elemento alvo
  position?: 'top' | 'bottom' | 'left' | 'right';
  route?: string;               // Rota para navegar
}
