// Tipo Unificado para Técnicas de Gravação/Personalização
// SSOT: BD Externo (Promobrind) é o master

import type { TipoSetup, FormatoVariante } from './gravacao-database';

/**
 * Interface unificada para técnicas de personalização
 * Consolidada a partir de:
 * - personalization_techniques (Supabase - será depreciado)
 * - tecnica_gravacao (Promobrind - SSOT)
 */
export interface TecnicaUnificada {
  // === Identificação ===
  id: string;
  codigo: string;
  codigoInterno: string;
  nome: string;
  slug: string;
  descricao: string | null;
  
  // === Configuração de Cores ===
  permiteCores: boolean;
  maxCores: number;
  cobraPorCor: boolean;
  
  // === Configuração de Cobrança ===
  cobraPorArea: boolean;
  cobraPorPontos: boolean;
  
  // === Setup ===
  requerSetup: boolean;
  tipoSetup: TipoSetup;
  
  // === Produção ===
  tempoProducaoDias: number;
  quantidadeMinima: number;
  
  // === Custos Base ===
  custoSetup: number;
  custoUnitario: number;
  
  // === Status ===
  ativo: boolean;
  ordemExibicao: number;
  
  // === Relacionamentos ===
  variantes: TecnicaVarianteUnificada[];
  variantesCount: number;
  
  // === Metadados ===
  fonte: 'externo' | 'local'; // Para migração gradual
  criadoEm: string;
  atualizadoEm: string;
}

/**
 * Variante de técnica unificada
 */
export interface TecnicaVarianteUnificada {
  id: string;
  tecnicaId: string;
  codigo: string;
  codigoInterno: string;
  nome: string;
  slug: string;
  descricao: string | null;
  formato: FormatoVariante;
  permiteCores: boolean;
  maxCores: number;
  cobraPorCor: boolean;
  produtosTipicos: string[];
  ordemExibicao: number;
  ativo: boolean;
}

/**
 * Faixa de preço por quantidade
 */
export interface TecnicaFaixaPreco {
  id: string;
  tecnicaCodigo: string;
  quantidadeMinima: number;
  quantidadeMaxima: number | null;
  precoPorCor: number;
  precoAdicionalCor: number;
  precoSetup: number;
  ativo: boolean;
}

/**
 * Faixa de área para cálculo de preço
 */
export interface TecnicaFaixaAreaUnificada {
  id: string;
  tecnicaId: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  areaMinimaCm2: number | null;
  areaMaximaCm2: number | null;
  multiplicadorPreco: number;
  valorAdicionalPeca: number;
  ordemExibicao: number;
  ativo: boolean;
}

/**
 * Faixa de pontos (bordado) para cálculo de preço
 */
export interface TecnicaFaixaPontosUnificada {
  id: string;
  tecnicaId: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  pontosMinimo: number | null;
  pontosMaximo: number | null;
  areaTipicaCm2: number | null;
  multiplicadorPreco: number;
  ordemExibicao: number;
  ativo: boolean;
}

/**
 * Resumo simplificado para dropdowns e seletores
 */
export interface TecnicaResumo {
  id: string;
  codigo: string;
  nome: string;
  permiteCores: boolean;
  maxCores: number;
  ativo: boolean;
}

/**
 * Filtros para busca de técnicas
 */
export interface TecnicaFiltros {
  apenasAtivas?: boolean;
  permiteCores?: boolean;
  cobraPorArea?: boolean;
  cobraPorPontos?: boolean;
  busca?: string;
}
