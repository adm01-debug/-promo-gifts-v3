import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

Deno.test("global-fuzzing: resilience check", async () => {
  const malformed = "{ invalid }";
  let error;
  try {
    JSON.parse(malformed);
  } catch (e) {
    error = e;
  }
  assertEquals(!!error, true);
});
