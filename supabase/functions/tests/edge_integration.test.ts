import { assert, assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

/**
 * Testes de integração para Edge Functions.
 * Foca em validação de entrada, payloads e status codes.
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "http://localhost:54321";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

async function invokeFunction(name: string, body: any, headers: any = {}) {
  const url = `${SUPABASE_URL}/functions/v1/${name}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      ...headers,
    },
    body: JSON.stringify(body),
  });
  return response;
}

Deno.test("Edge Function: cnpj-lookup - validação de entrada", async () => {
  const res = await invokeFunction("cnpj-lookup", { cnpj: "invalid" });
  // Should return 400 or a specific validation error payload
  assert(res.status === 400 || res.status === 422, `Expected 400/422 but got ${res.status}`);
});

Deno.test("Edge Function: validate-access - status codes", async () => {
  const res = await invokeFunction("validate-access", {});
  // Empty payload might be unauthorized or bad request depending on implementation
  assert(res.status >= 400, `Expected error status but got ${res.status}`);
});

Deno.test("Edge Function: HMAC verification simulation (if applicable)", async () => {
  // Mocking a webhook call that requires HMAC
  const res = await invokeFunction("webhook-inbound", { test: true }, {
    "X-Hub-Signature-256": "invalid_signature"
  });
  assertEquals(res.status, 401, "Should reject invalid HMAC signature");
});
