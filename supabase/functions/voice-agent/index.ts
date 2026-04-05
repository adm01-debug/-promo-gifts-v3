import { getCorsHeaders } from '../_shared/cors.ts';
import { authenticateRequest, authErrorResponse } from '../_shared/auth.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const TranscriptSchema = z.object({
  transcript: z.string().min(1, 'transcript cannot be empty').max(1000, 'transcript too long'),
});

const SYSTEM_PROMPT = `Você é um assistente de voz inteligente para um sistema de vendas de brindes promocionais (PromoGifts).
Sua função é interpretar comandos de voz do vendedor e retornar uma ação estruturada.

CONTEXTO: O vendedor usa o sistema para buscar produtos, criar orçamentos, navegar entre páginas e filtrar o catálogo.

CATEGORIAS DISPONÍVEIS: Canetas, Mochilas, Garrafas, Copos/Canecas, Cadernos, Camisetas, Bonés, Chaveiros, Kits, Tecnologia (powerbanks, fones, etc.)
CORES COMUNS: azul, vermelho, verde, amarelo, preto, branco, rosa, roxo, laranja, cinza, prata, dourado
MATERIAIS: metal, plástico, bambu, silicone, couro, tecido, alumínio, inox, vidro, papel reciclado

PÁGINAS DO SISTEMA:
- / (catálogo de produtos)
- /orcamentos (lista de orçamentos)
- /orcamentos/novo (criar orçamento)
- /pedidos (pedidos)
- /favoritos (favoritos)
- /colecoes (coleções)
- /simulador (simulador de personalização)
- /mockup (gerador de mockups)
- /bi (dashboard BI)
- /tendencias (tendências)

Responda SEMPRE em JSON com esta estrutura:
{
  "action": "search" | "filter" | "navigate" | "sort" | "clear" | "answer",
  "response": "texto curto e amigável para falar de volta ao usuário (max 2 frases)",
  "data": {
    "query": "termo de busca (se action=search)",
    "route": "rota para navegar (se action=navigate)",
    "sortBy": "price-asc|price-desc|name|stock (se action=sort)",
    "filters": {
      "category": "categoria (se detectada)",
      "color": "cor (se detectada)",
      "material": "material (se detectado)",
      "maxPrice": número (se detectado),
      "minPrice": número (se detectado),
      "inStock": boolean (se mencionado),
      "isKit": boolean (se mencionado)
    }
  }
}

Se o usuário fizer uma pergunta geral, use action="answer" e responda de forma útil.
Se o comando não fizer sentido, responda com action="answer" e peça esclarecimento.
Seja conciso e amigável. Use linguagem informal brasileira.`;

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const parsed = TranscriptSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { transcript } = parsed.data;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: transcript },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'execute_voice_command',
              description: 'Execute a voice command from the user',
              parameters: {
                type: 'object',
                properties: {
                  action: {
                    type: 'string',
                    enum: ['search', 'filter', 'navigate', 'sort', 'clear', 'answer'],
                  },
                  response: { type: 'string', description: 'Friendly response to speak back (max 2 sentences)' },
                  data: {
                    type: 'object',
                    properties: {
                      query: { type: 'string' },
                      route: { type: 'string' },
                      sortBy: { type: 'string', enum: ['price-asc', 'price-desc', 'name', 'stock'] },
                      filters: {
                        type: 'object',
                        properties: {
                          category: { type: 'string' },
                          color: { type: 'string' },
                          material: { type: 'string' },
                          maxPrice: { type: 'number' },
                          minPrice: { type: 'number' },
                          inStock: { type: 'boolean' },
                          isKit: { type: 'boolean' },
                        },
                      },
                    },
                  },
                },
                required: ['action', 'response'],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'execute_voice_command' } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add funds.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errText = await response.text();
      console.error('AI gateway error:', response.status, errText);
      return new Response(
        JSON.stringify({ error: 'AI processing failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    let result;
    if (toolCall?.function?.arguments) {
      try {
        result = JSON.parse(toolCall.function.arguments);
      } catch {
        result = { action: 'answer', response: 'Desculpe, não entendi. Pode repetir?', data: {} };
      }
    } else {
      // Fallback: try to parse content as JSON
      const content = aiData.choices?.[0]?.message?.content || '';
      try {
        result = JSON.parse(content);
      } catch {
        result = { action: 'answer', response: content || 'Desculpe, não entendi.', data: {} };
      }
    }

    // Validate the AI output structure
    if (!result.action || !result.response) {
      result = { action: 'answer', response: result.response || 'Desculpe, ocorreu um erro.', data: {} };
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Voice agent error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
