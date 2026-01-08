import { useState, useEffect, useMemo, useCallback } from 'react';
import { useExternalDatabase, ExternalProduct } from './useExternalDatabase';

// ============================================
// TIPOS PARA DASHBOARD DE ESTOQUE
// ============================================

export interface StockItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  variantId?: string;
  variantName?: string;
  colorName?: string;
  colorHex?: string;
  currentStock: number;
  minStock: number;
  maxStock?: number;
  reservedStock: number;
  availableStock: number;
  futureStock?: number;
  futureStockDate?: string;
  status: StockStatus;
  daysUntilStockout?: number;
  lastUpdated: string;
  supplier?: string;
  leadTimeDays?: number;
}

export type StockStatus = 'in_stock' | 'low_stock' | 'critical' | 'out_of_stock' | 'overstocked';

export interface StockSummary {
  totalProducts: number;
  totalVariants: number;
  inStock: number;
  lowStock: number;
  critical: number;
  outOfStock: number;
  overstocked: number;
  totalValue: number;
  averageStockDays: number;
}

export interface StockAlert {
  id: string;
  type: 'low_stock' | 'critical' | 'out_of_stock' | 'restock_needed' | 'overstock';
  severity: 'info' | 'warning' | 'error';
  productId: string;
  productName: string;
  sku: string;
  message: string;
  currentStock: number;
  threshold: number;
  createdAt: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  variantId?: string;
  type: 'in' | 'out' | 'adjustment' | 'transfer' | 'return';
  quantity: number;
  reason?: string;
  reference?: string;
  createdAt: string;
  createdBy?: string;
}

export interface StockFilters {
  status: StockStatus | 'all';
  supplier: string | 'all';
  category: string | 'all';
  search: string;
  sortBy: 'name' | 'stock_asc' | 'stock_desc' | 'days_remaining';
}

export const defaultStockFilters: StockFilters = {
  status: 'all',
  supplier: 'all',
  category: 'all',
  search: '',
  sortBy: 'stock_asc',
};

// ============================================
// HOOK PRINCIPAL
// ============================================

