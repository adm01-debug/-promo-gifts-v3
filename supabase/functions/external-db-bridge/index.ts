// supabase/functions/external-db-bridge/index.ts
// Lean orchestrator — delegates config, aliases, telemetry and cache to shared modules.

import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";
import {
  type Operation,
  ALLOWED_RPCS,
  PRODUCT_TABLES, PRODUCT_VIEWS, COMPANY_TABLES, SYSTEM_TABLES,
  PERMISSIONS, SENSITIVE_TABLES,
  HEAVY_TABLES, VERY_HEAVY_TABLES,
  TABLES_WITHOUT_CREATED_AT, TABLES_WITHOUT_UPDATED_AT,
  getResourceGroup,
  type ProductTable, type ProductView,
} from "../_shared/external-db-config.ts";
import {
  resolveTableAlias,
  sanitizeExternalWriteData,
  mapTechniqueRowToLegacyShape,
  mapPriceTableRowToLegacyShape,
} from "../_shared/external-db-aliases.ts";
import { emitTelemetry, classifyDuration, VERY_SLOW_QUERY_THRESHOLD_MS, SLOW_QUERY_THRESHOLD_MS } from "../_shared/external-db-telemetry.ts";
import { getCached, setCache } from "../_shared/external-db-cache.ts";

// ============================================
// QUERY HELPERS
// ============================================

function applyFilters(
  query: any,
  filters: Record<string, unknown>,
  categoryDescendants: string[] | null,
) {
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;

    if (key === '_search' && typeof value === 'string') {
      const escaped = value.replace(/%/g, '\\%').replace(/_/g, '\\_');
      query = query.or(`name.ilike.%${escaped}%,sku.ilike.%${escaped}%,supplier_reference.ilike.%${escaped}%,brand.ilike.%${escaped}%,description.ilike.%${escaped}%`);
      return;
    }

    // Name prefix search: matches products whose name STARTS with the term (case insensitive)
    if (key === '_name_prefix' && typeof value === 'string') {
      const escaped = value.replace(/%/g, '\\%').replace(/_/g, '\\_');
      query = query.ilike('name', `${escaped}%`);
      return;
    }

    if (categoryDescendants && (key === 'category_id' || key === 'main_category_id')) {
      query = query.in(key, categoryDescendants);
      return;
    }

    if (typeof value === 'string') {
      // Support PostgREST-style in.(val1,val2,...) operator
      const inMatch = value.match(/^in\.\((.+)\)$/);
      if (inMatch) {
        const vals = inMatch[1].split(',').map(v => v.trim());
        query = query.in(key, vals);
      } else {
        // Support PostgREST-style comparison operators: gte., lte., gt., lt., neq.
        const operatorMatch = value.match(/^(gte|lte|gt|lt|neq)\.(.+)$/);
        if (operatorMatch) {
          const [, op, val] = operatorMatch;
          query = query[op](key, val);
        } else if (['name', 'description', 'title', 'razao_social', 'nome_fantasia', 'nome', 'descricao'].includes(key)) {
          query = query.ilike(key, `%${value}%`);
        } else {
          query = query.eq(key, value);
        }
      }
    } else if (Array.isArray(value)) {
      query = query.in(key, value);
    } else {
      query = query.eq(key, value);
    }
  });
  return query;
}

function computeSafeLimit(
  requestedLimit: number,
  table: string,
  hasSearch: boolean,
  offset: number,
  selectFields?: string,
): number {
  const isHeavy = HEAVY_TABLES.includes(table);
  const isVeryHeavy = VERY_HEAVY_TABLES.includes(table);
  if (!isHeavy) return requestedLimit;

  // Lightweight selects (few scalar fields, no JSONB) can handle larger pages safely
  const isLightweight = selectFields && selectFields !== '*' && selectFields.split(',').length <= 20;
  if (isLightweight) {
    if (hasSearch) return Math.min(requestedLimit, 250);
    return Math.min(requestedLimit, 500);
  }

  if (hasSearch) return Math.min(requestedLimit, 120);
  if (isVeryHeavy) return Math.min(requestedLimit, 100);
  if (offset >= 1000) return Math.min(requestedLimit, 125);
  return Math.min(requestedLimit, 200);
}

function isUnpopulatedMaterializedViewError(message?: string | null): boolean {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return normalized.includes('has not been populated')
    || (normalized.includes('materialized view') && normalized.includes('not been populated'))
    || normalized.includes('mv precisa de refresh');
}

// ============================================
// VIRTUAL TABLE: product_print_areas
// Materializes personalization_areas JSONB → flat rows
// ============================================

function normalizeTechniqueIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function normalizeArea(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return { ...(value as Record<string, unknown>) };
}

function getAreas(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeArea);
}

function getAreaId(area: Record<string, unknown>, index: number): string {
  const rawId = area.id;
  return typeof rawId === 'string' && rawId.trim().length > 0 ? rawId : `area-${index}`;
}

