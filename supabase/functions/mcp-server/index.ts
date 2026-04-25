// MCP server for Claude Desktop / other Lovable projects.
// Authenticates via X-MCP-Key header (validated in DB against mcp_api_keys.key_hash).
// Each tool declares { scope, mode } and is gated centrally before running.
// Every tool invocation is audited (granted, denied, error) with consistent error codes.
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

// ────────────────────────────────────────────────────────────────────────────
// Scope governance
// ────────────────────────────────────────────────────────────────────────────

type ToolMode = "read" | "write" | "admin";

interface AuthCtx {
  keyId: string;
  scopes: Set<string>;
  isFull: boolean;
  ip: string | null;
  ua: string | null;
}

interface ToolGuard {
  scope: string;     // e.g. "quotes:read", "quotes:write"
  mode: ToolMode;    // for audit + UX
}

// Standardized error codes for clients (matches admin_audit_log details.error_code)
const ERR = {
  UNAUTHENTICATED: "MCP_UNAUTHENTICATED",
  KEY_REVOKED: "MCP_KEY_REVOKED",
  KEY_EXPIRED: "MCP_KEY_EXPIRED",
  SCOPE_MISSING: "MCP_SCOPE_MISSING",
  WRITE_FORBIDDEN: "MCP_WRITE_FORBIDDEN",
  INTERNAL: "MCP_INTERNAL_ERROR",
} as const;

class McpAuthError extends Error {
  code: string;
  status: number;
  meta: Record<string, unknown>;
  constructor(code: string, message: string, status = 403, meta: Record<string, unknown> = {}) {
    super(message);
    this.code = code;
    this.status = status;
    this.meta = meta;
  }
}

async function audit(
  action: "mcp_tool.granted" | "mcp_tool.denied" | "mcp_tool.error",
  ctx: AuthCtx | null,
  details: Record<string, unknown>,
) {
  try {
    await supabase.from("admin_audit_log").insert({
      user_id: null,
      action,
      resource_type: "mcp_api_key",
      resource_id: ctx?.keyId ?? null,
      ip_address: ctx?.ip ?? null,
      user_agent: ctx?.ua ?? null,
      details: {
        ...details,
        is_full_access: ctx?.isFull ?? false,
        source: "mcp-server",
      },
    });
  } catch (_) {
    // never fail the request because of audit failure
  }
}

async function authenticate(req: Request): Promise<AuthCtx | null> {
  const key = req.headers.get("x-mcp-key") || "";
  if (!key || key.length < 16) return null;
  const { data, error } = await supabase.rpc("validate_mcp_key", { _key_plain: key });
  if (error || !data || (Array.isArray(data) && data.length === 0)) return null;
  const row = Array.isArray(data) ? data[0] : data;
  const scopes = new Set<string>(row.scopes ?? []);
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("cf-connecting-ip") ??
    null;
  const ua = req.headers.get("user-agent") ?? null;
  return { keyId: row.key_id, scopes, isFull: scopes.has("*"), ip, ua };
}

/**
 * Central authorization. Throws McpAuthError if the caller cannot run the tool.
 * Write/admin tools require an EXPLICIT matching scope — wildcard "*" is the only
 * scope that bypasses the explicit-write requirement.
 */
function authorizeTool(ctx: AuthCtx | null, toolName: string, guard: ToolGuard): AuthCtx {
  if (!ctx) {
    throw new McpAuthError(ERR.UNAUTHENTICATED, "Chave MCP inválida ou ausente.", 401);
  }
  // Wildcard always passes — but it was already gated at issuance with strong friction.
  if (ctx.isFull) return ctx;

  const hasScope = ctx.scopes.has(guard.scope);
  if (!hasScope) {
    throw new McpAuthError(
      ERR.SCOPE_MISSING,
      `Acesso negado: a ferramenta "${toolName}" requer o escopo "${guard.scope}" (modo ${guard.mode}). Sua chave possui: [${[...ctx.scopes].join(", ") || "nenhum"}].`,
      403,
      { required_scope: guard.scope, mode: guard.mode, available_scopes: [...ctx.scopes] },
    );
  }

  // Defensive double-check: write/admin tools must NEVER run from a read-only scope.
  if (guard.mode !== "read") {
    const isWriteScope = guard.scope.endsWith(":write") || guard.scope === "*";
    if (!isWriteScope) {
      throw new McpAuthError(
        ERR.WRITE_FORBIDDEN,
        `Configuração inválida: ferramenta "${toolName}" em modo "${guard.mode}" exige escopo terminando em :write.`,
        403,
        { required_scope: guard.scope, mode: guard.mode },
      );
    }
  }
  return ctx;
}

// ────────────────────────────────────────────────────────────────────────────
// Tool wrapper: gate + audit + error normalization
// ────────────────────────────────────────────────────────────────────────────

type ToolResult = { content: Array<{ type: "text"; text: string }> };
type ToolHandler<I> = (input: I, ctx: AuthCtx) => Promise<ToolResult> | ToolResult;

