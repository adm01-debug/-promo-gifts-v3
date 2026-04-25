// supabase/functions/_shared/credentials.ts
// SSOT (Single Source of Truth) for credential resolution across all edge functions.
//
// Resolution order:
//   1) integration_credentials table (DB-first) — values entered via /admin/conexoes
//   2) Deno.env.get(name) fallback — legacy/bootstrap values
//   3) optional name aliases (different historical env names → canonical DB name)
//
// In-memory cache (60s TTL per isolate) avoids hammering the DB on hot paths.

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

interface CacheEntry {
  value: string | null;
  source: CredentialSource;
  expires_at: number;
}

export type CredentialSource = "db" | "env" | "none";

export interface CredentialResolution {
  value: string | null;
  source: CredentialSource;
  /** Canonical secret name actually resolved (after alias lookup). */
  resolved_name: string;
}

const CACHE = new Map<string, CacheEntry>();
const TTL_MS = 60_000;

/**
 * Aliases: map legacy / alternate env-var names to the canonical
 * `integration_credentials.secret_name` used by /admin/conexoes.
 *
 * Lookup order for an alias chain is:
 *   canonical → DB hit?  → use it.
 *   canonical → env hit? → use it.
 *   alias[0]  → env hit? → use it.   (legacy fallback)
 *   alias[1]  → env hit? → use it.   (older legacy fallback)
 */
const ALIASES: Record<string, string[]> = {
  EXTERNAL_PROMOBRIND_URL: ["EXTERNAL_SUPABASE_URL"],
  EXTERNAL_PROMOBRIND_SERVICE_ROLE_KEY: [
    "EXTERNAL_SUPABASE_SERVICE_ROLE_KEY",
    "EXTERNAL_SUPABASE_SERVICE_KEY",
  ],
  EXTERNAL_PROMOBRIND_ANON_KEY: ["EXTERNAL_SUPABASE_ANON_KEY"],
  EXTERNAL_CRM_URL: ["CRM_SUPABASE_URL"],
  EXTERNAL_CRM_SERVICE_ROLE_KEY: ["CRM_SUPABASE_SERVICE_KEY"],
  EXTERNAL_CRM_ANON_KEY: ["CRM_SUPABASE_ANON_KEY"],
};

export function invalidateCredentialCache(name?: string): void {
  if (name) {
    CACHE.delete(name);
    // Also clear any aliases pointing at this canonical name
    for (const [canonical] of Object.entries(ALIASES)) {
      if (canonical === name) CACHE.delete(canonical);
    }
  } else {
    CACHE.clear();
  }
}

/**
 * Lazily build a service-role client for credential lookups when the caller
 * does not supply one. Each isolate creates at most one client.
 */
let internalServiceClient: SupabaseClient | null = null;
function getInternalServiceClient(): SupabaseClient | null {
  if (internalServiceClient) return internalServiceClient;
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  internalServiceClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return internalServiceClient;
}

/**
 * Resolve a credential by name with full provenance metadata.
 * Always prefers DB; falls back to env (and to legacy env aliases).
 */
export async function resolveCredential(
  name: string,
  serviceClient?: SupabaseClient | null,
): Promise<CredentialResolution> {
  const cached = CACHE.get(name);
  if (cached && cached.expires_at > Date.now()) {
    return { value: cached.value, source: cached.source, resolved_name: name };
  }

  const client = serviceClient ?? getInternalServiceClient();

  // 1) DB (canonical name only — `integration_credentials` stores canonical names)
  if (client) {
    try {
      const { data, error } = await client
        .from("integration_credentials")
        .select("secret_value")
        .eq("secret_name", name)
        .maybeSingle();
      if (!error && data?.secret_value) {
        const value = data.secret_value as string;
        CACHE.set(name, { value, source: "db", expires_at: Date.now() + TTL_MS });
        return { value, source: "db", resolved_name: name };
      }
    } catch (err) {
      console.error("[credentials] DB read failed for", name, err);
    }
  }

  // 2) Env at canonical name
  const envCanonical = Deno.env.get(name);
  if (envCanonical) {
    CACHE.set(name, { value: envCanonical, source: "env", expires_at: Date.now() + TTL_MS });
    return { value: envCanonical, source: "env", resolved_name: name };
  }

  // 3) Env at legacy aliases
  for (const alias of ALIASES[name] ?? []) {
    const v = Deno.env.get(alias);
    if (v) {
      CACHE.set(name, { value: v, source: "env", expires_at: Date.now() + TTL_MS });
      return { value: v, source: "env", resolved_name: alias };
    }
  }

  CACHE.set(name, { value: null, source: "none", expires_at: Date.now() + TTL_MS });
  return { value: null, source: "none", resolved_name: name };
}

/**
 * Convenience: just the value (or null). Backwards-compatible with older callers.
 */
export async function getCredential(
  name: string,
  serviceClient?: SupabaseClient | null,
): Promise<string | null> {
  const { value } = await resolveCredential(name, serviceClient);
  return value;
}

/**
 * Resolve many credentials in parallel.
 */
export async function resolveCredentials(
  names: string[],
  serviceClient?: SupabaseClient | null,
): Promise<Record<string, CredentialResolution>> {
  const entries = await Promise.all(
    names.map(async (n) => [n, await resolveCredential(n, serviceClient)] as const),
  );
  return Object.fromEntries(entries);
}
