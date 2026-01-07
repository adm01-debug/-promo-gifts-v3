// src/types/category.ts
// Categorias de produtos

export interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;        // FK para category pai
  level: number;                   // 1 = principal, 2 = sub, 3 = sub-sub
  path: string | null;             // "pai/filho/neto"
  description: string | null;
  image_url: string | null;
  icon: string | null;
  is_active: boolean;
  display_order: number;
  product_count: number;
  bitrix_id: number | null;
  created_at: string;
  updated_at: string;
}

// Categoria com filhos (para árvore/menu)
export interface CategoryWithChildren extends Category {
  children?: CategoryWithChildren[];
}

// Categoria simplificada para selects
export type CategoryOption = Pick<Category, 'id' | 'name' | 'level' | 'parent_id'>;
