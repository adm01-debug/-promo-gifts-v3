/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { rateLimiters, applyRateLimit } from '../_shared/rate-limiter.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. RATE LIMITING: 5 req/min por token
    const url = new URL(req.url)
    const token = url.searchParams.get('token')
    
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Token não fornecido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const rateLimitResponse = await applyRateLimit(
      req,
      rateLimiters.approval,
      () => token // Usar token como identificador
    )
    
    if (rateLimitResponse) {
      return rateLimitResponse // HTTP 429 se excedeu
    }

    // 2. DADOS DA REQUISIÇÃO
    const { approved, rejectionReason } = await req.json()
    
    // Coletar dados de auditoria
    const ipAddress = req.headers.get('x-forwarded-for') || 
                      req.headers.get('x-real-ip') || 
                      'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'

    // 3. SUPABASE CLIENT
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 4. VALIDAR TOKEN
    const { data: tokenData, error: tokenError } = await supabase
      .from('quote_approval_tokens')
      .select('*, quotes(*)')
      .eq('token', token)
      .single()

    if (tokenError || !tokenData) {
      console.error('Token validation error:', tokenError);
      
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. VALIDAÇÕES DE SEGURANÇA
    
    // Já foi usado?
    if (tokenData.is_used) {
      return new Response(
        JSON.stringify({ 
          error: 'Token já foi utilizado',
          used_at: tokenData.used_at
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Expirou?
    if (new Date(tokenData.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ 
          error: 'Token expirado',
          expires_at: tokenData.expires_at
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Já foi aprovado/rejeitado antes?
    if (tokenData.approved !== null) {
      return new Response(
        JSON.stringify({ 
          error: 'Orçamento já foi processado',
          status: tokenData.approved ? 'aprovado' : 'rejeitado'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 6. PROCESSAR APROVAÇÃO/REJEIÇÃO
    const { error: updateError } = await supabase
      .from('quote_approval_tokens')
      .update({
        approved,
        rejection_reason: rejectionReason,
        approved_at: new Date().toISOString(),
        ip_address: ipAddress,
        user_agent: userAgent,
        attempts: (tokenData.attempts || 0) + 1,
        is_used: true, // Invalidar após uso
        used_at: new Date().toISOString()
      })
      .eq('id', tokenData.id)

    if (updateError) {
      throw updateError
    }

    // 7. ATUALIZAR STATUS DO ORÇAMENTO
    const newStatus = approved ? 'approved' : 'rejected'
    
    await supabase
      .from('quotes')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', tokenData.quote_id)

    // 8. REGISTRAR NO HISTÓRICO
    // Nota: O registro do histórico requer user_id e usa 'metadata' ao invés de 'details'
    await supabase
      .from('quote_history')
      .insert({
        quote_id: tokenData.quote_id,
        user_id: tokenData.created_by, // Usar o criador do token como referência
        action: approved ? 'approved_by_client' : 'rejected_by_client',
        description: approved 
          ? 'Orçamento aprovado pelo cliente via link de aprovação' 
          : `Orçamento rejeitado pelo cliente: ${rejectionReason || 'Sem motivo informado'}`,
        metadata: {
          via: 'approval_link',
          ip_address: ipAddress,
          rejection_reason: rejectionReason
        }
      })

    // 9. RESPOSTA DE SUCESSO
    return new Response(
      JSON.stringify({ 
        success: true,
        quote_number: tokenData.quotes.quote_number,
        status: newStatus,
        message: approved 
          ? 'Orçamento aprovado com sucesso!' 
          : 'Orçamento rejeitado.'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error: unknown) {
    console.error('Erro ao processar aprovação:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    return new Response(
      JSON.stringify({ 
        error: 'Erro ao processar aprovação',
        details: errorMessage 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
