/**
 * Types: Sistema de Gravação e Personalização
 * 
 * Tipos para áreas de gravação e técnicas de personalização.
 * Baseado na documentação oficial do backend (DOC_SISTEMA_GRAVACAO_LOVABLE).
 * 
 * SSOT: BD Externo (Promobrind) é o master.
 */

// ============================================
// TÉCNICA DE GRAVAÇÃO
// ============================================

/**
 * Técnica de Gravação completa (tabela tecnica_gravacao)
 */
export interface TecnicaGravacao {
  id: string;
  codigo: string;
  nome: string;
  slug: string;
  descricao: string | null;
  permite_cores: boolean;
  max_cores: string | null; // "1", "4", "Full Color"
  cobra_por_cor: boolean;
  cobra_por_area: boolean;
  cobra_por_pontos: boolean;
  requer_setup: boolean;
  tipo_setup: 'nenhum' | 'fotolito' | 'cliche' | 'matriz' | string | null;
  tempo_producao_dias: number;
  ordem_exibicao: number;
  ativo: boolean;
  codigo_interno: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Técnica simplificada (retorno de fn_get_product_print_areas)
 */
export interface TecnicaSimples {
  id: string;
  nome: string;
  codigo: string;
}

// ============================================
// ÁREAS DE GRAVAÇÃO
// ============================================

/**
 * Shape (formato) da área de gravação
 */
export type AreaShape = 'rectangle' | 'circle' | 'oval' | 'triangle' | 'custom';

/**
 * Área de gravação do produto (tabela product_print_areas)
 */
export interface ProductPrintArea {
  id: string;
  product_id: string;
  area_code: string | null;
  area_name: string | null;
  component_name: string | null;
  location_name: string | null;
  max_width: number | null;
  max_height: number | null;
  unit: string;
  shape: AreaShape | null;
  is_curved: boolean;
  is_primary: boolean;
  display_order: number;
  allowed_technique_ids: string[] | null;
  notes: string | null;
  is_active: boolean;
  additional_cost: number;
  example_image_url: string | null;
  area_image: string | null;
  location_image: string | null;
  component_image: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Retorno da função fn_get_product_print_areas
 * Área com técnicas já resolvidas (JOIN com tecnica_gravacao)
 */
export interface PrintAreaWithTechniques {
  area_id: string;
  area_code: string;
  area_name: string;
  component_name: string | null;
  location_name: string | null;
  max_width: number;
  max_height: number;
  unit: string;
  shape: AreaShape;
  is_curved: boolean;
  is_primary: boolean;
  display_order: number;
  techniques: TecnicaSimples[];
}

/**
 * Área agrupada por componente e localização
 */
export interface GroupedPrintArea {
  componentName: string;
  componentCode: string;
  locations: {
    locationName: string;
    locationCode: string;
    techniques: {
      id: string;
      areaName: string;
      techniqueCode: string;
      maxWidth: number | null;
      maxHeight: number | null;
      maxColors: number | null;
      areaCm2: number | null;
      isCurved: boolean;
      isPrimary: boolean;
      servCode: string | null;
    }[];
  }[];
}

// ============================================
// ESTATÍSTICAS E VIEWS
// ============================================

/**
 * Estatísticas de técnica (view v_technique_stats)
 */
export interface TechniqueStats {
  tecnica_id: string;
  codigo: string;
  nome: string;
  ativo: boolean;
  produtos_com_tecnica: number;
  areas_com_tecnica: number;
}

// ============================================
// PERSONALIZAÇÃO SELECIONADA (UI)
// ============================================

/**
 * Configuração de personalização selecionada pelo usuário
 * (usado em orçamentos, pedidos, simulador)
 */
export interface PersonalizacaoSelecionada {
  areaId: string;
  areaCode: string;
  areaName: string;
  tecnicaId: string;
  tecnicaCodigo: string;
  tecnicaNome: string;
  largura: number;
  altura: number;
  cores: number;
  arteUrl?: string;
  observacoes?: string;
}

// ============================================
// CONSTANTES
// ============================================

/**
 * Cores por técnica para badges
 */
export const TECHNIQUE_COLORS: Record<string, string> = {
  SERIGRAFIA: 'bg-info/10 text-info border-info/20',
  LASER: 'bg-destructive/10 text-destructive border-destructive/20',
  LASER_CO2: 'bg-destructive/10 text-destructive border-destructive/20',
  LASER_UV: 'bg-destructive/10 text-destructive border-destructive/20',
  UV_DIGITAL: 'bg-primary/10 text-primary border-primary/20',
  TAMPOGRAFIA: 'bg-success/10 text-success border-success/20',
  BORDADO: 'bg-warning/10 text-warning border-warning/20',
  SUBLIMACAO: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
  HOT_STAMPING: 'bg-orange/10 text-orange border-orange/20',
  TRANSFER_DIGITAL: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  ADESIVO: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
  ETIQUETA: 'bg-muted/50 text-muted-foreground border-border/20',
  FILME_RECORTE: 'bg-teal-500/10 text-teal-500 border-teal-500/20',
  DECALQUE: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  HEAT_TRANSFER: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
  EMBORRACHADO: 'bg-lime-500/10 text-lime-500 border-lime-500/20',
};

/**
 * Ícones por técnica
 */
export const TECHNIQUE_ICONS: Record<string, string> = {
  SERIGRAFIA: '🖌️',
  LASER: '⚡',
  LASER_CO2: '⚡',
  LASER_UV: '⚡',
  UV_DIGITAL: '🎨',
  TAMPOGRAFIA: '🔘',
  BORDADO: '🧵',
  SUBLIMACAO: '🌈',
  HOT_STAMPING: '✨',
  TRANSFER_DIGITAL: '📋',
  ADESIVO: '🏷️',
  ETIQUETA: '🏷️',
  FILME_RECORTE: '✂️',
  DECALQUE: '🔥',
  HEAT_TRANSFER: '🔥',
  EMBORRACHADO: '🔲',
};

/**
 * Shapes para CSS
 */
export const SHAPE_STYLES: Record<AreaShape, string> = {
  rectangle: 'rounded-lg',
  circle: 'rounded-full',
  oval: 'rounded-[50%]',
  triangle: 'clip-path-triangle',
  custom: '',
};
