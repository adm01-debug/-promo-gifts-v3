import { useState, useEffect, useMemo, useCallback } from 'react';
import { useExternalDatabase } from './useExternalDatabase';
import {
  VariantStock,
  ProductStockSummary,
  StockFilters,
  StockDashboardSummary,
  StockAlert,
  FutureStockEntry,
  defaultStockFilters,
  calculateStockStatus,
  calculateDaysUntilStockout,
  calculateAvailableStock,
  aggregateVariantsToProduct,
} from '@/types/stock';

// ============================================
// TIPOS PARA API EXTERNA
// ============================================

interface ExternalProductWithVariants {
  id: string;
  name: string;
  sku?: string;
  stock?: number;
  min_quantity?: number;
  category_id?: string;
  category_name?: string;
  supplier_id?: string;
  supplier_name?: string;
  lead_time_days?: number;
  updated_at?: string;
  colors?: Array<{
    name: string;
    hex?: string;
    code?: string;
    stock?: number;
  }>;
  variations?: Array<{
    id?: string;
    name: string;
    sku?: string;
    stock?: number;
    color?: string;
    size?: string;
    attributes?: Record<string, string>;
  }>;
}

interface ExternalVariantStock {
  id: string;
  product_id: string;
  variant_id?: string;
  sku?: string;
  color_id?: string;
  color_name?: string;
  color_hex?: string;
  size?: string;
  stock_quantity: number;
  min_stock?: number;
  max_stock?: number;
  reserved_quantity?: number;
  in_transit_quantity?: number;
  avg_daily_sales?: number;
  last_sale_at?: string;
  last_restock_at?: string;
  updated_at?: string;
}

