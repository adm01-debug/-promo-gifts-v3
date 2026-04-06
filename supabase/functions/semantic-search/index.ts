import { getCorsHeaders } from '../_shared/cors.ts';
import { authenticateRequest, authErrorResponse } from '../_shared/auth.ts';
import { callAiWithTracking, QuotaExceededError } from '../_shared/ai-usage.ts';

// ========================================
// CACHE IMPLEMENTATION - TTL 5 minutes
// ========================================

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class TTLCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private readonly ttlMs: number;
  private readonly maxEntries: number;
  private hits = 0;
  private misses = 0;

  constructor(ttlMs: number = 5 * 60 * 1000, maxEntries: number = 1000) {
    this.ttlMs = ttlMs;
    this.maxEntries = maxEntries;
  }

  generateKey(query: string): string {
    const normalized = query.toLowerCase().trim();
    const encoder = new TextEncoder();
    const data = encoder.encode(normalized);
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data[i];
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `search:${hash.toString(16)}`;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) { this.misses++; return null; }
    if (Date.now() > entry.expiresAt) { this.cache.delete(key); this.misses++; return null; }
    this.hits++;
    return entry.data;
  }

  set(key: string, data: T): void {
    if (this.cache.size >= this.maxEntries) this.evictOldest();
    this.cache.set(key, { data, expiresAt: Date.now() + this.ttlMs });
  }

  private evictOldest(): void {
    const now = Date.now();
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) { this.cache.delete(key); return; }
      if (entry.expiresAt < oldestTime) { oldestTime = entry.expiresAt; oldestKey = key; }
    }
    if (oldestKey) this.cache.delete(oldestKey);
  }

  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) { this.cache.delete(key); cleaned++; }
    }
    return cleaned;
  }

  getStats() {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? ((this.hits / total) * 100).toFixed(1) + '%' : '0%';
    return { hits: this.hits, misses: this.misses, size: this.cache.size, hitRate };
  }
}

// ========================================
// GLOBAL CACHE INSTANCE
// ========================================
const searchCache = new TTLCache<SearchIntent>(5 * 60 * 1000, 1000);
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 60 * 1000;

interface SearchIntent {
  type: 'product' | 'client' | 'quote' | 'order' | 'mixed';
  filters: {
    category?: string;
    color?: string;
    material?: string;
    priceRange?: 'low' | 'medium' | 'high';
    status?: string;
    clientName?: string;
    dateRange?: 'today' | 'week' | 'month' | 'year';
  };
  keywords: string[];
  originalQuery: string;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate
    const auth = await authenticateRequest(req);

    const { query } = await req.json();
    if (!query || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ success: false, error: 'Query too short' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Periodic cleanup
    if (Date.now() - lastCleanup > CLEANUP_INTERVAL) {
      const cleaned = searchCache.cleanup();
      if (cleaned > 0) console.log(`[Cache] Cleaned ${cleaned} expired entries`);
      lastCleanup = Date.now();
    }

    // Check cache
    const cacheKey = searchCache.generateKey(query);
    const cachedResult = searchCache.get(cacheKey);

    if (cachedResult) {
      const stats = searchCache.getStats();
      console.log(`[Cache HIT] Query: "${query}" | Stats: ${JSON.stringify(stats)}`);
      return new Response(
        JSON.stringify({ success: true, intent: cachedResult, cached: true, cacheStats: stats }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Cache miss — call AI with tracking
    console.log(`[Cache MISS] Query: "${query}" - Calling AI...`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const model = "google/gemini-2.5-flash";

    const systemPrompt = `Você é um assistente de busca inteligente para um sistema de catálogo de produtos promocionais e brindes corporativos.

Analise a consulta do usuário e extraia a intenção de busca estruturada.

TIPOS DE BUSCA:
- product: busca por produtos (canecas, camisetas, brindes, etc.)
- client: busca por clientes (empresas, pessoas)
- quote: busca por orçamentos
- order: busca por pedidos
- mixed: busca geral em múltiplas entidades

FILTROS POSSÍVEIS:
- category: categoria do produto (ex: canecas, camisetas, mochilas, escritório)
- color: cor do produto (ex: azul, vermelho, preto, branco)
- material: material (ex: algodão, plástico, metal, couro)
- priceRange: faixa de preço (low = barato, medium = médio, high = caro/premium)
- status: status (para orçamentos: draft, pending, sent, approved, rejected | para pedidos: pending, confirmed, shipped, delivered)
- clientName: nome do cliente mencionado
- dateRange: período de tempo (today, week, month, year)

EXEMPLOS:
- "canecas azuis baratas" → type: product, filters: { category: "canecas", color: "azul", priceRange: "low" }
- "orçamentos pendentes do João" → type: quote, filters: { status: "pending", clientName: "João" }
- "pedidos entregues essa semana" → type: order, filters: { status: "delivered", dateRange: "week" }
- "camisetas algodão branco" → type: product, filters: { category: "camisetas", material: "algodão", color: "branco" }
- "cliente Empresa ABC" → type: client, filters: { clientName: "Empresa ABC" }

Responda APENAS com JSON válido no formato especificado.`;

    const aiResponse = await callAiWithTracking({
      userId: auth.userId,
      functionName: "semantic-search",
      model,
      apiKey: LOVABLE_API_KEY,
      requestBody: {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analise esta busca: "${query}"` }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "parse_search_intent",
              description: "Extrai a intenção estruturada de uma consulta de busca",
              parameters: {
                type: "object",
                properties: {
                  type: { type: "string", enum: ["product", "client", "quote", "order", "mixed"] },
                  filters: {
                    type: "object",
                    properties: {
                      category: { type: "string" },
                      color: { type: "string" },
                      material: { type: "string" },
                      priceRange: { type: "string", enum: ["low", "medium", "high"] },
                      status: { type: "string" },
                      clientName: { type: "string" },
                      dateRange: { type: "string", enum: ["today", "week", "month", "year"] }
                    }
                  },
                  keywords: { type: "array", items: { type: "string" } }
                },
                required: ["type", "filters", "keywords"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "parse_search_intent" } }
      },
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ success: false, error: "Rate limit exceeded" }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ success: false, error: "Payment required" }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();

    let searchIntent: SearchIntent = {
      type: 'mixed',
      filters: {},
      keywords: query.split(' ').filter((w: string) => w.length > 2),
      originalQuery: query
    };

    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        searchIntent = { ...parsed, originalQuery: query };
      } catch (e) {
        console.error("[Error] Parsing tool response:", e);
      }
    }

    searchCache.set(cacheKey, searchIntent);
    const stats = searchCache.getStats();
    console.log(`[Cache SET] Query: "${query}" | Cache size: ${stats.size} | Hit rate: ${stats.hitRate}`);

    return new Response(
      JSON.stringify({ success: true, intent: searchIntent, cached: false, cacheStats: stats }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    if (error instanceof QuotaExceededError) {
      return new Response(JSON.stringify({ success: false, error: "Cota de IA excedida este mês." }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if ((error as any)?.status === 401 || (error as any)?.status === 403) {
      return authErrorResponse(error, corsHeaders);
    }
    console.error("[Error] semantic-search:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
