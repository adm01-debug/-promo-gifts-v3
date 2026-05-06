/**
 * Constantes e helpers do Sistema de Gravação
 * Extraído de useGravacaoV2.ts
 */

import type { TabelaPrecoOficial, FaixaPrecoOficial } from './gravacao-types';

// ============================================
// CONSTANTES
// ============================================

export const TECHNIQUE_COLORS: Record<string, string> = {
  SERIGRAFIA: 'bg-info/10 text-info border-info/20',
  SERITEX: 'bg-info/10 text-info border-info/20',
  LASER: 'bg-destructive/10 text-destructive border-destructive/20',
  FIBER: 'bg-destructive/10 text-destructive border-destructive/20',
  LASER_CO2: 'bg-destructive/10 text-destructive border-destructive/20',
  CO2: 'bg-destructive/10 text-destructive border-destructive/20',
  LASER_UV: 'bg-destructive/10 text-destructive border-destructive/20',
  UV_DIGITAL: 'bg-primary/10 text-primary border-primary/20',
  DIGITAL: 'bg-primary/10 text-primary border-primary/20',
  TAMPOGRAFIA: 'bg-success/10 text-success border-success/20',
  TAMPO: 'bg-success/10 text-success border-success/20',
  BORDADO: 'bg-warning/10 text-warning border-warning/20',
  SUBLIMACAO: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
  SUBLI: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
  HOT_STAMPING: 'bg-orange/10 text-orange border-orange/20',
  STAMP: 'bg-orange/10 text-orange border-orange/20',
  TRANSFER_DIGITAL: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  DTF: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  ADESIVO: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
  DOMING: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
  ETIQUETA: 'bg-muted/50 text-muted-foreground border-border/20',
  HEAT_TRANSFER: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
  FILME_RECORTE: 'bg-teal-500/10 text-teal-500 border-teal-500/20',
  DECALQUE: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  EMBORRACHADO: 'bg-lime-500/10 text-lime-500 border-lime-500/20',
};

export const TECHNIQUE_ICONS: Record<string, string> = {
  SERIGRAFIA: '🖌️',
  SERITEX: '🖌️',
  LASER: '⚡',
  FIBER: '⚡',
  LASER_CO2: '⚡',
  CO2: '⚡',
  LASER_UV: '⚡',
  UV_DIGITAL: '🎨',
  DIGITAL: '🎨',
  TAMPOGRAFIA: '📘',
  TAMPO: '📘',
  BORDADO: '🧵',
  SUBLIMACAO: '🌈',
  SUBLI: '🌈',
  HOT_STAMPING: '✨',
  STAMP: '✨',
  TRANSFER_DIGITAL: '📋',
  DTF: '📋',
  ADESIVO: '🏷️',
  DOMING: '🏷️',
  ETIQUETA: '🏷️',
  HEAT_TRANSFER: '🔥',
  FILME_RECORTE: '✂️',
  DECALQUE: '🔥',
  EMBORRACHADO: '🔲',
};

export const AREA_SHAPES = {
  rectangle: 'Retângulo',
  circle: 'Círculo',
  oval: 'Oval',
  triangle: 'Triângulo',
  custom: 'Customizado',
} as const;

export const QUANTITY_TIERS_REFERENCE = [
  { min: 1, max: 9, label: '1-9 un' },
  { min: 10, max: 24, label: '10-24 un' },
  { min: 25, max: 49, label: '25-49 un' },
  { min: 50, max: 99, label: '50-99 un' },
  { min: 100, max: 249, label: '100-249 un' },
  { min: 250, max: 499, label: '250-499 un' },
  { min: 500, max: 999, label: '500-999 un' },
  { min: 1000, max: null, label: '1000+ un' },
];

// ============================================
// HELPERS
// ============================================

function matchByPrefix(codigo: string, map: Record<string, string>): string | undefined {
  const prefix = codigo.split('-')[0]?.split('_')[0]?.toUpperCase();
  return prefix ? map[prefix] : undefined;
}

export function getTechniqueColor(codigo: string): string {
  return TECHNIQUE_COLORS[codigo] || matchByPrefix(codigo, TECHNIQUE_COLORS) || 'bg-muted/50 text-muted-foreground border-border/20';
}

