import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Novelty {
  novelty_id: string;
  product_id: string;
  product_name: string;
  product_sku: string | null;
  supplier_code: string | null;
  supplier_product_code: string | null;
  detected_at: string;
  expires_at: string;
  days_remaining: number;
  is_highlighted: boolean;
}

export interface NoveltyWithProduct extends Novelty {
  product_description?: string;
  base_price?: number;
  product_image?: string;
  supplier_id?: string;
  supplier_name?: string;
  category_id?: string;
  category_name?: string;
  status?: 'active' | 'expiring_soon' | 'expired';
}

export interface NoveltyStats {
  total_novelties: number;
  active_novelties: number;
  highlighted_novelties: number;
  expiring_soon: number;
  by_supplier: Record<string, number>;
}

export interface UseNoveltiesOptions {
  supplierCode?: string;
  limit?: number;
  offset?: number;
  onlyHighlighted?: boolean;
  maxDays?: number; // Filtrar por período (ex: últimos 7 dias)
}

/**
 * Hook para buscar novidades ativas usando a função RPC get_active_novelties
 */
export function useNovelties(options: UseNoveltiesOptions = {}) {
  const { supplierCode, limit = 50, offset = 0, onlyHighlighted = false, maxDays } = options;

  return useQuery<Novelty[]>({
    queryKey: ['novelties', supplierCode, limit, offset, onlyHighlighted, maxDays],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_active_novelties', {
        p_supplier_code: supplierCode || null,
        p_limit: limit,
        p_offset: offset,
        p_only_highlighted: onlyHighlighted,
      });

      if (error) {
        console.error('Erro ao buscar novidades:', error);
        throw new Error(`Falha ao buscar novidades: ${error.message}`);
      }

      let novelties = (data || []) as Novelty[];

      // Filtrar por período se maxDays for especificado
      if (maxDays) {
        const minDaysRemaining = 30 - maxDays; // Ex: maxDays=7 -> produtos com 23-30 dias restantes
        novelties = novelties.filter(n => n.days_remaining >= minDaysRemaining);
      }

      return novelties;
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
    retry: 2,
  });
}

/**
 * Hook para buscar novidades com dados completos do produto usando a view
 */
export function useNoveltiesWithProducts(options: UseNoveltiesOptions = {}) {
  const { supplierCode, limit = 50, onlyHighlighted = false, maxDays } = options;

  return useQuery<NoveltyWithProduct[]>({
    queryKey: ['novelties-full', supplierCode, limit, onlyHighlighted, maxDays],
    queryFn: async () => {
      let query = supabase
        .from('v_product_novelties')
        .select('*')
        .order('detected_at', { ascending: false })
        .limit(limit);

      if (supplierCode) {
        query = query.eq('supplier_code', supplierCode);
      }

      if (onlyHighlighted) {
        query = query.eq('is_highlighted', true);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar novidades completas:', error);
        throw new Error(`Falha ao buscar novidades: ${error.message}`);
      }

      let novelties = (data || []) as NoveltyWithProduct[];

      // Filtrar por período se maxDays for especificado
      if (maxDays) {
        const minDaysRemaining = 30 - maxDays;
        novelties = novelties.filter(n => n.days_remaining >= minDaysRemaining);
      }

      return novelties;
    },
    staleTime: 2 * 60 * 1000,
    retry: 2,
  });
}

/**
 * Hook para buscar estatísticas de novidades
 */
export function useNoveltyStats() {
  return useQuery<NoveltyStats>({
    queryKey: ['novelty-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_novelties_stats');

      if (error) {
        console.error('Erro ao buscar estatísticas:', error);
        throw new Error(`Falha ao buscar estatísticas: ${error.message}`);
      }

      // A função retorna uma tabela, pegamos o primeiro registro
      const stats = Array.isArray(data) ? data[0] : data;
      
      return {
        total_novelties: stats?.total_novelties || 0,
        active_novelties: stats?.active_novelties || 0,
        highlighted_novelties: stats?.highlighted_novelties || 0,
        expiring_soon: stats?.expiring_soon || 0,
        by_supplier: stats?.by_supplier || {},
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: 2,
  });
}

/**
 * Verifica se um produto é novidade (para uso nos cards)
 */
export function useIsProductNovelty(productId: string) {
  return useQuery<{ isNovelty: boolean; daysRemaining: number | null }>({
    queryKey: ['is-novelty', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_novelties')
        .select('expires_at')
        .eq('product_id', productId)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (error) {
        console.error('Erro ao verificar novidade:', error);
        return { isNovelty: false, daysRemaining: null };
      }

      if (!data) {
        return { isNovelty: false, daysRemaining: null };
      }

      const expiresAt = new Date(data.expires_at);
      const now = new Date();
      const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      return { isNovelty: true, daysRemaining };
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
        .from('product_novelties')
        .select('product_id')
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString());

      if (error) {
        console.error('Erro ao buscar IDs de novidades:', error);
        return new Set();
      }

      return new Set((data || []).map(d => d.product_id));
    },
    staleTime: 2 * 60 * 1000,
  });
}
