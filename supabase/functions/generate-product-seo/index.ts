import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { product } = await req.json();
    if (!product?.name) {
      return new Response(JSON.stringify({ error: "Nome do produto é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Você é um especialista em SEO e marketing para e-commerce de brindes corporativos e produtos promocionais no Brasil.
Gere conteúdo de alta qualidade, otimizado para buscadores brasileiros (Google Brasil).
Use linguagem profissional, persuasiva e orientada à conversão.
Responda APENAS com o JSON solicitado, sem markdown.`;

    const userPrompt = `Dados do produto:
- Nome: ${product.name}
- SKU: ${product.sku || "N/A"}
- Descrição: ${product.description || "N/A"}
- Descrição curta: ${product.short_description || "N/A"}
- Marca: ${product.brand || "N/A"}
- Categoria: ${product.category_name || "N/A"}
- País de origem: ${product.country_of_origin || "N/A"}
- Materiais: ${product.materials || "N/A"}
- Preço: ${product.sale_price ? `R$ ${product.sale_price}` : "N/A"}

Gere os seguintes campos SEO e marketing. Use as informações acima como contexto:

1. meta_title: Título SEO entre 50-60 caracteres. Inclua a palavra-chave principal.
2. meta_description: Meta descrição entre 120-155 caracteres. Persuasiva, com call-to-action.
3. meta_keywords: 5-8 palavras-chave separadas por vírgula, relevantes para o nicho de brindes.
4. slug: URL amigável a partir do nome (lowercase, hífens, sem acentos, max 60 chars).
5. key_benefits: 4-6 benefícios principais, um por linha. Foque em diferenciais para compradores corporativos.
6. use_cases: 4-6 casos de uso/ocasiões, um por linha. Pense em eventos, campanhas, datas comemorativas.

Retorne um JSON com exatamente essas chaves: meta_title, meta_description, meta_keywords, slug, key_benefits, use_cases.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "fill_seo_marketing",
              description: "Fill SEO and marketing fields for a product",
              parameters: {
                type: "object",
                properties: {
                  meta_title: { type: "string", description: "SEO title 50-60 chars" },
                  meta_description: { type: "string", description: "Meta description 120-155 chars" },
                  meta_keywords: { type: "string", description: "Comma-separated keywords" },
                  slug: { type: "string", description: "URL-friendly slug" },
                  key_benefits: { type: "string", description: "Key benefits, one per line" },
                  use_cases: { type: "string", description: "Use cases, one per line" },
                },
                required: ["meta_title", "meta_description", "meta_keywords", "slug", "key_benefits", "use_cases"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "fill_seo_marketing" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error("No structured output from AI");
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-product-seo error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