export function getTechniqueIcon(codigo: string): string {
  return TECHNIQUE_ICONS[codigo] || matchByPrefix(codigo, TECHNIQUE_ICONS) || '🔧';
}

export function formatPrice(value: number | null | undefined): string {
  if (value == null) return '-';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

// ============================================
// CALCULATORS
// ============================================

export function calculateTotalWithColorDiscount(
  basePrice: number, numCores: number, tabela: TabelaPrecoOficial
): number {
  if (!tabela.cobra_por_cor || numCores <= 1) return basePrice;
  let discount = 0;
  if (numCores === 2 && tabela.desconto_segunda_cor) discount = tabela.desconto_segunda_cor;
  else if (numCores === 3 && tabela.desconto_terceira_cor) discount = tabela.desconto_terceira_cor;
  else if (numCores >= 4 && tabela.desconto_quarta_cor_mais) discount = tabela.desconto_quarta_cor_mais;
  return basePrice * (1 - discount) * numCores;
}

export function calculateSetupCost(numCores: number, tabela: TabelaPrecoOficial): number {
  if (!tabela.custo_setup) return 0;
  return tabela.custo_setup_por_cor ? tabela.custo_setup * numCores : tabela.custo_setup;
}

export function findPriceTier(quantidade: number, faixas: FaixaPrecoOficial[]): FaixaPrecoOficial | null {
  for (const faixa of faixas) {
    if (quantidade >= faixa.quantidade_minima && (faixa.quantidade_maxima === null || quantidade <= faixa.quantidade_maxima)) {
      return faixa;
    }
  }
  return faixas.length > 0 ? faixas[faixas.length - 1] : null;
}

export function calculateCustomizationTotal(
  quantidade: number, numCores: number, tabela: TabelaPrecoOficial,
  faixas: FaixaPrecoOficial[], markupPercent: number = 115
) {
  const faixa = findPriceTier(quantidade, faixas);
  const markupMultiplier = 1 + (markupPercent / 100);

  if (!faixa) {
    return {
      faixa: null, custoUnitarioBase: 0, custoUnitarioTotal: 0, custoSetup: 0,
      custoManuseio: 0, custoTotalPecas: 0, precoUnitario: 0, precoMinimoUnitario: 0,
      subtotalPecas: 0, faturamentoMinimoGravacao: tabela.faturamento_minimo || 0,
      minimumApplied: false, total: 0, margemPercent: 0, prazoDias: null as number | null,
    };
  }

  const custoUnitarioBase = faixa.preco_unitario;
  const custoUnitarioTotal = calculateTotalWithColorDiscount(custoUnitarioBase, numCores, tabela);
  const custoSetup = calculateSetupCost(numCores, tabela);
  const custoManuseio = tabela.custo_manuseio_por_peca
    ? (tabela.custo_manuseio || 0) * quantidade
    : (tabela.custo_manuseio || 0);
  const custoTotalPecas = custoUnitarioTotal * quantidade;

  let precoUnitario = custoUnitarioTotal * markupMultiplier;
  const precoMinimoUnitario = 1.00;
  if (precoUnitario < precoMinimoUnitario) precoUnitario = precoMinimoUnitario;

  const subtotalPecas = precoUnitario * quantidade;
  const faturamentoMinimoGravacao = custoSetup * markupMultiplier;

  const minimumApplied = subtotalPecas < faturamentoMinimoGravacao;
  const total = minimumApplied ? faturamentoMinimoGravacao : subtotalPecas;

  const custoTotal = custoTotalPecas + custoManuseio;
  const margemPercent = custoTotal > 0 ? ((total - custoTotal) / custoTotal) * 100 : 0;

  return {
    faixa, custoUnitarioBase, custoUnitarioTotal, custoSetup, custoManuseio,
    custoTotalPecas, precoUnitario, precoMinimoUnitario, subtotalPecas,
    faturamentoMinimoGravacao, minimumApplied, total, margemPercent,
    prazoDias: faixa.prazo_dias,
  };
}
