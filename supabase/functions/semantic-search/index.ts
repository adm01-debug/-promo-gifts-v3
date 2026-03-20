/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

  // Generate cache key using hash
  generateKey(query: string): string {
    const normalized = query.toLowerCase().trim();
    const encoder = new TextEncoder();
    const data = encoder.encode(normalized);
    // Simple hash for cache key
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data[i];
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `search:${hash.toString(16)}`;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.data;
  }

  set(key: string, data: T): void {
    // Enforce LRU-like behavior by removing oldest entries when at capacity
    if (this.cache.size >= this.maxEntries) {
      this.evictOldest();
    }

    this.cache.set(key, {
      data,
      expiresAt: Date.now() + this.ttlMs
    });
  }

  private evictOldest(): void {
    const now = Date.now();
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    // First, try to remove expired entries
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        return;
      }
      if (entry.expiresAt < oldestTime) {
        oldestTime = entry.expiresAt;
        oldestKey = key;
      }
    }

    // If no expired entries, remove the oldest one
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  // Cleanup expired entries (called periodically)
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  getStats(): { hits: number; misses: number; size: number; hitRate: string } {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? ((this.hits / total) * 100).toFixed(1) + '%' : '0%';
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      hitRate
    };
  }

  // Reset stats (useful for monitoring)
  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
  }
}

// ========================================
// GLOBAL CACHE INSTANCE
// ========================================

// 5 minutes TTL, max 1000 entries
const searchCache = new TTLCache<SearchIntent>(5 * 60 * 1000, 1000);

// Cleanup expired entries every minute (roughly)
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 60 * 1000; // 1 minute

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();

    if (!query || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ success: false, error: 'Query too short' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Periodic cleanup (probabilistic, ~1% of requests)
    if (Date.now() - lastCleanup > CLEANUP_INTERVAL) {
      const cleaned = searchCache.cleanup();
      if (cleaned > 0) {
        console.log(`[Cache] Cleaned ${cleaned} expired entries`);
      }
      lastCleanup = Date.now();
    }

    // ========================================
    // CHECK CACHE FIRST
    // ========================================
    const cacheKey = searchCache.generateKey(query);
    const cachedResult = searchCache.get(cacheKey);

    if (cachedResult) {
      const stats = searchCache.getStats();
      console.log(`[Cache HIT] Query: "${query}" | Stats: ${JSON.stringify(stats)}`);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          intent: cachedResult,
          cached: true,
          cacheStats: stats
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================
    // CACHE MISS - Call AI
    // ========================================
    console.log(`[Cache MISS] Query: "${query}" - Calling AI...`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
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
                  type: {
                    type: "string",
                    enum: ["product", "client", "quote", "order", "mixed"],
                    description: "Tipo principal da busca"
                  },
                  filters: {
                    type: "object",
                    properties: {
                      category: { type: "string", description: "Categoria do produto" },
                      color: { type: "string", description: "Cor do produto" },
                      material: { type: "string", description: "Material do produto" },
                      priceRange: { type: "string", enum: ["low", "medium", "high"] },
                      status: { type: "string", description: "Status do orçamento/pedido" },
                      clientName: { type: "string", description: "Nome do cliente" },
                      dateRange: { type: "string", enum: ["today", "week", "month", "year"] }
                    }
                  },
                  keywords: {
                    type: "array",
                    items: { type: "string" },
                    description: "Palavras-chave para busca textual"
                  }
                },
                required: ["type", "filters", "keywords"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "parse_search_intent" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: "Rate limit exceeded, please try again later" }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: "Payment required" }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log("[AI Response]:", JSON.stringify(aiResponse));

    let searchIntent: SearchIntent = {
      type: 'mixed',
      filters: {},
      keywords: query.split(' ').filter((w: string) => w.length > 2),
      originalQuery: query
    };

    // Parse tool call response
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        searchIntent = {
          ...parsed,
          originalQuery: query
        };
      } catch (e) {
        console.error("[Error] Parsing tool response:", e);
      }
    }

    // ========================================
    // STORE IN CACHE
    // ========================================
    searchCache.set(cacheKey, searchIntent);
    const stats = searchCache.getStats();
    console.log(`[Cache SET] Query: "${query}" | Cache size: ${stats.size} | Hit rate: ${stats.hitRate}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        intent: searchIntent,
        cached: false,
        cacheStats: stats
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("[Error] semantic-search:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
