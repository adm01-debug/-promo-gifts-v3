import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mapeamento completo das tabelas do banco externo
type ResourceGroup = 'products' | 'companies' | 'views';
type Operation = 'select' | 'insert' | 'update' | 'delete';

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
  'variant_supplier_sources',  // Dados de estoque e previsão de reposição
  // Coleções
  'collections',
  'collection_products',
  // Público Alvo / Ramos de Atividade
  'ramo_atividade',
  'ramo_atividade_filho',
  'produto_ramo_atividade',
  // Setores de negócio
  'business_sectors',
  // Mockups
  'mockup_drafts',
  'generated_mockups',
  // Técnicas de Personalização e Preços
  'personalization_techniques',
  'customization_price_tables',
  'customization_price_tiers',
  // ============================================
  // TÉCNICAS DE GRAVAÇÃO - BD EXTERNO PROMOBRIND
  // IMPORTANTE: Este é o ÚNICO banco de dados!
  // Não existe BD local para técnicas.
  // ============================================
  'tecnica_gravacao',           // Tabela principal de técnicas
  'tecnica_gravacao_variante',  // Variações de cada técnica (SINGULAR!)
  'tecnica_faixa_area',         // Faixas de preço por área
  'tecnica_faixa_pontos',       // Faixas de preço por pontos (bordado)
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
 * Compat: várias partes do app antigo ainda chamam a tabela
 * `personalization_techniques`, mas no BD externo a fonte de verdade é
 * `tecnica_gravacao`.
 */
function isPersonalizationTechniquesAlias(table: string) {
  return table === 'personalization_techniques';
}

/**
 * Compat: o app usa `customization_price_tables` mas no BD externo
 * a tabela real é `tecnica_faixa_area`.
 */
function isCustomizationPriceTablesAlias(table: string) {
  return table === 'customization_price_tables' || table === 'customization_price_tiers';
}

function mapPriceTableFiltersToExternal(filters: Record<string, unknown> | undefined) {
  if (!filters) return undefined;
  const out: Record<string, unknown> = { ...filters };

  // Mapear campos legacy para schema externo
  if ('is_active' in out) {
    out.ativo = out.is_active;
    delete out.is_active;
  }
  if ('table_code' in out) {
    // table_code no legacy corresponde ao codigo da técnica
    out.codigo = out.table_code;
    delete out.table_code;
  }
  if ('technique_id' in out) {
    out.tecnica_gravacao_id = out.technique_id;
    delete out.technique_id;
  }

  return out;
}

