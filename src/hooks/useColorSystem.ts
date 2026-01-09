import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// =====================================================
// TIPOS DO SISTEMA DE CORES (3 Níveis)
// =====================================================

export interface ColorGroup {
  id: string;
  name: string;
  slug: string;
  hex_code: string | null;
  variations: ColorVariation[];
}

export interface ColorVariation {
  id: string;
  name: string;
  slug: string;
  hex_code: string | null;
}

export interface ColorNuance {
  id: string;
  name: string;
  slug: string;
}

export interface ColorFilters {
  groups: ColorGroup[];
  nuances: ColorNuance[];
}

// =====================================================
// HOOK PRINCIPAL - Carrega toda a hierarquia de cores
// =====================================================

export function useColorSystem() {
  return useQuery<ColorFilters>({
    queryKey: ['color-system'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_color_filters');
      
      if (error) {
        console.error('Erro ao carregar sistema de cores:', error);
        throw new Error(`Falha ao carregar cores: ${error.message}`);
      }
      
      return data as ColorFilters;
    },
    staleTime: 60 * 60 * 1000, // 1 hora - dados muito estáveis
    gcTime: 24 * 60 * 60 * 1000, // 24 horas em cache
  });
}

// =====================================================
// HOOKS INDIVIDUAIS
// =====================================================

/**
 * Hook para buscar apenas os grupos de cor (para filtros rápidos)
 */
export function useColorGroups() {
  return useQuery<ColorGroup[]>({
    queryKey: ['color-groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('color_groups')
        .select(`
          id,
          name,
          slug,
          hex_code,
          color_variations (
            id,
            name,
            slug,
            hex_code
          )
        `)
        .eq('is_active', true)
        .order('sort_order');

      if (error) {
        throw new Error(`Falha ao carregar grupos de cor: ${error.message}`);
      }

      return (data || []).map(group => ({
        id: group.id,
        name: group.name,
        slug: group.slug,
        hex_code: group.hex_code,
        variations: (group.color_variations || []) as ColorVariation[],
      }));
    },
    staleTime: 60 * 60 * 1000,
  });
}

/**
 * Hook para buscar apenas as nuances/acabamentos
 */
export function useColorNuances() {
  return useQuery<ColorNuance[]>({
    queryKey: ['color-nuances'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('color_nuances')
        .select('id, name, slug')
        .eq('is_active', true)
        .order('sort_order');

      if (error) {
        throw new Error(`Falha ao carregar nuances: ${error.message}`);
      }

      return data || [];
    },
    staleTime: 60 * 60 * 1000,
  });
}

/**
 * Hook para buscar variações de um grupo específico
 */
export function useColorVariations(groupId: string | null) {
  return useQuery<ColorVariation[]>({
    queryKey: ['color-variations', groupId],
    queryFn: async () => {
      if (!groupId) return [];

      const { data, error } = await supabase
        .from('color_variations')
        .select('id, name, slug, hex_code')
        .eq('group_id', groupId)
        .eq('is_active', true)
        .order('sort_order');

      if (error) {
        throw new Error(`Falha ao carregar variações: ${error.message}`);
      }

      return data || [];
    },
    enabled: !!groupId,
    staleTime: 60 * 60 * 1000,
  });
}

// =====================================================
// UTILITÁRIOS
// =====================================================

/**
 * Encontra um grupo pelo slug
 */
export function findGroupBySlug(groups: ColorGroup[], slug: string): ColorGroup | undefined {
  return groups.find(g => g.slug === slug);
}

/**
 * Encontra uma variação pelo slug dentro de um grupo
 */
export function findVariationBySlug(group: ColorGroup, slug: string): ColorVariation | undefined {
  return group.variations.find(v => v.slug === slug);
}

/**
 * Formata o nome completo da cor (variação + nuance)
 */
export function formatColorName(variationName: string, nuanceName?: string): string {
  if (nuanceName) {
    return `${variationName} ${nuanceName}`;
  }
  return variationName;
}

/**
 * Verifica se uma cor é clara (para decidir cor do texto)
 */
export function isLightColor(hexCode: string | null): boolean {
  if (!hexCode) return true;
  
  const hex = hexCode.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Fórmula de luminosidade
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}
