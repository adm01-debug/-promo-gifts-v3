import { describe, it, expect, vi } from 'vitest';
import { extractAndParseAIJSON } from '../supabase/functions/_shared/json-parser';

// Simulating Deno environment for the shared util in Vitest if possible, 
// or testing it as a regular JS function.
vi.mock('../supabase/functions/_shared/structured-logger.ts', () => ({
  createStructuredLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
  })
}));

describe('AI Recommendations Integration Logic', () => {
  it('should handle unescaped quotes in AI responses (Integration Simulation)', () => {
    const aiResponse = '{"recommendations": [{"productId": "123", "score": 0.9, "reason": "Because it is "premium""}]}';
    const parsed: any = extractAndParseAIJSON(aiResponse);
    expect(parsed.recommendations[0].reason).toContain('premium');
  });

  it('should handle truncated AI responses', () => {
    const aiResponse = '{"recommendations": [{"productId": "123", "score": 0.9, "reason": "text"';
    const parsed: any = extractAndParseAIJSON(aiResponse);
    expect(parsed.recommendations[0].productId).toBe("123");
  });
});
