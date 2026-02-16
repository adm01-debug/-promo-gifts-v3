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

    // SVG files should already be converted to PNG on the client side
    // but add a safety check just in case
    const isSvg = typeof logoImageSrc === "string" && 
      (logoImageSrc.startsWith("data:image/svg+xml") || logoImageSrc.endsWith(".svg"));
    
    if (isSvg) {
      return new Response(
        JSON.stringify({ 
          error: "Logos em formato SVG não são suportados. Por favor, converta para PNG ou JPG.",
          errorCode: "SVG_NOT_SUPPORTED"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating mockup for product: ${productName}`);
    console.log(`Technique: ${techniqueName}`);
    console.log(`Position: ${positionX}%, ${positionY}%`);
    console.log(`Size: ${logoWidthCm}cm x ${logoHeightCm}cm`);

    // Calculate precise position description
    // positionX: 0%=far left, 50%=center, 100%=far right
    // positionY: 0%=very top, 50%=center, 100%=very bottom
    const horizontalPos = positionX < 25 ? "far left" : positionX < 40 ? "left of center" : positionX > 75 ? "far right" : positionX > 60 ? "right of center" : "horizontally centered";
    const verticalPos = positionY < 25 ? "near the very top" : positionY < 40 ? "in the upper third" : positionY > 75 ? "near the very bottom" : positionY > 60 ? "in the lower third" : "vertically centered";
    const positionDesc = `${verticalPos}, ${horizontalPos}`;

    // Calculate relative size (assuming product is ~30cm on average)
    const relativeSize = ((logoWidthCm + logoHeightCm) / 2) / 30;
    const sizeDesc = relativeSize < 0.15 ? "small" : relativeSize < 0.3 ? "medium-sized" : "large";

    const prompt = `You are a professional product mockup generator. Apply the provided company logo onto the product image at the EXACT position specified.

Product: ${productName}
Technique: ${techniquePrompt}

EXACT LOGO POSITION (this is critical, do NOT deviate):
- Horizontal: ${positionX}% from the left edge (${horizontalPos})
- Vertical: ${positionY}% from the top edge (${verticalPos})
- The logo must be placed at EXACTLY this coordinate on the product surface: ${positionDesc}
- Logo size: ${sizeDesc} (approximately ${logoWidthCm}cm x ${logoHeightCm}cm)

STRICT RULES - MUST FOLLOW ALL:
1. Place the logo at EXACTLY the specified position (${positionX}% horizontal, ${positionY}% vertical). This is the most important rule.
2. DO NOT move the logo to a different location than specified. If the position says "lower third", the logo MUST be in the lower third, NOT in the middle or upper area.
3. DO NOT change the product size, proportions, dimensions, framing, or crop in any way.
4. The output must have the exact same composition and scale as the input product image.
5. The logo should follow the contours/curves of the product surface naturally.
6. Apply realistic lighting and shadows matching the product.
7. Maintain identical background, lighting, and photography style.

Output the final image maintaining the exact same dimensions and aspect ratio as the original product photo.`;

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
