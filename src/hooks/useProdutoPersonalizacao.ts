/**
 * Hook Unificado: Produto + Técnicas de Personalização
 * 
 * Combina dados do produto com técnicas disponíveis para gravação,
 * incluindo opções de cores, tamanhos e preços.
 * 
 * SSOT: BD Externo (Promobrind) é o master
 * - products: dados do produto
 * - product_print_areas: áreas de gravação por produto
 * - customization_price_tables: tabelas de preço por técnica
 * 
 * Transformadores: Importados de @/lib/personalization (Domain Layer)
 */
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { PRODUTOS_QUERY_OPTIONS, TABELAS_PRECO_QUERY_OPTIONS } from '@/lib/query-config';
import { invokeExternalDb } from '@/lib/external-db';
import { rawToTabelaPrecoTecnica } from '@/lib/personalization';
import type { TabelaPrecoTecnica, CustomizationPriceTableRaw } from '@/types/tecnica-unificada';
import type { ProductTechnique, SizeOption, Product as SimulatorProduct, ProductColor } from '@/components/pricing/simulator/types';

// ============================================
// TIPOS
// ============================================

export interface ExternalPrintArea {
  id: string;
  product_id: string;
  component_name: string;
  component_code: string;
  location_name: string;
  location_code: string;
  area_name: string;
  area_code: string;
  supplier_technique_code: string;
  max_width: number | null;
  max_height: number | null;
  max_colors: number | null;
  area_cm2: number | null;
  is_curved: boolean;
  is_primary: boolean;
  is_active: boolean;
  display_order: number;
  serv_code: string | null;
}

export interface ProdutoPersonalizacao {
  produto: SimulatorProduct | null;
  tecnicas: ProductTechnique[];
  tecnicasPorComponente: Record<string, ProductTechnique[]>;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export interface TecnicaComOpcoes extends ProductTechnique {
  opcoesTabela: TabelaPrecoTecnica[];
  opcoesCores: { value: number; label: string }[];
  opcoesTamanho: SizeOption[];
  temPrecoPorCor: boolean;
  temPrecoPorArea: boolean;
}

export interface ProdutoPersonalizacaoCompleto extends ProdutoPersonalizacao {
  tecnicasComOpcoes: TecnicaComOpcoes[];
}

// ============================================
// QUERY KEYS
// ============================================

export const PRODUTO_PERSONALIZACAO_KEYS = {
  all: ['produto-personalizacao'] as const,
  produto: (productId: string) => [...PRODUTO_PERSONALIZACAO_KEYS.all, 'produto', productId] as const,
  tecnicas: (productId: string) => [...PRODUTO_PERSONALIZACAO_KEYS.all, 'tecnicas', productId] as const,
  completo: (productId: string) => [...PRODUTO_PERSONALIZACAO_KEYS.all, 'completo', productId] as const,
};

// ============================================
// TRANSFORMADORES
// ============================================

function transformPrintAreaToTechnique(area: ExternalPrintArea): ProductTechnique {
  // Criar código composto: componente-local-tecnica
  const composedCode = `${area.component_code}-${area.location_code}-${area.supplier_technique_code}`;
  
  return {
    id: area.id,
    techniqueCode: area.supplier_technique_code,
    techniqueName: area.area_name,
    componentName: area.component_name || 'Produto',
    locationName: area.location_name,
    locationCode: area.location_code,
    composedCode,
    maxWidth: area.max_width,
    maxHeight: area.max_height,
    maxArea: area.area_cm2,
    maxColors: area.max_colors,
    isCurved: area.is_curved,
    isPrimary: area.is_primary,
  };
}

function groupTechniquesByComponent(tecnicas: ProductTechnique[]): Record<string, ProductTechnique[]> {
  return tecnicas.reduce((acc, tech) => {
    const key = tech.componentName;
    if (!acc[key]) acc[key] = [];
    acc[key].push(tech);
    return acc;
  }, {} as Record<string, ProductTechnique[]>);
}

// ============================================
// HOOK PRINCIPAL: Produto + Técnicas Básicas
// ============================================

/**
 * Busca um produto e suas técnicas de personalização disponíveis
 */
export function useProdutoPersonalizacao(productId: string | null): ProdutoPersonalizacao {
  // Query para buscar áreas de gravação do produto
  const tecnicasQuery = useQuery({
    queryKey: PRODUTO_PERSONALIZACAO_KEYS.tecnicas(productId ?? ''),
    queryFn: async (): Promise<ProductTechnique[]> => {
      if (!productId) return [];

      const { fetchPrintAreasFromProduct } = await import('@/lib/fetch-print-areas');
      const fetchedAreas = await fetchPrintAreasFromProduct(productId);
      const result = { records: fetchedAreas as unknown as ExternalPrintArea[] };

      return result.records.map(transformPrintAreaToTechnique);
    },
    enabled: !!productId,
    ...PRODUTOS_QUERY_OPTIONS,
  });

  // Query para buscar dados do produto
  const produtoQuery = useQuery({
    queryKey: PRODUTO_PERSONALIZACAO_KEYS.produto(productId ?? ''),
    queryFn: async (): Promise<SimulatorProduct | null> => {
      if (!productId) return null;

      const result = await invokeExternalDb<any>({
        table: 'products',
        operation: 'select',
        filters: { id: productId },
        select: 'id, name, sku, base_price, image_url, images, primary_image_url, category_id, main_category_id, supplier_reference, description, brand, is_active, active, stock_quantity, colors',
        limit: 1,
      });

      const p = result.records[0];
      if (!p) return null;

      // Normalizar para o formato SimulatorProduct
      const colors: ProductColor[] = normalizeColors(p.colors);
      
      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        price: p.base_price || 0,
        images: extractImages(p),
        category_name: null,
        supplier_reference: p.supplier_reference,
        brand: p.brand,
        colors,
      };
    },
    enabled: !!productId,
    ...PRODUTOS_QUERY_OPTIONS,
  });

