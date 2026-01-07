// src/types/favorite.ts
// Favoritos do usuário

import type { Product } from './product';

export interface Favorite {
  id: string;
  user_id: string;          // FK profiles.id
  product_id: string;       // FK products.id
  created_at: string;
}

// Favorito com produto (para listagem)
export interface FavoriteWithProduct extends Favorite {
  product: Product;
}

// Para armazenamento local (fallback)
export interface FavoriteItem {
  productId: string;
  addedAt: string;
}
