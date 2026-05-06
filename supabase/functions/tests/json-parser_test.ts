import { assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { extractAndParseAIJSON } from "../_shared/json-parser.ts";

Deno.test("json-parser: should parse clean JSON", () => {
  const input = '{"key": "value"}';
  const result = extractAndParseAIJSON(input);
  assertEquals(result, { key: "value" });
});

Deno.test("json-parser: should handle markdown fences", () => {
  const input = '```json\n{"key": "value"}\n```';
  const result = extractAndParseAIJSON(input);
  assertEquals(result, { key: "value" });
});

Deno.test("json-parser: should handle unescaped quotes in strings", () => {
  const input = '{"reason": "Ele gosta de "Blocos" ecológicos", "id": 1}';
  const result = extractAndParseAIJSON(input);
  assertEquals(result, { reason: 'Ele gosta de \\"Blocos\\" ecológicos', id: 1 });
});

Deno.test("json-parser: should handle truncated JSON (missing closing braces)", () => {
  const input = '{"recommendations": [{"id": 1, "name": "test"}';
  const result = extractAndParseAIJSON(input);
  assertEquals(result, { recommendations: [{ id: 1, name: "test" }] });
});

Deno.test("json-parser: should handle trailing commas", () => {
  const input = '{"list": [1, 2, 3,], "obj": {"a": 1,},}';
  const result = extractAndParseAIJSON(input);
  assertEquals(result, { list: [1, 2, 3], obj: { a: 1 } });
});

Deno.test("json-parser: should throw error on completely invalid input", () => {
  const input = "Not a JSON at all";
  assertThrows(() => extractAndParseAIJSON(input));
});
