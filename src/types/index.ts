// src/types/index.ts
// Central Types Export - SSOT

// ============================================
// DOMAIN TYPES (SSOT interno)
// ============================================
export * from './domain';

// ============================================
// INFRASTRUCTURE TYPES (BD externo Promobrind)
// ============================================
export * from './infrastructure';

// ============================================
// TIPOS PORTUGUESE (compatibilidade)
// ============================================
export * from './tecnica-unificada';
export * from './gravacao-database';

// ============================================
// MÓDULOS ESPECÍFICOS
// ============================================
export * from './profile';
export * from './product';
export * from './category';
export * from './quote';
export * from './favorite';
export * from './client';

export * from './expert';
export * from './onboarding';
export * from './mockup';

// Legacy re-exports
export type {
  Product as LegacyProduct,
  Category as LegacyCategory,
} from './database';