function buildVirtualRecords(productId: string, personalizationAreas: unknown): Record<string, unknown>[] {
  const areas = getAreas(personalizationAreas);
  return areas.flatMap((area, index) => {
    const areaId = getAreaId(area, index);
    const techniqueIds = normalizeTechniqueIds(area.allowed_technique_ids ?? area.technique_ids);
    return techniqueIds.map((techniqueId) => ({
      ...area,
      id: `${productId}::${areaId}::${techniqueId}`,
      product_id: productId,
      area_id: areaId,
      area_name: typeof area.area_name === 'string' ? area.area_name : typeof area.name === 'string' ? area.name : `Área ${index + 1}`,
      technique_id: techniqueId,
      allowed_technique_ids: techniqueIds,
      is_active: area.is_active !== false,
      display_order: typeof area.display_order === 'number' ? area.display_order : index,
      component_name: typeof area.component_name === 'string' ? area.component_name : null,
      location_name: typeof area.location_name === 'string' ? area.location_name : null,
      _virtual: true,
    }));
  });
}

function parseVirtualId(virtualId: string) {
  const parts = virtualId.split('::');
  if (parts.length !== 3 || parts.some((p) => !p)) return null;
  return { productId: parts[0], areaId: parts[1], techniqueId: parts[2] };
}

async function fetchProductForVirtualAreas(externalSupabase: any, productId: string) {
  const { data: product, error } = await externalSupabase
    .from('products')
    .select('id, personalization_areas')
    .eq('id', productId)
    .maybeSingle();
  const missingColumn = !!error?.message?.includes("personalization_areas");
  return { product, error, missingColumn };
}

function addTechniqueToAreas(personalizationAreas: unknown, techniqueId: string, areaName = 'Área Principal') {
  const areas = getAreas(personalizationAreas);
  if (areas.length === 0) {
    const areaId = crypto.randomUUID();
    return {
      updatedAreas: [{ id: areaId, area_name: areaName, allowed_technique_ids: [techniqueId], is_active: true, is_primary: true, display_order: 0, unit: 'cm', shape: 'rectangle', max_width: 0, max_height: 0 }],
      areaId, alreadyLinked: false,
    };
  }
  const targetIndex = areas.findIndex((a) => a.is_primary === true);
  const resolvedIndex = targetIndex >= 0 ? targetIndex : 0;
  const targetArea = normalizeArea(areas[resolvedIndex]);
  const areaId = getAreaId(targetArea, resolvedIndex);
  const existing = normalizeTechniqueIds(targetArea.allowed_technique_ids ?? targetArea.technique_ids);
  const alreadyLinked = existing.includes(techniqueId);
  const next = alreadyLinked ? existing : [...existing, techniqueId];
  targetArea.id = areaId;
  targetArea.allowed_technique_ids = next;
  if ('technique_ids' in targetArea) targetArea.technique_ids = next;
  if (typeof targetArea.area_name !== 'string' && typeof targetArea.name !== 'string') targetArea.area_name = areaName;
  areas[resolvedIndex] = targetArea;
  return { updatedAreas: areas, areaId, alreadyLinked };
}

function removeTechniqueFromAreas(personalizationAreas: unknown, areaId: string, techniqueId: string) {
  const areas = getAreas(personalizationAreas);
  let removed = false;
  const updatedAreas = areas.map((area, index) => {
    const next = normalizeArea(area);
    const nextAreaId = getAreaId(next, index);
    if (nextAreaId !== areaId) return next;
    const current = normalizeTechniqueIds(next.allowed_technique_ids ?? next.technique_ids);
    const filtered = current.filter((id) => id !== techniqueId);
    removed = removed || filtered.length !== current.length;
    next.id = nextAreaId;
    next.allowed_technique_ids = filtered;
    if ('technique_ids' in next) next.technique_ids = filtered;
    return next;
  });
  return { updatedAreas, removed };
}

// ============================================
// MAIN HANDLER
// ============================================

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  const preflightResponse = handleCorsPreflightIfNeeded(req);
  if (preflightResponse) return preflightResponse;

  const requestStartTime = performance.now();

  try {
    const body = await req.json();

    // ============================================
    // BATCH OPERATION
    // ============================================
    if (body.operation === 'batch') {
      return await handleBatch(body, req, corsHeaders, requestStartTime);
    }

    const operation = body.operation as Operation;

    // ============================================
    // RPC OPERATION
    // ============================================
    if (operation === 'rpc') {
      return await handleRpc(body, corsHeaders);
    }

    // ============================================
    // CRUD OPERATIONS
    // ============================================
    return await handleCrud(body, req, corsHeaders, requestStartTime);

  } catch (error) {
    const totalDuration = Math.round(performance.now() - requestStartTime);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error(`❌ [telemetry] Request failed after ${totalDuration}ms: ${errorMessage}`);
    return jsonResponse({ error: errorMessage }, 500, corsHeaders);
  }
});

// ============================================
// BATCH HANDLER
// ============================================

