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
    const logoImageSrc = logoBase64 || logoUrl;

    if (!productImageUrl || !logoImageSrc) {
      return new Response(
        JSON.stringify({ error: "Product image and logo are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
