// src/types/gamification.ts
// Sistema de gamificação para vendedores

export interface SellerGamification {
  id: string;
  user_id: string;             // FK profiles.id (UNIQUE)
  xp: number;
  level: number;
  coins: number;
  streak: number;              // Dias consecutivos
  total_activities: number;
  last_activity_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Achievement {
  id: string;
  code: string;                // UNIQUE
  name: string;
  description: string | null;
  icon: string;
  category: string;
  requirement_type: string;
  requirement_value: number;
  xp_reward: number;
  coins_reward: number;
  is_active: boolean;
  created_at: string;
}

export interface SellerAchievement {
  id: string;
  user_id: string;             // FK profiles.id
  achievement_id: string;      // FK achievements.id
  earned_at: string;
}

// Achievement com status de desbloqueio
export interface AchievementWithStatus extends Achievement {
  earned: boolean;
  earned_at?: string;
}

// Recompensas da loja
export interface StoreReward {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string;
  category: string;
  reward_type: string;
  coin_cost: number;
  stock: number | null;        // null = ilimitado
  reward_data: Record<string, unknown> | null;
  sort_order: number | null;
  is_active: boolean | null;
  created_at: string;
}

export interface UserReward {
  id: string;
  user_id: string;
  reward_id: string;
  purchased_at: string;
  is_used: boolean;
  used_at: string | null;
}

// XP por nível
export const XP_PER_LEVEL = [
  0,      // Level 1
  100,    // Level 2
  250,    // Level 3
  500,    // Level 4
  1000,   // Level 5
  2000,   // Level 6
  3500,   // Level 7
  5500,   // Level 8
  8000,   // Level 9
  12000,  // Level 10
];

// Ranking entry
export interface RankingEntry {
  user_id: string;
  xp: number;
  level: number;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}
