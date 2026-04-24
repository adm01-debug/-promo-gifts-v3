// supabase/functions/_shared/credentials.ts
// Unified credential reader: DB-first, env-var fallback, with 60s in-memory cache.
// Used across edge functions so that values entered via /admin/conexoes
// take effect at runtime without redeploying.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

interface CacheEntry {
  value: string | null;
  expires_at: number;
}

const CACHE = new Map<string, CacheEntry>();
const TTL_MS = 60_000;

export function invalidateCredentialCache(name?: string): void {
  if (name) CACHE.delete(name);
  else CACHE.clear();
}

/**
 * Resolves a credential value by name.
 * 1) integration_credentials table (service-role bypasses RLS)
 * 2) Deno.env.get(name) fallback
 * 3) returns null if neither has it
 */
export async function getCredential(
  name: string,
  serviceClient: SupabaseClient,
): Promise<string | null> {
  const cached = CACHE.get(name);
  if (cached && cached.expires_at > Date.now()) return cached.value;

  let value: string | null = null;
  try {
    const { data, error } = await serviceClient
      .from("integration_credentials")
      .select("secret_value")
      .eq("secret_name", name)
      .maybeSingle();
    if (!error && data?.secret_value) value = data.secret_value as string;
  } catch (err) {
    console.error("[credentials] DB read failed for", name, err);
  }

  if (!value) {
    const env = Deno.env.get(name);
    if (env) value = env;
  }

  CACHE.set(name, { value, expires_at: Date.now() + TTL_MS });
  return value;
}
