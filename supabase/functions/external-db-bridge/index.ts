import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Mapeamento completo das tabelas do banco externo
type ResourceGroup = 'products' | 'companies' | 'views';
type Operation = 'select' | 'insert' | 'update' | 'delete' | 'rpc';

// Whitelist de RPCs permitidas
const ALLOWED_RPCS = [
  'fn_get_product_print_areas',
  'fn_get_product_print_areas_v2',
  'fn_get_product_customization_options',
  'fn_link_product_print_areas',
  'fn_backfill_product_print_areas',
  'fn_get_customization_price',
  'fn_get_customization_price_v2',
  'fn_find_fornecedor_price_table',
  'get_category_descendants',
] as const;

// Tabelas relacionadas a PRODUTOS (CRUD completo) - SINCRONIZADO 2026-01-30
const PRODUCT_TABLES = [
  // Principais
  'products',
  'categories',
  'suppliers',
  'tags',
  // Produto relacionadas
  'product_images',
  'product_videos',
  'product_variants',
  'product_materials',
  'product_tags',
  'product_categories',
  'product_category_assignments', // Vínculo N:N produto-categoria
  'product_suppliers',
  'product_print_areas',
  'product_kit_components',
  'product_attributes',
  // Cores
  'color_groups',
  'color_nuances',
  'color_equivalences',
  'color_variations',
  'supplier_colors',
  // Materiais
  'material_groups',
  'material_types',
  'material_variations',
  'supplier_materials',
  // Atributos e definições
  'supplier_attribute_definitions',
  'supplier_product_attributes',
  'category_attributes',
  // Preços e variações
  'price_lists',
  'variant_cost_tiers',
  'variant_sale_prices',
  'variation_types',
  'variation_values',
  'stock_movements',
  // Estoque e Reposição
  'variant_supplier_sources',  // Dados de estoque, previsão de reposição e dados fiscais
  // Fornecedor — Filiais
  'supplier_branches',         // Filiais de fornecedores (CNPJ, UF, regime tributário, ICMS)
  // Coleções
  'collections',
  'collection_products',
  // Público Alvo / Ramos de Atividade
  'ramo_atividade',
  'ramo_atividade_filho',
  'produto_ramo_atividade',
  // Setores de negócio
  'business_sectors',
  // NOTA: mockup_drafts e generated_mockups são tabelas LOCAIS (Lovable Cloud), removidas da whitelist do bridge externo
  // Técnicas de Personalização e Preços
  'personalization_techniques',
  'customization_price_tables',
  'customization_price_tiers',
  // ============================================
  // TÉCNICAS DE GRAVAÇÃO - BD EXTERNO PROMOBRIND
  // Tabelas REAIS que existem no banco externo
  // ============================================
  'tecnicas_gravacao',                     // 16 técnicas-mãe (Serigrafia, Laser, Bordado...)
  'print_area_techniques',                 // 2654 áreas de gravação vinculadas a produtos (FONTE ÚNICA)
  // ============================================
  // SISTEMA DE PREÇOS v2 - ARQUITETURA OFICIAL
  // Implementado em 02/02/2026
  // ============================================
  'tabela_preco_gravacao_oficial',         // 54 variantes de preço com configurações
  'tabela_preco_gravacao_oficial_faixa',   // 301 faixas de preço
  'organization_markup_customization',     // 59 configurações de markup (v5.1)
  // ============================================
  // SISTEMA DE PREÇOS v2 - VARIANTES POR ÁREA
  // category_area_techniques: vínculos área×técnica com variantes
  // ============================================
  'category_area_techniques',              // Vínculos área-técnica com variante_id
  'tabela_preco_fornecedores_gravacao',    // Tabela real mapeada via alias customization_price_tables
  // Histórico de preços
  'price_history',                         // Histórico de alterações de preço (usa changed_at, sem created_at/updated_at)
] as const;

// Views e Materialized Views (somente leitura)
const PRODUCT_VIEWS = [
  // Views de produtos
  'v_products_with_techniques',
  'v_products_with_stock',
  'v_products_with_tags',
  'v_products_min_price',
  'v_products_without_images',
  'v_products_without_videos',
  'v_products_missing_primary_image',
  'v_product_print_areas_complete',
  'v_product_images_cdn',
  'v_product_videos_cdn',
  'v_product_attributes_formatted',
  // Views de kits
  'v_kit_with_components',
  'v_kit_component_print_areas',
  // Views de preços e técnicas
  'v_customization_price_summary',
  'v_variant_pricing_complete',
  'v_technique_stats',
  'v_techniques_stricker_mapping',
  // Views de mídia e sync
  'v_media_stats',
  'v_n8n_sync_summary',
  'v_n8n_sync_errors',
  'v_n8n_sync_success_recent',
  // Materialized views
  'mv_product_compositions',
  'mv_material_group_stats',
  // Views de materiais
  'materials_complete',
  'products_with_materials',
  // View especial de categorias
  'categories_tree_visual',
] as const;

// Tabelas relacionadas a EMPRESAS/CLIENTES (somente leitura)
const COMPANY_TABLES = [
  'bitrix_clients',
  'client_contacts',
  'client_notes',
  'organizations',
  'user_organizations',
  'business_sectors',
] as const;

// Tabelas de sistema que NÃO devem ser acessadas
const SYSTEM_TABLES = [
  'user_roles',
  'user_onboarding',
  'profiles',
  'user_filter_presets',
  'user_favorites',
  'user_rewards',
  'notification_preferences',
  'notification_templates',
  'notifications',
  'push_subscriptions',
  'analytics_events',
  'audit_log',
  'search_queries',
  'sync_jobs',
  'feature_flags',
  'system_settings',
  'payments',
  'orders',
  'order_items',
  'quotes',
  'quote_items',
  'quote_versions',
  'quote_templates',
  'quote_comments',
  'achievements',
  'seller_achievements',
  'seller_gamification',
  'store_rewards',
  'expert_conversations',
  'expert_messages',
  'saved_filters',
  'geo_allowed_countries',
  'media_sync_log',
  'category_sync_log',
] as const;

type ProductTable = typeof PRODUCT_TABLES[number];
type ProductView = typeof PRODUCT_VIEWS[number];
type CompanyTable = typeof COMPANY_TABLES[number];

// Permissões por grupo
const PERMISSIONS: Record<ResourceGroup, Operation[]> = {
  products: ['select', 'insert', 'update', 'delete'],
  companies: ['select'], // Somente leitura
  views: ['select'], // Views são somente leitura
};

function getResourceGroup(tableName: string): ResourceGroup | null {
  if (PRODUCT_TABLES.includes(tableName as ProductTable)) {
    return 'products';
  }
  if (PRODUCT_VIEWS.includes(tableName as ProductView)) {
    return 'views';
  }
  if (COMPANY_TABLES.includes(tableName as CompanyTable)) {
    return 'companies';
  }
  return null;
}

// ============================================
// Aliases / Compatibilidade de schema (BD externo)
// ============================================

/**
 * Compat: várias partes do app chamam `personalization_techniques` ou
 * `tecnica_gravacao`, mas no BD externo a tabela real é
 * `tabela_preco_gravacao_oficial`.
 */
function isTechniqueTableAlias(table: string) {
  return table === 'personalization_techniques' || table === 'tecnica_gravacao';
}

/**
 * Compat: `tecnica_gravacao_variante` não existe mais.
 * Variantes são linhas na mesma tabela `tabela_preco_gravacao_oficial`
 * agrupadas por `grupo_tecnica`.
 */
