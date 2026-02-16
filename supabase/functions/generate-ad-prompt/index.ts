/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const {
      productName,
      productColor,
      productCategory,
      techniqueName,
      locationName,
      clientSegment,
      clientName,
      brandColorName,
      objective,
      tone,
      targetAudience,
      season,
      numberOfPrompts,
    } = await req.json();

    if (!productName) {
      return new Response(
        JSON.stringify({ error: "Product name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const numPrompts = Math.min(numberOfPrompts || 4, 6);

    const systemPrompt = `You are a world-class advertising creative director specialized in promotional product photography. 

Your expertise:
- You've directed campaigns for brands like Nike, Apple, Starbucks, and Coca-Cola
- You understand how promotional products (mugs, pens, t-shirts, bags, bottles, caps, notebooks, tech accessories) are used in real-world marketing scenarios
- You create scene descriptions that result in stunning, magazine-worthy commercial photographs
- You know how to make branded products look premium and desirable

RULES:
1. Each prompt must describe a COMPLETE photographic scene with specific details about lighting, environment, mood, and composition
2. Write prompts in English (they will be sent to an image AI model)
3. Each prompt should be 2-3 sentences, detailed but focused
4. The product must ALWAYS be the hero/focal point of the scene
5. Include specific photography terms: lighting setup, depth of field, color palette, composition style
6. Vary the scenes significantly — different environments, times of day, moods, and compositions
7. Consider the product type and how it's naturally used
8. If a client segment is provided, tailor scenes to that industry
9. Never use generic descriptions — be specific and evocative
10. Think about what would make someone STOP scrolling on Instagram

RESPOND ONLY with a valid JSON array. No markdown, no explanation. Example:
[
  {
    "title": "Short scene title in Portuguese (3-5 words)",
    "prompt": "Detailed scene description in English...",
    "category": "lifestyle|corporativo|outdoor|esporte|gastronomia|varejo|evento|educacao",
    "mood": "One-word mood descriptor",
    "bestFor": "Brief note in Portuguese about when to use this prompt (1 sentence)"
  }
]`;

    const userMessage = `Generate ${numPrompts} UNIQUE advertising scene prompts for this product:

PRODUCT: ${productName}${productColor ? ` (color: ${productColor})` : ''}${productCategory ? `\nPRODUCT CATEGORY: ${productCategory}` : ''}
CUSTOMIZATION: ${techniqueName || 'printing'} on ${locationName || 'front'}
${clientName ? `CLIENT: ${clientName}` : ''}
${clientSegment ? `CLIENT INDUSTRY: ${clientSegment}` : ''}
${brandColorName ? `BRAND COLOR: ${brandColorName}` : ''}
${objective ? `CAMPAIGN OBJECTIVE: ${objective}` : ''}
${tone ? `DESIRED TONE: ${tone}` : ''}
${targetAudience ? `TARGET AUDIENCE: ${targetAudience}` : ''}
${season ? `SEASON/OCCASION: ${season}` : ''}

Create ${numPrompts} distinct scene concepts that:
- Show the product in different, compelling real-world contexts
- Range from aspirational to relatable scenarios
- Would each produce a visually stunning commercial photograph
- Consider the specific product type, its materials, and how people actually use it
- If a client industry is given, include at least 2 scenes relevant to that industry`;

    console.log("[ad-prompt] Generating prompts for:", productName);

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
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[ad-prompt] AI error:", response.status, errorText);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse JSON from response (handle markdown code blocks)
    let prompts;
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      prompts = JSON.parse(cleaned);
    } catch {
      console.error("[ad-prompt] Failed to parse:", content.slice(0, 500));
      throw new Error("Falha ao processar resposta da IA");
    }

    if (!Array.isArray(prompts) || prompts.length === 0) {
      throw new Error("Nenhum prompt gerado");
    }

    console.log(`[ad-prompt] Generated ${prompts.length} prompts successfully`);

    return new Response(
      JSON.stringify({ prompts }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("[ad-prompt] Error:", error);
    const message = error instanceof Error ? error.message : "Falha ao gerar prompts";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
