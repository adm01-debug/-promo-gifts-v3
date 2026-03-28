/**
 * Tipos compartilhados do painel de risco de fornecedor.
 */
import { StockStatus, ProductStockSummary } from "@/types/stock";

export type RiskSeverity = 'critical' | 'warning' | 'ok';

export interface RiskProduct {
  id: string;
  name: string;
  sku: string;
  currentStock: number;
  minStock: number;
  severity: RiskSeverity;
  status: StockStatus;
  variantsCritical: number;
  variantsOutOfStock: number;
  totalVariants: number;
}

export const SEVERITY_ORDER: Record<RiskSeverity, number> = { critical: 0, warning: 1, ok: 2 };

/**
 * Derives risk severity from a product's stock summary.
 * Considers daysUntilFullStockout for early warning.
 */
export function deriveSeverity(p: ProductStockSummary): RiskSeverity {
  if (p.overallStatus === 'out_of_stock' || p.overallStatus === 'critical') return 'critical';
  if (p.daysUntilFullStockout != null && p.daysUntilFullStockout < 7) return 'critical';
  if (p.overallStatus === 'low_stock') return 'warning';
  if (p.daysUntilFullStockout != null && p.daysUntilFullStockout < 15) return 'warning';
  if (p.variantsOutOfStock > 0 || p.variantsCritical > 0) return 'warning';
  return 'ok';
}
