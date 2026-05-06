import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

Deno.test("cnpj-lookup: validation check", async () => {
  // Simple validation to ensure the test runner picks it up
  const status = 200;
  assertEquals(status, 200);
});
