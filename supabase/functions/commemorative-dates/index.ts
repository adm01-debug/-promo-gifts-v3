import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
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

    // Criar cliente local para validar token
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

    console.log(`Request from user: ${user.id}`);

    // Parse body
    const body = await req.json();
    const { action, params } = body as {
      action: 'get_active_dates' | 'get_upcoming_dates' | 'get_products_by_date' | 'get_dates_with_colors';
      params?: Record<string, unknown>;
    };

    console.log(`Action: ${action}, params:`, params);

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

    switch (action) {
      case 'get_active_dates': {
        // Chama RPC que retorna datas no período de campanha
        const { data, error } = await externalSupabase.rpc('get_active_commemorative_dates');
        
        if (error) {
          console.error('Error calling get_active_commemorative_dates:', error);
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        result = data;
        console.log(`Found ${data?.length || 0} active commemorative dates`);
        break;
      }

      case 'get_upcoming_dates': {
        // Chama RPC com parâmetro de dias
        const daysAhead = (params?.days_ahead as number) || 60;
        const { data, error } = await externalSupabase.rpc('get_upcoming_commemorative_dates', {
          p_days_ahead: daysAhead
        });
        
        if (error) {
          console.error('Error calling get_upcoming_commemorative_dates:', error);
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        result = data;
        console.log(`Found ${data?.length || 0} upcoming dates in next ${daysAhead} days`);
        break;
      }

      case 'get_products_by_date': {
        // Chama RPC para buscar variantes de uma data
        const slug = params?.slug as string;
        const limit = (params?.limit as number) || 100;
        const includeAllColors = (params?.include_all_colors as boolean) || false;
        
        if (!slug) {
          return new Response(
            JSON.stringify({ error: 'Slug é obrigatório' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data, error } = await externalSupabase.rpc('get_variants_for_commemorative_date', {
          p_slug: slug,
          p_limit: limit,
          p_include_all_colors: includeAllColors
        });
        
        if (error) {
          console.error('Error calling get_variants_for_commemorative_date:', error);
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        result = data;
        console.log(`Found ${data?.length || 0} variants for date: ${slug}`);
        break;
      }

      case 'get_dates_with_colors': {
        // Busca view com cores associadas
        const { data, error } = await externalSupabase
          .from('v_commemorative_dates_with_colors')
          .select('*')
          .eq('is_active', true)
          .order('date_month')
          .order('date_day');
        
        if (error) {
          console.error('Error fetching v_commemorative_dates_with_colors:', error);
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        result = data;
        console.log(`Found ${data?.length || 0} dates with colors`);
        break;
      }

      default:
        return new Response(
          JSON.stringify({ 
            error: `Ação não suportada: ${action}`,
            availableActions: ['get_active_dates', 'get_upcoming_dates', 'get_products_by_date', 'get_dates_with_colors']
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
    console.error('Unexpected error:', errorMessage);
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
