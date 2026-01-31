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
        // Buscar produtos vinculados às categorias via product_category_assignments
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

        // Buscar na tabela de vínculo N:N (product_category_assignments)
        const { data: assignments, error: assignError } = await externalClient
          .from('product_category_assignments')
          .select('product_id')
          .in('category_id', targetCategoryIds);

        if (assignError) {
          // Se a tabela não existir, tentar fallback para product_categories
          console.log('Tentando fallback para product_categories...');
          
          const { data: fallbackData, error: fallbackError } = await externalClient
            .from('product_categories')
            .select('product_id')
            .in('category_id', targetCategoryIds);

          if (fallbackError) {
            // Último fallback: buscar por category_id direto nos produtos
            console.log('Tentando fallback para products.category_id...');
            
            const { data: productsData, error: productsError } = await externalClient
              .from('products')
              .select('id')
              .in('category_id', targetCategoryIds);

            if (productsError) throw productsError;

            const productIds = [...new Set(productsData.map((p: any) => p.id))];
            
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

          const productIds = [...new Set(fallbackData.map((a: any) => a.product_id))];
          
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

        const productIds = [...new Set(assignments.map((a: any) => a.product_id))];

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
