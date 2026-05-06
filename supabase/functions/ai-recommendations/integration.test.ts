import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { extractAndParseAIJSON } from "../_shared/json-parser.ts";

Deno.test("ai-recommendations: integration simulation with problematic quotes", async () => {
  // Simulate what the AI might return
  const aiContent = `
  Aqui estão as recomendações:
  \`\`\`json
  {
    "recommendations": [
      {
        "productId": "p1",
        "score": 0.95,
        "reason": "O cliente prefere itens de "Luxo" e alta qualidade."
      }
    ],
    "insights": "Foco em premium."
  }
  \`\`\`
  `;
  
  const parsed = extractAndParseAIJSON(aiContent) as any;
  assertEquals(parsed.recommendations[0].productId, "p1");
  assertEquals(parsed.recommendations[0].reason, 'O cliente prefere itens de "Luxo" e alta qualidade.');
});
