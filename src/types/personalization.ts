// src/types/personalization.ts
// Técnicas de personalização

export interface PersonalizationTechnique {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  min_quantity: number | null;
  setup_cost: number | null;
  unit_cost: number | null;
  estimated_days: number | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface PersonalizationLocation {
  id: string;
  product_type: string;
  location_name: string;
  code: string | null;
  is_active: boolean | null;
  created_at: string;
}

export interface PersonalizationSize {
  id: string;
  technique_id: string | null;
  technique_code: string | null;
  size_label: string;
  width_cm: number | null;
  height_cm: number | null;
  area_cm2: number | null;
  price_modifier: number | null;
  is_active: boolean | null;
  created_at: string;
}

// Simulação de personalização
export interface PersonalizationSimulation {
  id: string;
  seller_id: string;
  client_id: string | null;
  product_id: string | null;
  product_name: string;
  product_sku: string | null;
  product_unit_price: number;
  quantity: number;
  simulation_data: SimulationData[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SimulationData {
  technique_id: string;
  technique_name: string;
  location: string;
  colors: number;
  size: string;
  setup_cost: number;
  unit_cost: number;
  total_cost: number;
}
