import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Interface para categorias extraídas da tabela products
export interface Category {
  id: string | number;
  name: string;
  slug?: string;
  icon?: string;
  description?: string;
}

/**
 * Hook para buscar categorias únicas dos produtos
 * Como não existe tabela 'categories', extraímos de products.category_name
 */
export function useCategories() {
  return useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      // Buscar categorias únicas diretamente da tabela products
      const { data, error } = await supabase
        .from('products')
        .select('category_id, category_name')
        .not('category_name', 'is', null);

      if (error) throw new Error(`Failed to fetch categories: ${error.message}`);

      // Extrair categorias únicas
      const uniqueCategories = new Map<string, Category>();
      
      data?.forEach((product) => {
        if (product.category_name && !uniqueCategories.has(product.category_name)) {
          uniqueCategories.set(product.category_name, {
            id: product.category_id || product.category_name,
            name: product.category_name,
            slug: product.category_name.toLowerCase().replace(/\s+/g, '-'),
          });
        }
      });

      return Array.from(uniqueCategories.values()).sort((a, b) => 
        a.name.localeCompare(b.name)
      );
    },
    staleTime: 30 * 60 * 1000, // 30 min (dados estáveis)
  });
}
