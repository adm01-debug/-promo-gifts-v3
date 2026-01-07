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

// Steps do tour
export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  target?: string;              // Seletor CSS do elemento alvo
  placement?: 'top' | 'bottom' | 'left' | 'right';
  action?: 'click' | 'navigate' | 'input';
  actionTarget?: string;
}

// Configuração do tour
export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Bem-vindo ao Gifts Store!',
    description: 'Vamos fazer um tour rápido pelo sistema.',
  },
  {
    id: 'catalog',
    title: 'Catálogo de Produtos',
    description: 'Explore nosso catálogo com mais de 1.900 brindes.',
    target: '[data-tour="catalog"]',
    placement: 'bottom',
  },
  {
    id: 'search',
    title: 'Busca Inteligente',
    description: 'Use a busca para encontrar produtos rapidamente.',
    target: '[data-tour="search"]',
    placement: 'bottom',
  },
  {
    id: 'quotes',
    title: 'Orçamentos',
    description: 'Crie e gerencie orçamentos para seus clientes.',
    target: '[data-tour="quotes"]',
    placement: 'right',
  },
  {
    id: 'gamification',
    title: 'Gamificação',
    description: 'Ganhe XP e moedas completando atividades!',
    target: '[data-tour="gamification"]',
    placement: 'bottom',
  },
];
