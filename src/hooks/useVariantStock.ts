import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
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
  min_quantity?: number;
  
  stock_quantity?: number;
  updated_at?: string;
}

interface ExternalVariantStock {
  id: string;
  product_id: string;
  sku?: string;
  name?: string;
  color_id?: string;
  color_name?: string;
  color_hex?: string;
  color_code?: string;
  size_id?: string;
  size_code?: string;
  stock_quantity: number;
  is_active?: boolean;
  updated_at?: string;
}

interface ExternalSupplierSource {
  id: string;
  variant_id: string;
  supplier_id?: string;
  supplier_sku?: string;
  quantity: number;
  reserved_quantity?: number;
  next_quantity_1?: number | null;
  next_date_1?: string | null;
  next_quantity_2?: number | null;
  next_date_2?: string | null;
  next_quantity_3?: number | null;
  next_date_3?: string | null;
  is_active?: boolean;
  updated_at?: string;
}

function toNumber(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

// ============================================
// HELPER: Busca paginada direta via edge function
// ============================================

async function fetchPaginatedFromBridge<T extends { id: string }>(
  table: string,
  select: string,
  pageSize = 1000,
  maxRecords = 100000,
  filters?: Record<string, unknown>
): Promise<T[]> {
  const all: T[] = [];
  let offset = 0;
  let lastFirstId: string | undefined;

  while (all.length < maxRecords) {
    const { data, error } = await supabase.functions.invoke('external-db-bridge', {
      body: { table, operation: 'select', select, limit: pageSize, offset, filters },
    });

    if (error) {
      console.error(`[Stock] Erro ao buscar ${table}:`, error);
      break;
    }

    const records = (data?.data?.records ?? []) as T[];
    const count = data?.data?.count as number | null;

    if (records.length === 0) break;

    // Trava anti-loop: primeiro ID repetido = offset ignorado
    if (records[0]?.id === lastFirstId) {
      logger.warn(`[Stock] Paginação ignorando offset em ${table}; parando.`);
      break;
    }
    lastFirstId = records[0]?.id;

    all.push(...records);
    offset += records.length;

    if (count !== null && offset >= count) break;
    if (records.length < pageSize) break;
  }

  return all;
}

// ============================================
// HOOK PRINCIPAL: useVariantStock
// ============================================

export function useVariantStock() {
  const [filters, setFilters] = useState<StockFilters>(defaultStockFilters);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState({ step: '', current: 0, total: 0 });
  const [productStocks, setProductStocks] = useState<ProductStockSummary[]>([]);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [futureStock, setFutureStock] = useState<FutureStockEntry[]>([]);

  // ============================================
  // BUSCAR DADOS DE ESTOQUE
  // ============================================

  const fetchStockData = useCallback(async () => {
    setIsLoading(true);
    setLoadingProgress({ step: 'Carregando produtos...', current: 0, total: 3 });
    
    try {
      // 1) Produtos - sem limite fixo, busca todos
      const allProducts = await fetchPaginatedFromBridge<ExternalProductWithVariants>(
        'products',
        'id,name,sku,min_quantity,stock_quantity,updated_at',
        1000,
        100000,
        { active: true }
      );
      logger.log(`[Stock] Carregados ${allProducts.length} produtos`);
      setLoadingProgress({ step: 'Carregando variantes...', current: 1, total: 3 });

      // 2) Variantes - busca todas as ativas
      const allVariants = await fetchPaginatedFromBridge<ExternalVariantStock>(
        'product_variants',
        'id,product_id,sku,name,color_id,color_name,color_hex,color_code,stock_quantity,is_active,updated_at',
        1000,
        100000,
        { is_active: true }
      );
      logger.log(`[Stock] Carregadas ${allVariants.length} variantes`);
      setLoadingProgress({ step: 'Carregando previsões de estoque...', current: 2, total: 3 });

      // 3) Supplier Sources - estoque futuro
      const allSupplierSources = await fetchPaginatedFromBridge<ExternalSupplierSource>(
        'variant_supplier_sources',
        'id,variant_id,supplier_id,supplier_sku,quantity,next_quantity_1,next_date_1,next_quantity_2,next_date_2,next_quantity_3,next_date_3,is_active,updated_at',
        1000,
        100000,
        { is_active: true }
      );
      logger.log(`[Stock] Carregados ${allSupplierSources.length} supplier sources`);
      setLoadingProgress({ step: 'Processando dados...', current: 3, total: 3 });
      
      // Agrupar variantes por product_id
      const variantsByProduct = new Map<string, ExternalVariantStock[]>();
      allVariants.forEach(v => {
        if (!v.product_id) return;
        const existing = variantsByProduct.get(v.product_id) || [];
        existing.push(v);
        variantsByProduct.set(v.product_id, existing);
      });

      // Agrupar supplier sources por variant_id
      const sourcesByVariant = new Map<string, ExternalSupplierSource>();
      allSupplierSources.forEach(s => {
        if (!s.variant_id) return;
        // Se já existe, pegar o mais recente
        const existing = sourcesByVariant.get(s.variant_id);
        if (!existing || (s.updated_at && existing.updated_at && s.updated_at > existing.updated_at)) {
          sourcesByVariant.set(s.variant_id, s);
        }
      });

      // Gerar entradas de estoque futuro
      const futureEntries: FutureStockEntry[] = [];
      
      if (allProducts.length > 0) {
        const summaries: ProductStockSummary[] = allProducts.map(product => {
          const productVariants = variantsByProduct.get(product.id) || [];
          const variants: VariantStock[] = [];
          
          if (productVariants.length > 0) {
            // Usar variantes reais da tabela product_variants
            productVariants.forEach(pv => {
              const supplierSource = sourcesByVariant.get(pv.id);
              
              // Estoque: priorizar supplier_source.quantity se disponível
              const currentStock = supplierSource 
                ? toNumber(supplierSource.quantity, toNumber(pv.stock_quantity, 0))
                : toNumber(pv.stock_quantity, 0);
              
              const minStock = product.min_quantity || 10;
              const reservedStock = supplierSource ? toNumber(supplierSource.reserved_quantity, 0) : 0;
              
              // Calcular estoque em trânsito (soma das previsões futuras)
              let inTransitStock = 0;
              if (supplierSource) {
                if (supplierSource.next_quantity_1) inTransitStock += supplierSource.next_quantity_1;
                if (supplierSource.next_quantity_2) inTransitStock += supplierSource.next_quantity_2;
                if (supplierSource.next_quantity_3) inTransitStock += supplierSource.next_quantity_3;
                
                // Criar entradas de estoque futuro
                if (supplierSource.next_quantity_1 && supplierSource.next_date_1) {
                  futureEntries.push({
                    id: `${supplierSource.id}-1`,
                    productId: product.id,
                    variantId: pv.id,
                    colorName: pv.color_name || undefined,
                    expectedQuantity: supplierSource.next_quantity_1,
                    expectedDate: supplierSource.next_date_1,
                    source: 'purchase_order',
                    status: 'confirmed',
                    createdAt: supplierSource.updated_at || new Date().toISOString(),
                    updatedAt: supplierSource.updated_at || new Date().toISOString(),
                  });
                }
                if (supplierSource.next_quantity_2 && supplierSource.next_date_2) {
                  futureEntries.push({
                    id: `${supplierSource.id}-2`,
                    productId: product.id,
                    variantId: pv.id,
                    colorName: pv.color_name || undefined,
                    expectedQuantity: supplierSource.next_quantity_2,
                    expectedDate: supplierSource.next_date_2,
                    source: 'purchase_order',
                    status: 'pending',
                    createdAt: supplierSource.updated_at || new Date().toISOString(),
                    updatedAt: supplierSource.updated_at || new Date().toISOString(),
                  });
                }
                if (supplierSource.next_quantity_3 && supplierSource.next_date_3) {
                  futureEntries.push({
                    id: `${supplierSource.id}-3`,
                    productId: product.id,
                    variantId: pv.id,
                    colorName: pv.color_name || undefined,
                    expectedQuantity: supplierSource.next_quantity_3,
                    expectedDate: supplierSource.next_date_3,
                    source: 'purchase_order',
                    status: 'pending',
                    createdAt: supplierSource.updated_at || new Date().toISOString(),
                    updatedAt: supplierSource.updated_at || new Date().toISOString(),
                  });
                }
              }
              
              const availableStock = calculateAvailableStock(currentStock, reservedStock);
              const status = calculateStockStatus(currentStock, minStock, undefined, inTransitStock);
              
              variants.push({
                id: pv.id,
                productId: product.id,
                variantId: pv.id,
                variantSku: pv.sku || `${product.sku}-${pv.color_code || 'VAR'}`,
                colorId: pv.color_id,
                colorName: pv.color_name || 'Padrão',
                colorHex: pv.color_hex,
                currentStock,
                minStock,
                reservedStock,
                inTransitStock,
                availableStock,
                status,
                daysUntilStockout: calculateDaysUntilStockout(availableStock),
                futureStock: inTransitStock > 0 ? inTransitStock : undefined,
                futureStockDate: supplierSource?.next_date_1 || undefined,
                updatedAt: pv.updated_at || product.updated_at || new Date().toISOString(),
              });
            });

            // Fallback: quando o estoque real está no produto (products.stock_quantity)
            // mas as variações vêm zeradas (situação atual do banco externo).
            const productLevelStock = toNumber(product.stock_quantity, 0);
            const sumVariantStock = variants.reduce((sum, v) => sum + toNumber(v.currentStock, 0), 0);

            if (sumVariantStock === 0 && productLevelStock > 0) {
              const minStock = product.min_stock || product.min_quantity || 10;

              if (variants.length === 1) {
                // Se só existe uma variação, atribuímos o estoque do produto a ela.
                variants[0] = {
                  ...variants[0],
                  currentStock: productLevelStock,
                  availableStock: calculateAvailableStock(productLevelStock, variants[0].reservedStock),
                  status: calculateStockStatus(productLevelStock, minStock),
                  daysUntilStockout: calculateDaysUntilStockout(productLevelStock),
                };
              } else {
                // Se há múltiplas variações (cores), mantemos o detalhe (zerado)
                // e adicionamos uma linha de "Total do Produto" para refletir o estoque agregado.
                const reservedStock = 0;
                const inTransitStock = 0;
                const availableStock = calculateAvailableStock(productLevelStock, reservedStock);
                const status = calculateStockStatus(productLevelStock, minStock);

                variants.push({
                  id: `${product.id}::product_total`,
                  productId: product.id,
                  variantId: `${product.id}::product_total`,
                  variantSku: product.sku || 'PROD',
                  colorName: 'Total do Produto',
                  currentStock: productLevelStock,
                  minStock,
                  reservedStock,
                  inTransitStock,
                  availableStock,
                  status,
                  daysUntilStockout: calculateDaysUntilStockout(availableStock),
                  updatedAt: product.updated_at || new Date().toISOString(),
                });
              }
            }
          } else {
            // Produto sem variantes na tabela product_variants
            // Criar variação padrão com estoque 0
            const currentStock = toNumber(product.stock_quantity, 0);
            const minStock = product.min_stock || product.min_quantity || 10;
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
            ...aggregated,
          };
        });
        
        setProductStocks(summaries);
        setFutureStock(futureEntries);
        
        // Gerar alertas
        const newAlerts = generateStockAlerts(summaries);
        setAlerts(newAlerts);
        
        logger.log(`[Stock] Processados ${summaries.length} produtos com ${futureEntries.length} previsões de estoque futuro`);
      }
    } catch (error) {
      console.error('Erro ao buscar dados de estoque:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
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
      
      totalStockValue: allVariants.reduce((sum, v) => sum + ((v.stockQuantity || 0) * (v.price || 0)), 0),
      totalAvailableValue: allVariants.filter(v => v.status === 'in_stock').reduce((sum, v) => sum + ((v.stockQuantity || 0) * (v.price || 0)), 0),
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
      items = items.filter(p => {
        // Match no status geral do produto
        if (p.overallStatus === filters.status) return true;
        
        // Para 'incoming', também incluir produtos que tenham variantes com estoque em trânsito
        if (filters.status === 'incoming') {
          return p.totalInTransitStock > 0 || p.variants.some(v => v.status === 'incoming' || v.inTransitStock > 0);
        }
        
        // Para outros status, também verificar se há variantes com esse status
        return p.variants.some(v => v.status === filters.status);
      });
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
  
  const dismissAllAlerts = useCallback(() => {
    setAlerts([]);
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
    loadingProgress,
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
    dismissAllAlerts,
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