async function handleBatch(body: any, req: Request, corsHeaders: Record<string, string>, requestStartTime: number) {
  const queries = body.queries as Array<Record<string, unknown>>;
  if (!Array.isArray(queries) || queries.length === 0) {
    return jsonResponse({ error: 'Batch requires a non-empty "queries" array' }, 400, corsHeaders);
  }
  if (queries.length > 10) {
    return jsonResponse({ error: 'Batch limited to 10 queries max' }, 400, corsHeaders);
  }

  const externalSupabase = getExternalClient(corsHeaders);
  if (externalSupabase instanceof Response) return externalSupabase;

  const results = await Promise.all(
    queries.map(async (q, idx) => {
      const qTable = q.table as string;
      const qSelect = (q.select as string) || '*';
      const qFilters = q.filters as Record<string, unknown> | undefined;
      const qOrderBy = q.orderBy as { column: string; ascending?: boolean } | undefined;
      const hasSearch = !!(qFilters && '_search' in qFilters);
      const rawLimit = (q.limit as number) || 500;
      const qOffset = (q.offset as number) || 0;
      const qLimit = computeSafeLimit(rawLimit, qTable, hasSearch, qOffset, qSelect);
      const qCacheKey = q.cacheKey as string | undefined;
      const qCountMode = q.countMode as string | undefined;

      if (qCacheKey) {
        const cached = getCached<{ records: unknown[]; count: number | null }>(qCacheKey);
        if (cached) {
          console.log(`[batch] Query ${idx} (${qTable}) served from cache (${(cached.records as unknown[]).length} records)`);
          return { success: true, data: cached, fromCache: true };
        }
      }

      const resourceGroup = getResourceGroup(qTable);
      if (!resourceGroup) return { success: false, error: `Tabela '${qTable}' não mapeada` };

      try {
        const queryStart = performance.now();
        // Use lightweight select for products in batch too
        const effectiveBatchSelect = (qTable === 'products' && (!qSelect || qSelect === '*'))
          ? PRODUCTS_LIGHTWEIGHT_SELECT
          : qSelect;
        const selectOpts = qCountMode ? { count: qCountMode } : undefined;
        let query = selectOpts
          ? externalSupabase.from(qTable).select(effectiveBatchSelect, selectOpts)
          : externalSupabase.from(qTable).select(effectiveBatchSelect);
        if (qFilters) query = applyFilters(query, qFilters, null);
        if (qOrderBy) query = query.order(qOrderBy.column, { ascending: qOrderBy.ascending ?? false });
        query = query.range(qOffset, qOffset + qLimit - 1);

        const { data: selectData, error: selectError, count } = await query;
        const duration = Math.round(performance.now() - queryStart);

        if (selectError) {
          if (qTable.startsWith('mv_') && isUnpopulatedMaterializedViewError(selectError.message)) {
            console.warn(`[batch] Query ${idx} (${qTable}) returned unpopulated MV; sending empty result`);
            const result = {
              records: [],
              count: 0,
              meta: { materialized_view_status: 'not_populated' },
            };
            if (qCacheKey) setCache(qCacheKey, result);
            return { success: true, data: result };
          }

          console.warn(`[batch] Query ${idx} (${qTable}) failed in ${duration}ms: ${selectError.message}`);
          return { success: false, error: selectError.message };
        }

        const result = { records: selectData || [], count };
        if (qCacheKey) setCache(qCacheKey, result);

        const icon = duration >= VERY_SLOW_QUERY_THRESHOLD_MS ? '🔴' : duration >= SLOW_QUERY_THRESHOLD_MS ? '🟡' : '✅';
        console.log(`[batch] ${icon} Query ${idx} (${qTable}) ${duration}ms, ${selectData?.length ?? 0} records`);
        return { success: true, data: result };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : String(err) };
      }
    })
  );

  const totalDuration = Math.round(performance.now() - requestStartTime);
  console.log(`[batch] Total: ${totalDuration}ms for ${queries.length} queries`);
  return jsonResponse({ success: true, results }, 200, corsHeaders);
}

// ============================================
// RPC HANDLER
// ============================================

async function handleRpc(body: any, corsHeaders: Record<string, string>) {
  const rpcName = body.rpcName as string;
  const rpcParams = body.rpcParams as Record<string, unknown>;

  if (!ALLOWED_RPCS.includes(rpcName as any)) {
    return jsonResponse({ error: `RPC '${rpcName}' não permitida`, allowedRpcs: ALLOWED_RPCS }, 403, corsHeaders);
  }

  const externalSupabase = getExternalClient(corsHeaders);
  if (externalSupabase instanceof Response) return externalSupabase;

  console.log(`RPC: ${rpcName}`, rpcParams);
  const rpcStart = performance.now();
  const { data: rpcData, error: rpcError } = await externalSupabase.rpc(rpcName, rpcParams || {});
  const rpcDuration = Math.round(performance.now() - rpcStart);

  if (rpcError) {
    emitTelemetry({ operation: 'rpc', rpcName, durationMs: rpcDuration, status: 'error', error: rpcError.message });
    return jsonResponse({ error: rpcError.message }, 400, corsHeaders);
  }

  emitTelemetry({ operation: 'rpc', rpcName, durationMs: rpcDuration, status: classifyDuration(rpcDuration), recordCount: Array.isArray(rpcData) ? rpcData.length : 1 });

  // Enrich legacy flat responses from fn_get_customization_price
  let enrichedData = rpcData;
  const isLegacyFlat = rpcData?.success && rpcData?.tabela_codigo && !rpcData?.tabela;
  if (rpcName === 'fn_get_customization_price' && isLegacyFlat) {
    enrichedData = await enrichCustomizationPrice(externalSupabase, rpcData);
  }

  return jsonResponse({ success: true, data: enrichedData }, 200, corsHeaders);
}

