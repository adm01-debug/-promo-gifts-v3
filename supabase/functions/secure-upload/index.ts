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
      throw new Error('Nenhum arquivo enviado')
    }

    const vtApiKey = Deno.env.get('VIRUSTOTAL_API_KEY')
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    let isSuspicious = false;
    let targetBucket = 'personalization-images';

    if (vtApiKey) {
      try {
        const fileBuffer = await file.arrayBuffer()
        const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

        console.log(`Verificando VirusTotal: ${hashHex}`)

        const vtCheckResponse = await fetch(`https://www.virustotal.com/api/v3/files/${hashHex}`, {
          headers: { 'x-apikey': vtApiKey },
          signal: AbortSignal.timeout(10000) // Timeout de 10 segundos
        })

        if (vtCheckResponse.ok) {
          const vtData = await vtCheckResponse.json()
          const stats = vtData.data.attributes.last_analysis_stats
          if (stats.malicious > 0 || stats.suspicious > 0) {
            isSuspicious = true;
          }
        } else if (vtCheckResponse.status === 404) {
          // Arquivo novo, enviar para análise futura e marcar como pendente/quarentena por segurança se for crítico
          // Aqui bloquearemos apenas se for explicitamente malicioso conhecido para evitar falsos negativos imediatos
        } else {
          // Erro na API do VirusTotal ou Timeout
          throw new Error('Falha na verificação de segurança (VirusTotal indisponível)')
        }
      } catch (err) {
        console.error('Erro VirusTotal:', err.message)
        return new Response(JSON.stringify({ error: 'Erro de segurança: A verificação de malware falhou ou expirou.' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    if (isSuspicious) {
      targetBucket = 'quarantine';
      console.warn(`Arquivo suspeito detectado (${file.name}). Movendo para quarentena.`);
    }

    const fileExt = file.name.split('.').pop()
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

    const { data, error: uploadError } = await supabaseAdmin.storage
      .from(targetBucket)
      .upload(fileName, await file.arrayBuffer(), {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) throw uploadError

    if (isSuspicious) {
      return new Response(JSON.stringify({ error: 'Arquivo bloqueado por malware detectado.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: { publicUrl } } = supabaseAdmin.storage.from(targetBucket).getPublicUrl(data.path)

    return new Response(JSON.stringify({ url: publicUrl, path: data.path }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Upload Error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})


  } catch (error) {
    console.error('Erro no processamento do upload:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
