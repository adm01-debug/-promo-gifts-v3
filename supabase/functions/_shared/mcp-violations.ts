/**
 * Helper para registrar tentativas bloqueadas de acesso a chaves MCP.
 * Dispara `record_mcp_access_violation` no banco, que por sua vez
 * verifica o threshold de abuso e gera alertas para admins.
 *
 * Falhas de log são silenciadas para nunca derrubar o caminho de erro.
 */

// deno-lint-ignore no-explicit-any
type SupabaseAdmin = any;

export type McpViolationReason =
  | "missing_jwt"
  | "invalid_jwt"
  | "not_admin"
  | "stepup_missing"
  | "stepup_invalid"
  | "stepup_consume_failed"
  | "rate_limited"
  | "validation_failed"
  | "unauthorized_direct_write"
  | "other";

export interface RecordMcpViolationInput {
  userId: string | null;
  reason: McpViolationReason;
  source: string;        // ex: "mcp-keys-issue"
  operation?: string | null; // ex: "issue" | "rotate" | "revoke" | "update"
  targetKeyId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  details?: Record<string, unknown>;
}

export async function recordMcpViolation(
  admin: SupabaseAdmin,
  input: RecordMcpViolationInput,
): Promise<void> {
  try {
    await admin.rpc("record_mcp_access_violation", {
      _user_id: input.userId,
      _reason: input.reason,
      _source: input.source,
      _operation: input.operation ?? null,
      _target_key_id: input.targetKeyId ?? null,
      _ip: input.ip ?? null,
      _user_agent: input.userAgent ?? null,
      _request_id: input.requestId ?? null,
      _details: input.details ?? {},
    });
  } catch (err) {
    console.warn(
      "[mcp-violations] failed to record:",
      err instanceof Error ? err.message : err,
    );
  }
}
