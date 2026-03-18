import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth guard: require authenticated admin user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const { createClient: createAuthClient } = await import('https://esm.sh/@supabase/supabase-js@2.49.4');
    const supabaseAuth = createAuthClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Require admin role
    const { data: roleData } = await supabaseAuth.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle();
    if (!roleData) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: admin role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { mode = 'tables', tableName } = body;

    console.log(`[INSPECT] Mode: ${mode}, Table: ${tableName || 'all'}`);

    // Conectar ao banco externo
    const externalUrl = Deno.env.get('EXTERNAL_SUPABASE_URL');
    const externalKey = Deno.env.get('EXTERNAL_SUPABASE_SERVICE_KEY');

    if (!externalUrl || !externalKey) {
      return new Response(
        JSON.stringify({ error: 'Banco externo não configurado' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const externalSupabase = createClient(externalUrl, externalKey);

    // Lista de tabelas para testar (ordenadas por prioridade)
    const tablesToTest = [
      // Principais
      'products', 'categories', 'suppliers', 'tags',
      'personalization_techniques', 'customization_price_tables',
      // Produto relacionadas
      'product_images', 'product_videos', 'product_variants',
      'product_materials', 'product_tags', 'product_categories',
      'product_suppliers', 'product_print_areas', 'product_kit_components',
      // Cores e Materiais
      'color_groups', 'color_nuances', 'color_equivalences', 'color_variations',
      'material_groups', 'material_types', 'material_variations',
      'supplier_colors', 'supplier_materials',
      // Atributos
      'supplier_attribute_definitions', 'supplier_product_attributes',
      'product_attributes', 'category_attributes',
      // Preços e Estoque
      'price_lists', 'variant_stocks', 'variant_cost_tiers', 'variant_sale_prices',
      'variation_types', 'variation_values', 'stock_movements',
      // Coleções
      'collections', 'collection_products',
      // Ramos de atividade (Público Alvo)
      'ramo_atividade', 'ramo_atividade_filho', 'produto_ramo_atividade',
      // Empresas
      'bitrix_clients', 'organizations', 'client_contacts', 'business_sectors',
      // Mockups
      'mockup_drafts', 'generated_mockups',
    ];

    // Modo: verificar uma tabela específica
    if (mode === 'columns' && tableName) {
      try {
        const { data, error } = await externalSupabase
          .from(tableName)
          .select('*')
          .limit(1);

        if (error) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              table: tableName,
              error: error.message 
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const columns = data && data.length > 0 ? Object.keys(data[0]) : [];
        const sampleRow = data && data.length > 0 ? data[0] : null;

        return new Response(
          JSON.stringify({ 
            success: true,
            table: tableName,
            columns,
            sampleRow,
            columnTypes: columns.map(col => ({
              name: col,
              type: sampleRow ? typeof sampleRow[col] : 'unknown',
              value: sampleRow ? sampleRow[col] : null
            }))
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            table: tableName,
            error: err instanceof Error ? err.message : 'Erro desconhecido'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Modo padrão: listar todas as tabelas existentes
    const results: Array<{
      name: string;
      exists: boolean;
      columns: string[];
      rowCount: number;
      error?: string;
    }> = [];

    // Processar tabelas em lotes para não dar timeout
    const batchSize = 10;
    for (let i = 0; i < tablesToTest.length; i += batchSize) {
      const batch = tablesToTest.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (tbl) => {
        try {
          const { data, error, count } = await externalSupabase
            .from(tbl)
            .select('*', { count: 'exact', head: false })
            .limit(1);

          if (error) {
            return {
              name: tbl,
              exists: false,
              columns: [],
              rowCount: 0,
              error: error.message
            };
          }

          return {
            name: tbl,
            exists: true,
            columns: data && data.length > 0 ? Object.keys(data[0]) : [],
            rowCount: count || 0
          };
        } catch (err) {
          return {
            name: tbl,
            exists: false,
            columns: [],
            rowCount: 0,
            error: err instanceof Error ? err.message : 'Erro'
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    // Separar tabelas existentes e não existentes
    const existingTables = results.filter(r => r.exists);
    const missingTables = results.filter(r => !r.exists);

    console.log(`[INSPECT] Found ${existingTables.length} tables, ${missingTables.length} missing`);

    return new Response(
      JSON.stringify({ 
        success: true,
        summary: {
          total_tested: results.length,
          existing: existingTables.length,
          missing: missingTables.length
        },
        existingTables: existingTables.map(t => ({
          name: t.name,
          columns: t.columns,
          rowCount: t.rowCount
        })),
        missingTables: missingTables.map(t => ({
          name: t.name,
          error: t.error
        }))
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[INSPECT] Error:', errorMessage);
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
