import { useQuery } from '@tanstack/react-query';
import { fetchPromobrindColors } from '@/lib/external-db';

export interface ProductColor {
  id?: string;
  name: string;
  hex: string;
  pantone?: string;
  group?: string;
}

/**
 * Hook para buscar cores únicas dos produtos Promobrind
 */
export function useColors() {
  return useQuery<ProductColor[]>({
    queryKey: ['promobrind-colors'],
    queryFn: async () => {
      const colors = await fetchPromobrindColors();
      return colors.map(c => ({
        name: c.name,
        hex: c.hex,
      }));
    },
    staleTime: 60 * 60 * 1000, // 1 hora (dados muito estáveis)
  });
}
