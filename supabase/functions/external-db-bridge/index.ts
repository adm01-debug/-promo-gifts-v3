import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Recursos e permissões
type Resource = 'companies' | 'products';
type Operation = 'select' | 'insert' | 'update' | 'delete';

const PERMISSIONS: Record<Resource, Operation[]> = {
  companies: ['select'], // Somente leitura
  products: ['select', 'insert', 'update', 'delete'], // CRUD completo
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
      console.error('Missing or invalid Authorization header');
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar cliente local para validar usuário
    const localSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Validar token e obter claims
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await localSupabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error('Token validation failed:', claimsError);
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log(`Request from user: ${userId}`);

    // Buscar role do usuário no banco local
    const { data: userRoles, error: roleError } = await localSupabase
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
    const { resource, operation, data, filters, id } = body as {
      resource: Resource;
      operation: Operation;
      data?: Record<string, unknown>;
      filters?: Record<string, unknown>;
      id?: string;
    };

    console.log(`Operation: ${operation} on ${resource}`);

    // Validar recurso
    if (!resource || !PERMISSIONS[resource]) {
      return new Response(
        JSON.stringify({ error: `Recurso inválido: ${resource}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar operação
    if (!operation || !PERMISSIONS[resource].includes(operation)) {
      return new Response(
        JSON.stringify({ 
          error: `Operação '${operation}' não permitida para '${resource}'`,
          allowed: PERMISSIONS[resource]
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar permissões baseadas em role para operações de escrita
    if (['insert', 'update', 'delete'].includes(operation)) {
      // Apenas admin e gerente podem fazer operações de escrita em produtos
      if (!['admin', 'gerente', 'vendedor'].includes(userRole)) {
        return new Response(
          JSON.stringify({ error: 'Permissão insuficiente para esta operação' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Vendedor só pode inserir, não pode deletar
      if (userRole === 'vendedor' && operation === 'delete') {
        return new Response(
          JSON.stringify({ error: 'Vendedores não podem excluir produtos' }),
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

    // Mapear nomes de tabelas (ajuste conforme sua estrutura)
    const tableMap: Record<Resource, string> = {
      companies: 'companies', // ou 'empresas' se for em português
      products: 'products',   // ou 'produtos' se for em português
    };

    const tableName = tableMap[resource];
    let result;

    switch (operation) {
      case 'select': {
        let query = externalSupabase.from(tableName).select('*');
        
        // Aplicar filtros
        if (filters) {
          Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
              if (typeof value === 'string' && key.includes('name')) {
                query = query.ilike(key, `%${value}%`);
              } else {
                query = query.eq(key, value);
              }
            }
          });
        }

        // Ordenar e limitar
        query = query.order('created_at', { ascending: false }).limit(1000);
        
        const { data: selectData, error: selectError } = await query;
        
        if (selectError) {
          console.error('Select error:', selectError);
          return new Response(
            JSON.stringify({ error: selectError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        result = selectData;
        console.log(`Selected ${selectData?.length || 0} records from ${tableName}`);
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
          .from(tableName)
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
        console.log(`Inserted record in ${tableName}:`, insertResult?.id);
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
          .from(tableName)
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
        console.log(`Updated record in ${tableName}:`, id);
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
          .from(tableName)
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
        console.log(`Deleted record from ${tableName}:`, id);
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
