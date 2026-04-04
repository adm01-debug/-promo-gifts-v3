import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Interface para novidade com detalhes da view v_product_novelties
 * Esta é a fonte principal de dados para novidades
 */
export interface NoveltyWithDetails {
  novelty_id: string;
  product_id: string;
  product_sku: string | null;
  product_name: string;
  product_description: string | null;
  base_price: number | null;
  product_image: string | null;
  category_id: string | null;
  category_name: string | null;
  supplier_code: string | null;
  supplier_id: string | null;
  supplier_name: string | null;
  supplier_product_code: string | null;
  detected_at: string;
  expires_at: string;
  days_remaining: number;
  status: 'active' | 'expiring_soon' | 'expired';
  is_highlighted: boolean;
  is_active: boolean;
}

/**
 * Interface para estatísticas de novidades (RPC get_novelties_stats)
 */
export interface NoveltyStats {
  total_novelties: number;
  active_novelties: number;
  expiring_soon: number;
  by_supplier?: Record<string, number>;
}

/**
 * Interface normalizada para exibição de estatísticas
 */
export interface NoveltyStatsDisplay {
  totalNovelties: number;
  activeNovelties: number;
  expiringSoon: number;
  totalProducts: number;
  noveltyRate: number;
}

export interface UseNoveltiesOptions {
  limit?: number;
  offset?: number;
  onlyHighlighted?: boolean;
}

/**
 * Hook para buscar novidades com detalhes completos (view v_product_novelties)
 * FONTE PRINCIPAL - Use esta para listar novidades
 */
export function useNoveltiesWithDetails(options: UseNoveltiesOptions = {}) {
  const { limit = 100, onlyHighlighted = false } = options;

  return useQuery<NoveltyWithDetails[]>({
    queryKey: ['novelties-details', limit, onlyHighlighted],
    queryFn: async () => {
      let query = supabase
        .from('v_product_novelties')
        .select('*')
        .eq('is_active', true)
        .order('days_remaining', { ascending: true })
        .limit(limit);

      if (onlyHighlighted) {
        query = query.eq('is_highlighted', true);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar novidades detalhadas:', error);
        throw new Error(`Falha ao buscar novidades: ${error.message}`);
      }

      return (data || []) as NoveltyWithDetails[];
    },
    staleTime: 2 * 60 * 1000,
    retry: 2,
  });
}

/**
 * Hook para buscar novidades expirando em breve (7 dias ou menos)
 */
export function useExpiringNovelties(maxDays: number = 7) {
  return useQuery<NoveltyWithDetails[]>({
    queryKey: ['expiring-novelties', maxDays],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_product_novelties')
        .select('*')
        .eq('is_active', true)
        .lte('days_remaining', maxDays)
        .order('days_remaining', { ascending: true });

      if (error) {
        console.error('Erro ao buscar novidades expirando:', error);
        throw new Error(`Falha ao buscar novidades expirando: ${error.message}`);
      }

      return (data || []) as NoveltyWithDetails[];
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

/**
 * Hook para estatísticas de novidades (RPC get_novelties_stats)
 */
export function useNoveltyStats() {
  return useQuery<NoveltyStatsDisplay>({
    queryKey: ['novelty-stats'],
    queryFn: async () => {
      // Buscar estatísticas via RPC
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_novelties_stats');
      
      if (rpcError) {
        console.error('Erro ao buscar estatísticas:', rpcError);
        throw new Error(`Falha ao buscar estatísticas: ${rpcError.message}`);
      }

      const stats = rpcData as NoveltyStats;

      // Buscar contagem total de produtos
      const { count: totalProducts } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      const total = totalProducts || 0;
      const activeNovelties = stats?.active_novelties || 0;

      return {
        totalNovelties: stats?.total_novelties || 0,
        activeNovelties: activeNovelties,
        expiringSoon: stats?.expiring_soon || 0,
        totalProducts: total,
        noveltyRate: total > 0 ? Math.round((activeNovelties / total) * 100) : 0,
      };
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

/**
 * Hook para buscar novidades via RPC get_active_novelties
 */
export function useNovelties(options: UseNoveltiesOptions & { supplierCode?: string; maxDays?: number } = {}) {
  const { supplierCode, limit = 50, offset = 0, maxDays } = options;

  return useQuery({
    queryKey: ['novelties-rpc', supplierCode, limit, offset, maxDays],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_active_novelties', {
        p_supplier_code: supplierCode || null,
        p_limit: limit,
        p_offset: offset,
      });

      if (error) {
        console.error('Erro ao buscar novidades:', error);
        throw new Error(`Falha ao buscar novidades: ${error.message}`);
      }

      let novelties = data || [];

      // Filtrar por período se maxDays for especificado
      if (maxDays) {
        const minDaysRemaining = 30 - maxDays;
        novelties = novelties.filter((n: { days_remaining?: number }) => (n.days_remaining ?? 0) >= minDaysRemaining);
      }

      return novelties;
    },
    staleTime: 2 * 60 * 1000,
    retry: 2,
  });
}

/**
 * Hook para contar total de novidades ativas (usando view)
 */
export function useNoveltyCount() {
  return useQuery<number>({
    queryKey: ['novelty-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('v_product_novelties')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      if (error) {
        console.error('Erro ao contar novidades:', error);
        return 0;
      }

      return count || 0;
    },
    staleTime: 2 * 60 * 1000,
    retry: 2,
  });
}

/**
 * Verifica se um produto específico é novidade
 */
export function useIsProductNovelty(productId: string) {
  return useQuery<{ isNovelty: boolean; daysRemaining: number | null }>({
    queryKey: ['is-novelty', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_product_novelties')
        .select('days_remaining, is_active')
        .eq('product_id', productId)
        .eq('is_active', true)
        .maybeSingle();

      if (error || !data) {
        return { isNovelty: false, daysRemaining: null };
      }

      return { 
        isNovelty: true, 
        daysRemaining: data.days_remaining 
      };
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!productId,
  });
}

/**
 * Hook para buscar IDs de produtos que são novidades (para batch checking)
 */
export function useNoveltyProductIds() {
  return useQuery<Set<string>>({
    queryKey: ['novelty-product-ids'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_product_novelties')
        .select('product_id')
        .eq('is_active', true);

      if (error) {
        console.error('Erro ao buscar IDs de novidades:', error);
        return new Set();
      }

      return new Set((data || []).map(d => d.product_id));
    },
    staleTime: 2 * 60 * 1000,
  });
}