async function enrichCustomizationPrice(externalSupabase: any, rpcData: any) {
  try {
    const { data: tabelaRows } = await externalSupabase
      .from('tabela_preco_gravacao_oficial')
      .select('id,area_maxima_texto,max_cores,cobra_por_cor')
      .eq('codigo', rpcData.tabela_codigo)
      .eq('ativo', true)
      .limit(1);

    if (tabelaRows?.length) {
      const t = tabelaRows[0];
      const { data: faixaRows } = await externalSupabase
        .from('tabela_preco_gravacao_oficial_faixa')
        .select('largura_max,altura_max')
        .eq('tabela_preco_gravacao_id', t.id);

      let maxLargura: number | null = null;
      let maxAltura: number | null = null;
      if (faixaRows?.length) {
        const larguras = faixaRows.map((f: any) => f.largura_max).filter((v: any): v is number => typeof v === 'number' && v < 90);
        const alturas = faixaRows.map((f: any) => f.altura_max).filter((v: any): v is number => typeof v === 'number' && v < 90);
        maxLargura = larguras.length ? Math.max(...larguras) : null;
        maxAltura = alturas.length ? Math.max(...alturas) : null;
      }

      return {
        ...rpcData,
        tabela: { ...(rpcData.tabela || {}), id: t.id, area_maxima_texto: t.area_maxima_texto ?? null, largura_max_cm: maxLargura, altura_max_cm: maxAltura, max_cores: t.max_cores ?? rpcData.max_cores ?? null, cobra_por_cor: t.cobra_por_cor ?? false },
      };
    }
  } catch (e) {
    console.warn('[external-db-bridge] RPC enrichment failed:', e);
  }
  return rpcData;
}

// ============================================
// CRUD HANDLER
// ============================================

async function handleCrud(body: any, req: Request, corsHeaders: Record<string, string>, requestStartTime: number) {
  const operation = body.operation as Operation;
  let table = body.table as string;

  if (!table || typeof table !== 'string' || table === 'undefined') {
    return jsonResponse({ error: `Parâmetro 'table' é obrigatório e deve ser uma string válida (recebido: ${JSON.stringify(table)})` }, 400, corsHeaders);
  }

  // Resolve aliases
  const alias = resolveTableAlias(table, body.filters, body.orderBy, body.select);
  table = alias.table;
  const filters = alias.filters;
  const orderBy = alias.orderBy;
  const select = alias.select;
  const aliasType = alias.aliasType;

  // Auth check
  const isReadOperation = operation === 'select';
  const isPublicTable = PRODUCT_TABLES.includes(table as ProductTable) || PRODUCT_VIEWS.includes(table as ProductView);
  const isSensitive = SENSITIVE_TABLES.has(table);
  const allowPublicAccess = isReadOperation && isPublicTable && !isSensitive;

  const authHeader = req.headers.get('Authorization');
  let userId: string | null = null;
  let userRole = 'public';

  if (authHeader?.startsWith('Bearer ')) {
    const localSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData, error: userError } = await localSupabase.auth.getUser();

    if (userData?.user && !userError) {
      userId = userData.user.id;
      const localService = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      const { data: userRoles, error: roleError } = await localService.from('user_roles').select('role').eq('user_id', userId);
      if (roleError) console.error('Error fetching user roles:', roleError);
      userRole = userRoles?.[0]?.role || 'vendedor';
    } else {
      console.error('Auth failed:', userError?.message);
    }
  }

  if (!allowPublicAccess && !userId) {
    console.error(`Authentication required: table=${table}, operation=${operation}, sensitive=${isSensitive}`);
    return jsonResponse({ error: 'Autenticação necessária' }, 401, corsHeaders);
  }

  console.log(`Operation: ${operation} on table: ${table} (public: ${allowPublicAccess})`);

  // Extract remaining body fields
  const { data, id, limit: queryLimit, offset: queryOffset, countMode: requestCountMode } = body;

  // Validate resource group & permissions
  const resourceGroup = getResourceGroup(table);
  if (!resourceGroup) {
    if (SYSTEM_TABLES.includes(table as any)) {
      return jsonResponse({ error: `Tabela '${table}' não está disponível para acesso externo` }, 403, corsHeaders);
    }
    return jsonResponse({ error: `Tabela '${table}' não mapeada`, availableTables: { products: PRODUCT_TABLES, companies: COMPANY_TABLES } }, 400, corsHeaders);
  }

  if (!PERMISSIONS[resourceGroup].includes(operation)) {
    return jsonResponse({ error: `Operação '${operation}' não permitida para '${resourceGroup}'`, allowed: PERMISSIONS[resourceGroup] }, 403, corsHeaders);
  }

  if (['insert', 'update', 'delete', 'upsert', 'batch_insert'].includes(operation)) {
    if (!['admin', 'gerente', 'vendedor'].includes(userRole)) {
      return jsonResponse({ error: 'Permissão insuficiente para esta operação' }, 403, corsHeaders);
    }
    if (userRole === 'vendedor' && operation === 'delete') {
      return jsonResponse({ error: 'Vendedores não podem excluir registros' }, 403, corsHeaders);
    }
  }

  const externalSupabase = getExternalClient(corsHeaders);
  if (externalSupabase instanceof Response) return externalSupabase;

  const isVirtual = table === 'product_print_areas';
  let result;

  switch (operation) {
    case 'select':
      result = await handleSelect(externalSupabase, table, { filters, id, select, orderBy, queryLimit, queryOffset, requestCountMode, isVirtual, aliasType, corsHeaders });
      if (result instanceof Response) return result;
      break;

    case 'insert':
      result = await handleInsert(externalSupabase, table, { data, isVirtual, corsHeaders });
      if (result instanceof Response) return result;
      break;

    case 'upsert':
      result = await handleUpsert(externalSupabase, table, { data, corsHeaders });
      if (result instanceof Response) return result;
      break;

    case 'batch_insert':
      result = await handleBatchInsert(externalSupabase, table, { data, corsHeaders, onConflict: body.onConflict });
      if (result instanceof Response) return result;
      break;

    case 'update':
      result = await handleUpdate(externalSupabase, table, { data, id, isVirtual, corsHeaders });
      if (result instanceof Response) return result;
      break;

    case 'delete':
      result = await handleDelete(externalSupabase, table, { id, isVirtual, corsHeaders });
      if (result instanceof Response) return result;
      break;

    default:
      return jsonResponse({ error: `Operação não suportada: ${operation}` }, 400, corsHeaders);
  }

  const totalDuration = Math.round(performance.now() - requestStartTime);
  if (totalDuration >= VERY_SLOW_QUERY_THRESHOLD_MS) {
    console.warn(`🔴 [telemetry] Total request ${operation}:${table} took ${totalDuration}ms (VERY SLOW)`);
  } else if (totalDuration >= SLOW_QUERY_THRESHOLD_MS) {
    console.warn(`🟡 [telemetry] Total request ${operation}:${table} took ${totalDuration}ms (SLOW)`);
  }

  return jsonResponse({ data: result, success: true }, 200, corsHeaders);
}