function isTechniqueVarianteAlias(table: string) {
  return table === 'tecnica_gravacao_variante';
}

/**
 * Compat: o app usa `customization_price_tables` mas no BD externo
 * a tabela real é `tabela_preco_fornecedores_gravacao`.
 */
function isCustomizationPriceTablesAlias(table: string) {
  return table === 'customization_price_tables' || table === 'customization_price_tiers';
}

const PRODUCT_COLUMNS_NOT_IN_EXTERNAL_SCHEMA = new Set([
  // Logística (sem coluna correspondente no externo)
  'cest',
  'freight_class',
  'default_carrier',
  'shipping_weight_kg',
  'shipping_width_cm',
  'shipping_height_cm',
  'shipping_length_cm',
  'cubic_weight',
  'requires_special_shipping',
  'shipping_notes',
  // Fiscais (sem coluna correspondente no externo)
  'cfop',
  'csosn',
  'icms_rate',
  'pis_rate',
  'cofins_rate',
  'tax_regime',
  // Campos locais do formulário (sem coluna no externo)
  'stock_unit',
  'has_commercial_packaging',
  // Dimensões internas da embalagem (campos locais)
  'box_internal_height_cm',
  'box_internal_width_cm',
  'box_internal_length_cm',
  // Campo que precisa de rename (tratado no mapeamento abaixo)
  'country_of_origin',
  // Campo virtual (não existe na tabela products)
  'image_url',
]);

// Mapeamento de nomes diferentes entre formulário e banco externo
const PRODUCT_FIELD_RENAME_MAP: Record<string, string> = {
  'country_of_origin': 'origin_country',
};

function sanitizeExternalWriteData(table: string, data: Record<string, unknown>) {
  if (table !== 'products') return data;

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (PRODUCT_COLUMNS_NOT_IN_EXTERNAL_SCHEMA.has(key)) {
      // Se tem rename, mapeia; senão descarta
      const renamed = PRODUCT_FIELD_RENAME_MAP[key];
      if (renamed) result[renamed] = value;
      continue;
    }
    result[key] = value;
  }
  return result;
}

function mapPriceTableFiltersToExternal(filters: Record<string, unknown> | undefined) {
  if (!filters) return undefined;
  const out: Record<string, unknown> = { ...filters };

  // Mapear campos legacy para schema externo (tabela_preco_fornecedores_gravacao)
  if ('is_active' in out) {
    out.is_active = out.is_active; // Mesmo nome na tabela nova
  }
  if ('table_code' in out) {
    // table_code mapeia para tecnica_codigo
    out.tecnica_codigo = out.table_code;
    delete out.table_code;
  }
  if ('table_code_option' in out) {
    // table_code_option mapeia para table_code
    out.table_code = out.table_code_option;
    delete out.table_code_option;
  }
  if ('table_fullcode' in out) {
    out.table_code = out.table_fullcode;
    delete out.table_fullcode;
  }
  if ('technique_id' in out) {
    // technique_id não existe diretamente; usar tecnica_codigo se necessário
    delete out.technique_id;
  }
  if ('customization_type_name' in out) {
    out.tecnica_codigo = out.customization_type_name;
    delete out.customization_type_name;
  }

  return out;
}

function mapPriceTableOrderByToExternal(orderBy: { column: string; ascending?: boolean } | undefined) {
  if (!orderBy) return { column: 'table_code', ascending: true };
  
  const columnMap: Record<string, string> = {
    'table_code': 'table_code',
    'table_code_option': 'table_code',
    'customization_type_name': 'tecnica_codigo',
    'max_colors': 'max_colors',
    'display_order': 'table_code',
    'is_active': 'is_active',
  };

  return {
    column: columnMap[orderBy.column] || 'table_code',
    ascending: orderBy.ascending ?? true,
  };
}

function mapPriceTableRowToLegacyShape(row: Record<string, unknown>) {
  // Mapear tabela_preco_fornecedores_gravacao para shape legacy
  return {
    ...row,
    // Campos esperados pelo frontend (baseado no briefing)
    id: row.id,
    table_code: row.table_code,
    table_code_option: row.table_code,
    table_fullcode: row.table_code,
    customization_type_name: row.tecnica_codigo,
    tecnica_codigo: row.tecnica_codigo,
    max_colors: row.max_colors,
    max_area_width_cm: row.max_area_width_cm,
    max_area_height_cm: row.max_area_height_cm,
    price_by_color: row.price_by_color ?? false,
    price_by_area: row.price_by_area ?? false,
    setup_price: row.setup_price ?? 0,
    handling_price: 0,
    is_active: row.is_active ?? true,
    // Faixas de preço (min_qty_1 a min_qty_15, price_1 a price_15)
    min_qty_1: row.min_qty_1,
    min_qty_2: row.min_qty_2,
    min_qty_3: row.min_qty_3,
    min_qty_4: row.min_qty_4,
    min_qty_5: row.min_qty_5,
    price_1: row.price_1,
    price_2: row.price_2,
    price_3: row.price_3,
    price_4: row.price_4,
    price_5: row.price_5,
  };
}

function mapTechniqueFiltersToExternal(filters: Record<string, unknown> | undefined) {
  if (!filters) return undefined;
  const out: Record<string, unknown> = { ...filters };

  // boolean ativo
  if ('is_active' in out) {
    out.ativo = out.is_active;
    delete out.is_active;
  }

  // campos comuns
  if ('code' in out) {
    out.codigo = out.code;
    delete out.code;
  }
  if ('name' in out) {
    out.nome = out.name;
    delete out.name;
  }
  if ('description' in out) {
    out.descricao = out.description;
    delete out.description;
  }
  if ('max_colors' in out) {
    out.max_cores = out.max_colors;
    delete out.max_colors;
  }
  if ('estimated_days' in out) {
    out.tempo_producao_dias = out.estimated_days;
    delete out.estimated_days;
  }

  return out;
}

function mapTechniqueOrderByToExternal(orderBy: { column: string; ascending?: boolean } | undefined) {
  if (!orderBy) return { column: 'nome', ascending: true };
  const columnMap: Record<string, string> = {
    name: 'nome',
    nome: 'nome',
    code: 'codigo',
    codigo: 'codigo',
    is_active: 'ativo',
    ativo: 'ativo',
    estimated_days: 'tempo_producao_dias',
    tempo_producao_dias: 'tempo_producao_dias',
    ordem_exibicao: 'nome',
    display_order: 'nome',
  };
  return {
    ...orderBy,
    column: columnMap[orderBy.column] ?? orderBy.column,
  };
}

