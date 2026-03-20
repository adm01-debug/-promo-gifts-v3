import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "imageBase64 is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle HTTP URLs: fetch the image and convert to base64
    let imageContent = imageBase64;
    if (imageBase64.startsWith("http://") || imageBase64.startsWith("https://")) {
      try {
        const imgResponse = await fetch(imageBase64);
        if (!imgResponse.ok) throw new Error(`Failed to fetch image: ${imgResponse.status}`);
        const contentType = imgResponse.headers.get("content-type") || "image/png";
        
        // Reject SVG — AI vision models don't support it
        if (contentType.includes("svg")) {
          return new Response(JSON.stringify({ 
            error: "Formato SVG não é suportado para análise de cores. Por favor, envie a logo em PNG, JPG ou WEBP." 
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
        const arrayBuffer = await imgResponse.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        let binary = "";
        for (let i = 0; i < uint8Array.length; i++) {
          binary += String.fromCharCode(uint8Array[i]);
        }
        const base64 = btoa(binary);
        imageContent = `data:${contentType};base64,${base64}`;
      } catch (fetchErr) {
        console.error("Error fetching image URL:", fetchErr);
        return new Response(JSON.stringify({ error: "Failed to fetch image from URL" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Also reject SVG from base64 data URIs
    if (imageContent.startsWith("data:image/svg")) {
      return new Response(JSON.stringify({ 
        error: "Formato SVG não é suportado para análise de cores. Por favor, envie a logo em PNG, JPG ou WEBP." 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this logo image and extract ALL distinct colors present in it.
For each color, return:
- name: a human-readable color name in Portuguese (e.g. "Azul Escuro", "Vermelho")
- hex: the exact hex color code (e.g. "#003DA5")

Rules:
- Ignore white backgrounds (but include white if it's PART of the logo design)
- Ignore transparency
- Extract between 1-10 colors
- Order by visual prominence (most dominant first)
- Be precise with the hex values — match the actual pixel colors

Return ONLY a JSON array, no markdown, no explanation. Example:
[{"name":"Azul Marinho","hex":"#003DA5"},{"name":"Vermelho","hex":"#E4002B"}]`
              },
              {
                type: "image_url",
                image_url: {
                  url: imageContent.startsWith("data:") ? imageContent : `data:image/png;base64,${imageContent}`
                }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "[]";
    
    // Parse JSON from response (handle markdown wrapping)
    let colors;
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      colors = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      console.error("Failed to parse AI response:", content);
      colors = [];
    }

    return new Response(JSON.stringify({ colors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-logo-colors error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
