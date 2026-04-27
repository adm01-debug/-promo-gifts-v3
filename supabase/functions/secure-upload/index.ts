import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const folder = formData.get('folder') as string || 'uploads'

    if (!file) {
      return new Response(JSON.stringify({ error: 'Nenhum arquivo enviado' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 1. Validação Básica
    const MAX_SIZE = 5 * 1024 * 1024 // 5MB
    if (file.size > MAX_SIZE) {
      return new Response(JSON.stringify({ error: 'Arquivo excede o limite de 5MB' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Scan Antivírus (VirusTotal)
    const vtApiKey = Deno.env.get('VIRUSTOTAL_API_KEY')
    if (vtApiKey) {
      const fileBuffer = await file.arrayBuffer()
      const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

      console.log(`Verificando hash no VirusTotal: ${hashHex}`)

      // Verificar se o arquivo já é conhecido e malicioso
      const vtCheckResponse = await fetch(`https://www.virustotal.com/api/v3/files/${hashHex}`, {
        headers: { 'x-apikey': vtApiKey }
      })

      if (vtCheckResponse.ok) {
        const vtData = await vtCheckResponse.json()
        const stats = vtData.data.attributes.last_analysis_stats
        if (stats.malicious > 0 || stats.suspicious > 0) {
          console.error(`Arquivo malicioso detectado! Malicious: ${stats.malicious}, Suspicious: ${stats.suspicious}`)
          return new Response(JSON.stringify({ error: 'Arquivo bloqueado por motivos de segurança (malware detectado)' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
        console.log('Arquivo já conhecido e limpo.')
      } else if (vtCheckResponse.status === 404) {
        // Arquivo novo, enviar para análise
        console.log('Arquivo novo, enviando para análise no VirusTotal...')
        const vtFormData = new FormData()
        vtFormData.append('file', file)
        
        await fetch('https://www.virustotal.com/api/v3/files', {
          method: 'POST',
          headers: { 'x-apikey': vtApiKey },
          body: vtFormData,
        })
        // Como é um arquivo novo, não temos o resultado imediato. 
        // Em um sistema crítico, poderíamos bloquear até a análise terminar,
        // mas aqui permitiremos e logaremos para auditoria posterior.
      }
    }

    // 3. Upload para Supabase Storage
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const fileExt = file.name.split('.').pop()
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

    const { data, error: uploadError } = await supabaseAdmin.storage
      .from('personalization-images')
      .upload(fileName, await file.arrayBuffer(), {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      throw uploadError
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('personalization-images')
      .getPublicUrl(data.path)

    return new Response(JSON.stringify({ url: publicUrl, path: data.path }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Erro no processamento do upload:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
