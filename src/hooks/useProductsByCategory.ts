import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseProductsByCategoryOptions {
  categoryIds: string[];
  includeDescendants?: boolean;
  enabled?: boolean;
}

interface UseProductsByCategoryResult {
  productIds: Set<string>;
  hasFilter: boolean;
  isLoading: boolean;
  error: string | null;
  categoriesCount: number;
  source: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook para buscar IDs de produtos vinculados a categorias via tabela relacional
 * Usa a tabela product_category_assignments (ou fallbacks)
 */
export function useProductsByCategory({
  categoryIds,
  includeDescendants = true,
  enabled = true,
}: UseProductsByCategoryOptions): UseProductsByCategoryResult {
  const [productIds, setProductIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoriesCount, setCategoriesCount] = useState(0);
  const [source, setSource] = useState<string | null>(null);

  // Verificar se há filtro ativo
  const hasFilter = useMemo(() => {
    return categoryIds.length > 0;
  }, [categoryIds]);

  const fetchProductIds = useCallback(async () => {
    if (!hasFilter || !enabled) {
      setProductIds(new Set());
      setCategoriesCount(0);
      setSource(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('categories-api', {
        body: {
          action: 'products_by_categories',
          categoryIds,
          includeDescendants,
        },
      });

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Erro ao buscar produtos por categoria');
      }

      setProductIds(new Set(data.productIds || []));
      setCategoriesCount(data.categoriesUsed || categoryIds.length);
      setSource(data.source || null);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('Erro ao buscar produtos por categoria:', err);
      setError(message);
      setProductIds(new Set());
    } finally {
      setIsLoading(false);
    }
  }, [categoryIds, includeDescendants, hasFilter, enabled]);

  // Buscar quando os parâmetros mudam
  useEffect(() => {
    fetchProductIds();
  }, [fetchProductIds]);

  return {
    productIds,
    hasFilter,
    isLoading,
    error,
    categoriesCount,
    source,
    refetch: fetchProductIds,
  };
}

/**
 * Hook auxiliar para buscar descendentes de categorias
 */
export function useCategoryDescendants(categoryIds: string[]) {
  const [descendantIds, setDescendantIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (categoryIds.length === 0) {
      setDescendantIds([]);
      return;
    }

    const fetchDescendants = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('categories-api', {
          body: {
            action: 'descendants',
            categoryIds,
          },
        });

        if (!error && data.success) {
          setDescendantIds(data.data || []);
        }
      } catch (err) {
        console.error('Erro ao buscar descendentes:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDescendants();
  }, [categoryIds]);

  return { descendantIds, isLoading };
}