// ============================================
// SELECT
// ============================================

async function handleSelect(externalSupabase: any, table: string, opts: any) {
  const { filters, id, select, orderBy, queryLimit, queryOffset, requestCountMode, isVirtual, aliasType, corsHeaders } = opts;

  if (isVirtual) {
    const selectStart = performance.now();
    const productIdFromId = typeof id === 'string' ? parseVirtualId(id)?.productId : null;
    const virtualProductId = productIdFromId ?? (typeof filters?.product_id === 'string' ? filters.product_id : null);
    if (!virtualProductId) {
      emitTelemetry({ operation: 'select', table, durationMs: Math.round(performance.now() - selectStart), status: 'error', error: 'Filtro product_id é obrigatório' });
      return jsonResponse({ error: 'Filtro product_id é obrigatório para product_print_areas' }, 400, corsHeaders);
    }

    const { product, error: productError, missingColumn } = await fetchProductForVirtualAreas(externalSupabase, virtualProductId);
    const dur = Math.round(performance.now() - selectStart);

    if (missingColumn) {
      emitTelemetry({ operation: 'select', table, durationMs: dur, status: 'ok', recordCount: 0 });
      console.warn(`Virtual table ${table} unavailable: products.personalization_areas does not exist`);
      return { records: [], count: 0 };
    }
    if (productError) {
      emitTelemetry({ operation: 'select', table, durationMs: dur, status: 'error', error: productError.message });
      return jsonResponse({ error: productError.message }, 400, corsHeaders);
    }

    const limit = typeof queryLimit === 'number' && queryLimit > 0 ? queryLimit : 200;
    const offset = typeof queryOffset === 'number' && queryOffset >= 0 ? queryOffset : 0;
    let allRecords = buildVirtualRecords(virtualProductId, product?.personalization_areas);

    if (id) allRecords = allRecords.filter((r) => r.id === id);
    if (filters) {
      allRecords = allRecords.filter((r) => Object.entries(filters).every(([k, v]) => {
        if (v === undefined || v === null || v === '' || k === 'product_id') return true;
        return Array.isArray(v) ? v.includes(r[k] as never) : r[k] === v;
      }));
    }

    const paginated = allRecords.slice(offset, offset + limit);
    emitTelemetry({ operation: 'select', table, limit, offset, countMode: 'virtual', durationMs: dur, status: classifyDuration(dur), recordCount: paginated.length });
    return { records: paginated, count: allRecords.length };
  }

  // Category descendants optimization
  let categoryDescendants: string[] | null = null;
  if (table === 'products' && filters && (filters.category_id || filters.main_category_id)) {
    const catId = (filters.category_id || filters.main_category_id) as string;
    try {
      const { data: desc, error: descErr } = await externalSupabase.rpc('get_category_descendants', { category_uuid: catId });
      if (!descErr && Array.isArray(desc)) {
        categoryDescendants = desc as string[];
        console.log(`Category ${catId} has ${categoryDescendants.length} descendants`);
      }
    } catch (err) {
      console.warn('Error calling get_category_descendants:', err);
    }
  }

  const isHeavy = HEAVY_TABLES.includes(table);
  const isVeryHeavy = VERY_HEAVY_TABLES.includes(table);
  const hasSearch = filters && '_search' in filters;
  const hasNamePrefix = filters && '_name_prefix' in filters;
  const countMode = requestCountMode ?? (hasSearch ? 'none' : (isVeryHeavy ? 'none' : (isHeavy ? 'planned' : 'exact')));
  const queryCountMode = countMode === 'none' ? undefined : countMode;

  // Use lightweight columns for products table when select is '*' (avoids heavy JSONB columns like personalization_areas, metadata)
  const effectiveSelect = (table === 'products' && (!select || select === '*'))
    ? PRODUCTS_LIGHTWEIGHT_SELECT
    : (select || '*');

  let query = queryCountMode
    ? externalSupabase.from(table).select(effectiveSelect, { count: queryCountMode })
    : externalSupabase.from(table).select(effectiveSelect);

  if (filters) query = applyFilters(query, filters, categoryDescendants);
  if (id) query = query.eq('id', id);
  if (orderBy) query = query.order(orderBy.column, { ascending: orderBy.ascending ?? false });

  const requestedLimit = typeof queryLimit === 'number' && queryLimit > 0 ? queryLimit : 500;
  const safeOffset = typeof queryOffset === 'number' && queryOffset >= 0 ? queryOffset : 0;
  const safeLimit = computeSafeLimit(requestedLimit, table, !!(hasSearch || hasNamePrefix), safeOffset, effectiveSelect);
  query = query.range(safeOffset, safeOffset + safeLimit - 1);

  const selectStart = performance.now();
  let selectData, selectError, count;

  try {
    const result = await query;
    selectData = result.data;
    selectError = result.error;
    count = result.count;
  } catch (abortErr) {
    const selectDuration = Math.round(performance.now() - selectStart);
    emitTelemetry({ operation: 'select', table, limit: safeLimit, offset: safeOffset, countMode, durationMs: selectDuration, status: 'error', error: 'Query timeout (client-side)' });
    return jsonResponse({ error: 'Query timeout - tente reduzir o escopo da busca' }, 408, corsHeaders);
  }

  const selectDuration = Math.round(performance.now() - selectStart);

  if (selectError) {
    if (table.startsWith('mv_') && isUnpopulatedMaterializedViewError(selectError.message)) {
      emitTelemetry({ operation: 'select', table, limit: safeLimit, offset: safeOffset, countMode, durationMs: selectDuration, status: 'ok', recordCount: 0 });
      console.warn(`[external-db-bridge] ${table} not populated yet; returning empty result`);
      return {
        records: [],
        count: 0,
        meta: { materialized_view_status: 'not_populated' },
      };
    }

    // On statement timeout for products, retry with even smaller limit and no count
    if (selectError.message?.includes('statement timeout') && isVeryHeavy && safeLimit > 50) {
      console.warn(`[retry] ${table} timed out with limit=${safeLimit}, retrying with limit=50 and no count`);
      const retryStart = performance.now();
      let retryQuery = externalSupabase.from(table).select(effectiveSelect);
      if (filters) retryQuery = applyFilters(retryQuery, filters, categoryDescendants);
      if (id) retryQuery = retryQuery.eq('id', id);
      if (orderBy) retryQuery = retryQuery.order(orderBy.column, { ascending: orderBy.ascending ?? false });
      retryQuery = retryQuery.range(safeOffset, safeOffset + 49);

      const { data: retryData, error: retryError } = await retryQuery;
      const retryDuration = Math.round(performance.now() - retryStart);

      if (retryError) {
        emitTelemetry({ operation: 'select', table, limit: 50, offset: safeOffset, countMode: 'none', durationMs: retryDuration, status: 'error', error: retryError.message });
        return jsonResponse({ error: retryError.message }, 400, corsHeaders);
      }

      let records = retryData || [];
      if (aliasType === 'technique') records = records.map(mapTechniqueRowToLegacyShape);
      if (aliasType === 'priceTable') records = records.map(mapPriceTableRowToLegacyShape);
      emitTelemetry({ operation: 'select', table, limit: 50, offset: safeOffset, countMode: 'none', durationMs: retryDuration, status: classifyDuration(retryDuration), recordCount: records.length });
      console.log(`[retry] Selected ${records.length} records from ${table} (offset=${safeOffset}, limit=50)`);
      return { records, count: null };
    }

    emitTelemetry({ operation: 'select', table, limit: safeLimit, offset: safeOffset, countMode, durationMs: selectDuration, status: 'error', error: selectError.message });
    return jsonResponse({ error: selectError.message }, 400, corsHeaders);
  }

  let records = selectData || [];

  // Apply legacy row transforms for aliased tables
  if (aliasType === 'technique') records = records.map(mapTechniqueRowToLegacyShape);
  if (aliasType === 'priceTable') records = records.map(mapPriceTableRowToLegacyShape);

  emitTelemetry({ operation: 'select', table, limit: safeLimit, offset: safeOffset, countMode, durationMs: selectDuration, status: classifyDuration(selectDuration), recordCount: records.length });
  console.log(`Selected ${records.length} records from ${table} (offset=${safeOffset}, limit=${safeLimit}, count=${count ?? 'n/a'})`);

  return { records, count: count ?? null };
}

