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
    // Para inspeção inicial, permitir acesso sem auth estrita
    // Em produção, isso deve ser restrito a admins
    const body = await req.json().catch(() => ({}));
    const isInitialInspection = body?.initial === true;

    if (!isInitialInspection) {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(
          JSON.stringify({ error: 'Não autorizado' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const localSupabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const token = authHeader.replace('Bearer ', '');
      const { data: claimsData, error: claimsError } = await localSupabase.auth.getClaims(token);
      
      if (claimsError || !claimsData?.claims) {
        return new Response(
          JSON.stringify({ error: 'Token inválido' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const userId = claimsData.claims.sub;
      const { data: userRoles } = await localSupabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      const userRole = userRoles?.[0]?.role;
      if (userRole !== 'admin') {
        return new Response(
          JSON.stringify({ error: 'Apenas administradores podem inspecionar o banco externo' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('Starting external database inspection...');

    // Conectar ao banco externo
    const externalUrl = Deno.env.get('EXTERNAL_SUPABASE_URL');
    const externalKey = Deno.env.get('EXTERNAL_SUPABASE_SERVICE_KEY');

    if (!externalUrl || !externalKey) {
      return new Response(
        JSON.stringify({ error: 'Banco externo não configurado' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Connecting to external Supabase:', externalUrl);

    // Usar API REST para listar tabelas
    // O endpoint /rest/v1/ com OPTIONS retorna as tabelas disponíveis
    const tablesResponse = await fetch(`${externalUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': externalKey,
        'Authorization': `Bearer ${externalKey}`,
      },
    });

    if (!tablesResponse.ok) {
      // Tentar método alternativo - consultar cada tabela conhecida
      console.log('Could not list tables directly, trying known tables...');
      
      const externalSupabase = createClient(externalUrl, externalKey);
      const knownTables = [
        'products', 'produtos',
        'companies', 'empresas',
        'categories', 'categorias',
        'colors', 'cores',
        'suppliers', 'fornecedores',
        'personalization_techniques', 'tecnicas_personalizacao',
        'personalization_sizes', 'tamanhos_personalizacao',
        'personalization_locations', 'locais_personalizacao',
        'product_components', 'componentes_produto',
        'product_groups', 'grupos_produto',
        'product_colors', 'cores_produto',
        'product_images', 'imagens_produto',
        'clients', 'clientes',
        'orders', 'pedidos',
        'quotes', 'orcamentos',
      ];

      const foundTables: { name: string; columns: string[]; rowCount: number }[] = [];

      for (const tableName of knownTables) {
        try {
          const { data, error, count } = await externalSupabase
            .from(tableName)
            .select('*', { count: 'exact', head: false })
            .limit(1);

          if (!error && data !== null) {
            const columns = data.length > 0 ? Object.keys(data[0]) : [];
            foundTables.push({
              name: tableName,
              columns,
              rowCount: count || 0,
            });
            console.log(`Found table: ${tableName} with ${count} rows`);
          }
        } catch {
          // Tabela não existe, ignorar
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          tables: foundTables,
          message: `Encontradas ${foundTables.length} tabelas no banco externo`
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Se conseguiu listar via API REST
    const openApiSpec = await tablesResponse.json();
    const tables = Object.keys(openApiSpec.definitions || {}).filter(
      name => !name.startsWith('_') && name !== 'rpc'
    );

    // Obter detalhes de cada tabela
    const externalSupabase = createClient(externalUrl, externalKey);
    const tableDetails: { name: string; columns: string[]; rowCount: number }[] = [];

    for (const tableName of tables) {
      try {
        const { data, count } = await externalSupabase
          .from(tableName)
          .select('*', { count: 'exact', head: false })
          .limit(1);

        if (data !== null) {
          const columns = data.length > 0 ? Object.keys(data[0]) : [];
          tableDetails.push({
            name: tableName,
            columns,
            rowCount: count || 0,
          });
        }
      } catch {
        // Ignorar tabelas com erro
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        tables: tableDetails,
        message: `Encontradas ${tableDetails.length} tabelas no banco externo`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Inspection error:', errorMessage);
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
