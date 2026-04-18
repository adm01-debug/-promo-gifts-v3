// ============================================================
// EDGE FUNCTION: kit-identity-suggest
// Recebe nome + lista de itens do kit e sugere identidade visual
// (tag curta + cor hex + ícone lucide). Usa Lovable AI Gateway
// com tool-calling para JSON estrito. Modelo barato e rápido.
// ============================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface RequestBody {
  name?: string;
  items?: Array<{ name?: string; sku?: string }>;
  description?: string | null;
}

const PALETTE = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#0EA5E9',
];

const ICONS = [
  'Package', 'Gift', 'Briefcase', 'Coffee', 'Heart',
  'Sparkles', 'Trophy', 'Leaf', 'Star', 'Rocket',
  'Sun', 'Moon', 'Zap', 'Flame', 'Award',
];

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json().catch(() => ({}))) as RequestBody;
    const name = (body.name ?? '').trim();
    const items = Array.isArray(body.items) ? body.items.slice(0, 30) : [];

    if (!name && items.length === 0) {
      return new Response(JSON.stringify({ error: 'Forneça name ou items' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY ausente' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const itemList = items.map((i) => i?.name).filter(Boolean).join(', ').slice(0, 800);

    const systemPrompt = `Você nomeia identidades visuais de kits corporativos brasileiros.
Devolva: tag curta (1-2 palavras CAPSLOCK), cor (HEX da paleta) e ícone (lucide).
Paleta cores: ${PALETTE.join(', ')}.
Ícones disponíveis: ${ICONS.join(', ')}.
Escolha o que melhor combina com o tema. Tag deve ser MARKETING, ex.: ONBOARDING, NATAL, VIP.`;

    const userPrompt = `Kit: "${name || 'sem nome'}"\nItens: ${itemList || 'nenhum'}\n${body.description ? `Descrição: ${body.description}` : ''}`;

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'suggest_identity',
            description: 'Devolve a identidade sugerida',
            parameters: {
              type: 'object',
              properties: {
                tag: { type: 'string', maxLength: 20 },
                color: { type: 'string', enum: PALETTE },
                icon: { type: 'string', enum: ICONS },
                rationale: { type: 'string', maxLength: 120 },
              },
              required: ['tag', 'color', 'icon'],
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'suggest_identity' } },
      }),
    });

    if (!aiRes.ok) {
      const text = await aiRes.text();
      return new Response(JSON.stringify({ error: `AI ${aiRes.status}`, details: text.slice(0, 200) }), {
        status: aiRes.status === 429 ? 429 : 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const json = await aiRes.json();
    const call = json?.choices?.[0]?.message?.tool_calls?.[0];
    if (!call?.function?.arguments) {
      return new Response(JSON.stringify({ error: 'Resposta IA inválida' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const parsed = JSON.parse(call.function.arguments);
    return new Response(JSON.stringify({ suggestion: parsed }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message ?? 'Erro' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
