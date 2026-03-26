import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const extUrl = Deno.env.get('EXTERNAL_SUPABASE_URL')!;
  const extKey = Deno.env.get('EXTERNAL_SUPABASE_SERVICE_KEY')!;
  const ext = createClient(extUrl, extKey);

  const TABLES = [
    'products','categories','suppliers','tags',
    'product_images','product_videos','product_variants','product_materials',
    'product_tags','product_category_assignments',
    'product_kit_components','product_properties',
    'color_groups','color_nuances','color_equivalences','color_variations','supplier_colors',
    'material_groups','material_types','material_variations','supplier_materials',
    'supplier_attribute_definitions','supplier_property_mappings','category_attributes',
    'variation_types','variation_values',
    'variant_supplier_sources','supplier_branches',
    'collections','collection_products',
    'ramo_atividade','ramo_atividade_filho','produto_ramo_atividade',
    'tecnicas_gravacao','print_area_techniques',
    'tabela_preco_gravacao_oficial','tabela_preco_gravacao_oficial_faixa',
    'price_history',
  ];

  const results: Record<string, unknown> = {};

  for (const table of TABLES) {
    try {
      // Use PostgREST select with limit 1 and get all columns
      const { data, error } = await ext.from(table).select('*').limit(1);
      if (error) {
        results[table] = { error: error.message };
        continue;
      }
      if (data && data.length > 0) {
        const cols = Object.keys(data[0]);
        const hasCreatedAt = cols.includes('created_at');
        const hasUpdatedAt = cols.includes('updated_at');
        const timeCols = cols.filter(c => 
          c.includes('_at') || c.includes('date') || c.includes('time') || c.includes('stamp')
        );
        const altTimeCols = timeCols.filter(c => c !== 'created_at' && c !== 'updated_at');
        results[table] = {
          has_created_at: hasCreatedAt,
          has_updated_at: hasUpdatedAt,
          alt_timestamp_cols: altTimeCols,
          all_columns: cols,
        };
      } else {
        // Empty table - try to get column info from an error-free select
        const { data: d2, error: e2 } = await ext.from(table).select('*').limit(0);
        results[table] = { empty: true, note: 'No rows to inspect columns' };
      }
    } catch (e) {
      results[table] = { error: String(e) };
    }
  }

  // Summary: tables that LACK created_at or updated_at
  const issues: Record<string, unknown> = {};
  for (const [table, info] of Object.entries(results)) {
    const i = info as any;
    if (i.error || i.empty) continue;
    if (!i.has_created_at || !i.has_updated_at) {
      issues[table] = {
        has_created_at: i.has_created_at,
        has_updated_at: i.has_updated_at,
        alt_timestamp_cols: i.alt_timestamp_cols,
      };
    }
  }

  return new Response(JSON.stringify({ issues, full: results }, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