function mapTechniqueRowToLegacyShape(row: Record<string, unknown>) {
  // Mapear tabela_preco_gravacao_oficial → shape legacy (tecnica_gravacao / personalization_techniques)
  const codigo = (row.codigo as string | undefined) ?? null;
  const nome = (row.nome as string | undefined) ?? '';
  const descricao = (row.descricao as string | undefined) ?? null;
  const ativo = (row.ativo as boolean | undefined) ?? true;
  const tempo = (row.tempo_producao_dias as number | undefined) ?? null;
  const maxCores = typeof row.max_cores === 'number' ? row.max_cores : null;
  const cobraPorCor = (row.cobra_por_cor as boolean | undefined) ?? false;
  const custoSetup = typeof row.custo_setup === 'number' ? row.custo_setup : 0;

  return {
    ...row,
    // Campos legacy esperados pelo frontend (tecnica_gravacao shape)
    codigo: codigo,
    codigo_interno: (row.codigo_curto as string | undefined) ?? codigo,
    nome: nome,
    slug: (row.slug_grupo as string | undefined) ?? '',
    descricao: descricao,
    permite_cores: maxCores != null && maxCores > 0,
    max_cores: maxCores,
    cobra_por_cor: cobraPorCor,
    cobra_por_area: false,
    cobra_por_pontos: false,
    requer_setup: custoSetup > 0,
    tipo_setup: custoSetup > 0 ? 'arte_digital' : 'nenhum',
    tempo_producao_dias: tempo,
    ordem_exibicao: (row.ordem_exibicao as number | undefined) ?? 0,
    ativo: ativo,
    // Campos legacy (personalization_techniques shape)
    code: codigo,
    name: nome,
    description: descricao,
    is_active: ativo,
    estimated_days: tempo,
    requires_color_count: maxCores != null && maxCores > 0,
    max_colors: maxCores,
    display_order: (row.ordem_exibicao as number | undefined) ?? 0,
    price_by_color: cobraPorCor,
    price_by_area: false,
    setup_cost: custoSetup,
    unit_cost: null,
    min_quantity: null,
    setup_price: custoSetup,
    handling_price: (row.custo_manuseio as number | undefined) ?? 0,
    // Campos extras da tabela real
    grupo_tecnica: row.grupo_tecnica,
    nome_grupo: row.nome_grupo,
    slug_grupo: row.slug_grupo,
    ordem_grupo: (row.ordem_exibicao as number | undefined) ?? 0,
    custo_setup: custoSetup,
    custo_aplicacao: row.custo_aplicacao,
    cobra_aplicacao: row.cobra_aplicacao,
  };
}

// ============================================
// TELEMETRY CONFIG
// ============================================
const SLOW_QUERY_THRESHOLD_MS = 3000; // Alert if query takes > 3s
const VERY_SLOW_QUERY_THRESHOLD_MS = 8000; // Warn critically if > 8s

function emitTelemetry(meta: {
  operation: string;
  table?: string;
  rpcName?: string;
  limit?: number;
  offset?: number;
  countMode?: string;
  durationMs: number;
  recordCount?: number;
  status: 'ok' | 'error' | 'slow' | 'very_slow';
  error?: string;
  userId?: string | null;
}) {
  const icon = meta.status === 'very_slow' ? '🔴' : meta.status === 'slow' ? '🟡' : meta.status === 'error' ? '❌' : '✅';
  const target = meta.rpcName || meta.table || 'unknown';
  const line = `${icon} [telemetry] ${meta.operation}:${target} ${meta.durationMs}ms | records=${meta.recordCount ?? '-'} limit=${meta.limit ?? '-'} offset=${meta.offset ?? '-'} count=${meta.countMode ?? '-'}`;
  
  if (meta.status === 'very_slow') {
    console.warn(`⚠️ VERY SLOW QUERY: ${line}`);
  } else if (meta.status === 'slow') {
    console.warn(`⚠️ SLOW QUERY: ${line}`);
  } else if (meta.status === 'error') {
    console.error(line + ` error=${meta.error}`);
  } else {
    console.info(line);
  }

  // Persist slow/very_slow/error queries to the telemetry table (fire-and-forget)
  if (meta.status !== 'ok') {
    try {
      const localUrl = Deno.env.get('SUPABASE_URL');
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      if (localUrl && serviceKey) {
        const localClient = createClient(localUrl, serviceKey);
        localClient.from('query_telemetry').insert({
          operation: meta.operation,
          table_name: meta.table || null,
          rpc_name: meta.rpcName || null,
          duration_ms: meta.durationMs,
          record_count: meta.recordCount ?? null,
          query_limit: meta.limit ?? null,
          query_offset: meta.offset ?? null,
          count_mode: meta.countMode || null,
          severity: meta.status,
          error_message: meta.error || null,
          user_id: meta.userId || null,
        }).then(({ error: insertErr }) => {
          if (insertErr) console.warn('[telemetry-persist] Insert failed:', insertErr.message);
        });
      }
    } catch (e) {
      // Fire-and-forget: don't block the response
    }
  }
}

