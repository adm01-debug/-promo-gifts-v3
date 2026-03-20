import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
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
    // Criar cliente para o banco externo
    const externalUrl = Deno.env.get('EXTERNAL_SUPABASE_URL');
    const externalKey = Deno.env.get('EXTERNAL_SUPABASE_SERVICE_KEY');

    if (!externalUrl || !externalKey) {
      throw new Error('Missing external database configuration');
    }

    const externalClient = createClient(externalUrl, externalKey);

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const { action, categoryIds, includeDescendants } = body;

    switch (action) {
      case 'tree': {
        // Buscar árvore de categorias
        const { data, error } = await externalClient
          .from('categories_tree_visual')
          .select('*')
          .order('sort_path', { ascending: true });

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'all': {
        // Buscar todas categorias
        const { data, error } = await externalClient
          .from('categories')
          .select('*')
          .order('name', { ascending: true });

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'descendants': {
        // Buscar categoria e todos os seus descendentes
        if (!categoryIds || categoryIds.length === 0) {
          return new Response(
            JSON.stringify({ success: true, data: [] }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Buscar categorias e seus filhos recursivamente
        const { data: allCategories, error: catError } = await externalClient
          .from('categories')
          .select('id, parent_id, name, level');

        if (catError) throw catError;

        // Função para encontrar todos os descendentes
        const findDescendants = (parentIds: string[]): string[] => {
          const descendants: string[] = [];
          const queue = [...parentIds];
          
          while (queue.length > 0) {
            const currentId = queue.shift()!;
            descendants.push(currentId);
            
            // Encontrar filhos diretos
            const children = allCategories
              .filter((c: any) => c.parent_id === currentId)
              .map((c: any) => c.id);
            
            queue.push(...children);
          }
          
          return [...new Set(descendants)]; // Remover duplicatas
        };

        const allCategoryIds = findDescendants(categoryIds);

        return new Response(
          JSON.stringify({ success: true, data: allCategoryIds }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'products_by_categories': {
        // Buscar produtos vinculados às categorias
        if (!categoryIds || categoryIds.length === 0) {
          return new Response(
            JSON.stringify({ success: true, productIds: [] }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        let targetCategoryIds = [...categoryIds];

        // Se includeDescendants = true, buscar também subcategorias
        if (includeDescendants) {
          const { data: allCategories, error: catError } = await externalClient
            .from('categories')
            .select('id, parent_id');

          if (catError) throw catError;

          // Encontrar todos os descendentes
          const findDescendants = (parentIds: string[]): string[] => {
            const descendants: string[] = [];
            const queue = [...parentIds];
            
            while (queue.length > 0) {
              const currentId = queue.shift()!;
              descendants.push(currentId);
              
              const children = allCategories
                .filter((c: any) => c.parent_id === currentId)
                .map((c: any) => c.id);
              
              queue.push(...children);
            }
            
            return [...new Set(descendants)];
          };

          targetCategoryIds = findDescendants(categoryIds);
        }

        console.log('Querying products for categories:', targetCategoryIds.length, 'categories');

        // ESTRATÉGIA 1: Usar products.category_id diretamente (fonte principal)
        // Este é o campo mais confiável no banco Promobrind
        console.log('Strategy 1: Using products.category_id directly...');
        const { data: directProducts, error: directError } = await externalClient
          .from('products')
          .select('id')
          .in('category_id', targetCategoryIds)
          .eq('is_active', true);

        if (!directError && directProducts && directProducts.length > 0) {
          const productIds = directProducts.map((p: any) => p.id);
          console.log(`Found ${productIds.length} products via products.category_id`);
          
          return new Response(
            JSON.stringify({ 
              success: true, 
              productIds,
              source: 'products.category_id',
              categoriesUsed: targetCategoryIds.length
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (directError) {
          console.log('products.category_id query error:', directError.message);
        }

        // ESTRATÉGIA 2: Tentar product_category_assignments (tabela N:N)
        // Nota: Esta tabela pode ter UUIDs de categoria inválidos/placeholders
        console.log('Strategy 2: Trying product_category_assignments...');
        const { data: assignments, error: assignError } = await externalClient
          .from('product_category_assignments')
          .select('product_id')
          .in('category_id', targetCategoryIds);

        if (!assignError && assignments && assignments.length > 0) {
          const productIds = [...new Set(assignments.map((a: any) => a.product_id))];
          console.log(`Found ${productIds.length} products via product_category_assignments`);
          
          return new Response(
            JSON.stringify({ 
              success: true, 
              productIds,
              source: 'product_category_assignments',
              categoriesUsed: targetCategoryIds.length
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // ESTRATÉGIA 3: Tentar product_categories (outra tabela N:N)
        console.log('Strategy 3: Trying product_categories table...');
        const { data: fallbackData, error: fallbackError } = await externalClient
          .from('product_categories')
          .select('product_id')
          .in('category_id', targetCategoryIds);

        if (!fallbackError && fallbackData && fallbackData.length > 0) {
          const productIds = [...new Set(fallbackData.map((a: any) => a.product_id))];
          console.log(`Found ${productIds.length} products via product_categories`);
          
          return new Response(
            JSON.stringify({ 
              success: true, 
              productIds,
              source: 'product_categories',
              categoriesUsed: targetCategoryIds.length
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Se nenhuma estratégia funcionou, retornar vazio
        console.log('No products found for selected categories');
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            productIds: [],
            source: 'none',
            categoriesUsed: targetCategoryIds.length,
            message: 'No products found for selected categories'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Invalid action. Valid: tree, all, descendants, products_by_categories' 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error('Error in categories-api:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
