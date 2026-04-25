/**
 * useMcpKeys — listagem + filtros + lookup de criadores das chaves MCP.
 *
 * Reusa o cliente Supabase autenticado (admin via RLS) e enriquece cada
 * chave com `creator_email` / `creator_name` via lookup batch em `profiles`.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { isFullAccess } from "@/lib/mcp/scopes";

export interface McpKeyRow {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  description: string | null;
  created_by: string;
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
  rotated_from: string | null;
  // enriched
  creator_email: string | null;
  creator_name: string | null;
  status: "active" | "expired" | "revoked";
  is_full: boolean;
}

export type StatusFilter = "all" | "active" | "expired" | "revoked";
export type SortKey = "created_desc" | "expires_asc" | "last_used_desc";

interface Filters {
  search: string;
  status: StatusFilter;
  onlyFull: boolean;
  sort: SortKey;
}

function deriveStatus(row: { revoked_at: string | null; expires_at: string | null }): McpKeyRow["status"] {
  if (row.revoked_at) return "revoked";
  if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) return "expired";
  return "active";
}

export function useMcpKeys() {
  const [rows, setRows] = useState<McpKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({
    search: "",
    status: "all",
    onlyFull: false,
    sort: "created_desc",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const { data: keys, error } = await supabase
      .from("mcp_api_keys")
      .select(
        "id, name, key_prefix, scopes, description, created_by, last_used_at, expires_at, revoked_at, created_at, rotated_from",
      )
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar chaves", { description: error.message });
      setRows([]);
      setLoading(false);
      return;
    }

    const ids = Array.from(new Set((keys ?? []).map((k) => k.created_by).filter(Boolean)));
    let creators: Map<string, { email: string | null; name: string | null }> = new Map();
    if (ids.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, email, full_name")
        .in("user_id", ids);
      creators = new Map(
        (profiles ?? []).map(
          (p: { user_id: string; email: string | null; full_name: string | null }) => [
            p.user_id,
            { email: p.email, name: p.full_name },
          ],
        ),
      );
    }

    const enriched: McpKeyRow[] = (keys ?? []).map((k) => {
      const c = creators.get(k.created_by);
      return {
        ...k,
        scopes: k.scopes ?? [],
        creator_email: c?.email ?? null,
        creator_name: c?.name ?? null,
        status: deriveStatus(k),
        is_full: isFullAccess(k.scopes ?? []),
      };
    });

    setRows(enriched);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    let out = rows;
    const q = filters.search.trim().toLowerCase();
    if (q) {
      out = out.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.key_prefix.toLowerCase().includes(q) ||
          (r.creator_email ?? "").toLowerCase().includes(q),
      );
    }
    if (filters.status !== "all") {
      out = out.filter((r) => r.status === filters.status);
    }
    if (filters.onlyFull) {
      out = out.filter((r) => r.is_full);
    }
    const sorted = [...out];
    switch (filters.sort) {
      case "expires_asc":
        sorted.sort((a, b) => {
          const ax = a.expires_at ? new Date(a.expires_at).getTime() : Number.POSITIVE_INFINITY;
          const bx = b.expires_at ? new Date(b.expires_at).getTime() : Number.POSITIVE_INFINITY;
          return ax - bx;
        });
        break;
      case "last_used_desc":
        sorted.sort((a, b) => {
          const ax = a.last_used_at ? new Date(a.last_used_at).getTime() : 0;
          const bx = b.last_used_at ? new Date(b.last_used_at).getTime() : 0;
          return bx - ax;
        });
        break;
      default:
        sorted.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
    }
    return sorted;
  }, [rows, filters]);

  const counts = useMemo(
    () => ({
      total: rows.length,
      active: rows.filter((r) => r.status === "active").length,
      expired: rows.filter((r) => r.status === "expired").length,
      revoked: rows.filter((r) => r.status === "revoked").length,
      full: rows.filter((r) => r.is_full && r.status === "active").length,
    }),
    [rows],
  );

  const revoke = useCallback(
    async (id: string, reason?: string) => {
      const { data, error } = await supabase.functions.invoke("mcp-keys-revoke", {
        body: { key_id: id, reason: reason ?? null },
      });
      if (error || (data && (data as { error?: string }).error)) {
        toast.error("Erro ao revogar", { description: sanitizeError(error ?? data) });
        return false;
      }
      toast.success("Chave revogada");
      await load();
      return true;
    },
    [load],
  );

  return { rows: filtered, allRows: rows, loading, filters, setFilters, counts, reload: load, revoke };
}
