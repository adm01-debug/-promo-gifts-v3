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
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const {
      productImageUrl,
      logoBase64,
      logoUrl,
      productName,
      productColor,
      techniqueName,
      locationName,
      scenePrompt,
      sceneCategory,
    } = await req.json();

    const logoImageSrc = logoBase64 || logoUrl;

    if (!productImageUrl || !logoImageSrc) {
      return new Response(
        JSON.stringify({ error: "Product image and logo are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!scenePrompt) {
      return new Response(
        JSON.stringify({ error: "Scene prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[ad-image] Product: ${productName} (${productColor})`);
    console.log(`[ad-image] Technique: ${techniqueName} @ ${locationName}`);
    console.log(`[ad-image] Scene category: ${sceneCategory}`);

    const prompt = `Create a HIGH-QUALITY commercial advertising photograph for a promotional product company.

PRODUCT: ${productName}${productColor ? ` in ${productColor} color` : ''}
CUSTOMIZATION: The product has the company logo applied via ${techniqueName || 'printing'} on the ${locationName || 'front'}.

SCENE: ${scenePrompt}

CRITICAL REQUIREMENTS:
1. The product shown in the reference image MUST appear prominently in the scene, clearly visible
2. The company logo from the second image MUST be visible on the product, applied realistically via ${techniqueName || 'printing'}
3. The logo should look naturally integrated into the product surface (not floating or pasted on)
4. The overall image should look like a professional advertising campaign photo
5. High resolution, perfect lighting, commercial photography quality
6. The product should be the HERO of the image — the focal point
7. People, environments, and props should complement but not overshadow the product
8. Colors should be vibrant and appealing, suitable for marketing materials

Style: Professional commercial photography, advertising campaign quality, magazine-worthy.`;

    console.log("[ad-image] Sending request to AI Gateway...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: productImageUrl } },
              { type: "image_url", image_url: { url: logoImageSrc } },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[ad-image] AI Gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados. Adicione mais créditos." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const generatedImage = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!generatedImage) {
      console.error("[ad-image] No image in response:", JSON.stringify(data).slice(0, 500));
      throw new Error("Nenhuma imagem gerada na resposta");
    }

    console.log("[ad-image] Ad image generated successfully");

    return new Response(
      JSON.stringify({
        imageUrl: generatedImage,
        message: data.choices?.[0]?.message?.content || "Imagem publicitária gerada com sucesso",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("[ad-image] Error:", error);
    const message = error instanceof Error ? error.message : "Falha ao gerar imagem publicitária";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