  const tecnicas = tecnicasQuery.data ?? [];
  const tecnicasPorComponente = useMemo(() => groupTechniquesByComponent(tecnicas), [tecnicas]);

  return {
    produto: produtoQuery.data ?? null,
    tecnicas,
    tecnicasPorComponente,
    isLoading: tecnicasQuery.isLoading || produtoQuery.isLoading,
    isError: tecnicasQuery.isError || produtoQuery.isError,
    error: tecnicasQuery.error || produtoQuery.error,
  };
}

// ============================================
// HOOK COMPLETO: Com Opções de Preço
// ============================================

// Nota: CustomizationPriceTableRaw é importado de @/types/tecnica-unificada
// Transformador rawToTabelaPrecoTecnica é importado de @/lib/personalization

/**
 * Busca produto + técnicas + opções de preço completas
 * Útil para simuladores de preço
 */
export function useProdutoPersonalizacaoCompleto(productId: string | null): ProdutoPersonalizacaoCompleto {
  const baseData = useProdutoPersonalizacao(productId);
  
  // Extrair códigos únicos de técnicas para buscar tabelas de preço
  const techniqueCodes = useMemo(() => {
    return [...new Set(baseData.tecnicas.map(t => t.techniqueCode))];
  }, [baseData.tecnicas]);

  // Query para buscar tabelas de preço das técnicas
  const tabelasQuery = useQuery({
    queryKey: ['produto-tecnicas-tabelas', techniqueCodes],
    queryFn: async (): Promise<Map<string, TabelaPrecoTecnica[]>> => {
      if (techniqueCodes.length === 0) return new Map();

      const result = await invokeExternalDb<CustomizationPriceTableRaw>({
        table: 'customization_price_tables',
        operation: 'select',
        filters: { is_active: true },
        limit: 500,
      });

      // Mapear tabelas por código de técnica
      const tabelasPorCodigo = new Map<string, TabelaPrecoTecnica[]>();

      for (const raw of result.records) {
        const tabela = rawToTabelaPrecoTecnica(raw);
        const tableCode = raw.table_code?.toLowerCase() || '';
        
        // Encontrar técnicas que correspondem a esta tabela
        for (const techCode of techniqueCodes) {
          const code = techCode.toLowerCase();
          if (tableCode.includes(code) || code.includes(tableCode) || 
              tabela.nomeTecnica?.toLowerCase().includes(code)) {
            if (!tabelasPorCodigo.has(techCode)) {
              tabelasPorCodigo.set(techCode, []);
            }
            tabelasPorCodigo.get(techCode)!.push(tabela);
          }
        }
      }

      return tabelasPorCodigo;
    },
    enabled: techniqueCodes.length > 0,
    ...TABELAS_PRECO_QUERY_OPTIONS,
  });

  // Combinar técnicas com opções de tabela
  const tecnicasComOpcoes = useMemo((): TecnicaComOpcoes[] => {
    const tabelasMap = tabelasQuery.data ?? new Map();

    return baseData.tecnicas.map(tech => {
      const tabelas = tabelasMap.get(tech.techniqueCode) || [];
      
      // Verificar tipos de precificação
      const temPrecoPorCor = tabelas.some(t => t.precoPorCor);
      const temPrecoPorArea = tabelas.some(t => t.precoPorArea);

      // Extrair opções de cores
      const opcoesCores = extractColorOptions(tabelas, temPrecoPorCor);

      // Extrair opções de tamanho
      const opcoesTamanho = extractSizeOptions(tabelas);

      return {
        ...tech,
        opcoesTabela: tabelas,
        opcoesCores,
        opcoesTamanho,
        temPrecoPorCor,
        temPrecoPorArea,
      };
    });
  }, [baseData.tecnicas, tabelasQuery.data]);

  return {
    ...baseData,
    tecnicasComOpcoes,
    isLoading: baseData.isLoading || tabelasQuery.isLoading,
    isError: baseData.isError || tabelasQuery.isError,
    error: baseData.error || tabelasQuery.error,
  };
}

