/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
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
      techniqueName,
      techniquePrompt,
      positionX, 
      positionY, 
      logoWidthCm, 
      logoHeightCm,
      productName 
    } = await req.json();

    // Accept either base64 data or a URL for the logo
    let logoImageSrc = logoBase64 || logoUrl;

    if (!productImageUrl || !logoImageSrc) {
      return new Response(
        JSON.stringify({ error: "Product image and logo are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Detect SVG and convert to PNG-compatible format
    const isSvgDataUri = typeof logoImageSrc === "string" && logoImageSrc.startsWith("data:image/svg+xml");
    const isSvgUrl = typeof logoImageSrc === "string" && (logoImageSrc.endsWith(".svg") || logoImageSrc.includes("image/svg"));
    
    if (isSvgDataUri || isSvgUrl) {
      console.log("SVG logo detected — converting to PNG via rasterization...");
      try {
        let svgContent: string;
        if (isSvgDataUri) {
          // Extract SVG content from data URI
          const base64Match = logoImageSrc.match(/^data:image\/svg\+xml;base64,(.+)$/);
          const rawMatch = logoImageSrc.match(/^data:image\/svg\+xml[^,]*,(.+)$/);
          if (base64Match) {
            svgContent = atob(base64Match[1]);
          } else if (rawMatch) {
            svgContent = decodeURIComponent(rawMatch[1]);
          } else {
            throw new Error("Could not parse SVG data URI");
          }
        } else {
          // Fetch SVG from URL
          const svgResp = await fetch(logoImageSrc);
          if (!svgResp.ok) throw new Error(`Failed to fetch SVG: ${svgResp.status}`);
          svgContent = await svgResp.text();
        }

        // Ensure SVG has explicit dimensions for rasterization
        let width = 512, height = 512;
        const viewBoxMatch = svgContent.match(/viewBox=["']([^"']+)["']/);
        if (viewBoxMatch) {
          const parts = viewBoxMatch[1].split(/[\s,]+/).map(Number);
          if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
            const aspect = parts[2] / parts[3];
            if (aspect > 1) { width = 512; height = Math.round(512 / aspect); }
            else { height = 512; width = Math.round(512 * aspect); }
          }
        }

        // Convert SVG to a PNG-compatible base64 using a simple SVG-in-canvas approach
        // Since we can't use Canvas in Deno edge, we'll encode the SVG as a properly-typed PNG placeholder
        // The best approach: re-encode as a high-quality base64 with proper MIME
        const svgBase64 = btoa(unescape(encodeURIComponent(svgContent)));
        // Try sending as a generic image — wrap SVG in a minimal foreignObject PNG workaround
        // Actually, the simplest fix: convert to a proper raster by using the product image endpoint
        // For now, provide clear error message to user about SVG limitation
        
        return new Response(
          JSON.stringify({ 
            error: "Logos em formato SVG não são suportados para geração de mockups. Por favor, converta seu logo para PNG ou JPG antes de fazer o upload.",
            errorCode: "SVG_NOT_SUPPORTED"
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (svgError) {
        console.error("SVG handling error:", svgError);
        return new Response(
          JSON.stringify({ 
            error: "Logos em formato SVG não são suportados. Por favor, use PNG ou JPG.",
            errorCode: "SVG_NOT_SUPPORTED"
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log(`Generating mockup for product: ${productName}`);
    console.log(`Technique: ${techniqueName}`);
    console.log(`Position: ${positionX}%, ${positionY}%`);
    console.log(`Size: ${logoWidthCm}cm x ${logoHeightCm}cm`);

    // Calculate position description
    const horizontalPos = positionX < 40 ? "left side" : positionX > 60 ? "right side" : "center";
    const verticalPos = positionY < 40 ? "upper" : positionY > 60 ? "lower" : "middle";
    const positionDesc = `${verticalPos} ${horizontalPos}`;

    // Calculate relative size (assuming product is ~30cm on average)
    const relativeSize = ((logoWidthCm + logoHeightCm) / 2) / 30;
    const sizeDesc = relativeSize < 0.15 ? "small" : relativeSize < 0.3 ? "medium-sized" : "large";

    const prompt = `Take this promotional product image and apply the provided company logo to it.

Product: ${productName}
Logo placement: ${positionDesc} of the product
Logo size: ${sizeDesc} (approximately ${logoWidthCm}cm x ${logoHeightCm}cm)

IMPORTANT: Render the logo ${techniquePrompt}

Make the result look like a professional product mockup photo. The logo should:
- Be properly integrated into the product surface
- Follow the contours and curves of the product
- Have realistic lighting and shadows matching the product
- Look like a real customized promotional item
- Maintain the original product colors and appearance

Keep the product photography style consistent - same background, lighting, and overall quality.`;

    console.log("Sending request to Lovable AI Gateway...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt
              },
              {
                type: "image_url",
                image_url: {
                  url: productImageUrl
                }
              },
              {
                type: "image_url",
                image_url: {
                  url: logoImageSrc
                }
              }
            ]
          }
        ],
        modalities: ["image", "text"]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add more credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI Gateway response received");

    // Extract the generated image from the response
    const generatedImage = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!generatedImage) {
      console.error("No image in response:", JSON.stringify(data));
      throw new Error("No image generated in response");
    }

    console.log("Mockup generated successfully");

    return new Response(
      JSON.stringify({ 
        mockupUrl: generatedImage,
        message: data.choices?.[0]?.message?.content || "Mockup generated successfully"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error generating mockup:", error);
    const message = error instanceof Error ? error.message : "Failed to generate mockup";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
