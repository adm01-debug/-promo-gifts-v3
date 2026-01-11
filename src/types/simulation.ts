// src/types/simulation.ts
// Tipos centralizados para o Simulador de Personalização

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
}

export interface Client {
  id: string;
  name: string;
  ramo: string | null;
  nicho: string | null;
}

export interface Technique {
  id: string;
  code: string;
  name: string;
  description: string | null;
  unit_cost: number;
  setup_cost: number;
  estimated_days: number;
  min_quantity: number;
}

export interface TechniqueSettings {
  colors: number;
  width: number;
  height: number;
  positions: number;
}

export interface SimulationOption {
  id: string;
  techniqueId: string;
  techniqueName: string;
  techniqueCode: string;
  colors: number;
  width: number;
  height: number;
  positions: number;
  unitCost: number;
  setupCost: number;
  totalPersonalizationCost: number;
  costPerUnit: number;
  estimatedDays: number;
  productUnitPrice: number;
  totalProductCost: number;
  grandTotal: number;
  grandTotalPerUnit: number;
}

export interface SavedSimulation {
  id: string;
  product_id: string | null;
  product_name: string;
  product_sku: string | null;
  quantity: number;
  product_unit_price: number;
  simulation_data: SimulationOption[];
  notes: string | null;
  created_at: string;
  client_id: string | null;
  bitrix_clients?: {
    id: string;
    name: string;
    ramo: string | null;
  } | null;
}

// Wizard step types
export type SimulatorStep = 'product' | 'techniques' | 'results';

export interface SimulatorState {
  currentStep: SimulatorStep;
  selectedProductId: string | null;
  quantity: number;
  customProductPrice: string;
  selectedTechniques: string[];
  techniqueSettings: Record<string, TechniqueSettings>;
  simulationOptions: SimulationOption[];
}
