/// <reference lib="deno.ns" />
// ============================================================
// EDGE FUNCTION: generate-mockup-nanobanana
// Geração de Mockups com IA usando Nano Banana API
// ============================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GenerateMockupRequest {
  jobId: string;
}

interface MockupArea {
  id: string;
  name: string;
  positionX: number;
  positionY: number;
  logoWidth: number;
  logoHeight: number;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Inicializar Supabase Client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Verificar autenticação
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      throw new Error('Não autenticado')
    }

    // Parse request body
    const { jobId } = await req.json() as GenerateMockupRequest

    // Buscar job do banco
    const { data: job, error: jobError } = await supabaseClient
      .from('mockup_generation_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      throw new Error('Job não encontrado')
    }

    // Verificar se job pertence ao usuário
    if (job.user_id !== user.id) {
      throw new Error('Não autorizado')
    }

    // Atualizar status para processing
    await supabaseClient
      .from('mockup_generation_jobs')
      .update({
        status: 'processing',
        processing_started_at: new Date().toISOString(),
      })
      .eq('id', jobId)

    // Buscar técnica para pegar o prompt
    const { data: technique } = await supabaseClient
      .from('personalization_techniques')
      .select('prompt_suffix')
      .eq('id', job.technique_id)
      .single()

    const techniquePrompt = technique?.prompt_suffix || 'as professionally applied logo'

    // Gerar mockups para cada combinação de cor x área
    const colors: string[] = job.product_colors || []
    const areas: MockupArea[] = job.areas_config || []

    const generatedMockups = []
    const failedMockups = []

    for (const color of colors) {
      for (const area of areas) {
        try {
          // Construir prompt
          const prompt = buildPrompt(
            job.product_name,
            techniquePrompt,
            color,
            area,
            job.custom_prompt
          )

          console.log(`Gerando mockup: ${area.name} - ${color}`)
          console.log(`Prompt: ${prompt}`)

          // Chamar Nano Banana API
          const mockupUrl = await generateWithNanoBanana(
            prompt,
            job.logo_url,
            job.ai_model || 'pro'
          )

          // Salvar mockup no banco
          const { data: mockup, error: mockupError } = await supabaseClient
            .from('generated_mockups')
            .insert({
              job_id: jobId,
              user_id: user.id,
              product_id: job.product_id,
              product_name: job.product_name,
              product_sku: job.product_sku,
              technique_id: job.technique_id,
              technique_name: job.technique_name,
              product_color_hex: color,
              area_name: area.name,
              area_config: area,
              mockup_url: mockupUrl,
              logo_url: job.logo_url,
              ai_model_used: job.ai_model || 'pro',
              prompt_used: prompt,
              generation_cost: job.ai_model === 'pro' ? 0.60 : 0.10,
            })
            .select()
            .single()

          if (mockupError) {
            console.error('Erro ao salvar mockup:', mockupError)
            failedMockups.push({ color, area: area.name, error: mockupError.message })
          } else {
            generatedMockups.push(mockup)
          }

        } catch (error) {
          console.error(`Erro ao gerar mockup ${area.name} - ${color}:`, error)
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          failedMockups.push({
            color,
            area: area.name,
            error: errorMessage,
          })

          // Incrementar contador de falhas
          await supabaseClient.rpc('increment', {
            row_id: jobId,
            table_name: 'mockup_generation_jobs',
            column_name: 'failed_mockups'
          })
        }
      }
    }

    // Atualizar job com custo real
    const actualCost = generatedMockups.reduce(
      (sum, m) => sum + (m.generation_cost || 0),
      0
    )

    await supabaseClient
      .from('mockup_generation_jobs')
      .update({
        actual_cost: actualCost,
        status: failedMockups.length === 0 ? 'completed' : 'completed',
        processing_completed_at: new Date().toISOString(),
      })
      .eq('id', jobId)

    return new Response(
      JSON.stringify({
        success: true,
        generated: generatedMockups.length,
        failed: failedMockups.length,
        mockups: generatedMockups,
        errors: failedMockups,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Erro geral:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function buildPrompt(
  productName: string,
  techniquePrompt: string,
  color: string,
  area: MockupArea,
  customPrompt?: string
): string {
  const basePrompt = customPrompt || `Professional product photography of ${productName} in ${color} color, with company logo ${techniquePrompt}, placed on ${area.name.toLowerCase()}, studio lighting, white background, 4K quality, realistic shadows, commercial photography style`

  return basePrompt
}

async function generateWithNanoBanana(
  prompt: string,
  logoUrl: string,
  model: string = 'pro'
): Promise<string> {
  const apiKey = Deno.env.get('NANOBANANA_API_KEY')
  
  if (!apiKey) {
    throw new Error('NANOBANANA_API_KEY não configurada')
  }

  const endpoint = model === 'pro'
    ? 'https://api.nanobananaapi.ai/v1/pro/generate'
    : 'https://api.nanobananaapi.ai/v1/generate'

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      input_images: [logoUrl],
      model: model,
      resolution: '2K',
      num_outputs: 1,
      guidance_scale: 7.5,
      num_inference_steps: model === 'pro' ? 50 : 25,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Nano Banana API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  
  // Nano Banana retorna array de URLs
  if (!data.images || !data.images[0]) {
    throw new Error('Nenhuma imagem retornada pela API')
  }

  return data.images[0]
}

/* Exemplo de payload para testar:
{
  "jobId": "uuid-do-job"
}
*/