// ============================================
// INSERT
// ============================================

async function handleInsert(externalSupabase: any, table: string, opts: any) {
  const { data, isVirtual, corsHeaders } = opts;

  if (isVirtual) {
    if (!data?.product_id || !data?.technique_id) {
      return jsonResponse({ error: 'product_id e technique_id obrigatórios para inserção em product_print_areas' }, 400, corsHeaders);
    }
    const productId = data.product_id as string;
    const techniqueId = data.technique_id as string;
    const areaName = (data.area_name as string) || 'Área Principal';

    const { product, error: productError, missingColumn } = await fetchProductForVirtualAreas(externalSupabase, productId);
    if (missingColumn) return jsonResponse({ error: 'Áreas de personalização não disponíveis neste catálogo externo' }, 503, corsHeaders);
    if (productError) return jsonResponse({ error: productError.message }, 400, corsHeaders);
    if (!product) return jsonResponse({ error: `Produto '${productId}' não encontrado` }, 404, corsHeaders);

    const { updatedAreas, areaId, alreadyLinked } = addTechniqueToAreas(product.personalization_areas, techniqueId, areaName);

    if (!alreadyLinked) {
      const { data: updatedProduct, error: updateError } = await externalSupabase
        .from('products')
        .update({ personalization_areas: updatedAreas, updated_at: new Date().toISOString() })
        .eq('id', productId).select('id').maybeSingle();

      if (updateError) return jsonResponse({ error: updateError.message, details: updateError.details }, 400, corsHeaders);
      if (!updatedProduct) return jsonResponse({ error: `Produto '${productId}' não encontrado para atualização` }, 404, corsHeaders);
    }

    const virtualRecord = buildVirtualRecords(productId, updatedAreas)
      .find((r) => r.area_id === areaId && r.technique_id === techniqueId);
    const result = virtualRecord || { id: `${productId}::${areaId}::${techniqueId}`, product_id: productId, area_id: areaId, technique_id: techniqueId };
    console.log(`${alreadyLinked ? 'Already linked' : 'Inserted virtual record'} in ${table}:`, (result as any).id);
    return result;
  }

  // Standard insert
  const canInjectCreatedAt = !TABLES_WITHOUT_CREATED_AT.includes(table);
  const canInjectUpdatedAt = !TABLES_WITHOUT_UPDATED_AT.includes(table);
  const insertData: Record<string, unknown> = sanitizeExternalWriteData(table, {
    ...data,
    ...(canInjectUpdatedAt ? { updated_at: new Date().toISOString() } : {}),
  });
  if (canInjectCreatedAt && !insertData.created_at) insertData.created_at = new Date().toISOString();

  console.log(`Inserting into ${table}:`, JSON.stringify(insertData).substring(0, 500));
  const { data: insertResult, error: insertError } = await externalSupabase.from(table).insert(insertData).select().single();

  if (insertError) {
    console.error('Insert error:', insertError.message, insertError.details, insertError.hint);
    return jsonResponse({ error: insertError.message, details: insertError.details, hint: insertError.hint }, 400, corsHeaders);
  }

  console.log(`Inserted record in ${table}:`, insertResult?.id);
  return insertResult;
}

