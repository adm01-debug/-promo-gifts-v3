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
  assertEquals(res.status, 400, "CNPJ inválido deve retornar 400");
  const data = await res.json();
  assert(data.error || data.message, "Deve conter mensagem de erro");
});

Deno.test("Edge Function: validate-access - status codes", async () => {
  const res = await invokeFunction("validate-access", {});
  assert(res.status === 400 || res.status === 401, `Status inesperado: ${res.status}`);
});

Deno.test("Edge Function: webhook-inbound - HMAC verification", async () => {
  // Test case 1: Missing signature (401 + missing_signature)
  const res1 = await invokeFunction("webhook-inbound", { event: "test" });
  assertEquals(res1.status, 401, "Rejeitar sem assinatura");
  const data1 = await res1.json();
  assertEquals(data1.error, "missing_signature", "Erro: missing_signature");

  // Test case 2: Invalid signature format - no prefix (401 + invalid_signature_format)
  const res2 = await invokeFunction("webhook-inbound", { event: "test" }, {
    "X-Hub-Signature-256": "abcdef123456"
  });
  assertEquals(res2.status, 401, "Rejeitar sem prefixo sha256=");
  const data2 = await res2.json();
  assertEquals(data2.error, "invalid_signature_format", "Erro: invalid_signature_format");

  // Test case 3: Valid format but wrong signature (401 + invalid_signature)
  const res3 = await invokeFunction("webhook-inbound", { event: "test" }, {
    "X-Hub-Signature-256": "sha256=4f2f5e1f76e3d23f3f3f3f3f3f3f3f3f3f3f3f3f3f3f3f3f3f3f3f3f3f3f3f3f"
  });
  assertEquals(res3.status, 401, "Rejeitar assinatura incorreta");
  const data3 = await res3.json();
  assertEquals(data3.error, "invalid_signature", "Erro: invalid_signature");
});

Deno.test("Edge Function: bitrix-sync - erro de payload", async () => {
  const res = await invokeFunction("bitrix-sync", { malformed: true });
  assert(res.status >= 400, "Payload malformado deve falhar");
});