function mapPriceTableRowToLegacyShape(row: Record<string, unknown>) {
  return {
    ...row,
    // Campos esperados pelo frontend
    id: row.id,
    table_code: row.codigo,
    table_code_option: row.codigo,
    table_fullcode: row.codigo,
    customization_type_name: row.nome,
    max_colors: null,
    max_area_width_cm: row.area_maxima_cm2 ? Math.sqrt(row.area_maxima_cm2 as number) : null,
    max_area_height_cm: row.area_maxima_cm2 ? Math.sqrt(row.area_maxima_cm2 as number) : null,
    max_area_cm2: row.area_maxima_cm2,
    min_area_cm2: row.area_minima_cm2,
    price_by_color: false,
    price_by_area: true,
    setup_price: 0,
    handling_price: row.valor_adicional_peca ?? 0,
    price_modifier: row.multiplicador_preco ?? 1,
    is_active: row.ativo ?? true,
    technique_id: row.tecnica_gravacao_id,
    display_order: row.ordem_exibicao,
    description: row.descricao,
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
  if (!orderBy) return undefined;
  const columnMap: Record<string, string> = {
    name: 'nome',
    code: 'codigo',
    is_active: 'ativo',
    estimated_days: 'tempo_producao_dias',
  };
  return {
    ...orderBy,
    column: columnMap[orderBy.column] ?? orderBy.column,
  };
}

function mapTechniqueRowToLegacyShape(row: Record<string, unknown>) {
  const codigo = (row.codigo as string | undefined) ?? null;
  const nome = (row.nome as string | undefined) ?? '';
  const descricao = (row.descricao as string | undefined) ?? null;
  const ativo = (row.ativo as boolean | undefined) ?? true;
  const tempo = (row.tempo_producao_dias as number | undefined) ?? null;
  const maxCoresRaw = row.max_cores as unknown;
  const maxCores =
    typeof maxCoresRaw === 'number'
      ? maxCoresRaw
      : typeof maxCoresRaw === 'string'
        ? Number(maxCoresRaw)
        : null;

  // Retornar com campos legacy esperados em várias telas
  return {
    ...row,
    code: codigo,
    name: nome,
    description: descricao,
    is_active: ativo,
    estimated_days: tempo,
    requires_color_count: (row.permite_cores as boolean | undefined) ?? null,
    max_colors: Number.isFinite(maxCores as number) ? (maxCores as number) : null,
    display_order: (row.ordem_exibicao as number | undefined) ?? null,
    // Campos que existiam em alguns schemas antigos
    setup_price: null,
    handling_price: null,
    setup_cost: null,
    unit_cost: null,
    min_quantity: null,
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse body primeiro para verificar operação
    const body = await req.json();
    let table = (body as any).table as string;
    const operation = (body as any).operation as Operation;

    // Compatibilidade: alias de tabela antiga -> tabela real no BD externo
    const usingTechniqueAlias = isPersonalizationTechniquesAlias(table);
    const usingPriceTableAlias = isCustomizationPriceTablesAlias(table);
    
    if (usingTechniqueAlias) {
      table = 'tecnica_gravacao';
      (body as any).table = table;
      (body as any).filters = mapTechniqueFiltersToExternal((body as any).filters);
      (body as any).orderBy = mapTechniqueOrderByToExternal((body as any).orderBy);
      // select legacy pode referenciar colunas que não existem; força '*'
      (body as any).select = '*';
    }
    
    if (usingPriceTableAlias) {
      table = 'tecnica_faixa_area';
      (body as any).table = table;
      (body as any).filters = mapPriceTableFiltersToExternal((body as any).filters);
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

      // Criar cliente com token do usuário para validação
      const localSupabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      );

      // Validar token e obter usuário
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
    const { data, filters, id, select, orderBy, limit: queryLimit, offset: queryOffset } = body as {
      table: string;
      operation: Operation;
      data?: Record<string, unknown>;
      filters?: Record<string, unknown>;
      id?: string;
      select?: string;
      orderBy?: { column: string; ascending?: boolean };
      limit?: number;
      offset?: number;
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

    const externalSupabase = createClient(externalUrl, externalKey);
    let result;

    switch (operation) {
      case 'select': {
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
        
        let query = externalSupabase.from(table).select(select || '*', { count: 'exact' });
        
        // Aplicar filtros
        if (filters) {
          Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
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

        // Paginação (default compatível)
        const safeLimit = typeof queryLimit === 'number' && queryLimit > 0 ? queryLimit : 500;
        const safeOffset = typeof queryOffset === 'number' && queryOffset >= 0 ? queryOffset : 0;
        query = query.range(safeOffset, safeOffset + safeLimit - 1);
        
        const { data: selectData, error: selectError, count } = await query;
        
        if (selectError) {
          console.error('Select error:', selectError);
          return new Response(
            JSON.stringify({ error: selectError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Compat: mapear resposta para shape antigo quando chamarem personalization_techniques
        if (usingTechniqueAlias && Array.isArray(selectData)) {
          const mapped = selectData.map((r: any) => mapTechniqueRowToLegacyShape(r));
          result = { records: mapped, count };
        } else if (usingPriceTableAlias && Array.isArray(selectData)) {
          const mapped = selectData.map((r: any) => mapPriceTableRowToLegacyShape(r));
          result = { records: mapped, count };
        } else {
          result = { records: selectData, count };
        }
        console.log(`Selected ${selectData?.length || 0} of ${count} records from ${table} (offset=${safeOffset}, limit=${safeLimit})${categoryDescendants ? ` [category with ${categoryDescendants.length} descendants]` : ''}`);
        break;
      }

      case 'insert': {
        if (!data) {
          return new Response(
            JSON.stringify({ error: 'Dados obrigatórios para inserção' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Adicionar metadados
        const insertData = {
          ...data,
          created_by: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { data: insertResult, error: insertError } = await externalSupabase
          .from(table)
          .insert(insertData)
          .select()
          .single();

        if (insertError) {
          console.error('Insert error:', insertError);
          return new Response(
            JSON.stringify({ error: insertError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        result = insertResult;
        console.log(`Inserted record in ${table}:`, insertResult?.id);
        break;
      }

      case 'update': {
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

        // Adicionar metadados de atualização
        const updateData = {
          ...data,
          updated_by: userId,
          updated_at: new Date().toISOString(),
        };

        const { data: updateResult, error: updateError } = await externalSupabase
          .from(table)
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (updateError) {
          console.error('Update error:', updateError);
          return new Response(
            JSON.stringify({ error: updateError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

        const { error: deleteError } = await externalSupabase
          .from(table)
          .delete()
          .eq('id', id);

        if (deleteError) {
          console.error('Delete error:', deleteError);
          return new Response(
            JSON.stringify({ error: deleteError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    return new Response(
      JSON.stringify({ data: result, success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Unexpected error:', errorMessage);
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
