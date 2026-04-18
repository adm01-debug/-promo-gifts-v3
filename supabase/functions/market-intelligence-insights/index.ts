// supabase/functions/market-intelligence-insights/index.ts
// Generates AI-powered insights for the Market Intelligence dashboard.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { authenticateRequest, authErrorResponse } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface RequestBody {
  days?: number;
  categoryId?: string | null;
  supplierId?: string | null;
  productId?: string | null;
  categoryName?: string | null;
  supplierName?: string | null;
  productName?: string | null;
}

interface AggregatedSummary {
  period_days: number;
  filters: { category?: string | null; supplier?: string | null; product?: string | null };
  current: {
    revenue: number;
    orders: number;
    quotes: number;
    avg_ticket: number;
    conversion_rate: number;
  };
  previous: {
    revenue: number;
    orders: number;
    quotes: number;
    avg_ticket: number;
    conversion_rate: number;
  };
  deltas: {
    revenue_pct: number | null;
    orders_pct: number | null;
    quotes_pct: number | null;
    conversion_pct_points: number | null;
  };
  top_products: Array<{ name: string; quantity: number; revenue: number }>;
  top_suppliers: Array<{ name: string; revenue: number; share_pct: number }>;
}

function pctChange(curr: number, prev: number): number | null {
  if (prev === 0) return curr === 0 ? 0 : null;
  return Number((((curr - prev) / prev) * 100).toFixed(1));
}

function buildFallback(s: AggregatedSummary) {
  const filterCtx =
    [s.filters.category, s.filters.supplier, s.filters.product].filter(Boolean).join(" · ") ||
    "todo o catálogo";
  const rev = s.current.revenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const dRev = s.deltas.revenue_pct;
  const dQuotes = s.deltas.quotes_pct;
  const conv = s.current.conversion_rate;
  const top = s.top_products[0]?.name;

  return {
    summary: `Nos últimos ${s.period_days} dias, ${filterCtx} faturou ${rev} com ${s.current.orders} pedidos.`,
    what_changed:
      dRev !== null
        ? `Faturamento ${dRev >= 0 ? "subiu" : "caiu"} ${Math.abs(dRev)}% vs. período anterior; ${
            s.current.quotes
          } orçamentos${dQuotes !== null ? ` (${dQuotes >= 0 ? "+" : ""}${dQuotes}%)` : ""}.`
        : `${s.current.quotes} orçamentos e ${s.current.orders} pedidos no período.`,
    why: top
      ? `Performance puxada por "${top}" e concentração nos 5 principais fornecedores.`
      : "Volume distribuído entre múltiplos produtos sem concentração clara.",
    next_action:
      conv < 30
        ? `Conversão em ${conv}% — revise follow-up dos orçamentos abertos para destravar pedidos.`
        : "Mantenha o ritmo: foque os 5 produtos de maior giro para sustentar o faturamento.",
    highlights: [
      s.top_suppliers[0] ? `${s.top_suppliers[0].name} representa ${s.top_suppliers[0].share_pct}% do faturamento.` : null,
      s.current.avg_ticket > 0
        ? `Ticket médio: ${s.current.avg_ticket.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`
        : null,
    ].filter(Boolean) as string[],
  };
}

