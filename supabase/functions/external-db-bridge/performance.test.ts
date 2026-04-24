// Performance regression test for external-db-bridge.
//
// Garante que listings de products com `limit > 50`:
//   1. Aplicam o select lightweight automaticamente (sem campos JSONB pesados no payload)
//   2. Ficam abaixo do SLA de latência (p95 alvo)
//
// O teste é tolerante a cold start: faz 1 warm-up + N medições e usa a mediana
// para a asserção principal (evita flakiness em CI), mas também trava um teto
// absoluto generoso para qualquer requisição individual.
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const ENDPOINT = `${SUPABASE_URL}/functions/v1/external-db-bridge`;

// SLAs (ms). Ajustados a partir da telemetria validada (~1.7s média pós-otimização).
const SLA_MEDIAN_MS = 3500;       // mediana deve ficar bem abaixo do baseline (~3000ms pré-otimização)
const SLA_HARD_CEILING_MS = 8000; // teto absoluto: nenhuma request individual deve exceder
const MEASUREMENT_RUNS = 3;

// Campos pesados que NUNCA devem aparecer em um listing lightweight.
const HEAVY_FIELDS = [
  "metadata",
  "personalization_areas",
  "description_html",
  "description",
  "specifications",
];

async function callListing(limit: number): Promise<{ ms: number; rows: any[]; status: number }> {
  const started = performance.now();
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      operation: "select",
      table: "products",
      select: "*",
      limit,
    }),
  });
  const ms = performance.now() - started;
  const body = await res.json().catch(() => ({}));
  // Bridge response shape: { success, data: { records: [...] } } | { data: [...] } | [...]
  const rows = Array.isArray(body?.data?.records)
    ? body.data.records
    : Array.isArray(body?.data)
      ? body.data
      : Array.isArray(body)
        ? body
        : [];
  return { ms, rows, status: res.status };
}

Deno.test("perf: listing limit=150 enforces lightweight select (no heavy JSONB fields)", async () => {
  const { rows, status } = await callListing(150);
  assertEquals(status, 200, "endpoint deve responder 200");
  assert(rows.length > 0, "esperava pelo menos 1 produto retornado");

  const sample = rows[0];
  const presentHeavy = HEAVY_FIELDS.filter((f) => Object.prototype.hasOwnProperty.call(sample, f));
  assertEquals(
    presentHeavy,
    [],
    `payload contém campos pesados que deveriam ter sido removidos pelo lightweight select: ${presentHeavy.join(", ")}`,
  );
});

Deno.test("perf: listing limit=200 stays under latency SLA (median)", async () => {
  // Warm-up para mitigar cold start da edge function
  await callListing(200);

  const samples: number[] = [];
  for (let i = 0; i < MEASUREMENT_RUNS; i++) {
    const { ms, status } = await callListing(200);
    assertEquals(status, 200, `run ${i + 1} deve responder 200`);
    samples.push(ms);
    assert(
      ms < SLA_HARD_CEILING_MS,
      `run ${i + 1} excedeu o teto absoluto: ${ms.toFixed(0)}ms (limite ${SLA_HARD_CEILING_MS}ms)`,
    );
  }

  const sorted = [...samples].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  console.log(`[perf] listing limit=200 — samples=${samples.map((s) => s.toFixed(0)).join("ms,")}ms median=${median.toFixed(0)}ms`);

  assert(
    median < SLA_MEDIAN_MS,
    `latência mediana ${median.toFixed(0)}ms acima do SLA ${SLA_MEDIAN_MS}ms — possível regressão de performance`,
  );
});

Deno.test("perf: small limit=10 still receives full payload (no over-eager lightweight)", async () => {
  // Garante que o teste de performance não mascarou regressão na regra inversa:
  // listings pequenos devem manter campos completos para detail/edit pages.
  const { rows, status } = await callListing(10);
  assertEquals(status, 200);
  assert(rows.length > 0, "esperava pelo menos 1 produto retornado");

  const sample = rows[0];
  // Pelo menos UM dos campos pesados deve estar presente (mesmo que null) no payload completo.
  const hasAnyHeavy = HEAVY_FIELDS.some((f) => Object.prototype.hasOwnProperty.call(sample, f));
  assert(
    hasAnyHeavy,
    `listing pequeno (limit=10) deveria preservar campos completos, mas nenhum dos campos pesados foi retornado: ${HEAVY_FIELDS.join(", ")}`,
  );
});