function defineTool<I>(
  name: string,
  guard: ToolGuard,
  description: string,
  inputSchema: Record<string, unknown>,
  handler: ToolHandler<I>,
) {
  mcpServer.tool(name, {
    description: `${description} [scope: ${guard.scope} | mode: ${guard.mode}]`,
    inputSchema,
    handler: async (input: I): Promise<ToolResult> => {
      const ctx = currentCtx;
      const startedAt = Date.now();
      try {
        const authed = authorizeTool(ctx, name, guard);
        const result = await handler(input, authed);
        await audit("mcp_tool.granted", authed, {
          tool: name,
          scope: guard.scope,
          mode: guard.mode,
          duration_ms: Date.now() - startedAt,
        });
        return result;
      } catch (err) {
        if (err instanceof McpAuthError) {
          await audit("mcp_tool.denied", ctx, {
            tool: name,
            scope: guard.scope,
            mode: guard.mode,
            error_code: err.code,
            ...err.meta,
          });
          throw new Error(`[${err.code}] ${err.message}`);
        }
        await audit("mcp_tool.error", ctx, {
          tool: name,
          scope: guard.scope,
          mode: guard.mode,
          error_code: ERR.INTERNAL,
          message: err instanceof Error ? err.message : String(err),
        });
        throw err instanceof Error ? err : new Error(String(err));
      }
    },
  });
}

const mcpServer = new McpServer({
  name: "promogifts-mcp",
  version: "1.1.0",
});

// We resolve the auth context from a per-request module-level holder.
let currentCtx: AuthCtx | null = null;

// ────────────────────────────────────────────────────────────────────────────
// READ tools
// ────────────────────────────────────────────────────────────────────────────

defineTool<{ status?: string; limit?: number }, { content: Array<{ type: string; text: string }> }>(
  "list_quotes",
  { scope: "quotes:read", mode: "read" },
  "Lista os orçamentos mais recentes (limite 50).",
  {
    type: "object",
    properties: {
      status: { type: "string", description: "Filtrar por status (opcional)" },
      limit: { type: "number", description: "Máximo 50", default: 20 },
    },
  },
  async ({ status, limit }) => {
    const lim = Math.min(Math.max(Number(limit ?? 20), 1), 50);
    let q = supabase.from("quotes").select(
      "id, quote_number, status, client_name, client_email, total, created_at, updated_at",
    ).order("created_at", { ascending: false }).limit(lim);
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
);

defineTool<{ id: string }, { content: Array<{ type: string; text: string }> }>(
  "get_quote",
  { scope: "quotes:read", mode: "read" },
  "Detalha um orçamento por id.",
  {
    type: "object",
    required: ["id"],
    properties: { id: { type: "string", description: "UUID do orçamento" } },
  },
  async ({ id }) => {
    const { data, error } = await supabase.from("quotes").select("*, quote_items(*)").eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
);

defineTool<{ search?: string; limit?: number }, { content: Array<{ type: string; text: string }> }>(
  "list_companies",
  { scope: "crm:read", mode: "read" },
  "Lista as últimas empresas/clientes do CRM.",
  {
    type: "object",
    properties: { search: { type: "string" }, limit: { type: "number", default: 20 } },
  },
  async ({ search, limit }) => {
    const lim = Math.min(Math.max(Number(limit ?? 20), 1), 50);
    let q = supabase.from("quotes").select("client_name, client_email, client_company")
      .not("client_name", "is", null).limit(lim);
    if (search) q = q.ilike("client_name", `%${search}%`);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
);

defineTool<{ limit?: number }, { content: Array<{ type: string; text: string }> }>(
  "list_recent_orders",
  { scope: "orders:read", mode: "read" },
  "Lista os pedidos mais recentes.",
  {
    type: "object",
    properties: { limit: { type: "number", default: 20 } },
  },
  async ({ limit }) => {
    const lim = Math.min(Math.max(Number(limit ?? 20), 1), 50);
    const { data, error } = await supabase.from("orders").select(
      "id, order_number, status, fulfillment_status, client_name, total, created_at",
    ).order("created_at", { ascending: false }).limit(lim);
    if (error) throw new Error(error.message);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
);

// ────────────────────────────────────────────────────────────────────────────
// PING (no scope)
// ────────────────────────────────────────────────────────────────────────────

mcpServer.tool("ping", {
  description: "Verifica conectividade do MCP. [scope: nenhum | mode: read]",
  inputSchema: { type: "object", properties: {} },
  handler: () => {
    if (!currentCtx) throw new Error(`[${ERR.UNAUTHENTICATED}] Chave MCP inválida ou ausente.`);
    return { content: [{ type: "text", text: `pong (key ${currentCtx.keyId.slice(0, 8)}…, scopes: ${[...currentCtx.scopes].join(",") || "—"})` }] };
  },
});

// ────────────────────────────────────────────────────────────────────────────
// Transport
// ────────────────────────────────────────────────────────────────────────────

const transport = new StreamableHttpTransport();
const app = new Hono();

app.options("/*", (c) => new Response(null, { headers: corsHeaders }));

const httpHandler = transport.bind(mcpServer);

app.all("/*", async (c) => {
  const ctx = await authenticate(c.req.raw);
  if (!ctx) {
    return new Response(
      JSON.stringify({ error: ERR.UNAUTHENTICATED, message: "Chave MCP inválida ou ausente." }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
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