async function aggregateData(
  supabase: ReturnType<typeof createClient>,
  body: RequestBody,
): Promise<AggregatedSummary> {
  const days = Math.max(1, Math.min(body.days ?? 30, 365));
  const now = new Date();
  const startCurr = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const startPrev = new Date(now.getTime() - 2 * days * 24 * 60 * 60 * 1000);

  const buildQuoteQuery = (from: Date, to: Date) => {
    let q = supabase
      .from("quotes")
      .select("id, total, status, created_at", { count: "exact" })
      .gte("created_at", from.toISOString())
      .lt("created_at", to.toISOString());
    return q;
  };

  const buildOrderQuery = (from: Date, to: Date) => {
    let q = supabase
      .from("orders")
      .select("id, total, created_at", { count: "exact" })
      .gte("created_at", from.toISOString())
      .lt("created_at", to.toISOString());
    return q;
  };

  const [currQuotes, prevQuotes, currOrders, prevOrders] = await Promise.all([
    buildQuoteQuery(startCurr, now),
    buildQuoteQuery(startPrev, startCurr),
    buildOrderQuery(startCurr, now),
    buildOrderQuery(startPrev, startCurr),
  ]);

  const calcMetrics = (
    quotes: { data: any[] | null },
    orders: { data: any[] | null },
  ) => {
    const qData = quotes.data ?? [];
    const oData = orders.data ?? [];
    const revenue = oData.reduce((s, o) => s + (Number(o.total) || 0), 0);
    const orderCount = oData.length;
    const quoteCount = qData.length;
    const avg_ticket = orderCount > 0 ? revenue / orderCount : 0;
    const conversion_rate = quoteCount > 0 ? Number(((orderCount / quoteCount) * 100).toFixed(1)) : 0;
    return { revenue, orders: orderCount, quotes: quoteCount, avg_ticket, conversion_rate };
  };

  const current = calcMetrics(currQuotes, currOrders);
  const previous = calcMetrics(prevQuotes, prevOrders);

  const orderIds = (currOrders.data ?? []).map((o: any) => o.id);
  let top_products: AggregatedSummary["top_products"] = [];
  if (orderIds.length > 0) {
    const { data: items } = await supabase
      .from("order_items")
      .select("product_id, product_name, quantity, unit_price")
      .in("order_id", orderIds)
      .limit(2000);
    const acc: Record<string, { name: string; quantity: number; revenue: number }> = {};
    (items ?? []).forEach((it: any) => {
      if (body.productId && it.product_id !== body.productId) return;
      const key = it.product_id || it.product_name || "unknown";
      if (!acc[key]) acc[key] = { name: it.product_name || "Produto", quantity: 0, revenue: 0 };
      acc[key].quantity += Number(it.quantity) || 0;
      acc[key].revenue += (Number(it.quantity) || 0) * (Number(it.unit_price) || 0);
    });
    top_products = Object.values(acc)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }

  const top_suppliers: AggregatedSummary["top_suppliers"] = body.supplierName
    ? [{ name: body.supplierName, revenue: current.revenue, share_pct: 100 }]
    : [];

  return {
    period_days: days,
    filters: {
      category: body.categoryName ?? null,
      supplier: body.supplierName ?? null,
      product: body.productName ?? null,
    },
    current,
    previous,
    deltas: {
      revenue_pct: pctChange(current.revenue, previous.revenue),
      orders_pct: pctChange(current.orders, previous.orders),
      quotes_pct: pctChange(current.quotes, previous.quotes),
      conversion_pct_points: Number((current.conversion_rate - previous.conversion_rate).toFixed(1)),
    },
    top_products,
    top_suppliers,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await authenticateRequest(req).catch((e) => {
      throw e;
    });

    const body = (await req.json().catch(() => ({}))) as RequestBody;
    const summary = await aggregateData(auth.localServiceClient, body);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.warn("[market-intelligence-insights] LOVABLE_API_KEY missing — fallback");
      return new Response(JSON.stringify(buildFallback(summary)), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (summary.current.orders === 0 && summary.current.quotes === 0) {
      return new Response(JSON.stringify(buildFallback(summary)), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Você é analista comercial sênior. Gere insights ACIONÁVEIS e ESPECÍFICOS em pt-BR sobre o desempenho de vendas. Use números concretos do JSON fornecido. Seja direto: 1 frase por campo. Nunca invente dados.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Dados:\n${JSON.stringify(summary, null, 2)}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "emit_insights",
              description: "Retorna insights estruturados sobre o desempenho comercial",
              parameters: {
                type: "object",
                properties: {
                  summary: { type: "string", description: "Resumo executivo em 1 frase com número-chave" },
                  what_changed: { type: "string", description: "O que mudou vs. período anterior, com %" },
                  why: { type: "string", description: "Hipótese causal curta" },
                  next_action: { type: "string", description: "Próxima ação concreta" },
                  highlights: {
                    type: "array",
                    items: { type: "string" },
                    description: "2-3 bullets opcionais de destaque",
                  },
                },
                required: ["summary", "what_changed", "why", "next_action"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "emit_insights" } },
      }),
    });

    if (aiResp.status === 429) {
      return new Response(JSON.stringify({ error: "rate_limited", ...buildFallback(summary) }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiResp.status === 402) {
      return new Response(JSON.stringify({ error: "no_credits", ...buildFallback(summary) }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiResp.ok) {
      console.error("[market-intelligence-insights] AI error", aiResp.status, await aiResp.text());
      return new Response(JSON.stringify(buildFallback(summary)), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall?.function?.arguments;
    let parsed: any = null;
    try {
      parsed = typeof args === "string" ? JSON.parse(args) : args;
    } catch {
      parsed = null;
    }
    if (!parsed || !parsed.summary) {
      return new Response(JSON.stringify(buildFallback(summary)), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    if (e?.status) return authErrorResponse(e, corsHeaders);
    console.error("[market-intelligence-insights] error", e);
    return new Response(JSON.stringify({ error: e?.message ?? "internal_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
