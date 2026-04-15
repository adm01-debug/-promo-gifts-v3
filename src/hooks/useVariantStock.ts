/**
 * useVariantStock — Hook de estoque por variante (refatorado)
 * Fetcher em stock/stockFetcher.ts, alertas em stock/stockAlerts.ts
 */
import { useState, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ProductStockSummary,
  StockFilters,
  StockDashboardSummary,
  VariantStock,
  defaultStockFilters,
} from '@/types/stock';
import { fetchAndProcessStockData } from './stock/stockFetcher';

export function useVariantStock() {
  const [filters, setFilters] = useState<StockFilters>(defaultStockFilters);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['variant-stock-data'],
    queryFn: fetchAndProcessStockData,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const productStocks = data?.productStocks ?? [];
  const rawAlerts = data?.alerts ?? [];
  const futureStock = data?.futureStock ?? [];

  const alerts = useMemo(() => {
    if (dismissedAlerts.size === 0) return rawAlerts;
    return rawAlerts.filter(a => !dismissedAlerts.has(a.id));
  }, [rawAlerts, dismissedAlerts]);

  const loadingProgress = useMemo(() => {
    if (isLoading) return { step: 'Carregando dados em paralelo...', current: 0, total: 3 };
    return { step: '', current: 3, total: 3 };
  }, [isLoading]);

  const fetchStockData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['variant-stock-data'] });
  }, [queryClient]);

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
      totalStockValue: 0,
      totalAvailableValue: 0,
      averageDaysOfStock: allVariants.reduce((sum, v) => sum + (v.daysUntilStockout || 0), 0) / Math.max(1, allVariants.length),
      stockTurnoverRate: 0,
      totalAlerts: alerts.length,
      criticalAlerts: alerts.filter(a => a.severity === 'error').length,
      incomingStockValue: 0,
    };
  }, [productStocks, alerts]);

  // Extract unique categories and suppliers for filter dropdowns
  const availableCategories = useMemo(() => {
    const map = new Map<string, number>();
    productStocks.forEach(p => {
      const cat = p.categoryName || 'Sem categoria';
      map.set(cat, (map.get(cat) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [productStocks]);

  const availableSuppliers = useMemo(() => {
    const map = new Map<string, number>();
    productStocks.forEach(p => {
      const sup = p.supplierName || 'Sem fornecedor';
      map.set(sup, (map.get(sup) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [productStocks]);

  const availableColorGroups = useMemo(() => {
    const map = new Map<string, number>();
    productStocks.forEach(p => {
      p.variants.forEach(v => {
        if (v.colorName && v.colorName !== 'Padrão') {
          map.set(v.colorName, (map.get(v.colorName) || 0) + 1);
        }
      });
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [productStocks]);

  const filteredProducts = useMemo(() => {
    let items = [...productStocks];

    if (filters.status !== 'all') {
      items = items.filter(p => {
        if (p.overallStatus === filters.status) return true;
        // "low_stock" filter should also include "critical" products
        if (filters.status === 'low_stock' && p.overallStatus === 'critical') return true;
        if (filters.status === 'incoming') {
          return p.totalInTransitStock > 0 || p.variants.some(v => v.status === 'incoming' || v.inTransitStock > 0);
        }
        return p.variants.some(v => v.status === filters.status);
      });
    }

    if (filters.search) {
      const s = filters.search.toLowerCase();
      items = items.filter(p =>
        p.productName.toLowerCase().includes(s) ||
        p.productSku.toLowerCase().includes(s) ||
        p.variants.some(v => v.colorName?.toLowerCase().includes(s) || v.variantSku.toLowerCase().includes(s))
      );
    }

    if (filters.categoryId) {
      items = items.filter(p => p.categoryName === filters.categoryId);
    }

    if (filters.supplierId) {
      items = items.filter(p => p.supplierName === filters.supplierId);
    }

    if (filters.colorName) {
      items = items.filter(p => p.variants.some(v => v.colorName === filters.colorName));
    }

    if (filters.minQuantityNeeded && filters.minQuantityNeeded > 0) {
      items = items.filter(p => p.totalAvailableStock >= filters.minQuantityNeeded!);
    }

    if (filters.showOnlyWithAlerts) {
      const ids = new Set(alerts.map(a => a.productId));
      items = items.filter(p => ids.has(p.productId));
    }

    const dir = filters.sortDirection === 'asc' ? 1 : -1;
    switch (filters.sortBy) {
      case 'name': items.sort((a, b) => a.productName.localeCompare(b.productName) * dir); break;
      case 'sku': items.sort((a, b) => a.productSku.localeCompare(b.productSku) * dir); break;
      case 'stock_quantity': items.sort((a, b) => (a.totalCurrentStock - b.totalCurrentStock) * dir); break;
      case 'available_stock': items.sort((a, b) => (a.totalAvailableStock - b.totalAvailableStock) * dir); break;
      case 'days_remaining': items.sort((a, b) => ((a.daysUntilFullStockout ?? 999) - (b.daysUntilFullStockout ?? 999)) * dir); break;
    }

    return items;
  }, [productStocks, filters, alerts]);

  const allColors = useMemo(() => {
    const s = new Set<string>();
    productStocks.forEach(p => p.variants.forEach(v => { if (v.colorName) s.add(v.colorName); }));
    return Array.from(s).sort();
  }, [productStocks]);

  const criticalAlerts = useMemo(() => alerts.filter(a => a.severity === 'error'), [alerts]);

  const updateFilter = useCallback(<K extends keyof StockFilters>(key: K, value: StockFilters[K]) => {
    console.log('[StockFilter] updateFilter called:', key, '=', value);
    setFilters(prev => {
      const next = { ...prev, [key]: value };
      console.log('[StockFilter] New filters state:', next);
      return next;
    });
  }, []);

  const resetFilters = useCallback(() => setFilters(defaultStockFilters), []);

  const dismissAlert = useCallback((alertId: string) => {
    setDismissedAlerts(prev => new Set(prev).add(alertId));
  }, []);

  const dismissAllAlerts = useCallback(() => {
    setDismissedAlerts(new Set(rawAlerts.map(a => a.id)));
  }, [rawAlerts]);

  const dismissAlertsBySeverity = useCallback((severity: 'error' | 'warning' | 'info') => {
    setDismissedAlerts(prev => {
      const next = new Set(prev);
      rawAlerts.filter(a => a.severity === severity).forEach(a => next.add(a.id));
      return next;
    });
  }, [rawAlerts]);

  const getProductStock = useCallback((productId: string): ProductStockSummary | undefined => {
    return productStocks.find(p => p.productId === productId);
  }, [productStocks]);

  const getColorStock = useCallback((productId: string, colorName: string): VariantStock[] => {
    const product = productStocks.find(p => p.productId === productId);
    return product?.variants.filter(v => v.colorName === colorName) || [];
  }, [productStocks]);

  return {
    isLoading, isFetching, loadingProgress,
    productStocks: filteredProducts, allProductStocks: productStocks,
    summary, alerts, criticalAlerts, futureStock, filters, allColors,
    availableCategories, availableSuppliers, availableColorGroups,
    fetchStockData, updateFilter, resetFilters, dismissAlert,
    dismissAllAlerts, dismissAlertsBySeverity, setFilters,
    getProductStock, getColorStock,
  };
}

export function useProductVariantStock(productId: string) {
  const { productStocks, alerts, isLoading, fetchStockData, allProductStocks } = useVariantStock();

  const productStock = useMemo(() => allProductStocks.find(p => p.productId === productId), [allProductStocks, productId]);
  const productAlerts = useMemo(() => alerts.filter(a => a.productId === productId), [alerts, productId]);

  return {
    isLoading,
    productStock,
    variants: productStock?.variants || [],
    colors: productStock?.availableColors || [],
    alerts: productAlerts,
    refresh: fetchStockData,
  };
}
