import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mapeamento completo das tabelas do banco externo
type ResourceGroup = 'products' | 'companies' | 'views';
type Operation = 'select' | 'insert' | 'update' | 'delete';

// Tabelas relacionadas a PRODUTOS (CRUD completo)
const PRODUCT_TABLES = [
  'products',
  'product_images',
  'product_videos',
  'product_variants',
  'product_materials',
  'product_tags',
  'product_categories',
  'product_category_assignments',
  'product_print_areas',
  'product_kit_components',
  'product_suppliers',
  'product_attributes',
  'product_relationships',
  'product_reviews',
  'product_views',
  'product_comparisons',
  'product_personalization_options',
  'product_price_history',
  'product_technique_pricing_tiers',
  'categories',
  'category_attributes',
  'category_relationships',
  'suppliers',
  'supplier_colors',
  'tags',
  'personalization_techniques',
  'customization_price_tables',
  'color_groups',
  'color_nuances',
  'color_equivalences',
  'color_variations',
  'material_groups',
  'material_types',
  'material_variations',
  'collections',
  'collection_products',
  'price_lists',
  'price_change_history',
  'variant_stocks',
  'variant_cost_tiers',
  'variant_sale_prices',
  'variation_types',
  'variation_values',
  'material_equivalences',
  'stock_movements',
  'mockup_drafts',
  'mockup_generation_jobs',
  'mockup_approval_links',
  'generated_mockups',
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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('Missing or invalid Authorization header');
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar cliente local com SERVICE_ROLE para evitar recursão de RLS
    // ao buscar user_roles (a policy de user_roles usa has_role() que acessa user_roles)
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
    
    if (userError || !user) {
      console.error('User validation failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    console.log(`Request from user: ${userId}`);

    // Buscar role do usuário usando SERVICE_ROLE (bypassa RLS)
    const { data: userRoles, error: roleError } = await localServiceSupabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (roleError) {
      console.error('Error fetching user roles:', roleError);
    }

    const userRole = userRoles?.[0]?.role || 'vendedor';
    console.log(`User role: ${userRole}`);

    // Parse body
    const body = await req.json();
    const { table, operation, data, filters, id, select, orderBy, limit: queryLimit } = body as {
      table: string;
      operation: Operation;
      data?: Record<string, unknown>;
      filters?: Record<string, unknown>;
      id?: string;
      select?: string;
      orderBy?: { column: string; ascending?: boolean };
      limit?: number;
    };

    console.log(`Operation: ${operation} on table: ${table}`);

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
        let query = externalSupabase.from(table).select(select || '*', { count: 'exact' });
        
        // Aplicar filtros
        if (filters) {
          Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
              if (typeof value === 'string') {
                // Busca parcial para campos de texto
                if (['name', 'description', 'title', 'razao_social', 'nome_fantasia'].includes(key)) {
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

        // Ordenar
        if (orderBy) {
          query = query.order(orderBy.column, { ascending: orderBy.ascending ?? false });
        } else {
          query = query.order('created_at', { ascending: false });
        }

        // Limitar resultados
        query = query.limit(queryLimit || 500);
        
        const { data: selectData, error: selectError, count } = await query;
        
        if (selectError) {
          console.error('Select error:', selectError);
          return new Response(
            JSON.stringify({ error: selectError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        result = { records: selectData, count };
        console.log(`Selected ${selectData?.length || 0} of ${count} records from ${table}`);
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