// ============================================
// UPDATE
// ============================================

async function handleUpdate(externalSupabase: any, table: string, opts: any) {
  const { data, id, isVirtual, corsHeaders } = opts;

  if (isVirtual) {
    return jsonResponse({ error: 'Atualização direta de product_print_areas não suportada; atualize products.personalization_areas' }, 400, corsHeaders);
  }
  if (!id) return jsonResponse({ error: 'ID obrigatório para atualização' }, 400, corsHeaders);
  if (!data) return jsonResponse({ error: 'Dados obrigatórios para atualização' }, 400, corsHeaders);

  const canInjectUpdatedAt = !TABLES_WITHOUT_UPDATED_AT.includes(table);
  const updateData = sanitizeExternalWriteData(table, {
    ...data,
    ...(canInjectUpdatedAt ? { updated_at: new Date().toISOString() } : {}),
  });

  console.log(`Updating ${table} id=${id}:`, JSON.stringify(updateData).substring(0, 500));
  const { data: updateResult, error: updateError } = await externalSupabase.from(table).update(updateData).eq('id', id).select().maybeSingle();

  if (updateError) {
    console.error('Update error:', updateError.message, updateError.details, updateError.hint);
    return jsonResponse({ error: updateError.message, details: updateError.details, hint: updateError.hint }, 400, corsHeaders);
  }
  if (!updateResult) return jsonResponse({ error: `Registro não encontrado em '${table}' com id='${id}'` }, 404, corsHeaders);

  console.log(`Updated record in ${table}:`, id);
  return updateResult;
}

// ============================================
// DELETE
// ============================================

async function handleDelete(externalSupabase: any, table: string, opts: any) {
  const { id, isVirtual, corsHeaders } = opts;

  if (!id) return jsonResponse({ error: 'ID obrigatório para exclusão' }, 400, corsHeaders);

  if (isVirtual) {
    const parsedId = parseVirtualId(id);
    if (!parsedId) return jsonResponse({ error: `ID virtual inválido: '${id}'` }, 400, corsHeaders);

    const { product, error: productError, missingColumn } = await fetchProductForVirtualAreas(externalSupabase, parsedId.productId);
    if (missingColumn) return jsonResponse({ error: 'Áreas de personalização não disponíveis neste catálogo externo' }, 503, corsHeaders);
    if (productError) return jsonResponse({ error: productError.message }, 400, corsHeaders);
    if (!product) return jsonResponse({ error: `Produto '${parsedId.productId}' não encontrado` }, 404, corsHeaders);

    const { updatedAreas, removed } = removeTechniqueFromAreas(product.personalization_areas, parsedId.areaId, parsedId.techniqueId);
    if (!removed) return jsonResponse({ error: `Registro não encontrado em '${table}' com id='${id}'` }, 404, corsHeaders);

    const { data: updatedProduct, error: updateError } = await externalSupabase
      .from('products')
      .update({ personalization_areas: updatedAreas, updated_at: new Date().toISOString() })
      .eq('id', parsedId.productId).select('id').maybeSingle();

    if (updateError) return jsonResponse({ error: updateError.message, details: updateError.details }, 400, corsHeaders);
    if (!updatedProduct) return jsonResponse({ error: `Produto '${parsedId.productId}' não encontrado para atualização` }, 404, corsHeaders);

    console.log(`Deleted virtual record from ${table}:`, id);
    return { success: true, deleted_id: id };
  }

  // Standard delete
  const { data: deleteResult, error: deleteError } = await externalSupabase.from(table).delete().eq('id', id).select('id').maybeSingle();

  if (deleteError) {
    console.error('Delete error:', deleteError.message, deleteError.details, deleteError.hint);
    return jsonResponse({ error: deleteError.message, details: deleteError.details, hint: deleteError.hint }, 400, corsHeaders);
  }
  if (!deleteResult) return jsonResponse({ error: `Registro não encontrado em '${table}' com id='${id}'` }, 404, corsHeaders);

  console.log(`Deleted record from ${table}:`, id);
  return { success: true, deleted_id: id };
}

