import { getCorsHeaders, handleCorsPreflightIfNeeded } from '../_shared/cors.ts';
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { authenticateRequest, authErrorResponse } from '../_shared/auth.ts';
import { z } from "npm:zod@3.23.8";
import { callAiWithTracking, QuotaExceededError } from '../_shared/ai-usage.ts';

const MessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1).max(10000),
});

const TextFilterSchema = z.union([
  z.string().min(1).max(200),
  z.array(z.string().min(1).max(200)).max(25),
]).optional().nullable();

const ExpertChatBodySchema = z.object({
  messages: z.array(MessageSchema).min(1).max(50),
  clientId: z.string().uuid().optional().nullable(),
  categoryFilter: TextFilterSchema,
  priceMin: z.number().nonnegative().optional().nullable(),
  priceMax: z.number().nonnegative().optional().nullable(),
  materialFilter: TextFilterSchema,
  colorFilter: TextFilterSchema,
  genderFilter: TextFilterSchema,
  supplierFilter: TextFilterSchema,
  techniqueFilter: TextFilterSchema,
  publicoFilter: TextFilterSchema,
  dataComemorativaFilter: TextFilterSchema,
  endomarketingFilter: TextFilterSchema,
  nichoFilter: TextFilterSchema,
  tagFilter: TextFilterSchema,
  onlyInStock: z.boolean().optional().nullable(),
  onlyNew: z.boolean().optional().nullable(),
  onlyKit: z.boolean().optional().nullable(),
  onlyBestseller: z.boolean().optional().nullable(),
  onlyFeatured: z.boolean().optional().nullable(),
  hasPersonalization: z.boolean().optional().nullable(),
});
// CORS headers are now dynamic — use getCorsHeaders(req) inside the handler
// See _shared/cors.ts for the centralized configuration

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ClientData {
  id: string;
  name: string;
  razao_social: string;
  nome_fantasia?: string | null;
  ramo_atividade?: string | null;
  cnpj?: string | null;
  logo_url?: string | null;
  cidade?: string | null;
  estado?: string | null;
  website?: string | null;
  instagram?: string | null;
}

interface CustomerData {
  cliente_ativado?: boolean;
  data_primeira_compra?: string | null;
  data_ultima_compra?: string | null;
  total_pedidos?: number;
  valor_total_compras?: number;
  ticket_medio?: number | null;
  poder_compra?: string | null;
  perfil_preco?: string | null;
  vendedor_nome?: string | null;
  sobre?: string | null;
  observacoes?: string | null;
}

interface OrderData {
  id: string;
  order_number: string;
  status: string;
  total: number;
  created_at: string;
  client_name?: string;
  fulfillment_status?: string;
}

interface FollowUpData {
  id: string;
  quote_id: string;
  reminder_type: string;
  scheduled_for: string;
  is_sent: boolean;
}

// Extract search terms from the last user message
function extractSearchTerms(messages: Message[]): string[] {
  const lastUserMessage = [...messages].reverse().find(m => m.role === "user");
  if (!lastUserMessage) return [];
  
  const content = lastUserMessage.content.toLowerCase();
  
  const stopWords = new Set([
    "o", "a", "os", "as", "um", "uma", "uns", "umas", "de", "da", "do", "das", "dos",
    "em", "na", "no", "nas", "nos", "por", "para", "com", "sem", "que", "qual", "quais",
    "como", "onde", "quando", "porque", "se", "ou", "e", "mas", "mais", "menos",
    "muito", "muita", "muitos", "muitas", "pouco", "pouca", "poucos", "poucas",
    "esse", "essa", "esses", "essas", "este", "esta", "estes", "estas", "aquele", "aquela",
    "isso", "isto", "aquilo", "meu", "minha", "seu", "sua", "nosso", "nossa",
    "algum", "alguma", "alguns", "algumas", "nenhum", "nenhuma", "todo", "toda", "todos", "todas",
    "outro", "outra", "outros", "outras", "mesmo", "mesma", "próprio", "própria",
    "você", "vocês", "ele", "ela", "eles", "elas", "nós", "eu", "me", "te", "lhe", "nos",
    "preciso", "quero", "gostaria", "poderia", "pode", "tem", "tenho", "ter", "haver",
    "ser", "estar", "fazer", "dar", "ver", "ir", "vir", "saber", "querer", "poder",
    "cliente", "produto", "produtos", "brinde", "brindes", "recomenda", "recomende", "sugira", "sugere",
    "melhor", "melhores", "bom", "boa", "bons", "boas", "ótimo", "ótima", "excelente",
  ]);
  
  const words = content
    .replace(/[^\w\sàáâãéêíóôõúç]/g, " ")
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
  
  return [...new Set(words)];
}

function normalizeFilterValues(value: string | string[] | null | undefined): string[] {
  if (!value) return [];
  return (Array.isArray(value) ? value : [value]).map((item) => item.trim()).filter(Boolean);
}

