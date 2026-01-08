import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CategoryIcon {
  id: string;
  category_name: string;
  icon: string;
  description?: string;
}

/**
 * Hook para buscar ícones das categorias do Supabase
 */
export function useCategoryIcons() {
  return useQuery<CategoryIcon[]>({
    queryKey: ['category-icons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('category_icons')
        .select('id, category_name, icon, description')
        .eq('is_active', true);

      if (error) throw new Error(`Failed to fetch category icons: ${error.message}`);
      
      return data || [];
    },
    staleTime: 30 * 60 * 1000, // 30 min (dados estáveis)
  });
}

/**
 * Função utilitária para obter o ícone de uma categoria pelo nome
 */
export function getCategoryIcon(
  categoryName: string | undefined | null, 
  icons: CategoryIcon[]
): string {
  if (!categoryName) return '📦';
  
  // Busca exata
  const exact = icons.find(
    i => i.category_name.toLowerCase() === categoryName.toLowerCase()
  );
  if (exact) return exact.icon;
  
  // Busca parcial (contém)
  const partial = icons.find(
    i => categoryName.toLowerCase().includes(i.category_name.toLowerCase()) ||
         i.category_name.toLowerCase().includes(categoryName.toLowerCase())
  );
  if (partial) return partial.icon;
  
  return '📦'; // Padrão
}