// ============================================
// UPSERT (single row, merge on SKU)
// ============================================

async function handleUpsert(externalSupabase: any, table: string, opts: any) {
  const { data, corsHeaders } = opts;
  if (!data) return jsonResponse({ error: 'Dados obrigatórios para upsert' }, 400, corsHeaders);

  const canInjectCreatedAt = !TABLES_WITHOUT_CREATED_AT.includes(table);
  const canInjectUpdatedAt = !TABLES_WITHOUT_UPDATED_AT.includes(table);
  const upsertData: Record<string, unknown> = sanitizeExternalWriteData(table, {
    ...data,
    ...(canInjectUpdatedAt ? { updated_at: new Date().toISOString() } : {}),
  });
  if (canInjectCreatedAt && !upsertData.created_at) upsertData.created_at = new Date().toISOString();

  // Default merge on 'sku' for products, 'id' for others
  const onConflict = table === 'products' ? 'sku' : 'id';

  console.log(`Upserting into ${table} (onConflict=${onConflict}):`, JSON.stringify(upsertData).substring(0, 500));
  const { data: result, error } = await externalSupabase
    .from(table)
    .upsert(upsertData, { onConflict })
    .select()
    .maybeSingle();

  if (error) {
    console.error('Upsert error:', error.message, error.details, error.hint);
    return jsonResponse({ error: error.message, details: error.details, hint: error.hint }, 400, corsHeaders);
  }

  console.log(`Upserted record in ${table}:`, result?.id);
  return result;
}

// ============================================
// BATCH INSERT (multiple rows in one call)
// ============================================

async function handleBatchInsert(externalSupabase: any, table: string, opts: any) {
  const { data, corsHeaders, onConflict } = opts;

  if (!Array.isArray(data) || data.length === 0) {
    return jsonResponse({ error: 'batch_insert requer "data" como array não-vazio' }, 400, corsHeaders);
  }
  if (data.length > 100) {
    return jsonResponse({ error: 'batch_insert limitado a 100 registros por chamada' }, 400, corsHeaders);
  }

  const canInjectCreatedAt = !TABLES_WITHOUT_CREATED_AT.includes(table);
  const canInjectUpdatedAt = !TABLES_WITHOUT_UPDATED_AT.includes(table);
  const now = new Date().toISOString();

  const sanitizedRows = data.map((row: Record<string, unknown>) => {
    const sanitized = sanitizeExternalWriteData(table, {
      ...row,
      ...(canInjectUpdatedAt ? { updated_at: now } : {}),
    });
    if (canInjectCreatedAt && !sanitized.created_at) sanitized.created_at = now;
    return sanitized;
  });

  const useUpsert = !!onConflict;
  const conflictColumn = typeof onConflict === 'string' ? onConflict : (table === 'products' ? 'sku' : 'id');

  console.log(`Batch ${useUpsert ? 'upsert' : 'insert'} into ${table}: ${sanitizedRows.length} rows${useUpsert ? ` (onConflict=${conflictColumn})` : ''}`);

  let result, error;

  if (useUpsert) {
    const response = await externalSupabase
      .from(table)
      .upsert(sanitizedRows, { onConflict: conflictColumn, ignoreDuplicates: false })
      .select('id,sku,name');
    result = response.data;
    error = response.error;
  } else {
    const response = await externalSupabase
      .from(table)
      .insert(sanitizedRows)
      .select('id,sku,name');
    result = response.data;
    error = response.error;
  }

  if (error) {
    console.error('Batch insert error:', error.message, error.details, error.hint);
    return jsonResponse({
      error: error.message,
      details: error.details,
      hint: error.hint,
    }, 400, corsHeaders);
  }

  console.log(`Batch ${useUpsert ? 'upserted' : 'inserted'} ${result?.length ?? 0} records in ${table}`);
  return { records: result || [], count: result?.length ?? 0 };
}

// ============================================
// UTILITIES
// ============================================

function jsonResponse(body: unknown, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

function getExternalClient(corsHeaders: Record<string, string>) {
  const externalUrl = Deno.env.get('EXTERNAL_SUPABASE_URL');
  const externalKey = Deno.env.get('EXTERNAL_SUPABASE_SERVICE_KEY');
  if (!externalUrl || !externalKey) {
    return jsonResponse({ error: 'Banco externo não configurado' }, 500, corsHeaders);
  }
  return createClient(externalUrl, externalKey, {
    db: { schema: 'public' },
    global: {
      headers: {
        'x-connection-timeout': '15000',
        // Increase PostgREST statement timeout to 25s to avoid premature cancellation
        'Prefer': 'max-affected=1000',
      },
    },
  });
}

// Default lightweight columns for products table to avoid fetching heavy JSONB columns
const PRODUCTS_LIGHTWEIGHT_SELECT = 'id,name,sku,sale_price,cost_price,primary_image_url,category_id,main_category_id,supplier_id,supplier_reference,description,short_description,brand,is_active,active,stock_quantity,min_quantity,created_at,updated_at,is_featured,is_bestseller,is_new,is_on_sale,is_kit';