// ============================================
// IN-MEMORY CACHE for reference tables
// Survives across requests within the same isolate (~5-15 min)
// ============================================
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const REFERENCE_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const referenceCache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = referenceCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > REFERENCE_CACHE_TTL_MS) {
    referenceCache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T): void {
  referenceCache.set(key, { data, timestamp: Date.now() });
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestStartTime = performance.now();

  try {
    // Parse body primeiro para verificar operação
    const body = await req.json();

    // ============================================
    // BATCH OPERATION — multiple queries in one call
    // ============================================
    if ((body as any).operation === 'batch') {
      const queries = (body as any).queries as Array<Record<string, unknown>>;
      if (!Array.isArray(queries) || queries.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Batch requires a non-empty "queries" array' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (queries.length > 10) {
        return new Response(
          JSON.stringify({ error: 'Batch limited to 10 queries max' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Single auth check for all queries
      const externalUrl = Deno.env.get('EXTERNAL_SUPABASE_URL');
      const externalKey = Deno.env.get('EXTERNAL_SUPABASE_SERVICE_KEY');
      if (!externalUrl || !externalKey) {
        return new Response(
          JSON.stringify({ error: 'Banco externo não configurado' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Single DB client for all queries
      const externalSupabase = createClient(externalUrl, externalKey, {
        db: { schema: 'public' },
        global: { headers: { 'x-connection-timeout': '15000' } },
      });

      // Execute all queries in parallel
      const results = await Promise.all(
        queries.map(async (q, idx) => {
          const qTable = q.table as string;
          const qSelect = (q.select as string) || '*';
          const qFilters = q.filters as Record<string, unknown> | undefined;
          const qOrderBy = q.orderBy as { column: string; ascending?: boolean } | undefined;
          const isHeavyBatchTable = ['products', 'product_images', 'product_variants', 'color_variations', 'product_categories', 'product_category_assignments'].includes(qTable);
          const qHasSearchFilter = !!(qFilters && '_search' in qFilters);
          const rawLimit = (q.limit as number) || 500;
          const qOffset = (q.offset as number) || 0;
          const qLimit = !isHeavyBatchTable
            ? rawLimit
            : qHasSearchFilter
              ? Math.min(rawLimit, 120)
              : qOffset >= 1000
                ? Math.min(rawLimit, 125)
                : Math.min(rawLimit, 200);
          const qCacheKey = q.cacheKey as string | undefined;

          // Check in-memory cache first
          if (qCacheKey) {
            const cached = getCached<{ records: unknown[]; count: number | null }>(qCacheKey);
            if (cached) {
              console.log(`[batch] Query ${idx} (${qTable}) served from cache (${(cached.records as unknown[]).length} records)`);
              return { success: true, data: cached, fromCache: true };
            }
          }

          // Validate table
          const resourceGroup = getResourceGroup(qTable);
          if (!resourceGroup) {
            return { success: false, error: `Tabela '${qTable}' não mapeada` };
          }

          try {
            const queryStart = performance.now();
            let query = externalSupabase.from(qTable).select(qSelect);

            // Apply filters
            if (qFilters) {
              Object.entries(qFilters).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                  if (key === '_search' && typeof value === 'string') {
                    const escaped = value.replace(/%/g, '\\%').replace(/_/g, '\\_');
                    query = query.or(`name.ilike.%${escaped}%,sku.ilike.%${escaped}%,supplier_reference.ilike.%${escaped}%,brand.ilike.%${escaped}%,description.ilike.%${escaped}%`);
                    return;
                  }
                  if (typeof value === 'string') {
                    if (['name', 'description', 'title', 'razao_social', 'nome_fantasia', 'nome', 'descricao'].includes(key)) {
                      query = query.ilike(key, `%${value}%`);
                    } else {
                      query = query.eq(key, value);
                    }
                  } else if (Array.isArray(value)) {
                    query = query.in(key, value);
                  } else {
                    query = query.eq(key, value);
                  }
                }
              });
            }

            if (qOrderBy) {
              query = query.order(qOrderBy.column, { ascending: qOrderBy.ascending ?? false });
            }

            query = query.range(qOffset, qOffset + qLimit - 1);

            const { data: selectData, error: selectError, count } = await query;
            const duration = Math.round(performance.now() - queryStart);

            if (selectError) {
              console.warn(`[batch] Query ${idx} (${qTable}) failed in ${duration}ms: ${selectError.message}`);
              return { success: false, error: selectError.message };
            }

            const result = { records: selectData || [], count };

            // Store in cache if cacheKey was provided
            if (qCacheKey) {
              setCache(qCacheKey, result);
            }

            const status = duration >= VERY_SLOW_QUERY_THRESHOLD_MS ? '🔴' : duration >= SLOW_QUERY_THRESHOLD_MS ? '🟡' : '✅';
            console.log(`[batch] ${status} Query ${idx} (${qTable}) ${duration}ms, ${selectData?.length ?? 0} records`);

            return { success: true, data: result };
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return { success: false, error: msg };
          }
        })
      );

      const totalDuration = Math.round(performance.now() - requestStartTime);
      console.log(`[batch] Total: ${totalDuration}ms for ${queries.length} queries`);

      return new Response(
        JSON.stringify({ success: true, results }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const operation = (body as any).operation as Operation;

    // ============================================
    // OPERAÇÃO RPC (Remote Procedure Call)
    // ============================================
    if (operation === 'rpc') {
      const rpcName = (body as any).rpcName as string;
      const rpcParams = (body as any).rpcParams as Record<string, unknown>;

      // Validar RPC na whitelist
      if (!ALLOWED_RPCS.includes(rpcName as any)) {
        return new Response(
          JSON.stringify({ 
            error: `RPC '${rpcName}' não permitida`,
            allowedRpcs: ALLOWED_RPCS,
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Criar cliente para banco externo
      const externalUrl = Deno.env.get('EXTERNAL_SUPABASE_URL');
      const externalKey = Deno.env.get('EXTERNAL_SUPABASE_SERVICE_KEY');

      if (!externalUrl || !externalKey) {
        return new Response(
          JSON.stringify({ error: 'Banco externo não configurado' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const externalSupabase = createClient(externalUrl, externalKey);
      
      console.log(`RPC: ${rpcName}`, rpcParams);
      
      const rpcStart = performance.now();
      const { data: rpcData, error: rpcError } = await externalSupabase.rpc(rpcName, rpcParams || {});
      const rpcDuration = Math.round(performance.now() - rpcStart);

      if (rpcError) {
        emitTelemetry({ operation: 'rpc', rpcName, durationMs: rpcDuration, status: 'error', error: rpcError.message });
        return new Response(
          JSON.stringify({ error: rpcError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const rpcStatus = rpcDuration >= VERY_SLOW_QUERY_THRESHOLD_MS ? 'very_slow' : rpcDuration >= SLOW_QUERY_THRESHOLD_MS ? 'slow' : 'ok';
      emitTelemetry({ operation: 'rpc', rpcName, durationMs: rpcDuration, status: rpcStatus, recordCount: Array.isArray(rpcData) ? rpcData.length : 1 });

      // ============================================
      // ENRIQUECIMENTO: fn_get_customization_price (legacy flat response only)
      // A v5.9 retorna resposta nested completa — não precisa de enriquecimento
      // ============================================
      let enrichedData = rpcData;
      const isLegacyFlatResponse = rpcData?.success && rpcData?.tabela_codigo && !rpcData?.tabela;
      const shouldEnrich = (
        (rpcName === 'fn_get_customization_price') 
        && isLegacyFlatResponse
      );
      if (shouldEnrich) {
        try {
          // 1. Buscar tabela oficial pelo código (inclui area_maxima_texto, max_cores, cobra_por_cor)
          const { data: tabelaRows } = await externalSupabase
            .from('tabela_preco_gravacao_oficial')
            .select('id,area_maxima_texto,max_cores,cobra_por_cor')
            .eq('codigo', rpcData.tabela_codigo)
            .eq('ativo', true)
            .limit(1);

          if (tabelaRows?.length) {
            const tabelaId = tabelaRows[0].id;
            const areaMaxTexto = tabelaRows[0].area_maxima_texto;
            const maxCoresFromTable = tabelaRows[0].max_cores;
            const cobraPorCor = tabelaRows[0].cobra_por_cor;

            // 2. Buscar dimensões das faixas dessa tabela
            // Estratégia: pegar MAX real (excluindo sentinelas >=90 que significam "sem limite")
            const { data: faixaRows } = await externalSupabase
              .from('tabela_preco_gravacao_oficial_faixa')
              .select('largura_max,altura_max')
              .eq('tabela_preco_gravacao_id', tabelaId);

            let maxLargura: number | null = null;
            let maxAltura: number | null = null;

            if (faixaRows?.length) {
              const larguras = faixaRows
                .map((f: any) => typeof f.largura_max === 'number' ? f.largura_max : null)
                .filter((v: number | null): v is number => v !== null && v < 90);
              const alturas = faixaRows
                .map((f: any) => typeof f.altura_max === 'number' ? f.altura_max : null)
                .filter((v: number | null): v is number => v !== null && v < 90);

              maxLargura = larguras.length ? Math.max(...larguras) : null;
              maxAltura = alturas.length ? Math.max(...alturas) : null;
            }

            enrichedData = {
              ...rpcData,
              tabela: {
                ...(rpcData.tabela || {}),
                id: tabelaId,
                area_maxima_texto: areaMaxTexto ?? null,
                largura_max_cm: maxLargura,
                altura_max_cm: maxAltura,
                max_cores: maxCoresFromTable ?? rpcData.max_cores ?? null,
                cobra_por_cor: cobraPorCor ?? false,
              },
            };
          }
        } catch (enrichError) {
          console.warn('[external-db-bridge] RPC enrichment failed:', enrichError);
        }
      }

      return new Response(
        JSON.stringify({ success: true, data: enrichedData }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let table = (body as any).table as string;

    // Guard: table must be a non-empty string for non-RPC operations
    if (!table || typeof table !== 'string' || table === 'undefined') {
      console.error(`[external-db-bridge] Missing or invalid table: ${JSON.stringify(table)}, operation: ${operation}`);
      return new Response(
        JSON.stringify({ 
          error: `Parâmetro 'table' é obrigatório e deve ser uma string válida (recebido: ${JSON.stringify(table)})`,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // OPERAÇÕES CRUD (select, insert, update, delete)
    // ============================================

    // Compatibilidade: alias de tabela antiga -> tabela real no BD externo
    const usingTechniqueAlias = isTechniqueTableAlias(table);
    const usingVarianteAlias = isTechniqueVarianteAlias(table);
    const usingPriceTableAlias = isCustomizationPriceTablesAlias(table);
    
    if (usingTechniqueAlias) {
      table = 'tabela_preco_gravacao_oficial';
      (body as any).table = table;
      (body as any).filters = mapTechniqueFiltersToExternal((body as any).filters);
      (body as any).orderBy = mapTechniqueOrderByToExternal((body as any).orderBy);
      (body as any).select = '*';
    }

    if (usingVarianteAlias) {
      // Variantes agora são linhas na mesma tabela agrupadas por grupo_tecnica.
      // Para queries com tecnica_gravacao_id, precisamos buscar pelo grupo.
      table = 'tabela_preco_gravacao_oficial';
      (body as any).table = table;
      const varFilters = (body as any).filters as Record<string, unknown> | undefined;
      if (varFilters?.tecnica_gravacao_id) {
        // Guardar o ID pai para buscar grupo depois
        (body as any)._parentTechniqueId = varFilters.tecnica_gravacao_id;
        delete varFilters.tecnica_gravacao_id;
      }
      (body as any).filters = varFilters;
      (body as any).select = '*';
    }
    
    if (usingPriceTableAlias) {
      table = 'tabela_preco_fornecedores_gravacao';
      (body as any).table = table;
      (body as any).filters = mapPriceTableFiltersToExternal((body as any).filters);
      (body as any).orderBy = mapPriceTableOrderByToExternal((body as any).orderBy);
      (body as any).select = '*';
    }
    
    // Operações de leitura podem ser públicas (para busca de produtos no login/público)
    const isReadOperation = operation === 'select';
    const isPublicTable = PRODUCT_TABLES.includes(table as ProductTable) || 
                          PRODUCT_VIEWS.includes(table as ProductView);
    const allowPublicAccess = isReadOperation && isPublicTable;

    // Verificar autenticação (opcional para leitura de produtos)
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    let userRole = 'public';

    if (authHeader?.startsWith('Bearer ')) {
      // Criar cliente local com SERVICE_ROLE para evitar recursão de RLS
      const localServiceSupabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      // Validar token via getUser (método universal)
      const localSupabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: { user }, error: userError } = await localSupabase.auth.getUser();
      
      if (user && !userError) {
        userId = user.id;
        console.log(`Request from user: ${userId}`);

        // Buscar role do usuário usando SERVICE_ROLE (bypassa RLS)
        const { data: userRoles, error: roleError } = await localServiceSupabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId);

        if (roleError) {
          console.error('Error fetching user roles:', roleError);
        }

        userRole = userRoles?.[0]?.role || 'vendedor';
        console.log(`User role: ${userRole}`);
      } else {
        console.error('Auth failed:', userError?.message);
      }
    }

    // Se não é acesso público permitido e não está autenticado, bloquear
    if (!allowPublicAccess && !userId) {
      console.error('Authentication required for this operation');
      return new Response(
        JSON.stringify({ error: 'Autenticação necessária' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Operation: ${operation} on table: ${table} (public: ${allowPublicAccess})`);

    // Extrair dados adicionais do body já parseado
    const { data, filters, id, select, orderBy, limit: queryLimit, offset: queryOffset, countMode: requestCountMode } = body as {
      table: string;
      operation: Operation;
      data?: Record<string, unknown>;
      filters?: Record<string, unknown>;
      id?: string;
      select?: string;
      orderBy?: { column: string; ascending?: boolean };
      limit?: number;
      offset?: number;
      countMode?: 'exact' | 'planned' | 'estimated' | 'none';
    };

    // Identificar grupo do recurso
    const resourceGroup = getResourceGroup(table);
    
    if (!resourceGroup) {
      // Verificar se é tabela de sistema bloqueada
      if (SYSTEM_TABLES.includes(table as any)) {
        return new Response(
          JSON.stringify({ error: `Tabela '${table}' não está disponível para acesso externo` }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: `Tabela '${table}' não mapeada`,
          availableTables: {
            products: PRODUCT_TABLES,
            companies: COMPANY_TABLES,
          }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar operação
    if (!operation || !PERMISSIONS[resourceGroup].includes(operation)) {
      return new Response(
        JSON.stringify({ 
          error: `Operação '${operation}' não permitida para tabelas de '${resourceGroup}'`,
          allowed: PERMISSIONS[resourceGroup]
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar permissões baseadas em role para operações de escrita
    if (['insert', 'update', 'delete'].includes(operation)) {
      if (!['admin', 'gerente', 'vendedor'].includes(userRole)) {
        return new Response(
          JSON.stringify({ error: 'Permissão insuficiente para esta operação' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Vendedor só pode inserir e editar, não pode deletar
      if (userRole === 'vendedor' && operation === 'delete') {
        return new Response(
          JSON.stringify({ error: 'Vendedores não podem excluir registros' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Criar cliente para banco externo
    const externalUrl = Deno.env.get('EXTERNAL_SUPABASE_URL');
    const externalKey = Deno.env.get('EXTERNAL_SUPABASE_SERVICE_KEY');

    if (!externalUrl || !externalKey) {
      console.error('External Supabase credentials not configured');
      return new Response(
        JSON.stringify({ error: 'Banco externo não configurado' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const externalSupabase = createClient(externalUrl, externalKey, {
      db: { schema: 'public' },
      global: { headers: { 'x-connection-timeout': '15000' } },
    });

    const isVirtualProductPrintAreasTable = table === 'product_print_areas';

    const normalizeTechniqueIds = (value: unknown): string[] => {
      if (!Array.isArray(value)) return [];
      return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
    };

    const normalizePersonalizationArea = (value: unknown): Record<string, unknown> => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
      return { ...(value as Record<string, unknown>) };
    };

    const getPersonalizationAreas = (value: unknown): Record<string, unknown>[] => {
      if (!Array.isArray(value)) return [];
      return value.map(normalizePersonalizationArea);
    };

    const getPersonalizationAreaId = (area: Record<string, unknown>, index: number): string => {
      const rawId = area.id;
      return typeof rawId === 'string' && rawId.trim().length > 0 ? rawId : `area-${index}`;
    };

    const buildVirtualProductPrintAreaRecords = (productId: string, personalizationAreas: unknown): Record<string, unknown>[] => {
      const areas = getPersonalizationAreas(personalizationAreas);

      return areas.flatMap((area, index) => {
        const areaId = getPersonalizationAreaId(area, index);
        const techniqueIds = normalizeTechniqueIds(area.allowed_technique_ids ?? area.technique_ids);

        return techniqueIds.map((techniqueId) => ({
          ...area,
          id: `${productId}::${areaId}::${techniqueId}`,
          product_id: productId,
          area_id: areaId,
          area_name: typeof area.area_name === 'string'
            ? area.area_name
            : typeof area.name === 'string'
              ? area.name
              : `Área ${index + 1}`,
          technique_id: techniqueId,
          allowed_technique_ids: techniqueIds,
          is_active: area.is_active !== false,
          display_order: typeof area.display_order === 'number' ? area.display_order : index,
          component_name: typeof area.component_name === 'string' ? area.component_name : null,
          location_name: typeof area.location_name === 'string' ? area.location_name : null,
          _virtual: true,
        }));
      });
    };

    const parseVirtualProductPrintAreaId = (virtualId: string) => {
      const parts = virtualId.split('::');
      if (parts.length !== 3 || parts.some((part) => !part)) return null;

      const [productId, areaId, techniqueId] = parts;
      return { productId, areaId, techniqueId };
    };

    const fetchProductForVirtualPrintAreas = async (productId: string) => {
      const { data: product, error } = await externalSupabase
        .from('products')
        .select('id, personalization_areas')
        .eq('id', productId)
        .maybeSingle();

      const missingPersonalizationAreasColumn = !!error?.message?.includes("personalization_areas");
      return { product, error, missingPersonalizationAreasColumn };
    };

    const addTechniqueToPersonalizationAreas = (
      personalizationAreas: unknown,
      techniqueId: string,
      areaName = 'Área Principal'
    ) => {
      const areas = getPersonalizationAreas(personalizationAreas);

      if (areas.length === 0) {
        const areaId = crypto.randomUUID();
        return {
          updatedAreas: [{
            id: areaId,
            area_name: areaName,
            allowed_technique_ids: [techniqueId],
            is_active: true,
            is_primary: true,
            display_order: 0,
            unit: 'cm',
            shape: 'rectangle',
            max_width: 0,
            max_height: 0,
          }],
          areaId,
          alreadyLinked: false,
        };
      }

      const targetIndex = areas.findIndex((area) => area.is_primary === true);
      const resolvedIndex = targetIndex >= 0 ? targetIndex : 0;
      const targetArea = normalizePersonalizationArea(areas[resolvedIndex]);
      const areaId = getPersonalizationAreaId(targetArea, resolvedIndex);
      const existingTechniqueIds = normalizeTechniqueIds(targetArea.allowed_technique_ids ?? targetArea.technique_ids);
      const alreadyLinked = existingTechniqueIds.includes(techniqueId);
      const nextTechniqueIds = alreadyLinked ? existingTechniqueIds : [...existingTechniqueIds, techniqueId];

      targetArea.id = areaId;
      targetArea.allowed_technique_ids = nextTechniqueIds;
      if ('technique_ids' in targetArea) {
        targetArea.technique_ids = nextTechniqueIds;
      }
      if (typeof targetArea.area_name !== 'string' && typeof targetArea.name !== 'string') {
        targetArea.area_name = areaName;
      }

      areas[resolvedIndex] = targetArea;

      return {
        updatedAreas: areas,
        areaId,
        alreadyLinked,
      };
    };

    const removeTechniqueFromPersonalizationAreas = (
      personalizationAreas: unknown,
      areaId: string,
      techniqueId: string
    ) => {
      const areas = getPersonalizationAreas(personalizationAreas);
      let removed = false;

      const updatedAreas = areas.map((area, index) => {
        const nextArea = normalizePersonalizationArea(area);
        const nextAreaId = getPersonalizationAreaId(nextArea, index);

        if (nextAreaId !== areaId) {
          return nextArea;
        }

        const currentTechniqueIds = normalizeTechniqueIds(nextArea.allowed_technique_ids ?? nextArea.technique_ids);
        const nextTechniqueIds = currentTechniqueIds.filter((existingId) => existingId !== techniqueId);
        removed = removed || nextTechniqueIds.length !== currentTechniqueIds.length;

        nextArea.id = nextAreaId;
        nextArea.allowed_technique_ids = nextTechniqueIds;
        if ('technique_ids' in nextArea) {
          nextArea.technique_ids = nextTechniqueIds;
        }

        return nextArea;
      });

      return { updatedAreas, removed };
    };

    let result;

    switch (operation) {
      case 'select': {
        if (isVirtualProductPrintAreasTable) {
          const selectStart = performance.now();
          const productIdFromId = typeof id === 'string' ? parseVirtualProductPrintAreaId(id)?.productId : null;
          const virtualProductId = productIdFromId
            ?? (typeof filters?.product_id === 'string' ? filters.product_id : null);

          if (!virtualProductId) {
            const selectDuration = Math.round(performance.now() - selectStart);
            emitTelemetry({ operation: 'select', table, durationMs: selectDuration, status: 'error', error: 'Filtro product_id é obrigatório para product_print_areas' });
            return new Response(
              JSON.stringify({ error: 'Filtro product_id é obrigatório para product_print_areas' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          const { product, error: productError, missingPersonalizationAreasColumn } = await fetchProductForVirtualPrintAreas(virtualProductId);
          const selectDuration = Math.round(performance.now() - selectStart);

          if (missingPersonalizationAreasColumn) {
            emitTelemetry({ operation: 'select', table, durationMs: selectDuration, status: 'ok', recordCount: 0 });
            result = { records: [], count: 0 };
            console.warn(`Virtual table ${table} unavailable: products.personalization_areas does not exist in external schema`);
            break;
          }

          if (productError) {
            emitTelemetry({ operation: 'select', table, durationMs: selectDuration, status: 'error', error: productError.message });
            return new Response(
              JSON.stringify({ error: productError.message }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          const requestedLimit = typeof queryLimit === 'number' && queryLimit > 0 ? queryLimit : 200;
          const safeOffset = typeof queryOffset === 'number' && queryOffset >= 0 ? queryOffset : 0;
          const allRecords = buildVirtualProductPrintAreaRecords(virtualProductId, product?.personalization_areas);

          let filteredRecords = allRecords;

          if (id) {
            filteredRecords = filteredRecords.filter((record) => record.id === id);
          }

          if (filters) {
            filteredRecords = filteredRecords.filter((record) => {
              return Object.entries(filters).every(([key, value]) => {
                if (value === undefined || value === null || value === '') return true;
                if (key === 'product_id') return true;

                const recordValue = record[key];
                if (Array.isArray(value)) {
                  return value.includes(recordValue as never);
                }

                return recordValue === value;
              });
            });
          }

          const paginatedRecords = filteredRecords.slice(safeOffset, safeOffset + requestedLimit);
          const selectStatus = selectDuration >= VERY_SLOW_QUERY_THRESHOLD_MS ? 'very_slow' : selectDuration >= SLOW_QUERY_THRESHOLD_MS ? 'slow' : 'ok';
          emitTelemetry({ operation: 'select', table, limit: requestedLimit, offset: safeOffset, countMode: 'virtual', durationMs: selectDuration, status: selectStatus, recordCount: paginatedRecords.length });

          result = { records: paginatedRecords, count: filteredRecords.length };
          console.log(`Selected ${paginatedRecords.length} of ${filteredRecords.length} virtual records from ${table} (offset=${safeOffset}, limit=${requestedLimit})`);
          break;
        }

        // ============================================
        // FILTRO POR CATEGORIA COM DESCENDENTES
        // Usa função get_category_descendants() do BD para incluir subcategorias
        // ============================================
        let categoryDescendants: string[] | null = null;
        let categoryFilterKey: string | null = null;
        
        if (table === 'products' && filters && (filters.category_id || filters.main_category_id)) {
          const categoryId = (filters.category_id || filters.main_category_id) as string;
          categoryFilterKey = filters.category_id ? 'category_id' : 'main_category_id';
          
          // Buscar todos os IDs descendentes da categoria selecionada
          try {
            const { data: descendantsData, error: descendantsError } = await externalSupabase
              .rpc('get_category_descendants', { category_uuid: categoryId });
            
            if (!descendantsError && descendantsData && Array.isArray(descendantsData)) {
              categoryDescendants = descendantsData as string[];
              console.log(`Category ${categoryId} has ${categoryDescendants.length} descendants (including self)`);
            } else if (descendantsError) {
              console.warn('Could not fetch category descendants, falling back to exact match:', descendantsError.message);
            }
          } catch (err) {
            console.warn('Error calling get_category_descendants:', err);
          }
        }

        const isHeavyTable = ['products', 'product_images', 'product_variants', 'color_variations', 'product_categories', 'product_category_assignments'].includes(table);
        const isVeryHeavyTable = ['products', 'product_images'].includes(table);
        const hasSearchFilter = filters && '_search' in filters;

        // Heavy tables or search queries: avoid exact count to prevent timeouts
        // Very heavy tables (products, product_images) default to 'none' to prevent statement timeouts
        const countMode = requestCountMode
          ?? (hasSearchFilter ? 'none' : (isVeryHeavyTable ? 'none' : (isHeavyTable ? 'planned' : 'exact')));

        const queryCountMode = countMode === 'none' ? undefined : countMode;

        let query = queryCountMode
          ? externalSupabase.from(table).select(select || '*', { count: queryCountMode })
          : externalSupabase.from(table).select(select || '*');
        
        // Aplicar filtros
        if (filters) {
          Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
              // Busca multi-campo: _search faz OR entre name, sku, supplier_reference, brand, description e category_name
              if (key === '_search' && typeof value === 'string') {
                const escaped = value.replace(/%/g, '\\%').replace(/_/g, '\\_');
                query = query.or(`name.ilike.%${escaped}%,sku.ilike.%${escaped}%,supplier_reference.ilike.%${escaped}%,brand.ilike.%${escaped}%,description.ilike.%${escaped}%`);
                return;
              }

              // Se é filtro de categoria e temos descendentes, usar IN ao invés de EQ
              if (categoryDescendants && (key === 'category_id' || key === 'main_category_id')) {
                query = query.in(key, categoryDescendants);
                return; // Skip o processamento normal
              }
              
              if (typeof value === 'string') {
                // Busca parcial para campos de texto
                if (['name', 'description', 'title', 'razao_social', 'nome_fantasia', 'nome', 'descricao'].includes(key)) {
                  query = query.ilike(key, `%${value}%`);
                } else {
                  query = query.eq(key, value);
                }
              } else if (Array.isArray(value)) {
                query = query.in(key, value);
              } else {
                query = query.eq(key, value);
              }
            }
          });
        }

        // Filtrar por ID específico
        if (id) {
          query = query.eq('id', id);
        }

        // Ordenar (só aplicar default se orderBy explícito for passado)
        if (orderBy) {
          query = query.order(orderBy.column, { ascending: orderBy.ascending ?? false });
        }
        // Não aplicar ordenação default - nem todas as tabelas têm created_at

        // Paginação adaptativa: corta lotes grandes em tabelas pesadas para evitar statement timeout
        const requestedLimit = typeof queryLimit === 'number' && queryLimit > 0 ? queryLimit : 500;
        const safeOffset = typeof queryOffset === 'number' && queryOffset >= 0 ? queryOffset : 0;
        const safeLimit = !isHeavyTable
          ? requestedLimit
          : hasSearchFilter
            ? Math.min(requestedLimit, 120)
            : isVeryHeavyTable
              ? Math.min(requestedLimit, 100)
              : safeOffset >= 1000
                ? Math.min(requestedLimit, 125)
                : Math.min(requestedLimit, 200);
        query = query.range(safeOffset, safeOffset + safeLimit - 1);
        
        const selectStart = performance.now();
        const { data: selectData, error: selectError, count } = await query;
        const selectDuration = Math.round(performance.now() - selectStart);
        
        if (selectError) {
          emitTelemetry({ operation: 'select', table, limit: safeLimit, offset: safeOffset, countMode: countMode, durationMs: selectDuration, status: 'error', error: selectError.message });
          return new Response(
            JSON.stringify({ error: selectError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const selectStatus = selectDuration >= VERY_SLOW_QUERY_THRESHOLD_MS ? 'very_slow' : selectDuration >= SLOW_QUERY_THRESHOLD_MS ? 'slow' : 'ok';
        emitTelemetry({ operation: 'select', table, limit: safeLimit, offset: safeOffset, countMode: countMode, durationMs: selectDuration, status: selectStatus, recordCount: selectData?.length ?? 0 });
        
        // Compat: mapear resposta para shape antigo
        if ((usingTechniqueAlias || usingVarianteAlias) && Array.isArray(selectData)) {
          let mappedData = selectData;

          // Para variantes: filtrar por grupo do pai
          if (usingVarianteAlias && (body as any)._parentTechniqueId) {
            const parentId = (body as any)._parentTechniqueId;
            const parent = selectData.find((r: any) => r.id === parentId);
            if (parent) {
              // Retornar técnicas do mesmo grupo (excluindo o pai)
              mappedData = selectData.filter(
                (r: any) => (r as any).grupo_tecnica === (parent as any).grupo_tecnica && r.id !== parentId
              );
            } else {
              mappedData = [];
            }
          }

          const mapped = mappedData.map((r: any) => {
            const legacy = mapTechniqueRowToLegacyShape(r);
            // Para variantes, adicionar campo tecnica_gravacao_id
            if (usingVarianteAlias && (body as any)._parentTechniqueId) {
              (legacy as any).tecnica_gravacao_id = (body as any)._parentTechniqueId;
            }
            return legacy;
          });
          result = { records: mapped, count: mapped.length };
        } else if (usingPriceTableAlias && Array.isArray(selectData)) {
          const mapped = selectData.map((r: any) => mapPriceTableRowToLegacyShape(r));
          result = { records: mapped, count };
        } else {
          result = { records: selectData, count };
        }
        console.log(`Selected ${selectData?.length || 0} of ${typeof count === 'number' ? count : 'n/a'} records from ${table} (offset=${safeOffset}, limit=${safeLimit}, countMode=${countMode})${categoryDescendants ? ` [category with ${categoryDescendants.length} descendants]` : ''}`);
        break;
      }

      case 'insert': {
        if (!data) {
          return new Response(
            JSON.stringify({ error: 'Dados obrigatórios para inserção' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (isVirtualProductPrintAreasTable) {
          const productId = typeof data.product_id === 'string' ? data.product_id : '';
          const techniqueId = typeof data.technique_id === 'string' ? data.technique_id : '';

          if (!productId || !techniqueId) {
            return new Response(
              JSON.stringify({ error: 'product_id e technique_id são obrigatórios para product_print_areas' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          const { product, error: productError, missingPersonalizationAreasColumn } = await fetchProductForVirtualPrintAreas(productId);
          if (missingPersonalizationAreasColumn) {
            return new Response(
              JSON.stringify({ error: 'Áreas de personalização não estão disponíveis neste catálogo externo' }),
              { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          if (productError) {
            return new Response(
              JSON.stringify({ error: productError.message }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          if (!product) {
            return new Response(
              JSON.stringify({ error: `Produto '${productId}' não encontrado` }),
              { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          const { updatedAreas, areaId, alreadyLinked } = addTechniqueToPersonalizationAreas(
            product.personalization_areas,
            techniqueId,
            typeof data.area_name === 'string' ? data.area_name : 'Área Principal'
          );

          const nextPersonalizationAreas = alreadyLinked ? product.personalization_areas : updatedAreas;

          if (!alreadyLinked) {
            const { data: updatedProduct, error: updateError } = await externalSupabase
              .from('products')
              .update({
                personalization_areas: updatedAreas,
                updated_at: new Date().toISOString(),
              })
              .eq('id', productId)
              .select('id, personalization_areas')
              .maybeSingle();

            if (updateError) {
              return new Response(
                JSON.stringify({ error: updateError.message, details: updateError.details, hint: updateError.hint }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }

            if (!updatedProduct) {
              return new Response(
                JSON.stringify({ error: `Produto '${productId}' não encontrado para atualização` }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
          }

          const virtualRecord = buildVirtualProductPrintAreaRecords(productId, nextPersonalizationAreas)
            .find((record) => record.area_id === areaId && record.technique_id === techniqueId);

          result = virtualRecord || {
            id: `${productId}::${areaId}::${techniqueId}`,
            product_id: productId,
            area_id: areaId,
            technique_id: techniqueId,
          };
          console.log(`${alreadyLinked ? 'Technique already linked in' : 'Inserted virtual record in'} ${table}:`, (result as Record<string, unknown>).id);
          break;
        }

        // Tables with non-standard timestamp columns (audited 2026-03-26)
        // Granular: some tables have updated_at but not created_at, or vice-versa
        const TABLES_WITHOUT_CREATED_AT = [
          'variant_supplier_sources',       // tem updated_at, SEM created_at
          'price_history',                  // usa changed_at
          'collection_products',            // usa added_at
        ];
        const TABLES_WITHOUT_UPDATED_AT = [
          'product_tags',                   // só tem created_at
          'produto_ramo_atividade',         // só tem created_at
          'price_history',                  // usa changed_at
          'collection_products',            // usa added_at
          'product_category_assignments',   // só tem created_at
        ];
        const canInjectCreatedAt = !TABLES_WITHOUT_CREATED_AT.includes(table);
        const canInjectUpdatedAtInsert = !TABLES_WITHOUT_UPDATED_AT.includes(table);

        // Adicionar metadados de timestamp (não injeta created_by/updated_by pois nem todas as tabelas têm essas colunas)
        const insertData: Record<string, unknown> = sanitizeExternalWriteData(table, {
          ...data,
          ...(canInjectUpdatedAtInsert ? { updated_at: new Date().toISOString() } : {}),
        });
        // Só adicionar created_at se não veio no payload e a tabela suporta
        if (canInjectCreatedAt && !insertData.created_at) {
          insertData.created_at = new Date().toISOString();
        }

        console.log(`Inserting into ${table}:`, JSON.stringify(insertData).substring(0, 500));

        const { data: insertResult, error: insertError } = await externalSupabase
          .from(table)
          .insert(insertData)
          .select()
          .single();

        if (insertError) {
          console.error('Insert error:', insertError.message, insertError.details, insertError.hint);
          return new Response(
            JSON.stringify({ error: insertError.message, details: insertError.details, hint: insertError.hint }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        result = insertResult;
        console.log(`Inserted record in ${table}:`, insertResult?.id);
        break;
      }

      case 'update': {
        if (isVirtualProductPrintAreasTable) {
          return new Response(
            JSON.stringify({ error: 'Atualização direta de product_print_areas não é suportada; atualize products.personalization_areas' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (!id) {
          return new Response(
            JSON.stringify({ error: 'ID obrigatório para atualização' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (!data) {
          return new Response(
            JSON.stringify({ error: 'Dados obrigatórios para atualização' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Adicionar metadados de atualização (sem updated_by — nem todas as tabelas têm essa coluna)
        // Tables without standard updated_at column
        const TABLES_WITHOUT_UPDATED_AT = [
          'product_tags',                   // só tem created_at
          'produto_ramo_atividade',         // só tem created_at
          'price_history',                  // usa changed_at, sem created_at/updated_at
          'collection_products',            // usa added_at, sem created_at/updated_at
          'product_category_assignments',   // só tem created_at
        ];
        const canInjectUpdatedAt = !TABLES_WITHOUT_UPDATED_AT.includes(table);
        const updateData = sanitizeExternalWriteData(table, {
          ...data,
          ...(canInjectUpdatedAt ? { updated_at: new Date().toISOString() } : {}),
        });

        console.log(`Updating ${table} id=${id}:`, JSON.stringify(updateData).substring(0, 500));

        const { data: updateResult, error: updateError } = await externalSupabase
          .from(table)
          .update(updateData)
          .eq('id', id)
          .select()
          .maybeSingle();

        if (updateError) {
          console.error('Update error:', updateError.message, updateError.details, updateError.hint);
          return new Response(
            JSON.stringify({ error: updateError.message, details: updateError.details, hint: updateError.hint }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (!updateResult) {
          return new Response(
            JSON.stringify({ error: `Registro não encontrado para atualização em '${table}' com id='${id}'` }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        result = updateResult;
        console.log(`Updated record in ${table}:`, id);
        break;
      }

      case 'delete': {
        if (!id) {
          return new Response(
            JSON.stringify({ error: 'ID obrigatório para exclusão' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (isVirtualProductPrintAreasTable) {
          const parsedId = parseVirtualProductPrintAreaId(id);
          if (!parsedId) {
            return new Response(
              JSON.stringify({ error: `ID virtual inválido para product_print_areas: '${id}'` }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          const { product, error: productError, missingPersonalizationAreasColumn } = await fetchProductForVirtualPrintAreas(parsedId.productId);
          if (missingPersonalizationAreasColumn) {
            return new Response(
              JSON.stringify({ error: 'Áreas de personalização não estão disponíveis neste catálogo externo' }),
              { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          if (productError) {
            return new Response(
              JSON.stringify({ error: productError.message }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          if (!product) {
            return new Response(
              JSON.stringify({ error: `Produto '${parsedId.productId}' não encontrado` }),
              { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          const { updatedAreas, removed } = removeTechniqueFromPersonalizationAreas(
            product.personalization_areas,
            parsedId.areaId,
            parsedId.techniqueId
          );

          if (!removed) {
            return new Response(
              JSON.stringify({ error: `Registro não encontrado para exclusão em '${table}' com id='${id}'` }),
              { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          const { data: updatedProduct, error: updateError } = await externalSupabase
            .from('products')
            .update({
              personalization_areas: updatedAreas,
              updated_at: new Date().toISOString(),
            })
            .eq('id', parsedId.productId)
            .select('id')
            .maybeSingle();

          if (updateError) {
            return new Response(
              JSON.stringify({ error: updateError.message, details: updateError.details, hint: updateError.hint }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          if (!updatedProduct) {
            return new Response(
              JSON.stringify({ error: `Produto '${parsedId.productId}' não encontrado para atualização` }),
              { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          result = { success: true, deleted_id: id };
          console.log(`Deleted virtual record from ${table}:`, id);
          break;
        }

        const { data: deleteResult, error: deleteError } = await externalSupabase
          .from(table)
          .delete()
          .eq('id', id)
          .select('id')
          .maybeSingle();

        if (deleteError) {
          console.error('Delete error:', deleteError.message, deleteError.details, deleteError.hint);
          return new Response(
            JSON.stringify({ error: deleteError.message, details: deleteError.details, hint: deleteError.hint }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (!deleteResult) {
          return new Response(
            JSON.stringify({ error: `Registro não encontrado para exclusão em '${table}' com id='${id}'` }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        result = { success: true, deleted_id: id };
        console.log(`Deleted record from ${table}:`, id);
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Operação não suportada: ${operation}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    const totalDuration = Math.round(performance.now() - requestStartTime);
    if (totalDuration >= VERY_SLOW_QUERY_THRESHOLD_MS) {
      console.warn(`🔴 [telemetry] Total request ${operation}:${table} took ${totalDuration}ms (VERY SLOW)`);
    } else if (totalDuration >= SLOW_QUERY_THRESHOLD_MS) {
      console.warn(`🟡 [telemetry] Total request ${operation}:${table} took ${totalDuration}ms (SLOW)`);
    }

    return new Response(
      JSON.stringify({ data: result, success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const totalDuration = Math.round(performance.now() - requestStartTime);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error(`❌ [telemetry] Request failed after ${totalDuration}ms: ${errorMessage}`);
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
