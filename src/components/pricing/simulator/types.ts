// Tipos compartilhados para o Simulador de Preços

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  images: string[];
  category_name: string | null;
  supplier_reference?: string | null;
  brand?: string | null;
}

export interface ProductTechnique {
  id: string;
  techniqueCode: string;
  techniqueName: string;
  componentName: string;
  locationName: string;
  locationCode: string;
  composedCode: string;
  maxWidth: number | null;
  maxHeight: number | null;
  maxArea: number | null;
  maxColors: number | null;
  isCurved: boolean;
  isPrimary: boolean;
}

export interface SimulationResult {
  technique: ProductTechnique;
  priceCalculation: unknown; // PriceCalculation from useCustomizationPricing
  productTotal: number;
  customizationTotal: number;
  grandTotal: number;
  unitTotal: number;
}

// Dados internos do TechniqueSelector
export interface ComponentData {
  name: string;
  code: string;
  locations: LocationData[];
}

export interface LocationData {
  name: string;
  code: string;
  techniques: TechniqueData[];
}

export interface TechniqueData {
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
}

export interface SizeOption {
  label: string;
  value: string;
  modifier: number;
}
