import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

export interface ProductColor {
  id?: string;
  name: string;
  hex: string;
  pantone?: string;
  group?: string;
}

/**
 * Hook para buscar cores únicas dos produtos
 * Como não existe tabela 'colors', extraímos de products.colors (JSONB)
 */
export function useColors() {
  return useQuery<ProductColor[]>({
    queryKey: ['colors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('colors')
        .not('colors', 'is', null);

      if (error) throw new Error(`Failed to fetch colors: ${error.message}`);

      // Extrair cores únicas dos produtos
      const uniqueColors = new Map<string, ProductColor>();
      
      data?.forEach((product) => {
        if (product.colors && Array.isArray(product.colors)) {
          (product.colors as unknown as ProductColor[]).forEach((color) => {
            if (color && color.name && !uniqueColors.has(color.name)) {
              uniqueColors.set(color.name, {
                name: color.name,
                hex: color.hex || '#000000',
                pantone: color.pantone,
                group: color.group,
              });
            }
          });
        }
      });

      return Array.from(uniqueColors.values()).sort((a, b) => 
        a.name.localeCompare(b.name)
      );
    },
    staleTime: 60 * 60 * 1000, // 1 hora (dados muito estáveis)
  });
}
