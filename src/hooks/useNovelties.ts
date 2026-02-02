import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Interface para produto novidade (usando products.is_new)
 */
export interface NoveltyProduct {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  is_new: boolean;
  is_featured: boolean;
  base_price: number;
  category_id: string | null;
  category_name: string | null;
  primary_image_url: string | null;
  supplier_id: string | null;
  supplier_name: string | null;
  created_at: string;
}

/**
 * Interface para novidade com detalhes da view v_product_novelties
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
  supplier_product_code: string | null;
  detected_at: string;
  expires_at: string;
  days_remaining: number;
  status: 'active' | 'expiring_soon' | 'expired';
  is_highlighted: boolean;
  is_active: boolean;
}

/**
 * Interface para estatísticas de novidades (vw_novelty_stats)
 */
export interface NoveltyStats {
  total_products: number;
  products_is_new_true: number;
  products_is_new_false: number;
  total_novelty_records: number;
  active_novelties: number;
  expired_novelties: number;
  expiring_in_7_days: number;
  next_expiration: string | null;
  generated_at: string;
}

/**
 * Interface para estatísticas resumidas (RPC)
 */
export interface NoveltyStatsRPC {
  total_novelties: number;
  active_novelties: number;
  highlighted_novelties: number;
  expiring_soon: number;
  by_supplier?: Record<string, number>;
}

export interface UseNoveltiesOptions {
  limit?: number;
  offset?: number;
  onlyHighlighted?: boolean;
}

/**
 * Hook simples para buscar produtos novidade (products.is_new = true)
 * RECOMENDADO para a maioria dos casos
 */
export function useNoveltyProducts(options: UseNoveltiesOptions = {}) {
  const { limit = 50, offset = 0 } = options;

  return useQuery<NoveltyProduct[]>({
    queryKey: ['novelty-products', limit, offset],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          sku,
          name,
          description,
          is_new,
          is_featured,
          base_price,
          category_id,
          category_name,
          primary_image_url,
          supplier_id,
          supplier_name,
          created_at
        `)
        .eq('is_new', true)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Erro ao buscar produtos novidade:', error);
        throw new Error(`Falha ao buscar novidades: ${error.message}`);
      }

      return (data || []) as NoveltyProduct[];
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
    retry: 2,
  });
}

/**
 * Hook para buscar novidades com detalhes completos (view v_product_novelties)
 * Use quando precisar de days_remaining, status, etc.
 */
export function useNoveltiesWithDetails(options: UseNoveltiesOptions = {}) {
  const { limit = 50, onlyHighlighted = false } = options;

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
 * Hook para estatísticas de novidades (view vw_novelty_stats)
 */
export function useNoveltyStats() {
  return useQuery<NoveltyStats>({
    queryKey: ['novelty-stats-view'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_novelty_stats')
        .select('*')
        .single();

      if (error) {
        console.error('Erro ao buscar estatísticas:', error);
        // Fallback para RPC se a view não existir
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_novelties_stats');
        
        if (rpcError) {
          throw new Error(`Falha ao buscar estatísticas: ${rpcError.message}`);
        }

        const stats = Array.isArray(rpcData) ? rpcData[0] : rpcData;
        return {
          total_products: 0,
          products_is_new_true: stats?.active_novelties || 0,
          products_is_new_false: 0,
          total_novelty_records: stats?.total_novelties || 0,
          active_novelties: stats?.active_novelties || 0,
          expired_novelties: 0,
          expiring_in_7_days: stats?.expiring_soon || 0,
          next_expiration: null,
          generated_at: new Date().toISOString(),
        } as NoveltyStats;
      }

      return data as NoveltyStats;
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

/**
 * Hook para buscar novidades via RPC get_active_novelties
 * @deprecated Use useNoveltyProducts para casos simples
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
        novelties = novelties.filter((n: any) => n.days_remaining >= minDaysRemaining);
      }

      return novelties;
    },
    staleTime: 2 * 60 * 1000,
    retry: 2,
  });
}

/**
 * Hook para contar total de novidades ativas
 */
export function useNoveltyCount() {
  return useQuery<number>({
    queryKey: ['novelty-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('is_new', true);

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
        .from('products')
        .select('id')
        .eq('is_new', true);

      if (error) {
        console.error('Erro ao buscar IDs de novidades:', error);
        return new Set();
      }

      return new Set((data || []).map(d => d.id));
    },
    staleTime: 2 * 60 * 1000,
  });
}
