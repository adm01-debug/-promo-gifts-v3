import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Interface completa da tabela customization_price_tables
export interface CustomizationPriceTable {
  id: string;
  organization_id?: string;
  table_code: string;
  table_code_option?: string;
  table_fullcode?: string;
  technique_id?: string;
  customization_type_name: string;
  max_area_width_cm?: number;
  max_area_height_cm?: number;
  max_colors?: number;
  price_by_color?: boolean;
  price_by_area?: boolean;
  price_by_stitches?: boolean;
  // Quantidades mínimas por faixa
  min_qty_1?: number;
  min_qty_2?: number;
  min_qty_3?: number;
  min_qty_4?: number;
  min_qty_5?: number;
  min_qty_6?: number;
  min_qty_7?: number;
  min_qty_8?: number;
  min_qty_9?: number;
  min_qty_10?: number;
  min_qty_11?: number;
  min_qty_12?: number;
  min_qty_13?: number;
  min_qty_14?: number;
  min_qty_15?: number;
  // Preços por faixa
  price_1?: number;
  price_2?: number;
  price_3?: number;
  price_4?: number;
  price_5?: number;
  price_6?: number;
  price_7?: number;
  price_8?: number;
  price_9?: number;
  price_10?: number;
  price_11?: number;
  price_12?: number;
  price_13?: number;
  price_14?: number;
  price_15?: number;
  // SLA (prazo em dias) por faixa
  sla_1?: number;
  sla_2?: number;
  sla_3?: number;
  sla_4?: number;
  sla_5?: number;
  sla_6?: number;
  sla_7?: number;
  sla_8?: number;
  sla_9?: number;
  sla_10?: number;
  sla_11?: number;
  sla_12?: number;
  sla_13?: number;
  sla_14?: number;
  sla_15?: number;
  setup_price?: number;
  handling_price?: number;
  supplier_id?: string;
  source?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

// Faixa de preço simplificada para uso no frontend
export interface PriceTier {
  tierIndex: number;
  minQuantity: number;
  maxQuantity: number | null;
  unitPrice: number;
  slaDays: number | null;
}

// Resultado do cálculo de preço
export interface PriceCalculation {
  technique: string;
  techniqueCode: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  setupPrice: number;
  handlingPrice: number;
  grandTotal: number;
  slaDays: number | null;
  maxColors: number;
  maxArea: { width: number; height: number };
  savings?: {
    comparedToMin: number;
    percentageOff: number;
  };
}

// Função para extrair faixas de preço de uma tabela
export function extractPriceTiers(table: CustomizationPriceTable): PriceTier[] {
  const tiers: PriceTier[] = [];
  
  for (let i = 1; i <= 15; i++) {
    const minQty = table[`min_qty_${i}` as keyof CustomizationPriceTable] as number | undefined;
    const price = table[`price_${i}` as keyof CustomizationPriceTable] as number | undefined;
    const sla = table[`sla_${i}` as keyof CustomizationPriceTable] as number | undefined;
    
    if (minQty !== undefined && minQty !== null && price !== undefined && price !== null) {
      // Determinar max quantity baseado no próximo tier
      const nextMinQty = table[`min_qty_${i + 1}` as keyof CustomizationPriceTable] as number | undefined;
      const maxQty = nextMinQty ? nextMinQty - 1 : null;
      
      tiers.push({
        tierIndex: i,
        minQuantity: minQty,
        maxQuantity: maxQty,
        unitPrice: price,
        slaDays: sla ?? null,
      });
    }
  }
  
  return tiers;
}

// Função para calcular preço baseado na quantidade
export function calculatePriceForQuantity(
  table: CustomizationPriceTable,
  quantity: number
): PriceCalculation | null {
  const tiers = extractPriceTiers(table);
  
  if (tiers.length === 0) return null;
  
  // Encontrar o tier correto para a quantidade
  let selectedTier = tiers[0];
  for (const tier of tiers) {
    if (quantity >= tier.minQuantity) {
      selectedTier = tier;
    }
  }
  
  const unitPrice = selectedTier.unitPrice;
  const totalPrice = unitPrice * quantity;
  const setupPrice = table.setup_price || 0;
  const handlingPrice = table.handling_price || 0;
  const grandTotal = totalPrice + setupPrice + handlingPrice;
  
  // Calcular economia comparado com o menor tier
  const minTierPrice = tiers[0].unitPrice;
  const savingsPerUnit = minTierPrice - unitPrice;
  const percentageOff = minTierPrice > 0 ? ((minTierPrice - unitPrice) / minTierPrice) * 100 : 0;
  
  return {
    technique: table.customization_type_name,
    techniqueCode: table.table_code,
    quantity,
    unitPrice,
    totalPrice,
    setupPrice,
    handlingPrice,
    grandTotal,
    slaDays: selectedTier.slaDays,
    maxColors: table.max_colors || 1,
    maxArea: {
      width: table.max_area_width_cm || 0,
      height: table.max_area_height_cm || 0,
    },
    savings: savingsPerUnit > 0 ? {
      comparedToMin: savingsPerUnit * quantity,
      percentageOff: Math.round(percentageOff),
    } : undefined,
  };
}

// Hook principal para buscar e calcular preços de personalização
export function useCustomizationPricing() {
  const [priceTables, setPriceTables] = useState<CustomizationPriceTable[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPriceTables = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('external-db-bridge', {
        body: {
          table: 'customization_price_tables',
          operation: 'select',
          select: '*',
          filters: { is_active: true },
          orderBy: { column: 'customization_type_name', ascending: true },
        },
      });

      if (invokeError) throw new Error(invokeError.message);
      if (!data.success) throw new Error(data.error || 'Erro ao buscar tabelas de preço');

      setPriceTables(data.data.records || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(message);
      console.error('Erro ao buscar tabelas de preço:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPriceTables();
  }, [fetchPriceTables]);

  // Calcular preço para uma quantidade específica em todas as técnicas
  const calculateAllPrices = useCallback((quantity: number): PriceCalculation[] => {
    return priceTables
      .map(table => calculatePriceForQuantity(table, quantity))
      .filter((calc): calc is PriceCalculation => calc !== null)
      .sort((a, b) => a.unitPrice - b.unitPrice);
  }, [priceTables]);

  // Calcular preço para uma técnica específica
  const calculatePrice = useCallback((techniqueCode: string, quantity: number): PriceCalculation | null => {
    const table = priceTables.find(t => t.table_code === techniqueCode);
    if (!table) return null;
    return calculatePriceForQuantity(table, quantity);
  }, [priceTables]);

  // Obter faixas de preço de uma técnica
  const getTiers = useCallback((techniqueCode: string): PriceTier[] => {
    const table = priceTables.find(t => t.table_code === techniqueCode);
    if (!table) return [];
    return extractPriceTiers(table);
  }, [priceTables]);

  // Lista de técnicas disponíveis
  const techniques = useMemo(() => {
    return priceTables.map(table => ({
      code: table.table_code,
      name: table.customization_type_name,
      maxColors: table.max_colors || 1,
      maxArea: {
        width: table.max_area_width_cm || 0,
        height: table.max_area_height_cm || 0,
      },
      priceByColor: table.price_by_color || false,
      priceByArea: table.price_by_area || false,
    }));
  }, [priceTables]);

  // Faixas de quantidade padrão para exibição
  const standardQuantities = useMemo(() => [
    50, 100, 250, 500, 1000, 2500, 5000, 10000
  ], []);

  return {
    priceTables,
    techniques,
    standardQuantities,
    isLoading,
    error,
    fetchPriceTables,
    calculateAllPrices,
    calculatePrice,
    getTiers,
  };
}

// Hook para simulador de preços de um produto específico
export function usePriceSimulator(productBasePrice: number = 0) {
  const { priceTables, isLoading, error, calculateAllPrices } = useCustomizationPricing();
  const [quantity, setQuantity] = useState(100);
  const [selectedTechniqueCode, setSelectedTechniqueCode] = useState<string | null>(null);

  const calculations = useMemo(() => {
    return calculateAllPrices(quantity);
  }, [calculateAllPrices, quantity]);

  const selectedCalculation = useMemo(() => {
    if (!selectedTechniqueCode) return calculations[0] || null;
    return calculations.find(c => c.techniqueCode === selectedTechniqueCode) || null;
  }, [calculations, selectedTechniqueCode]);

  const totalWithProduct = useMemo(() => {
    if (!selectedCalculation) return null;
    const productTotal = productBasePrice * quantity;
    return {
      productTotal,
      customizationTotal: selectedCalculation.grandTotal,
      grandTotal: productTotal + selectedCalculation.grandTotal,
      unitTotal: (productTotal + selectedCalculation.grandTotal) / quantity,
    };
  }, [selectedCalculation, productBasePrice, quantity]);

  return {
    quantity,
    setQuantity,
    selectedTechniqueCode,
    setSelectedTechniqueCode,
    calculations,
    selectedCalculation,
    totalWithProduct,
    isLoading,
    error,
  };
}
