import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ScanLog {
  user_id: string | null;
  bucket: string;
  path: string;
  hash: string;
  scan_result: any;
  status_code: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // Variáveis para auditoria persistente mesmo em caso de erro
  let auditData: Partial<ScanLog> = {
    status_code: 500,
    scan_result: { message: 'Iniciando processamento' }
  };

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const folder = formData.get('folder') as string || 'uploads'
    
    const authHeader = req.headers.get('Authorization')
    let user = null
    if (authHeader) {
      const { data: { user: authUser } } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''))
      user = authUser
    }

    if (!file) throw new Error('Arquivo obrigatório')

    const fileBuffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer)
    const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')

    auditData = {
      user_id: user?.id ?? null,
      bucket: 'personalization-images',
      path: `${folder}/${file.name}`,
      hash: hashHex,
      status_code: 200,
      scan_result: { message: 'Arquivo recebido para análise' }
    };

    let isSuspicious = false
    let scanDetails: any = { source: 'VirusTotal', checked_at: new Date().toISOString() }
    let targetBucket = 'personalization-images'
    const vtApiKey = Deno.env.get('VIRUSTOTAL_API_KEY')

    if (vtApiKey) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000)
        const vtRes = await fetch(`https://www.virustotal.com/api/v3/files/${hashHex}`, {
          headers: { 'x-apikey': vtApiKey },
          signal: controller.signal
        })
        clearTimeout(timeoutId)

        if (vtRes.ok) {
          const vtData = await vtRes.json()
          scanDetails = { ...scanDetails, ...vtData.data.attributes.last_analysis_stats }
          if (scanDetails.malicious > 0 || scanDetails.suspicious > 0) {
            isSuspicious = true
            scanDetails.reason = `Detectado: ${scanDetails.malicious} maliciosos, ${scanDetails.suspicious} suspeitos`
          } else {
            scanDetails.reason = 'Arquivo limpo (base VirusTotal)'
          }
        } else if (vtRes.status === 404) {
          scanDetails.reason = 'Arquivo novo no VirusTotal (análise pendente). Permitido upload inicial.'
        } else {
          throw new Error(`Falha na API de segurança (Status: ${vtRes.status})`)
        }
      } catch (err) {
        const reason = err.name === 'AbortError' ? 'Timeout na verificação (10s)' : err.message;
        console.error('Security Check Failed:', reason);
        
        // Registrar falha de segurança na auditoria antes de retornar
        await supabaseAdmin.from('file_scan_logs').insert({
          ...auditData,
          status_code: 403,
          scan_result: { ...scanDetails, error: true, reason: `Bloqueio preventivo: ${reason}` }
        });

        return new Response(JSON.stringify({ error: `Segurança: ${reason}` }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    if (isSuspicious) targetBucket = 'quarantine'

    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${file.name.split('.').pop()}`
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(targetBucket)
      .upload(fileName, fileBuffer, { contentType: file.type, upsert: false })

    if (uploadError) throw uploadError

    // Atualizar dados de auditoria com o caminho final e resultado do scan
    auditData.path = uploadData.path;
    auditData.bucket = targetBucket;
    auditData.status_code = isSuspicious ? 403 : 200;
    auditData.scan_result = scanDetails;

    await supabaseAdmin.from('file_scan_logs').insert(auditData as ScanLog)

    if (isSuspicious) {
      return new Response(JSON.stringify({ error: 'Arquivo bloqueado: Malware detectado' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: { publicUrl } } = supabaseAdmin.storage.from(targetBucket).getPublicUrl(uploadData.path)
    return new Response(JSON.stringify({ url: publicUrl, path: uploadData.path }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
    })

  } catch (error: any) {
    console.error('Final Error:', error.message)
    
    // Tenta registrar o erro na auditoria se tivermos o hash
    if (auditData.hash) {
      await supabaseAdmin.from('file_scan_logs').insert({
        ...auditData,
        status_code: 500,
        scan_result: { error: true, message: error.message, stack: error.stack }
      });
    }

    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500
    })
  }
})

  }
})
