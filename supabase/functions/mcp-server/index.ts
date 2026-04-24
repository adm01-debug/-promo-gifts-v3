// MCP server for Claude Desktop / other Lovable projects.
// Authenticates via X-MCP-Key header (validated in DB against mcp_api_keys.key_hash).
// Each tool checks the caller's scopes before running.
import { Hono } from "hono";
import { McpServer, StreamableHttpTransport } from "mcp-lite";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-mcp-key, accept, mcp-session-id",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

interface AuthCtx {
  keyId: string;
  scopes: Set<string>;
}

async function authenticate(req: Request): Promise<AuthCtx | null> {
  const key = req.headers.get("x-mcp-key") || "";
  if (!key || key.length < 16) return null;
  const { data, error } = await supabase.rpc("validate_mcp_key", { _key_plain: key });
  if (error || !data || (Array.isArray(data) && data.length === 0)) return null;
  const row = Array.isArray(data) ? data[0] : data;
  return { keyId: row.key_id, scopes: new Set<string>(row.scopes ?? []) };
}

function requireScope(ctx: AuthCtx, scope: string) {
  if (!ctx.scopes.has(scope) && !ctx.scopes.has("*")) {
    throw new Error(`Escopo necessário: ${scope}`);
  }
}

const mcpServer = new McpServer({
  name: "promogifts-mcp",
  version: "1.0.0",
});

// We resolve the auth context from a per-request module-level holder.
let currentCtx: AuthCtx | null = null;

mcpServer.tool("list_quotes", {
  description: "Lista os orçamentos mais recentes (limite 50). Escopo: quotes:read",
  inputSchema: {
    type: "object",
    properties: {
      status: { type: "string", description: "Filtrar por status (opcional)" },
      limit: { type: "number", description: "Máximo 50", default: 20 },
    },
  },
  handler: async ({ status, limit }: { status?: string; limit?: number }) => {
    if (!currentCtx) throw new Error("Não autenticado");
    requireScope(currentCtx, "quotes:read");
    const lim = Math.min(Math.max(Number(limit ?? 20), 1), 50);
    let q = supabase.from("quotes").select(
      "id, quote_number, status, client_name, client_email, total, created_at, updated_at",
    ).order("created_at", { ascending: false }).limit(lim);
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
});

mcpServer.tool("get_quote", {
  description: "Detalha um orçamento por id. Escopo: quotes:read",
  inputSchema: {
    type: "object",
    required: ["id"],
    properties: { id: { type: "string", description: "UUID do orçamento" } },
  },
  handler: async ({ id }: { id: string }) => {
    if (!currentCtx) throw new Error("Não autenticado");
    requireScope(currentCtx, "quotes:read");
    const { data, error } = await supabase.from("quotes").select("*, quote_items(*)").eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
});

mcpServer.tool("list_companies", {
  description: "Lista as últimas empresas/clientes do CRM. Escopo: crm:read",
  inputSchema: {
    type: "object",
    properties: { search: { type: "string" }, limit: { type: "number", default: 20 } },
  },
  handler: async ({ search, limit }: { search?: string; limit?: number }) => {
    if (!currentCtx) throw new Error("Não autenticado");
    requireScope(currentCtx, "crm:read");
    const lim = Math.min(Math.max(Number(limit ?? 20), 1), 50);
    let q = supabase.from("quotes").select("client_name, client_email, client_company")
      .not("client_name", "is", null).limit(lim);
    if (search) q = q.ilike("client_name", `%${search}%`);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
});

mcpServer.tool("list_recent_orders", {
  description: "Lista os pedidos mais recentes. Escopo: orders:read",
  inputSchema: {
    type: "object",
    properties: { limit: { type: "number", default: 20 } },
  },
  handler: async ({ limit }: { limit?: number }) => {
    if (!currentCtx) throw new Error("Não autenticado");
    requireScope(currentCtx, "orders:read");
    const lim = Math.min(Math.max(Number(limit ?? 20), 1), 50);
    const { data, error } = await supabase.from("orders").select(
      "id, order_number, status, fulfillment_status, client_name, total, created_at",
    ).order("created_at", { ascending: false }).limit(lim);
    if (error) throw new Error(error.message);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
});

mcpServer.tool("ping", {
  description: "Verifica conectividade do MCP. Escopo: nenhum",
  inputSchema: { type: "object", properties: {} },
  handler: () => {
    if (!currentCtx) throw new Error("Não autenticado");
    return { content: [{ type: "text", text: `pong (key ${currentCtx.keyId.slice(0, 8)}…)` }] };
  },
});

const transport = new StreamableHttpTransport();
const app = new Hono();

app.options("/*", (c) => new Response(null, { headers: corsHeaders }));

const httpHandler = transport.bind(mcpServer);

app.all("/*", async (c) => {
  const ctx = await authenticate(c.req.raw);
  if (!ctx) {
    return new Response(JSON.stringify({ error: "Chave MCP inválida ou ausente" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  currentCtx = ctx;
  try {
    const res = await httpHandler(c.req.raw);
    const merged = new Headers(res.headers);
    for (const [k, v] of Object.entries(corsHeaders)) merged.set(k, v);
    return new Response(res.body, { status: res.status, headers: merged });
  } finally {
    currentCtx = null;
  }
});

Deno.serve(app.fetch);
