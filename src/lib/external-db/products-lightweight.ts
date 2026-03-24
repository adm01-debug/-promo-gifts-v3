/**
 * Lightweight product fetch — minimal fields, no enrichment.
 * Used for selectors and catalog listing.
 */
import { logger } from '@/lib/logger';
import { invokeExternalDb, invokeBatchBridge } from './bridge';
import type { InvokeResult } from './bridge';

const PRODUCT_SELECT_LIGHTWEIGHT = 'id, name, sku, sale_price, cost_price, primary_image_url, supplier_id, category_id, main_category_id, brand, is_active, active, stock_quantity, min_quantity, is_kit, gender';
const LIGHTWEIGHT_PAGE_SIZE = 500;
const LIGHTWEIGHT_MAX_CONCURRENCY = 2;
const LIGHTWEIGHT_MIN_SPLIT_PAGE_SIZE = 125;
const LIGHTWEIGHT_MAX_TOTAL = 2000;

export interface LightweightProduct {
  id: string;
  name: string;
  sku: string;
  sale_price?: number | null;
  cost_price?: number | null;
  image_url: string | null;
  primary_image_url: string | null;
  supplier_id: string | null;
  category_id: string | null;
  main_category_id: string | null;
  brand: string | null;
  is_active: boolean;
  active: boolean;
  stock_quantity?: number | null;
  min_quantity?: number | null;
  is_kit?: boolean | null;
  gender?: string | null;
}

function isTimeoutError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /(statement timeout|canceling statement|57014|bad gateway|boot_error|function failed to start)/i.test(message);
}

async function fetchPage(params: {
  filters: Record<string, unknown>;
  orderBy: { column: string; ascending?: boolean };
  limit: number;
  offset: number;
  countMode?: 'exact' | 'planned' | 'estimated' | 'none';
}): Promise<InvokeResult<LightweightProduct>> {
  return invokeExternalDb<LightweightProduct>({
    table: 'products', operation: 'select',
    filters: params.filters, select: PRODUCT_SELECT_LIGHTWEIGHT,
    orderBy: params.orderBy, limit: params.limit,
    offset: params.offset, countMode: params.countMode ?? 'none',
  });
}

async function fetchPageResilient(params: {
  filters: Record<string, unknown>;
  orderBy: { column: string; ascending?: boolean };
  limit: number;
  offset: number;
  countMode?: 'exact' | 'planned' | 'estimated' | 'none';
}): Promise<InvokeResult<LightweightProduct>> {
  try {
    return await fetchPage(params);
  } catch (error) {
    if (!isTimeoutError(error) || params.limit <= LIGHTWEIGHT_MIN_SPLIT_PAGE_SIZE) throw error;
    const firstHalf = Math.ceil(params.limit / 2);
    const secondHalf = params.limit - firstHalf;
    logger.warn(`[lightweight] Timeout at offset=${params.offset}, splitting ${params.limit} -> ${firstHalf}+${secondHalf}`);
    const [left, right] = await Promise.all([
      fetchPageResilient({ ...params, limit: firstHalf, countMode: 'none' }),
      fetchPageResilient({ ...params, offset: params.offset + firstHalf, limit: secondHalf, countMode: 'none' }),
    ]);
    return {
      records: [...left.records, ...right.records],
      count: params.countMode === 'none' ? null : left.count ?? right.count ?? null,
    };
  }
}

export async function fetchPromobrindProductsLightweight(options?: {
  search?: string;
  limit?: number;
  offset?: number;
  orderBy?: { column: string; ascending?: boolean };
  filters?: Record<string, unknown>;
}): Promise<LightweightProduct[]> {
  const filters: Record<string, unknown> = { active: true, ...options?.filters };
  if (options?.search) filters._search = options.search;
  const orderBy = options?.orderBy ?? { column: 'name', ascending: true };
  const baseOffset = options?.offset ?? 0;

  if (typeof options?.limit === 'number' && options.limit > 0) {
    const result = await fetchPageResilient({ filters, orderBy, limit: options.limit, offset: baseOffset, countMode: 'none' });
    return result.records;
  }

  const maxTotal = LIGHTWEIGHT_MAX_TOTAL;
  const pagesToFetch = Math.ceil(maxTotal / LIGHTWEIGHT_PAGE_SIZE);
  const batchQueries = Array.from({ length: pagesToFetch }, (_, i) => ({
    table: 'products', operation: 'select' as const,
    select: PRODUCT_SELECT_LIGHTWEIGHT, filters, orderBy,
    limit: LIGHTWEIGHT_PAGE_SIZE, offset: baseOffset + i * LIGHTWEIGHT_PAGE_SIZE,
  }));

  try {
    const batchResults = await invokeBatchBridge(batchQueries);
    const products: LightweightProduct[] = [];
    for (const result of batchResults) {
      if (result.success && result.data?.records) products.push(...(result.data.records as LightweightProduct[]));
    }
    return products;
  } catch (batchError) {
    logger.warn('[lightweight] Batch fetch failed, falling back to sequential:', batchError);
    return fetchSequential(filters, orderBy, baseOffset, maxTotal);
  }
}

async function fetchSequential(
  filters: Record<string, unknown>,
  orderBy: { column: string; ascending?: boolean },
  baseOffset: number,
  maxTotal: number,
): Promise<LightweightProduct[]> {
  const firstPage = await fetchPageResilient({ filters, orderBy, limit: LIGHTWEIGHT_PAGE_SIZE, offset: baseOffset, countMode: 'planned' });
  const products: LightweightProduct[] = [...firstPage.records];
  if (firstPage.records.length < LIGHTWEIGHT_PAGE_SIZE) return products;

  const estimatedTotal = typeof firstPage.count === 'number' && firstPage.count > firstPage.records.length
    ? Math.min(firstPage.count, maxTotal) : maxTotal;
  const remaining = estimatedTotal - products.length;
  if (remaining <= 0) return products;

  const offsets = Array.from(
    { length: Math.ceil(remaining / LIGHTWEIGHT_PAGE_SIZE) },
    (_, i) => baseOffset + LIGHTWEIGHT_PAGE_SIZE * (i + 1),
  );

  for (let i = 0; i < offsets.length; i += LIGHTWEIGHT_MAX_CONCURRENCY) {
    const batch = offsets.slice(i, i + LIGHTWEIGHT_MAX_CONCURRENCY);
    const pages = await Promise.all(
      batch.map(offset => fetchPageResilient({ filters, orderBy, limit: LIGHTWEIGHT_PAGE_SIZE, offset, countMode: 'none' })),
    );
    for (const page of pages) products.push(...page.records);
    if (pages[pages.length - 1]?.records.length < LIGHTWEIGHT_PAGE_SIZE) break;
    if (products.length >= maxTotal) break;
  }
  return products;
}
