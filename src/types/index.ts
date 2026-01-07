// src/types/index.ts
// Re-exports de todos os types

export * from './profile';
export * from './product';
export * from './category';
export * from './quote';
export * from './favorite';
export * from './client';
export * from './personalization';
export * from './gamification';
export * from './expert';
export * from './onboarding';
export * from './mockup';

// Legacy re-exports para compatibilidade
export type {
  Product as LegacyProduct,
  Category as LegacyCategory,
} from './database';