export function useStockDashboard() {
  const [filters, setFilters] = useState<StockFilters>(defaultStockFilters);
  const [isLoading, setIsLoading] = useState(true);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  
  // Hook para buscar produtos do banco externo
  const productsDB = useExternalDatabase<ProductWithStock>('products');
  const variantsDB = useExternalDatabase<VariantWithStock>('variant_stocks');

  // Buscar dados de estoque
  const fetchStockData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Buscar produtos com estoque
      const productsResult = await productsDB.fetchAll({
        select: 'id,name,sku,stock,min_quantity,supplier_id,lead_time_days,price,category_id,updated_at',
        limit: 500,
      });

      if (productsResult?.records) {
        // Transformar produtos em itens de estoque
        const items: StockItem[] = productsResult.records.map(product => {
          const minStock = product.min_quantity || 10;
          const currentStock = product.stock || 0;
          const status = getStockStatus(currentStock, minStock);
          
          return {
            id: product.id,
            productId: product.id,
            productName: product.name,
            sku: product.sku || '',
            currentStock,
            minStock,
            reservedStock: 0,
            availableStock: currentStock,
            status,
            daysUntilStockout: calculateDaysUntilStockout(currentStock),
            lastUpdated: product.updated_at || new Date().toISOString(),
            leadTimeDays: product.lead_time_days,
          };
        });

        setStockItems(items);
        
        // Gerar alertas baseados no estoque
        const newAlerts = generateAlerts(items);
        setAlerts(newAlerts);
      }
    } catch (error) {
      console.error('Erro ao buscar dados de estoque:', error);
    } finally {
      setIsLoading(false);
    }
  }, [productsDB]);

  // Carregar dados iniciais
  useEffect(() => {
    fetchStockData();
  }, []);

  // Calcular resumo do estoque
  const summary = useMemo((): StockSummary => {
    const inStock = stockItems.filter(i => i.status === 'in_stock').length;
    const lowStock = stockItems.filter(i => i.status === 'low_stock').length;
    const critical = stockItems.filter(i => i.status === 'critical').length;
    const outOfStock = stockItems.filter(i => i.status === 'out_of_stock').length;
    const overstocked = stockItems.filter(i => i.status === 'overstocked').length;

    const totalDays = stockItems.reduce((sum, item) => sum + (item.daysUntilStockout || 0), 0);

    return {
      totalProducts: stockItems.length,
      totalVariants: 0, // TODO: calcular variantes
      inStock,
      lowStock,
      critical,
      outOfStock,
      overstocked,
      totalValue: 0, // TODO: calcular valor total
      averageStockDays: stockItems.length > 0 ? Math.round(totalDays / stockItems.length) : 0,
    };
  }, [stockItems]);

  // Filtrar itens de estoque
  const filteredItems = useMemo(() => {
    let items = [...stockItems];

    // Filtro por status
    if (filters.status !== 'all') {
      items = items.filter(i => i.status === filters.status);
    }

    // Filtro por busca
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      items = items.filter(i => 
        i.productName.toLowerCase().includes(searchLower) ||
        i.sku.toLowerCase().includes(searchLower)
      );
    }

    // Ordenação
    switch (filters.sortBy) {
      case 'name':
        items.sort((a, b) => a.productName.localeCompare(b.productName));
        break;
      case 'stock_asc':
        items.sort((a, b) => a.currentStock - b.currentStock);
        break;
      case 'stock_desc':
        items.sort((a, b) => b.currentStock - a.currentStock);
        break;
      case 'days_remaining':
        items.sort((a, b) => (a.daysUntilStockout || 999) - (b.daysUntilStockout || 999));
        break;
    }

    return items;
  }, [stockItems, filters]);

  // Alertas críticos (prioridade alta)
  const criticalAlerts = useMemo(() => {
    return alerts.filter(a => a.severity === 'error');
  }, [alerts]);

  // Funções de ação
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

  return {
    // Estado
    isLoading,
    stockItems: filteredItems,
    allStockItems: stockItems,
    summary,
    alerts,
    criticalAlerts,
    filters,
    
    // Funções
    fetchStockData,
    updateFilter,
    resetFilters,
    dismissAlert,
    setFilters,
  };
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function getStockStatus(current: number, min: number, max?: number): StockStatus {
  if (current <= 0) return 'out_of_stock';
  if (current <= min * 0.25) return 'critical';
  if (current <= min) return 'low_stock';
  if (max && current > max * 1.5) return 'overstocked';
  return 'in_stock';
}

function calculateDaysUntilStockout(stock: number, avgDailySales = 2): number | undefined {
  if (avgDailySales <= 0) return undefined;
  return Math.floor(stock / avgDailySales);
}

function generateAlerts(items: StockItem[]): StockAlert[] {
  const alerts: StockAlert[] = [];

  items.forEach(item => {
    if (item.status === 'out_of_stock') {
      alerts.push({
        id: `alert-${item.id}-out`,
        type: 'out_of_stock',
        severity: 'error',
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        message: `Produto sem estoque!`,
        currentStock: item.currentStock,
        threshold: item.minStock,
        createdAt: new Date().toISOString(),
      });
    } else if (item.status === 'critical') {
      alerts.push({
        id: `alert-${item.id}-critical`,
        type: 'critical',
        severity: 'error',
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        message: `Estoque crítico: apenas ${item.currentStock} unidades`,
        currentStock: item.currentStock,
        threshold: item.minStock,
        createdAt: new Date().toISOString(),
      });
    } else if (item.status === 'low_stock') {
      alerts.push({
        id: `alert-${item.id}-low`,
        type: 'low_stock',
        severity: 'warning',
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        message: `Estoque baixo: ${item.currentStock}/${item.minStock} mínimo`,
        currentStock: item.currentStock,
        threshold: item.minStock,
        createdAt: new Date().toISOString(),
      });
    }
  });

  // Ordenar por severidade
  return alerts.sort((a, b) => {
    const severityOrder = { error: 0, warning: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

// ============================================
// TIPOS AUXILIARES
// ============================================

interface ProductWithStock {
  id: string;
  name: string;
  sku?: string;
  stock?: number;
  min_quantity?: number;
  supplier_id?: string;
  lead_time_days?: number;
  price?: number;
  category_id?: string;
  updated_at?: string;
}

interface VariantWithStock {
  id: string;
  product_id: string;
  sku?: string;
  stock_quantity?: number;
  reserved_quantity?: number;
  min_stock?: number;
  color_id?: string;
  updated_at?: string;
}
