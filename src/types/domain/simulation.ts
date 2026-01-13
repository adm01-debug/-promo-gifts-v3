/**
 * Domain Types: Simulação de Personalização
 * 
 * Tipos de domínio para o simulador de preços e personalização.
 */

import type { PriceCalculationResult } from './personalization';

// ============================================
// PRODUTO (Domínio)
// ============================================

/**
 * Produto para simulação
 */
export interface SimulationProduct {
  id: string;
  name: string;
  sku: string;
  price: number;
  image_url?: string | null; // URL da imagem principal
  images?: string[];
  categoryName?: string | null;
  brand?: string | null;
  colors?: ProductColor[];
}

export interface ProductColor {
  code: string;
  name: string;
  hex?: string;
  stock?: number;
}

// ============================================
// CLIENTE (Domínio)
// ============================================

/**
 * Cliente para simulação
 */
export interface SimulationClient {
  id: string;
  name: string;
  ramo: string | null;
  nicho: string | null;
}

// ============================================
// CONFIGURAÇÃO DE TÉCNICA (Domínio)
// ============================================

/**
 * Configurações selecionadas para uma técnica
 */
export interface TechniqueSettings {
  colors: number;
  width: number;
  height: number;
  positions: number;
}

// ============================================
// OPÇÃO DE SIMULAÇÃO (Domínio)
// ============================================

/**
 * Resultado de uma opção de simulação
 */
export interface SimulationOption {
  id: string;
  
  // Identificação da técnica
  techniqueId: string;
  techniqueName: string;
  techniqueCode: string;
  
  // Configuração aplicada
  colors: number;
  width: number;
  height: number;
  positions: number;
  
  // Custos de personalização
  unitCost: number;
  setupCost: number;
  totalPersonalizationCost: number;
  costPerUnit: number;
  
  // Prazo
  estimatedDays: number;
  
  // Custos do produto
  productUnitPrice: number;
  totalProductCost: number;
  
  // Totais
  grandTotal: number;
  grandTotalPerUnit: number;
}

// ============================================
// SIMULAÇÃO SALVA (Domínio)
// ============================================

/**
 * Simulação salva no banco
 */
export interface SavedSimulation {
  id: string;
  productId: string | null;
  productName: string;
  productSku: string | null;
  quantity: number;
  productUnitPrice: number;
  options: SimulationOption[];
  notes: string | null;
  createdAt: Date;
  clientId: string | null;
  client?: {
    id: string;
    name: string;
    ramo: string | null;
  } | null;
}

// ============================================
// WIZARD DE SIMULAÇÃO (Domínio)
// ============================================

export type SimulatorStep = 'product' | 'techniques' | 'results';

/**
 * Estado do wizard de simulação
 */
export interface SimulatorState {
  currentStep: SimulatorStep;
  selectedProductId: string | null;
  quantity: number;
  customProductPrice: string;
  selectedTechniques: string[];
  techniqueSettings: Record<string, TechniqueSettings>;
  simulationOptions: SimulationOption[];
}

// ============================================
// CENÁRIOS (Domínio)
// ============================================

/**
 * Cenário para comparação
 */
export interface SimulationScenario {
  product: SimulationProduct;
  quantity: number;
  options: SimulationOption[];
  savedAt: Date;
}

// ============================================
// RESULTADO DE SIMULAÇÃO COMPLETA (Domínio)
// ============================================

/**
 * Resultado completo de simulação com cálculo de preço
 */
export interface SimulationResult {
  technique: {
    id: string;
    code: string;
    name: string;
    componentName: string;
    locationName: string;
    maxColors: number | null;
  };
  priceCalculation: PriceCalculationResult;
  productTotal: number;
  customizationTotal: number;
  grandTotal: number;
  unitTotal: number;
}
