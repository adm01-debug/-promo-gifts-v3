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
          if (scanDetails.malicious > 0 || scanDetails.suspicious > 0) isSuspicious = true
        } else if (vtRes.status !== 404) {
          throw new Error('Segurança indisponível')
        }
      } catch (err) {
        console.error('VT Error:', err.message)
        return new Response(JSON.stringify({ error: 'Erro na verificação de malware' }), {
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

    // Persistir Log de Auditoria
    await supabaseAdmin.from('file_scan_logs').insert({
      user_id: user?.id ?? null,
      bucket: targetBucket,
      path: uploadData.path,
      hash: hashHex,
      scan_result: scanDetails,
      status_code: isSuspicious ? 403 : 200
    } as ScanLog)

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
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500
    })
  }
})