// ============================================
// HOOKS AUXILIARES
// ============================================

/**
 * Busca apenas as técnicas disponíveis para um produto
 */
export function useProdutoTecnicas(productId: string | null) {
  return useQuery({
    queryKey: PRODUTO_PERSONALIZACAO_KEYS.tecnicas(productId ?? ''),
    queryFn: async (): Promise<ProductTechnique[]> => {
      if (!productId) return [];

      const { fetchPrintAreasFromProduct } = await import('@/lib/fetch-print-areas');
      const fetchedAreas = await fetchPrintAreasFromProduct(productId);
      const result = { records: fetchedAreas as unknown as ExternalPrintArea[] };

      return result.records.map(transformPrintAreaToTechnique);
    },
    enabled: !!productId,
    ...PRODUTOS_QUERY_OPTIONS,
  });
}

/**
 * Busca tabela de preço específica para uma técnica
 */
export function useTecnicaTabela(techniqueCode: string | null, numCores?: number, larguraCm?: number, alturaCm?: number) {
  return useQuery({
    queryKey: ['tecnica-tabela', techniqueCode, numCores, larguraCm, alturaCm],
    queryFn: async (): Promise<TabelaPrecoTecnica | null> => {
      if (!techniqueCode) return null;

      const result = await invokeExternalDb<CustomizationPriceTableRaw>({
        table: 'customization_price_tables',
        operation: 'select',
        filters: { is_active: true },
        orderBy: { column: 'max_colors', ascending: true },
        limit: 100,
      });

      // Filtrar tabelas que correspondem ao código
      const code = techniqueCode.toLowerCase();
      const tabelasFiltradas = result.records
        .filter(raw => {
          const tableCode = (raw.table_code || '').toLowerCase();
          return tableCode.includes(code) || code.includes(tableCode);
        })
        .map(rawToTabelaPrecoTecnica);

      if (tabelasFiltradas.length === 0) return null;

      // Encontrar tabela adequada para os parâmetros
      let tabelaAdequada = tabelasFiltradas[0];

      if (numCores) {
        const comCores = tabelasFiltradas.find(t => 
          t.maxCores !== null && t.maxCores >= numCores
        );
        if (comCores) tabelaAdequada = comCores;
      }

      if (larguraCm && alturaCm) {
        const comDimensoes = tabelasFiltradas.find(t =>
          (t.larguraMaxCm === null || t.larguraMaxCm >= larguraCm) &&
          (t.alturaMaxCm === null || t.alturaMaxCm >= alturaCm)
        );
        if (comDimensoes) tabelaAdequada = comDimensoes;
      }

      return tabelaAdequada;
    },
    enabled: !!techniqueCode,
    ...TABELAS_PRECO_QUERY_OPTIONS,
  });
}