interface ExternalFutureStock {
  id: string;
  product_id: string;
  variant_id?: string;
  color_name?: string;
  expected_quantity: number;
  expected_date: string;
  order_date?: string;
  source: string;
  source_reference?: string;
  status: string;
  supplier_id?: string;
  supplier_name?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

// ============================================
// HOOK PRINCIPAL: useVariantStock
// ============================================

export function useVariantStock() {
  const [filters, setFilters] = useState<StockFilters>(defaultStockFilters);
  const [isLoading, setIsLoading] = useState(true);
  const [productStocks, setProductStocks] = useState<ProductStockSummary[]>([]);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [futureStock, setFutureStock] = useState<FutureStockEntry[]>([]);
  
  // Hooks para APIs externas
  const productsDB = useExternalDatabase<ExternalProductWithVariants>('products');
  const variantStocksDB = useExternalDatabase<ExternalVariantStock>('variant_stocks');
  // const futureStockDB = useExternalDatabase<ExternalFutureStock>('stock_forecasts'); // Se existir
  
  // ============================================
  // BUSCAR DADOS DE ESTOQUE
  // ============================================
  
  const fetchStockData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Buscar produtos com variações embutidas
      const productsResult = await productsDB.fetchAll({
        select: 'id,name,sku,stock,min_quantity,category_name,supplier_name,lead_time_days,updated_at,colors,variations',
        limit: 500,
      });
      
      // 2. Buscar estoque detalhado por variação (se existir dados)
      let variantStockMap = new Map<string, ExternalVariantStock[]>();
      try {
        const variantResult = await variantStocksDB.fetchAll({
          limit: 1000,
        });
        if (variantResult?.records) {
          variantResult.records.forEach(vs => {
            const key = vs.product_id;
            if (!variantStockMap.has(key)) {
              variantStockMap.set(key, []);
            }
            variantStockMap.get(key)!.push(vs);
          });
        }
      } catch (e) {
        console.log('Tabela variant_stocks não disponível ou vazia');
      }
      
      if (productsResult?.records) {
        const summaries: ProductStockSummary[] = productsResult.records.map(product => {
          // Converter para VariantStock
          const variants: VariantStock[] = [];
          
          // Primeiro: tentar usar dados da tabela variant_stocks
          const externalVariants = variantStockMap.get(product.id) || [];
          
          if (externalVariants.length > 0) {
            // Usar dados da tabela variant_stocks
            externalVariants.forEach(ev => {
              const currentStock = ev.stock_quantity || 0;
              const minStock = ev.min_stock || 10;
              const maxStock = ev.max_stock;
              const reservedStock = ev.reserved_quantity || 0;
              const inTransitStock = ev.in_transit_quantity || 0;
              const availableStock = calculateAvailableStock(currentStock, reservedStock);
              const status = calculateStockStatus(currentStock, minStock, maxStock, inTransitStock);
              
              variants.push({
                id: ev.id,
                productId: product.id,
                variantId: ev.variant_id || ev.id,
                variantSku: ev.sku || `${product.sku}-${ev.color_name || 'VAR'}`,
                colorId: ev.color_id,
                colorName: ev.color_name,
                colorHex: ev.color_hex,
                sizeName: ev.size,
                currentStock,
                minStock,
                maxStock,
                reservedStock,
                inTransitStock,
                availableStock,
                status,
                daysUntilStockout: calculateDaysUntilStockout(availableStock, ev.avg_daily_sales),
                avgDailySales: ev.avg_daily_sales,
                lastSaleDate: ev.last_sale_at,
                lastRestockDate: ev.last_restock_at,
                updatedAt: ev.updated_at || new Date().toISOString(),
              });
            });
          } else if (product.colors && Array.isArray(product.colors) && product.colors.length > 0) {
            // Fallback: usar cores do produto (JSONB)
            product.colors.forEach((color, idx) => {
              const currentStock = color.stock ?? Math.floor((product.stock || 0) / product.colors!.length);
              const minStock = Math.max(1, Math.floor((product.min_quantity || 10) / product.colors!.length));
              const reservedStock = 0;
              const inTransitStock = 0;
              const availableStock = calculateAvailableStock(currentStock, reservedStock);
              const status = calculateStockStatus(currentStock, minStock);
              
              variants.push({
                id: `${product.id}-color-${idx}`,
                productId: product.id,
                variantId: `${product.id}-color-${idx}`,
                variantSku: `${product.sku || 'PROD'}-${color.code || color.name?.substring(0, 3).toUpperCase() || idx}`,
                colorName: color.name,
                colorHex: color.hex,
                currentStock,
                minStock,
                reservedStock,
                inTransitStock,
                availableStock,
                status,
                daysUntilStockout: calculateDaysUntilStockout(availableStock),
                updatedAt: product.updated_at || new Date().toISOString(),
              });
            });
          } else if (product.variations && Array.isArray(product.variations) && product.variations.length > 0) {
            // Fallback: usar variações do produto (JSONB)
            product.variations.forEach((variation, idx) => {
              const currentStock = variation.stock ?? Math.floor((product.stock || 0) / product.variations!.length);
              const minStock = Math.max(1, Math.floor((product.min_quantity || 10) / product.variations!.length));
              const reservedStock = 0;
              const inTransitStock = 0;
              const availableStock = calculateAvailableStock(currentStock, reservedStock);
              const status = calculateStockStatus(currentStock, minStock);
              
              variants.push({
                id: variation.id || `${product.id}-var-${idx}`,
                productId: product.id,
                variantId: variation.id || `${product.id}-var-${idx}`,
                variantSku: variation.sku || `${product.sku || 'PROD'}-${idx}`,
                colorName: variation.color,
                sizeName: variation.size,
                attributeValues: variation.attributes,
                currentStock,
                minStock,
                reservedStock,
                inTransitStock,
                availableStock,
                status,
                daysUntilStockout: calculateDaysUntilStockout(availableStock),
                updatedAt: product.updated_at || new Date().toISOString(),
              });
            });
          } else {
            // Produto sem variações - criar uma única variação "padrão"
            const currentStock = product.stock || 0;
            const minStock = product.min_quantity || 10;
            const reservedStock = 0;
            const inTransitStock = 0;
            const availableStock = calculateAvailableStock(currentStock, reservedStock);
            const status = calculateStockStatus(currentStock, minStock);
            
            variants.push({
              id: product.id,
              productId: product.id,
              variantId: product.id,
              variantSku: product.sku || 'PROD',
              colorName: 'Padrão',
              currentStock,
              minStock,
              reservedStock,
              inTransitStock,
              availableStock,
              status,
              daysUntilStockout: calculateDaysUntilStockout(availableStock),
              updatedAt: product.updated_at || new Date().toISOString(),
            });
          }
          
          // Agregar variantes ao resumo do produto
          const aggregated = aggregateVariantsToProduct(variants);
          
          return {
            productId: product.id,
            productName: product.name,
            productSku: product.sku || '',
            categoryName: product.category_name,
            supplierName: product.supplier_name,
            ...aggregated,
          };
        });
        
        setProductStocks(summaries);
        
        // Gerar alertas
        const newAlerts = generateStockAlerts(summaries);
        setAlerts(newAlerts);
      }
    } catch (error) {
      console.error('Erro ao buscar dados de estoque:', error);
    } finally {
      setIsLoading(false);
    }
  }, [productsDB, variantStocksDB]);
  
  // Carregar dados iniciais
  useEffect(() => {
    fetchStockData();
  }, []);
  
  // ============================================
  // CÁLCULOS E FILTROS
  // ============================================
  
  // Resumo geral
  const summary = useMemo((): StockDashboardSummary => {
    const allVariants = productStocks.flatMap(p => p.variants);
    
    return {
      totalProducts: productStocks.length,
      totalVariants: allVariants.length,
      totalColors: new Set(allVariants.map(v => v.colorName).filter(Boolean)).size,
      
      productsInStock: productStocks.filter(p => p.overallStatus === 'in_stock').length,
      productsLowStock: productStocks.filter(p => p.overallStatus === 'low_stock').length,
      productsCritical: productStocks.filter(p => p.overallStatus === 'critical').length,
      productsOutOfStock: productStocks.filter(p => p.overallStatus === 'out_of_stock').length,
      
      variantsInStock: allVariants.filter(v => v.status === 'in_stock').length,
      variantsLowStock: allVariants.filter(v => v.status === 'low_stock').length,
      variantsCritical: allVariants.filter(v => v.status === 'critical').length,
      variantsOutOfStock: allVariants.filter(v => v.status === 'out_of_stock').length,
      
      totalStockValue: 0, // TODO: calcular com preço
      totalAvailableValue: 0,
      averageDaysOfStock: allVariants.reduce((sum, v) => sum + (v.daysUntilStockout || 0), 0) / Math.max(1, allVariants.length),
      stockTurnoverRate: 0,
      
      totalAlerts: alerts.length,
      criticalAlerts: alerts.filter(a => a.severity === 'error').length,
      
      incomingStockValue: 0,
    };
  }, [productStocks, alerts]);
  
  // Filtrar produtos
  const filteredProducts = useMemo(() => {
    let items = [...productStocks];
    
    // Filtro por status
    if (filters.status !== 'all') {
      items = items.filter(p => p.overallStatus === filters.status);
    }
    
    // Filtro por busca
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      items = items.filter(p => 
        p.productName.toLowerCase().includes(searchLower) ||
        p.productSku.toLowerCase().includes(searchLower) ||
        p.variants.some(v => 
          v.colorName?.toLowerCase().includes(searchLower) ||
          v.variantSku.toLowerCase().includes(searchLower)
        )
      );
    }
    
    // Filtro por categoria
    if (filters.categoryId) {
      items = items.filter(p => p.categoryName === filters.categoryId);
    }
    
    // Filtro por cor
    if (filters.colorName) {
      items = items.filter(p => 
        p.variants.some(v => v.colorName === filters.colorName)
      );
    }
    
    // Apenas com alertas
    if (filters.showOnlyWithAlerts) {
      const productIdsWithAlerts = new Set(alerts.map(a => a.productId));
      items = items.filter(p => productIdsWithAlerts.has(p.productId));
    }
    
    // Ordenação
    const direction = filters.sortDirection === 'asc' ? 1 : -1;
    switch (filters.sortBy) {
      case 'name':
        items.sort((a, b) => a.productName.localeCompare(b.productName) * direction);
        break;
      case 'sku':
        items.sort((a, b) => a.productSku.localeCompare(b.productSku) * direction);
        break;
      case 'stock_quantity':
        items.sort((a, b) => (a.totalCurrentStock - b.totalCurrentStock) * direction);
        break;
      case 'available_stock':
        items.sort((a, b) => (a.totalAvailableStock - b.totalAvailableStock) * direction);
        break;
      case 'days_remaining':
        items.sort((a, b) => {
          const aDays = a.daysUntilFullStockout ?? 999;
          const bDays = b.daysUntilFullStockout ?? 999;
          return (aDays - bDays) * direction;
        });
        break;
    }
    
    return items;
  }, [productStocks, filters, alerts]);
  
  // Todas as cores disponíveis
  const allColors = useMemo(() => {
    const colorSet = new Set<string>();
    productStocks.forEach(p => {
      p.variants.forEach(v => {
        if (v.colorName) colorSet.add(v.colorName);
      });
    });
    return Array.from(colorSet).sort();
  }, [productStocks]);
  
  // Alertas críticos
  const criticalAlerts = useMemo(() => {
    return alerts.filter(a => a.severity === 'error');
  }, [alerts]);
  
  // ============================================
  // AÇÕES
  // ============================================
  
  const updateFilter = useCallback(<K extends keyof StockFilters>(
    key: K,
    value: StockFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);
  
  const resetFilters = useCallback(() => {
    setFilters(defaultStockFilters);
  }, []);
  
  const dismissAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  }, []);
  
  // Buscar estoque de um produto específico
  const getProductStock = useCallback((productId: string): ProductStockSummary | undefined => {
    return productStocks.find(p => p.productId === productId);
  }, [productStocks]);
  
  // Buscar estoque de uma cor específica
  const getColorStock = useCallback((productId: string, colorName: string): VariantStock[] => {
    const product = productStocks.find(p => p.productId === productId);
    if (!product) return [];
    return product.variants.filter(v => v.colorName === colorName);
  }, [productStocks]);
  
  return {
    // Estado
    isLoading,
    productStocks: filteredProducts,
    allProductStocks: productStocks,
    summary,
    alerts,
    criticalAlerts,
    futureStock,
    filters,
    allColors,
    
    // Ações
    fetchStockData,
    updateFilter,
    resetFilters,
    dismissAlert,
    setFilters,
    
    // Getters
    getProductStock,
    getColorStock,
  };
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function generateStockAlerts(products: ProductStockSummary[]): StockAlert[] {
  const alerts: StockAlert[] = [];
  
  products.forEach(product => {
    product.variants.forEach(variant => {
      const baseAlert = {
        productId: product.productId,
        productName: product.productName,
        productSku: product.productSku,
        variantId: variant.variantId,
        colorName: variant.colorName,
        currentStock: variant.currentStock,
        threshold: variant.minStock,
        createdAt: new Date().toISOString(),
      };
      
      if (variant.status === 'out_of_stock') {
        alerts.push({
          id: `alert-${variant.id}-out`,
          type: 'out_of_stock',
          severity: 'error',
          title: 'Sem Estoque',
          message: `${variant.colorName || 'Variação'} está sem estoque!`,
          suggestedAction: 'Fazer pedido ao fornecedor',
          ...baseAlert,
        });
      } else if (variant.status === 'critical') {
        alerts.push({
          id: `alert-${variant.id}-critical`,
          type: 'critical',
          severity: 'error',
          title: 'Estoque Crítico',
          message: `${variant.colorName || 'Variação'}: apenas ${variant.currentStock} unidades (mínimo: ${variant.minStock})`,
          suggestedAction: 'Reabastecer urgentemente',
          ...baseAlert,
        });
      } else if (variant.status === 'low_stock') {
        alerts.push({
          id: `alert-${variant.id}-low`,
          type: 'low_stock',
          severity: 'warning',
          title: 'Estoque Baixo',
          message: `${variant.colorName || 'Variação'}: ${variant.currentStock}/${variant.minStock} mínimo`,
          suggestedAction: 'Planejar reposição',
          ...baseAlert,
        });
      }
      
      // Alerta de previsão de esgotamento
      if (variant.daysUntilStockout !== undefined && variant.daysUntilStockout <= 7 && variant.status !== 'out_of_stock') {
        alerts.push({
          id: `alert-${variant.id}-predict`,
          type: 'stockout_predicted',
          severity: 'warning',
          title: 'Esgotamento Previsto',
          message: `${variant.colorName || 'Variação'} deve esgotar em ${variant.daysUntilStockout} dias`,
          suggestedAction: 'Antecipar pedido de reposição',
          ...baseAlert,
        });
      }
    });
  });
  
  // Ordenar por severidade
  return alerts.sort((a, b) => {
    const severityOrder = { error: 0, warning: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

// ============================================
// HOOK PARA ESTOQUE DE PRODUTO ESPECÍFICO
// ============================================

export function useProductVariantStock(productId: string) {
  const { productStocks, alerts, isLoading, fetchStockData } = useVariantStock();
  
  const productStock = useMemo(() => {
    return productStocks.find(p => p.productId === productId);
  }, [productStocks, productId]);
  
  const productAlerts = useMemo(() => {
    return alerts.filter(a => a.productId === productId);
  }, [alerts, productId]);
  
  return {
    isLoading,
    productStock,
    variants: productStock?.variants || [],
    colors: productStock?.availableColors || [],
    alerts: productAlerts,
    refresh: fetchStockData,
  };
}
