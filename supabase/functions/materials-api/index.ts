import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar token no banco local
    const localSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await localSupabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Materials API request from user: ${user.id}`);

    // Parse body
    const body = await req.json();
    const { action, groupId, materialId, productId, limit = 100 } = body as {
      action: 'groups' | 'types' | 'types_by_group' | 'product_materials' | 'stats' | 'search';
      groupId?: string;
      materialId?: string;
      productId?: string;
      limit?: number;
      search?: string;
    };

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
    let result;

    switch (action) {
      case 'groups': {
        // Buscar grupos de materiais com estatísticas
        const { data, error } = await externalSupabase
          .from('mv_material_group_stats')
          .select('*')
          .order('group_name', { ascending: true });

        if (error) throw error;
        result = { groups: data, count: data?.length || 0 };
        break;
      }

      case 'types': {
        // Buscar todos os tipos de materiais via RPC para evitar RLS
        const { data, error } = await externalSupabase.rpc('get_all_material_types', {
          p_limit: limit
        });

        if (error) {
          console.error('Error fetching material types via RPC:', error);
          // Fallback: tentar buscar direto (pode falhar com RLS)
          const { data: fallbackData, error: fallbackError } = await externalSupabase
            .from('material_types')
            .select('id, name, slug, description, display_order, is_active, group_id')
            .eq('is_active', true)
            .order('name', { ascending: true })
            .limit(limit);
          
          if (fallbackError) {
            console.error('Fallback also failed:', fallbackError);
            throw new Error(fallbackError.message);
          }
          result = { types: fallbackData, count: fallbackData?.length || 0 };
        } else {
          result = { types: data, count: data?.length || 0 };
        }
        break;
      }

      case 'types_by_group': {
        // Buscar tipos de um grupo específico
        if (!groupId) {
          return new Response(
            JSON.stringify({ error: 'groupId é obrigatório' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Tentar via RPC primeiro
        const { data, error } = await externalSupabase.rpc('get_material_types_by_group', {
          p_group_id: groupId
        });

        if (error) {
          console.error('Error fetching material types by group via RPC:', error);
          // Fallback
          const { data: fallbackData, error: fallbackError } = await externalSupabase
            .from('material_types')
            .select('id, name, slug, description, display_order, is_active')
            .eq('group_id', groupId)
            .eq('is_active', true)
            .order('display_order', { ascending: true });
          
          if (fallbackError) {
            console.error('Fallback also failed:', fallbackError);
            throw new Error(fallbackError.message);
          }
          result = { types: fallbackData, count: fallbackData?.length || 0, groupId };
        } else {
          result = { types: data, count: data?.length || 0, groupId };
        }
        break;
      }

      case 'product_materials': {
        // Buscar materiais de um produto
        if (!productId) {
          return new Response(
            JSON.stringify({ error: 'productId é obrigatório' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data, error } = await externalSupabase
          .from('product_materials')
          .select(`
            id,
            part,
            percentage,
            notes,
            sort_order,
            material_id,
            material_types!inner (
              id,
              name,
              slug,
              group_id,
              material_groups!inner (
                id,
                name,
                slug
              )
            )
          `)
          .eq('product_id', productId)
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        if (error) throw error;
        result = { materials: data, count: data?.length || 0, productId };
        break;
      }

      case 'stats': {
        // Estatísticas gerais de materiais
        const { data, error } = await externalSupabase
          .from('mv_material_group_stats')
          .select('*')
          .order('products_using', { ascending: false });

        if (error) throw error;
        
        const totalMaterials = data?.reduce((sum, g) => sum + (g.total_materials || 0), 0) || 0;
        const totalProducts = data?.reduce((sum, g) => sum + (g.products_using || 0), 0) || 0;
        
        result = { 
          groups: data, 
          summary: {
            totalGroups: data?.length || 0,
            totalMaterials,
            totalProducts,
          }
        };
        break;
      }

      case 'search': {
        // Buscar materiais por nome
        const searchTerm = body.search || '';
        if (!searchTerm) {
          return new Response(
            JSON.stringify({ error: 'search é obrigatório' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data, error } = await externalSupabase
          .from('material_types')
          .select(`
            id,
            name,
            slug,
            description,
            group_id
          `)
          .eq('is_active', true)
          .ilike('name', `%${searchTerm}%`)
          .order('name', { ascending: true })
          .limit(20);

        if (error) throw error;
        result = { types: data, count: data?.length || 0, search: searchTerm };
        break;
      }

      default:
        return new Response(
          JSON.stringify({ 
            error: `Ação '${action}' não suportada`,
            availableActions: ['groups', 'types', 'types_by_group', 'product_materials', 'stats', 'search']
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return new Response(
      JSON.stringify({ data: result, success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Materials API error:', errorMessage);
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