// ============================================
// FUNÇÕES UTILITÁRIAS
// ============================================

function extractImages(p: any): string[] {
  let images: string[] = [];
  
  if (p.images && Array.isArray(p.images)) {
    images = p.images.map((img: any) => {
      if (typeof img === 'string') return img;
      return img.url || img.src || img.image_url || '';
    }).filter(Boolean);
  }
  
  if (images.length === 0 && p.primary_image_url) {
    images = [p.primary_image_url];
  }
  
  if (images.length === 0 && p.image_url) {
    images = [p.image_url];
  }
  
  if (images.length === 0) {
    images = ['/placeholder.svg'];
  }
  
  return images;
}

function normalizeColors(colors: any[] | undefined): ProductColor[] {
  if (!colors || !Array.isArray(colors)) return [];
  
  return colors.map((c: any) => ({
    code: c.code || c.color_code || c.name || 'unknown',
    name: c.name || c.color_name || 'Sem cor',
    hex: c.hex || c.hex_code || c.color_hex || '#CCCCCC',
    stock: c.stock || c.stock_quantity || undefined,
  }));
}

function extractColorOptions(tabelas: TabelaPrecoTecnica[], temPrecoPorCor: boolean): { value: number; label: string }[] {
  if (!temPrecoPorCor || tabelas.length === 0) return [];

  // Pegar todos os max_colors únicos
  const uniqueColors = [...new Set(tabelas.map(t => t.maxCores).filter((c): c is number => c !== null && c > 0))]
    .sort((a, b) => a - b);

  // Se não há variação, criar opções de 1 até o máximo
  if (uniqueColors.length <= 1) {
    const maxColors = uniqueColors[0] || 4;
    return Array.from({ length: maxColors }, (_, i) => ({
      value: i + 1,
      label: `${i + 1} ${i === 0 ? 'cor' : 'cores'}`,
    }));
  }

  // Se há variação, usar os valores disponíveis
  return uniqueColors.map(c => ({
    value: c,
    label: `${c} ${c === 1 ? 'cor' : 'cores'}`,
  }));
}

function extractSizeOptions(tabelas: TabelaPrecoTecnica[]): SizeOption[] {
  if (tabelas.length === 0) return [];

  const uniqueAreas = new Map<string, SizeOption>();
  
  for (const tabela of tabelas) {
    const width = tabela.larguraMaxCm;
    const height = tabela.alturaMaxCm;
    
    if (width && height && width > 0 && height > 0) {
      const key = `${width}x${height}`;
      if (!uniqueAreas.has(key)) {
        const areaCm2 = width * height;
        uniqueAreas.set(key, {
          label: `${width} x ${height} cm`,
          value: key,
          modifier: 1, // Será calculado no momento do uso
          width,
          height,
          areaCm2,
        });
      }
    }
  }

  // Ordenar por área
  return Array.from(uniqueAreas.values()).sort((a, b) => (a.areaCm2 || 0) - (b.areaCm2 || 0));
}

// ============================================
// EXPORTS ADICIONAIS
// ============================================

export type { ProductTechnique, SizeOption };
export type { SimulatorProduct as Product };
