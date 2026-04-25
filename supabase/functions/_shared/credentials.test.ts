/**
 * Testes para `_shared/credentials.ts` — a SSOT (Single Source of Truth)
 * usada pelo secrets-manager (UI) e pelas bridges (catálogo).
 *
 * Estes testes **simulam** o estado de `integration_credentials` via
 * um `serviceClient` mockado e validam que:
 *
 *  1. Quando a linha existe → `value` correto + `source: "db"`
 *  2. Quando a linha NÃO existe mas há env → `value` da env + `source: "env"`
 *  3. Quando há alias legado em env (ex.: EXTERNAL_SUPABASE_URL) e nada
 *     em DB nem na env canônica → resolve via alias com `source: "env"`
 *  4. Quando nada existe → `value: null` + `source: "none"`
 *
 * O caso (1) é o regression-test do bug original: UI mostrando "Sem
 * credenciais" mesmo com `integration_credentials` preenchida. Se este
 * teste passa, o secrets-manager retornará `has_value: true` + `source: "db"`.
 */

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  invalidateCredentialCache,
  resolveCredential,
} from "../_shared/credentials.ts";

/** Mock mínimo de SupabaseClient — apenas o caminho usado por `resolveCredential`. */
function mockServiceClient(table: Record<string, string | null>) {
  // deno-lint-ignore no-explicit-any
  const builder: any = {
    _name: null as string | null,
    select() { return builder; },
    eq(_col: string, val: string) { builder._name = val; return builder; },
    async maybeSingle() {
      const v = table[builder._name ?? ""] ?? null;
      return v
        ? { data: { secret_value: v }, error: null }
        : { data: null, error: null };
    },
  };
  // deno-lint-ignore no-explicit-any
  return { from: (_t: string) => builder } as any;
}

function clearEnv(...names: string[]) {
  for (const n of names) Deno.env.delete(n);
}

Deno.test("resolveCredential: integration_credentials preenchida → has_value=true, source='db'", async () => {
  invalidateCredentialCache();
  clearEnv("EXTERNAL_PROMOBRIND_URL", "EXTERNAL_SUPABASE_URL");

  const client = mockServiceClient({
    EXTERNAL_PROMOBRIND_URL: "https://promobrind-real.supabase.co",
  });

  const result = await resolveCredential("EXTERNAL_PROMOBRIND_URL", client);

  assertEquals(result.value, "https://promobrind-real.supabase.co", "value do DB");
  assertEquals(result.source, "db", "deve marcar source=db (não env)");
  assertEquals(result.resolved_name, "EXTERNAL_PROMOBRIND_URL", "nome canônico");

  // Conversão para o contrato do secrets-manager: has_value = !!value
  const has_value = !!result.value;
  assertEquals(has_value, true, "secrets-manager retornaria has_value=true");
});

Deno.test("resolveCredential: linha ausente + env canônica presente → source='env'", async () => {
  invalidateCredentialCache();
  Deno.env.set("EXTERNAL_PROMOBRIND_SERVICE_ROLE_KEY", "key-from-env-canonical");

  const client = mockServiceClient({}); // DB vazio
  const result = await resolveCredential("EXTERNAL_PROMOBRIND_SERVICE_ROLE_KEY", client);

  assertEquals(result.value, "key-from-env-canonical");
  assertEquals(result.source, "env");
  assertEquals(result.resolved_name, "EXTERNAL_PROMOBRIND_SERVICE_ROLE_KEY");

  clearEnv("EXTERNAL_PROMOBRIND_SERVICE_ROLE_KEY");
});

Deno.test("resolveCredential: alias legado (EXTERNAL_SUPABASE_URL) → resolve com source='env'", async () => {
  invalidateCredentialCache();
  clearEnv("EXTERNAL_PROMOBRIND_URL");
  Deno.env.set("EXTERNAL_SUPABASE_URL", "https://legacy-env-alias.supabase.co");

  const client = mockServiceClient({}); // DB vazio
  const result = await resolveCredential("EXTERNAL_PROMOBRIND_URL", client);

  assertEquals(result.value, "https://legacy-env-alias.supabase.co", "valor do alias legado");
  assertEquals(result.source, "env");
  assertEquals(result.resolved_name, "EXTERNAL_SUPABASE_URL", "nome resolvido aponta para o alias");

  clearEnv("EXTERNAL_SUPABASE_URL");
});

Deno.test("resolveCredential: nada configurado → source='none', value=null", async () => {
  invalidateCredentialCache();
  clearEnv(
    "EXTERNAL_PROMOBRIND_ANON_KEY",
    "EXTERNAL_SUPABASE_ANON_KEY",
  );

  const client = mockServiceClient({}); // DB vazio
  const result = await resolveCredential("EXTERNAL_PROMOBRIND_ANON_KEY", client);

  assertEquals(result.value, null);
  assertEquals(result.source, "none");

  // Conversão para o contrato do secrets-manager
  const has_value = !!result.value;
  assertEquals(has_value, false, "secrets-manager retornaria has_value=false → card 'Sem credenciais' aparece (correto)");
});

Deno.test("resolveCredential: DB tem prioridade sobre env (regression do bug original)", async () => {
  invalidateCredentialCache();
  Deno.env.set("EXTERNAL_PROMOBRIND_URL", "https://from-env.example.co");

  const client = mockServiceClient({
    EXTERNAL_PROMOBRIND_URL: "https://from-db.supabase.co",
  });

  const result = await resolveCredential("EXTERNAL_PROMOBRIND_URL", client);

  assertEquals(result.value, "https://from-db.supabase.co", "DB ganha");
  assertEquals(result.source, "db", "source=db, não env");
  assert(
    result.value !== "https://from-env.example.co",
    "valor do DB sobrescreve o da env — comportamento DB-first",
  );

  clearEnv("EXTERNAL_PROMOBRIND_URL");
});

Deno.test("resolveCredential: cache de 60s evita re-leitura do DB", async () => {
  invalidateCredentialCache();
  clearEnv("BITRIX24_TOKEN");

  let dbReads = 0;
  // deno-lint-ignore no-explicit-any
  const builder: any = {
    select() { return builder; },
    eq() { return builder; },
    async maybeSingle() {
      dbReads++;
      return { data: { secret_value: "cached-token" }, error: null };
    },
  };
  // deno-lint-ignore no-explicit-any
  const client = { from: () => builder } as any;

  const r1 = await resolveCredential("BITRIX24_TOKEN", client);
  const r2 = await resolveCredential("BITRIX24_TOKEN", client);
  const r3 = await resolveCredential("BITRIX24_TOKEN", client);

  assertEquals(r1.value, "cached-token");
  assertEquals(r2.value, "cached-token");
  assertEquals(r3.value, "cached-token");
  assertEquals(dbReads, 1, "DB deve ser lido apenas 1x (cache hit nas demais)");
});