function normalizeValueList(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      if (typeof item === "string") return item.trim() ? [item.trim()] : [];
      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        const candidate = typeof record.name === "string"
          ? record.name
          : typeof record.label === "string"
            ? record.label
            : typeof record.value === "string"
              ? record.value
              : null;
        return candidate?.trim() ? [candidate.trim()] : [];
      }
      return [];
    });
  }
  if (typeof value === "string") {
    return value.split(/[,;|]/).map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function readTagValues(tags: unknown, keys: string[]): string[] {
  if (!tags || typeof tags !== "object") return [];
  const record = tags as Record<string, unknown>;
  return keys.flatMap((key) => normalizeValueList(record[key]));
}

function matchesTextFilter(value: unknown, filters: string[]): boolean {
  if (!filters.length) return true;
  const normalized = typeof value === "string" ? value.toLowerCase() : "";
  return filters.some((filter) => normalized === filter.toLowerCase() || normalized.includes(filter.toLowerCase()));
}

function matchesListFilter(value: unknown, filters: string[]): boolean {
  if (!filters.length) return true;
  const normalizedValues = normalizeValueList(value).map((item) => item.toLowerCase());
  return filters.some((filter) => normalizedValues.some((item) => item === filter.toLowerCase() || item.includes(filter.toLowerCase())));
}

function matchesTagFilter(tags: unknown, keys: string[], filters: string[]): boolean {
  if (!filters.length) return true;
  return matchesListFilter(readTagValues(tags, keys), filters);
}

function applyProductFilters(products: any[], filters: {
  categoryFilters: string[];
  materialFilters: string[];
  colorFilters: string[];
  genderFilters: string[];
  supplierFilters: string[];
  techniqueFilters: string[];
  publicoFilters: string[];
  dataComemorativaFilters: string[];
  endomarketingFilters: string[];
  nichoFilters: string[];
  tagFilters: string[];
  onlyInStock: boolean;
  onlyNew: boolean;
  onlyKit: boolean;
  onlyBestseller: boolean;
  onlyFeatured: boolean;
  hasPersonalization: boolean;
}) {
  return products.filter((product: any) => {
    // Category filter: skip at this level (category_id needs name lookup, done post-fetch)
    // Material filter
    if (!matchesListFilter(product.materials, filters.materialFilters)) return false;
    // Color filter
    if (!matchesListFilter(product.colors, filters.colorFilters)) return false;
    // Gender filter
    if (!matchesTextFilter(product.gender, filters.genderFilters)) return false;
    // Supplier filter: skip at this level (supplier_id needs name lookup)
    // Publico-alvo from tags
    if (!matchesTagFilter(product.tags, ["publicoAlvo", "publico_alvo"], filters.publicoFilters)) return false;
    if (!matchesTagFilter(product.tags, ["datasComemorativas", "datas_comemorativas"], filters.dataComemorativaFilters)) return false;
    if (!matchesTagFilter(product.tags, ["endomarketing"], filters.endomarketingFilters)) return false;
    if (!matchesTagFilter(product.tags, ["nicho", "segmentosAtividade", "segmentos_atividade", "ramo", "ramosAtividade", "ramos_atividade"], filters.nichoFilters)) return false;
    // Tags: check both top-level tags array and nested tags.tags
    if (filters.tagFilters.length > 0) {
      const topLevelTags = normalizeValueList(product.tags);
      const nestedTags = readTagValues(product.tags, ["tags"]);
      const allTags = [...topLevelTags, ...nestedTags].map(t => t.toLowerCase());
      if (!filters.tagFilters.some(f => allTags.some(t => t === f.toLowerCase() || t.includes(f.toLowerCase())))) return false;
    }
    // Techniques: check tags.tecnicas or product.techniques
    if (filters.techniqueFilters.length > 0) {
      const techFromTags = readTagValues(product.tags, ["tecnicas", "techniques", "tecnica"]);
      const techDirect = normalizeValueList(product.techniques);
      const allTech = [...techFromTags, ...techDirect].map(t => t.toLowerCase());
      if (!filters.techniqueFilters.some(f => allTech.some(t => t === f.toLowerCase() || t.includes(f.toLowerCase())))) return false;
    }
    if (filters.onlyInStock && Number(product.stock_quantity ?? product.stock ?? 0) <= 0) return false;
    if (filters.onlyNew && !Boolean(product.new_arrival ?? product.is_new)) return false;
    if (filters.onlyKit && !Boolean(product.is_kit)) return false;
    if (filters.onlyFeatured && !Boolean(product.featured ?? product.is_featured)) return false;
    if (filters.onlyBestseller && !Boolean(product.best_seller ?? product.is_bestseller)) return false;
    if (filters.hasPersonalization && !Boolean(product.has_personalization ?? product.personalizable ?? product.is_personalizable)) return false;
    return true;
  });
}

Deno.serve(async (req) => {
  // Declare corsHeaders outside try so catch block can always access it
  let corsHeaders: Record<string, string>;
  try {
    corsHeaders = getCorsHeaders(req);
  } catch {
    corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    };
  }
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await authenticateRequest(req);
    const userId = auth.userId;
    console.log("Authenticated user:", userId);

    const rawBody = await req.json();
    const parsed = ExpertChatBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      console.error("Validation errors:", JSON.stringify(parsed.error.flatten()));
      return new Response(
        JSON.stringify({ error: "Dados inválidos", details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const {
      messages,
      clientId,
      categoryFilter,
      priceMin,
      priceMax,
      materialFilter,
      colorFilter,
      genderFilter,
      supplierFilter,
      techniqueFilter,
      publicoFilter,
      dataComemorativaFilter,
      endomarketingFilter,
      nichoFilter,
      tagFilter,
      onlyInStock,
      onlyNew,
      onlyKit,
      onlyBestseller,
      onlyFeatured,
      hasPersonalization,
    } = parsed.data;

    const normalizedFilters = {
      categoryFilters: normalizeFilterValues(categoryFilter),
      materialFilters: normalizeFilterValues(materialFilter),
      colorFilters: normalizeFilterValues(colorFilter),
      genderFilters: normalizeFilterValues(genderFilter),
      supplierFilters: normalizeFilterValues(supplierFilter),
      techniqueFilters: normalizeFilterValues(techniqueFilter),
      publicoFilters: normalizeFilterValues(publicoFilter),
      dataComemorativaFilters: normalizeFilterValues(dataComemorativaFilter),
      endomarketingFilters: normalizeFilterValues(endomarketingFilter),
      nichoFilters: normalizeFilterValues(nichoFilter),
      tagFilters: normalizeFilterValues(tagFilter),
      onlyInStock: Boolean(onlyInStock),
      onlyNew: Boolean(onlyNew),
      onlyKit: Boolean(onlyKit),
      onlyBestseller: Boolean(onlyBestseller),
      onlyFeatured: Boolean(onlyFeatured),
      hasPersonalization: Boolean(hasPersonalization),
    };
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não está configurada");
    }

    // Use service role client from auth (bypasses RLS for cross-table queries)
    const supabase = auth.localServiceClient;

    // Fetch seller profile (for personalized greeting)
    let sellerFirstName = "";
    const { data: sellerProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", userId)
      .single();
    if (sellerProfile?.full_name) {
      sellerFirstName = sellerProfile.full_name.split(" ")[0];
    }

    // Fetch client data if clientId is provided
    let clientContext = "";
    let clientData: ClientData | null = null;
    let customerData: CustomerData | null = null;

    if (clientId) {
      console.log("Fetching client data from CRM for:", clientId);
      
      // Connect to external CRM database
      const CRM_URL = Deno.env.get("CRM_SUPABASE_URL");
      const CRM_KEY = Deno.env.get("CRM_SUPABASE_ANON_KEY");
      
      if (CRM_URL && CRM_KEY) {
        const crmClient = createClient(CRM_URL, CRM_KEY);
        
        // Fetch company data from CRM
        const { data: company, error: companyError } = await crmClient
          .from("companies")
          .select("id, razao_social, nome_fantasia, title, ramo_atividade, cnpj, logo_url, cidade, estado, website, instagram, is_customer, is_supplier")
          .eq("id", clientId)
          .single();

        if (companyError) {
          console.error("Error fetching CRM company:", companyError);
        } else if (company) {
          clientData = {
            id: company.id,
            name: company.title || company.nome_fantasia || company.razao_social,
            razao_social: company.razao_social,
            nome_fantasia: company.nome_fantasia,
            ramo_atividade: company.ramo_atividade,
            cnpj: company.cnpj,
            logo_url: company.logo_url,
            cidade: company.cidade,
            estado: company.estado,
            website: company.website,
            instagram: company.instagram,
          };
          console.log("CRM company data loaded:", clientData.name);
        }

        // Fetch customer-specific data
        const { data: customer, error: customerError } = await crmClient
          .from("customers")
          .select("cliente_ativado, data_primeira_compra, data_ultima_compra, total_pedidos, valor_total_compras, ticket_medio, poder_compra, perfil_preco, vendedor_nome, sobre, observacoes")
          .eq("company_id", clientId)
          .single();

        if (!customerError && customer) {
          customerData = customer;
          console.log("CRM customer data loaded, total_pedidos:", customerData?.total_pedidos);
        }

        // Fetch contacts for this company
        const { data: contacts } = await crmClient
          .from("contacts")
          .select("first_name, last_name, cargo, departamento")
          .eq("company_id", clientId)
          .is("deleted_at", null)
          .limit(5);

        if (contacts?.length) {
          console.log("CRM contacts loaded:", contacts.length);
        }
      } else {
        console.warn("CRM env vars not set, skipping CRM data");
      }

      // Fetch client's quote history for product preferences
      let quoteProductHistory: any[] = [];
      const { data: clientQuotes, error: quotesError } = await supabase
        .from("quotes")
        .select(`
          id,
          quote_number,
          status,
          total,
          created_at,
          valid_until,
          sent_at,
          client_response,
          quote_items (
            product_name,
            product_sku,
            quantity,
            unit_price,
            subtotal
          )
        `)
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(15);

      if (!quotesError && clientQuotes) {
        quoteProductHistory = clientQuotes;
        console.log("Client quote history count:", quoteProductHistory.length);
      }

      // Fetch client's orders
      let clientOrders: OrderData[] = [];
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id, order_number, status, total, created_at, client_name, fulfillment_status")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (!ordersError && orders) {
        clientOrders = orders;
        console.log("Client orders count:", clientOrders.length);
      }

      // Fetch pending follow-up reminders for this seller
      let pendingFollowUps: FollowUpData[] = [];
      const { data: followUps, error: followUpsError } = await supabase
        .from("follow_up_reminders")
        .select("id, quote_id, reminder_type, scheduled_for, is_sent")
        .eq("seller_id", userId)
        .eq("is_sent", false)
        .order("scheduled_for", { ascending: true })
        .limit(10);

      if (!followUpsError && followUps) {
        pendingFollowUps = followUps;
        console.log("Pending follow-ups:", pendingFollowUps.length);
      }

      // Analyze product preferences from quote history
      const productPreferences = new Map<string, { count: number; totalValue: number; lastPurchase: string }>();
      
      quoteProductHistory.forEach(quote => {
        if (quote.quote_items) {
          quote.quote_items.forEach((item: any) => {
            const existing = productPreferences.get(item.product_name) || { count: 0, totalValue: 0, lastPurchase: quote.created_at };
            productPreferences.set(item.product_name, {
              count: existing.count + item.quantity,
              totalValue: existing.totalValue + (item.subtotal || 0),
              lastPurchase: quote.created_at > existing.lastPurchase ? quote.created_at : existing.lastPurchase
            });
          });
        }
      });

      // Build enhanced client context with full sales intelligence
      const topProducts = Array.from(productPreferences.entries())
        .sort((a, b) => b[1].totalValue - a[1].totalValue)
        .slice(0, 5);

      const averageOrderValue = quoteProductHistory.length > 0
        ? quoteProductHistory.reduce((sum, q) => sum + (q.total || 0), 0) / quoteProductHistory.length
        : 0;

      // Identify quotes needing follow-up (sent but no response, or expiring soon)
      const pendingQuotes = quoteProductHistory.filter(q => 
        q.status === 'sent' && !q.client_response
      );
      const expiringQuotes = quoteProductHistory.filter(q => {
        if (!q.valid_until) return false;
        const daysUntilExpiry = (new Date(q.valid_until).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        return daysUntilExpiry > 0 && daysUntilExpiry <= 7 && q.status !== 'approved' && q.status !== 'converted';
      });

      // Calculate recency and engagement metrics
      const daysSinceLastInteraction = quoteProductHistory.length > 0
        ? Math.floor((Date.now() - new Date(quoteProductHistory[0].created_at).getTime()) / (1000 * 60 * 60 * 24))
        : null;

      const totalRevenue = clientOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      const conversionRate = quoteProductHistory.length > 0
        ? ((quoteProductHistory.filter(q => q.status === 'approved' || q.status === 'converted').length / quoteProductHistory.length) * 100).toFixed(0)
        : "0";

      if (clientData) {
        clientContext = `
CONTEXTO COMPLETO DO CLIENTE (CRM):
- Nome: ${clientData.name}
- Razão Social: ${clientData.razao_social}
${clientData.nome_fantasia ? `- Nome Fantasia: ${clientData.nome_fantasia}` : ""}
- Ramo de atividade: ${clientData.ramo_atividade || "Não informado"}
${clientData.cnpj ? `- CNPJ: ${clientData.cnpj}` : ""}
- Localização: ${[clientData.cidade, clientData.estado].filter(Boolean).join(", ") || "Não informada"}
- Logo disponível: ${clientData.logo_url ? "Sim" : "Não"}
${clientData.website ? `- Website: ${clientData.website}` : ""}
${clientData.instagram ? `- Instagram: ${clientData.instagram}` : ""}
- Dias desde última interação: ${daysSinceLastInteraction !== null ? `${daysSinceLastInteraction} dias` : "N/A"}

DADOS COMERCIAIS (CRM):
${customerData ? `- Status: ${customerData.cliente_ativado ? "Ativo" : "Inativo"}
- Total de pedidos (CRM): ${customerData.total_pedidos || 0}
- Valor total compras: ${customerData.valor_total_compras ? `R$ ${customerData.valor_total_compras.toLocaleString("pt-BR")}` : "N/A"}
- Ticket médio (CRM): ${customerData.ticket_medio ? `R$ ${customerData.ticket_medio.toFixed(2)}` : "N/A"}
- Poder de compra: ${customerData.poder_compra || "N/A"}
- Perfil de preço: ${customerData.perfil_preco || "N/A"}
- Primeira compra: ${customerData.data_primeira_compra ? new Date(customerData.data_primeira_compra).toLocaleDateString("pt-BR") : "N/A"}
- Última compra: ${customerData.data_ultima_compra ? new Date(customerData.data_ultima_compra).toLocaleDateString("pt-BR") : "N/A"}
- Vendedor responsável: ${customerData.vendedor_nome || "N/A"}
${customerData.sobre ? `- Sobre: ${customerData.sobre}` : ""}
${customerData.observacoes ? `- Observações: ${customerData.observacoes}` : ""}` : "- Sem dados comerciais no CRM"}

MÉTRICAS DE VENDAS (PLATAFORMA):
- Ticket médio orçamentos: ${averageOrderValue > 0 ? `R$ ${averageOrderValue.toFixed(2)}` : "Sem dados"}
- Total de orçamentos: ${quoteProductHistory.length}
- Pedidos confirmados: ${clientOrders.length}
- Receita total em pedidos: R$ ${totalRevenue.toFixed(2)}
- Taxa de conversão: ${conversionRate}%

ORÇAMENTOS RECENTES:
${quoteProductHistory.length > 0
  ? quoteProductHistory.slice(0, 8).map((q, i) => {
      const statusMap: Record<string, string> = { draft: "Rascunho", sent: "Enviado", approved: "Aprovado", rejected: "Rejeitado", converted: "Convertido", expired: "Expirado" };
      return `${i + 1}. ${q.quote_number} - R$ ${q.total?.toFixed(2)} - ${statusMap[q.status] || q.status} - ${new Date(q.created_at).toLocaleDateString("pt-BR")}${q.client_response ? ` [Resposta: ${q.client_response}]` : ""}`;
    }).join("\n")
  : "Nenhum orçamento encontrado"}

PEDIDOS CONFIRMADOS:
${clientOrders.length > 0
  ? clientOrders.map((o, i) => {
      const statusMap: Record<string, string> = { pending: "Pendente", confirmed: "Confirmado", production: "Em Produção", shipped: "Enviado", delivered: "Entregue" };
      return `${i + 1}. ${o.order_number} - R$ ${o.total?.toFixed(2)} - ${statusMap[o.status] || o.status} - ${new Date(o.created_at).toLocaleDateString("pt-BR")}`;
    }).join("\n")
  : "Nenhum pedido encontrado"}

ALERTAS E FOLLOW-UPS:
${pendingQuotes.length > 0 ? `⚠️ ${pendingQuotes.length} orçamento(s) enviado(s) aguardando resposta do cliente` : ""}
${expiringQuotes.length > 0 ? `⏰ ${expiringQuotes.length} orçamento(s) prestes a vencer nos próximos 7 dias` : ""}
${daysSinceLastInteraction !== null && daysSinceLastInteraction > 30 ? `🔔 Cliente inativo há ${daysSinceLastInteraction} dias - considere retomar contato` : ""}
${pendingFollowUps.length > 0 ? `📋 ${pendingFollowUps.length} lembrete(s) de follow-up pendente(s)` : ""}
${!pendingQuotes.length && !expiringQuotes.length && (daysSinceLastInteraction === null || daysSinceLastInteraction <= 30) && !pendingFollowUps.length ? "✅ Nenhum alerta pendente" : ""}

PRODUTOS MAIS COMPRADOS:
${topProducts.length > 0
  ? topProducts.map(([name, data], i) => `  ${i + 1}. ${name} - ${data.count} unidades, R$ ${data.totalValue.toFixed(2)} total`).join("\n")
  : "  Nenhum histórico de produtos"}

INTELIGÊNCIA DE UPSELL:
${topProducts.length > 0 
  ? `- Preferências: ${topProducts.map(([name]) => name).join(", ")}
- Sugira versões premium ou complementares dos itens já comprados
- Ticket médio de R$ ${averageOrderValue.toFixed(2)} para calibrar sugestões
- Ofereça kits com produtos que ele já conhece`
  : "- Cliente novo - foque em entender necessidades e construir relacionamento"}
`;
      }
    }

    // Extract search terms from conversation
    const searchTerms = extractSearchTerms(messages);
    console.log("Extracted search terms:", searchTerms);

    let productsContext = "";
    let semanticResults: any[] = [];

    // Connect to external product database
    const EXT_URL = Deno.env.get("EXTERNAL_SUPABASE_URL");
    const EXT_KEY = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_KEY");

    if (!EXT_URL || !EXT_KEY) {
      console.error("External DB env vars not set — cannot fetch products");
    } else {
      const extClient = createClient(EXT_URL, EXT_KEY);

      // External DB schema — only columns confirmed to exist (from PRODUCT_SELECT_LIGHTWEIGHT + extras)
      const PRODUCT_COLS = "id, name, sku, sale_price, primary_image_url, category_id, supplier_id, description, brand, gender, is_kit, stock_quantity, min_quantity, tags, active";

      // --- Text search ---
      if (searchTerms.length > 0) {
        const searchQuery = searchTerms.join(" ");
        console.log("Performing text search for:", searchQuery);
        
        const orFilter = searchTerms
          .slice(0, 5) // limit to avoid overly complex queries
          .map(t => `name.ilike.%${t}%,description.ilike.%${t}%`)
          .join(",");
        
        const { data: searchProducts, error: searchError } = await extClient
          .from("products")
          .select(PRODUCT_COLS)
          .eq("active", true)
          .or(orFilter)
          .limit(40);

        if (searchError) {
          console.error("Text search error:", searchError);
        } else {
          semanticResults = (searchProducts || []);
          console.log("Text search found:", semanticResults.length, "products");
        }
      }

      // --- General product query with all filters ---
      let productsQuery = extClient
        .from("products")
        .select(PRODUCT_COLS)
        .eq("active", true);

      if (priceMin !== null && priceMin !== undefined) {
        productsQuery = productsQuery.gte("sale_price", priceMin);
      }
      if (priceMax !== null && priceMax !== undefined) {
        productsQuery = productsQuery.lte("sale_price", priceMax);
      }

      if (normalizedFilters.genderFilters.length === 1) {
        productsQuery = productsQuery.eq("gender", normalizedFilters.genderFilters[0]);
      } else if (normalizedFilters.genderFilters.length > 1) {
        productsQuery = productsQuery.in("gender", normalizedFilters.genderFilters);
      }

      if (normalizedFilters.onlyInStock) {
        productsQuery = productsQuery.gt("stock_quantity", 0);
      }
      if (normalizedFilters.onlyKit) {
        productsQuery = productsQuery.eq("is_kit", true);
      }
      // Note: new_arrival, featured, best_seller, is_personalizable may not exist as DB columns
      // They are stored in tags JSON — filtering happens post-fetch in applyProductFilters

      const { data: products, error: productsError } = await productsQuery.limit(120);

      if (productsError) {
        console.error("Error fetching products:", productsError);
      }

      // Post-fetch filtering for array-based fields (colors, materials, tags, techniques, suppliers, categories)
      const allRawProducts = [
        ...(semanticResults || []),
        ...(products || []).filter((p: any) => !semanticResults.some((s: any) => s.id === p.id)),
      ];

      const filteredProducts = applyProductFilters(allRawProducts, normalizedFilters);

      // Apply price filter on sale_price for text-search results that bypassed DB price filter
      let finalProducts = filteredProducts;
      if (priceMin !== null && priceMin !== undefined) {
        finalProducts = finalProducts.filter((p: any) => (p.sale_price ?? 0) >= priceMin);
      }
      if (priceMax !== null && priceMax !== undefined) {
        finalProducts = finalProducts.filter((p: any) => (p.sale_price ?? 0) <= priceMax);
      }

      console.log("Total products after all filters:", finalProducts.length);

      // Fetch category and supplier names for context enrichment
      const categoryIds = [...new Set(finalProducts.map((p: any) => p.category_id).filter(Boolean))];
      const supplierIds = [...new Set(finalProducts.map((p: any) => p.supplier_id).filter(Boolean))];

      let categoryMap: Record<string, string> = {};
      let supplierMap: Record<string, string> = {};

      const enrichPromises: Promise<void>[] = [];

      if (categoryIds.length > 0) {
        enrichPromises.push(
          extClient.from("categories").select("id, name").in("id", categoryIds.slice(0, 50))
            .then(({ data }) => {
              if (data) categoryMap = Object.fromEntries(data.map((c: any) => [c.id, c.name]));
            })
        );
      }
      if (supplierIds.length > 0) {
        enrichPromises.push(
          extClient.from("suppliers").select("id, name").in("id", supplierIds.slice(0, 50))
            .then(({ data }) => {
              if (data) supplierMap = Object.fromEntries(data.map((s: any) => [s.id, s.name]));
            })
        );
      }

      await Promise.all(enrichPromises);

      // Build product description helper
      const buildProductDescription = (p: any): string => {
        const imageUrl = p.primary_image_url || null;
        const catName = categoryMap[p.category_id] || null;
        const supName = supplierMap[p.supplier_id] || null;
        const price = p.sale_price;
        const parts = [
          `ID: ${p.id}`,
          `Nome: ${p.name}`,
          p.sku ? `SKU: ${p.sku}` : null,
          catName ? `Categoria: ${catName}` : null,
          price ? `Preço: R$ ${Number(price).toFixed(2)}` : null,
          p.description ? `Descrição: ${p.description.substring(0, 150)}` : null,
          p.materials?.length ? `Materiais: ${Array.isArray(p.materials) ? p.materials.join(", ") : p.materials}` : null,
          p.brand ? `Marca: ${p.brand}` : null,
          supName ? `Fornecedor: ${supName}` : null,
          p.stock_quantity ? `Estoque: ${p.stock_quantity}` : null,
          imageUrl ? `Imagem: ${imageUrl}` : null,
        ].filter(Boolean);
        return parts.join(" | ");
      };

      // Split into search results vs general
      const searchResultIds = new Set(semanticResults.map((p: any) => p.id));
      const searchFiltered = finalProducts.filter((p: any) => searchResultIds.has(p.id));
      const generalFiltered = finalProducts.filter((p: any) => !searchResultIds.has(p.id)).slice(0, 20);

      if (searchFiltered.length > 0) {
        productsContext = `
PRODUTOS ENCONTRADOS POR BUSCA (ordenados por relevância):
Estes produtos são os mais relevantes para a busca "${searchTerms.join(" ")}":

${searchFiltered.map(p => buildProductDescription(p)).join("\n\n")}
`;
      }

      if (generalFiltered.length > 0) {
        productsContext += `

OUTROS PRODUTOS DO CATÁLOGO (para contexto adicional):
${generalFiltered.map(p => buildProductDescription(p)).join("\n\n")}
`;
      }
    }

    // Build filter info for the AI
    const filterParts: string[] = [];
    const pushValues = (label: string, values: string[]) => {
      if (values.length > 0) filterParts.push(`${label}: ${values.join(", ")}`);
    };

    pushValues("Categorias", normalizedFilters.categoryFilters);
    pushValues("Materiais", normalizedFilters.materialFilters);
    pushValues("Cores", normalizedFilters.colorFilters);
    pushValues("Gêneros", normalizedFilters.genderFilters);
    pushValues("Fornecedores", normalizedFilters.supplierFilters);
    pushValues("Técnicas", normalizedFilters.techniqueFilters);
    pushValues("Público-alvo", normalizedFilters.publicoFilters);
    pushValues("Datas comemorativas", normalizedFilters.dataComemorativaFilters);
    pushValues("Endomarketing", normalizedFilters.endomarketingFilters);
    pushValues("Nichos/segmentos", normalizedFilters.nichoFilters);
    pushValues("Tags", normalizedFilters.tagFilters);

    if (priceMin !== null && priceMin !== undefined && priceMax !== null && priceMax !== undefined) {
      filterParts.push(`Preço: R$ ${priceMin} - R$ ${priceMax}`);
    } else if (priceMin !== null && priceMin !== undefined) {
      filterParts.push(`Preço: acima de R$ ${priceMin}`);
    } else if (priceMax !== null && priceMax !== undefined) {
      filterParts.push(`Preço: até R$ ${priceMax}`);
    }

    if (normalizedFilters.onlyInStock) filterParts.push("Apenas em estoque");
    if (normalizedFilters.onlyNew) filterParts.push("Apenas novidades");
    if (normalizedFilters.onlyKit) filterParts.push("Apenas kits");
    if (normalizedFilters.onlyBestseller) filterParts.push("Priorizar mais vendidos");
    if (normalizedFilters.onlyFeatured) filterParts.push("Apenas destaques");
    if (normalizedFilters.hasPersonalization) filterParts.push("Com personalização");

    const filterInfo = filterParts.length > 0
      ? `\nFILTROS ATIVOS: ${filterParts.join(", ")}\nAPENAS mostre produtos que atendam a TODOS os filtros. NÃO sugira produtos fora dos critérios definidos.`
      : "";

    if (productsContext) {
      productsContext = `
CATÁLOGO DE PRODUTOS (use o formato [[PRODUTO:id:nome]] para criar links clicáveis):${filterInfo}
${productsContext}`;
    }

    const sellerGreeting = sellerFirstName || "parceiro";

    const systemPrompt = `Você é o FLOW, assistente pessoal de vendas da Promo Brindes. Você é um parceiro estratégico humano e próximo do vendedor.

NOME DO VENDEDOR: ${sellerGreeting}
REGRA OBRIGATÓRIA: Na PRIMEIRA mensagem de cada conversa, SEMPRE cumprimente o vendedor pelo primeiro nome de forma calorosa e natural. Exemplo: "${sellerGreeting}, ótima pergunta!" ou "E aí ${sellerGreeting}, vamos lá!" ou "Fala ${sellerGreeting}! Olha só o que encontrei...". Nas mensagens seguintes, use o nome ocasionalmente (não em todas) para manter naturalidade.

PERSONALIDADE E TOM:
- Você é como um colega experiente e animado — não um robô
- Use expressões naturais: "olha só", "cara", "show", "perfeito", "massa", "bora", "vamos nessa"
- Demonstre entusiasmo genuíno quando encontrar boas oportunidades
- Seja empático — reconheça frustrações ("sei que é chato ficar sem resposta...")
- Use emojis com moderação para dar calor humano (1-3 por mensagem)
- Evite linguagem corporativa engessada — seja profissional mas acessível
- Quando não souber algo, seja honesto: "Não tenho essa info aqui, mas sugiro..."

SEU PAPEL COMPLETO:
1. **Consultor de Produtos** — Conhece profundamente o catálogo e faz recomendações personalizadas
2. **Analista de CRM** — Interpreta dados do cliente (ramo, histórico, ticket médio, taxa de conversão) para gerar insights
3. **Gerador de Propostas** — Sugere composições de orçamento com produtos, quantidades e argumentos de venda
4. **Estrategista de Follow-up** — Identifica oportunidades de retomada, orçamentos pendentes, clientes inativos
5. **Detector de Oportunidades** — Identifica cross-sell, upsell, sazonalidade e tendências de mercado

CAPACIDADES DE ASSISTENTE PESSOAL DE VENDAS:

📊 CRM E ANÁLISE DE CLIENTE:
- Quando perguntado sobre um cliente, forneça um resumo executivo (ticket médio, frequência, preferências, status)
- Identifique padrões de compra e sazonalidade
- Compare o comportamento do cliente com benchmarks do segmento
- Alerte sobre clientes inativos que precisam de atenção

📝 GERAÇÃO DE PROPOSTAS:
- Sugira composições de orçamento com produtos específicos, quantidades e justificativas
- Considere o ticket médio e histórico do cliente para calibrar valores
- Inclua argumentos de venda para cada produto sugerido
- Proponha alternativas (econômica, padrão, premium) quando possível
- Use sempre o formato de link: [[PRODUTO:id:nome]]

📞 FOLLOW-UP INTELIGENTE:
- Identifique orçamentos enviados sem resposta e sugira abordagens de follow-up
- Sugira textos prontos para WhatsApp/email baseados no contexto
- Alerte sobre orçamentos prestes a vencer
- Recomende o melhor momento e canal para retomar contato
- Se o cliente está inativo, sugira um motivo para recontato (novidade, promoção, data comemorativa)

🎯 ANÁLISE DE OPORTUNIDADES:
- Identifique oportunidades de cross-sell baseadas no que o cliente já comprou
- Sugira upgrades para produtos premium quando o ticket médio permitir
- Detecte oportunidades sazonais (Páscoa, Dia das Mães, Natal, etc.)
- Proponha kits e combos personalizados baseados nas preferências
- Analise a taxa de conversão e sugira melhorias na abordagem

ESTRATÉGIAS DE UPSELL E CROSS-SELL:
1. **Upgrade de produto**: Item básico → versão premium
2. **Produtos complementares**: Caneta + caderno, squeeze + toalha
3. **Kits e combos**: Agrupe produtos já comprados com desconto
4. **Maior quantidade**: Melhor custo-benefício em volume
5. **Personalização adicional**: Gravação, bordado, impressão colorida
6. **Linha premium**: Baseado no ticket médio

FORMATO DE LINKS DE PRODUTOS (com imagem quando disponível):
[[PRODUTO:id_do_produto:Nome do Produto:url_da_imagem]]
Se não houver imagem: [[PRODUTO:id_do_produto:Nome do Produto]]
Exemplo: "Recomendo o [[PRODUTO:abc123:Caderno Executivo Premium:https://example.com/img.jpg]]"
IMPORTANTE: SEMPRE inclua a URL da imagem quando disponível nos dados do produto (campo "Imagem").

BUSCA SEMÂNTICA:
PRIORIZE produtos de "PRODUTOS ENCONTRADOS POR BUSCA SEMÂNTICA" nas recomendações.

FORMATO DE MENSAGENS DE FOLLOW-UP:
Quando sugerir mensagens de follow-up, use blocos formatados assim:
> **WhatsApp/Email sugerido:**
> Olá [Nome], tudo bem? Vi que enviamos um orçamento para [produtos] no dia [data]. Gostaria de saber se tem alguma dúvida...

MAPEAMENTO DE CARACTERÍSTICAS:
- "sustentável/ecológico" → bambu, papel reciclado, algodão orgânico, madeira, cortiça
- "tecnológico" → carregadores, power banks, pen drives, fones
- "escritório" → canetas, cadernos, organizadores, mouse pads
- "premium/executivo" → kits, couro, canetas metálicas, agendas premium
- "eventos" → ecobags, squeezes, bonés, camisetas
- "fim de ano" → kits natalinos, champanheiras, porta-vinhos

DIRETRIZES DE COMUNICAÇÃO:
1. Seja proativo — não espere perguntas, ofereça insights
2. Sempre explique o PORQUÊ de cada recomendação
3. Use dados concretos (ticket médio, taxa de conversão, histórico)
4. Seja conciso mas estratégico
5. Linguagem profissional e acessível (português brasileiro informal)
6. Se não tiver dados suficientes, seja honesto e sugira como obtê-los
7. SEMPRE use [[PRODUTO:id:nome]] ao mencionar produtos
8. Quando gerar propostas, organize em formato de tabela quando possível

${clientContext}
${productsContext}

IMPORTANTE: Você tem acesso completo aos dados do cliente em tempo real — CRM, orçamentos, pedidos, follow-ups e análise comportamental. Use TODAS essas informações para ser o assistente mais estratégico e útil possível. Seu objetivo é ajudar o vendedor ${sellerGreeting} a fechar mais negócios com mais inteligência.`;

    const apiMessages: Message[] = [
      { role: "system", content: systemPrompt },
      ...messages
    ];

    console.log("Calling Lovable AI with", apiMessages.length, "messages");
    console.log("System prompt length:", systemPrompt.length);

    const response = await callAiWithTracking({
      userId,
      functionName: "expert-chat",
      model: "google/gemini-2.5-flash",
      apiKey: LOVABLE_API_KEY,
      stream: true,
      requestBody: {
        messages: apiMessages,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Aguarde alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos na workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    // Return streaming response
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (error) {
    if (error instanceof QuotaExceededError) {
      return new Response(
        JSON.stringify({ error: "Limite mensal de IA atingido. Contate o administrador." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if ((error as any)?.status === 401 || (error as any)?.status === 403) {
      return authErrorResponse(error, corsHeaders);
    }
    console.error("Expert chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
