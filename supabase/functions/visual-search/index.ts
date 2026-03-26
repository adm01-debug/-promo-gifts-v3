import { getCorsHeaders, handleCorsPreflightIfNeeded } from '../_shared/cors.ts';
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

// CORS headers are now dynamic — use getCorsHeaders(req) inside the handler
// See _shared/cors.ts for the centralized configuration

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const supabaseAuth = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { imageBase64 } = await req.json();
    
    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "Image is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Analyzing image with AI...");

    // Step 1: Analyze image to extract product characteristics
    const analysisResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Você é um especialista em identificação de produtos promocionais/brindes corporativos.
Analise a imagem e extraia características para busca de produtos similares.
Responda APENAS em JSON com este formato:
{
  "productType": "tipo do produto (ex: caneca, squeeze, caderno, bolsa, camiseta)",
  "material": "material principal (ex: plástico, metal, vidro, tecido, papel)",
  "colors": ["cores principais identificadas"],
  "category": "categoria (ex: escritório, cozinha, esporte, tecnologia, vestuário)",
  "keywords": ["palavras-chave para busca"],
  "description": "descrição curta do produto"
}`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analise esta imagem de produto e extraia as características para encontrar produtos similares no catálogo de brindes promocionais."
              },
              {
                type: "image_url",
                image_url: {
                  url: imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ]
      }),
    });

    if (!analysisResponse.ok) {
      const errorText = await analysisResponse.text();
      console.error("AI analysis error:", analysisResponse.status, errorText);
      
      if (analysisResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (analysisResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI analysis failed: ${errorText}`);
    }

    const analysisData = await analysisResponse.json();
    const analysisContent = analysisData.choices?.[0]?.message?.content || "";
    
    console.log("AI analysis result:", analysisContent);

    // Parse JSON from response
    let productAnalysis;
    try {
      const jsonMatch = analysisContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        productAnalysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      productAnalysis = {
        productType: "",
        material: "",
        colors: [],
        category: "",
        keywords: analysisContent.split(/\s+/).slice(0, 10),
        description: analysisContent.slice(0, 200)
      };
    }

    // Step 2: Search products in database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build search query combining keywords
    const searchTerms = [
      productAnalysis.productType,
      productAnalysis.material,
      productAnalysis.category,
      ...(productAnalysis.keywords || [])
    ].filter(Boolean).join(" ");

    console.log("Searching products with terms:", searchTerms);

    // Use semantic search function
    const { data: products, error: searchError } = await supabase
      .rpc("search_products_semantic", {
        search_query: searchTerms,
        max_results: 20
      });

    if (searchError) {
      console.error("Search error:", searchError);
      throw new Error(`Search failed: ${searchError.message}`);
    }

    // If no results from semantic search, try direct query
    let finalProducts = products || [];
    
    if (finalProducts.length === 0) {
      console.log("No semantic results, trying direct query...");
      
      const { data: directProducts, error: directError } = await supabase
        .from("products")
        .select("id, name, sku, category_name, subcategory, description, price, colors, materials, tags, images")
        .eq("is_active", true)
        .or(`name.ilike.%${productAnalysis.productType}%,category_name.ilike.%${productAnalysis.category}%`)
        .limit(20);

      if (!directError && directProducts) {
        finalProducts = directProducts.map(p => ({ ...p, relevance: 0.5 }));
      }
    }

    console.log(`Found ${finalProducts.length} similar products`);

    return new Response(
      JSON.stringify({
        analysis: productAnalysis,
        products: finalProducts,
        searchTerms
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Visual search error:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro ao processar busca visual";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
