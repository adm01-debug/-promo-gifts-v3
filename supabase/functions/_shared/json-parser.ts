/**
 * Centralized JSON parsing utilities for Edge Functions.
 * Handles AI response extraction and safe request body parsing.
 */
import { createStructuredLogger } from "./structured-logger.ts";

// Helper to get a logger without needing Request object (useful for shared utils)
function getLogger() {
  return createStructuredLogger({ 
    fn: "json-parser", 
    requestId: "internal", 
    base: { module: "shared-json-parser" } 
  });
}

/**
 * Robustly extract & parse JSON from an LLM response.
 * Handles markdown fences, prose around JSON, trailing commas, and minor
 * truncation (auto-closes multiple missing `]` or `}` at the end).
 */
export function extractAndParseAIJSON(raw: string): unknown {
  const log = getLogger();
  let s = String(raw ?? "").trim();

  // Strip markdown fences
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();

  // Slice from first { or [ to last matching } or ]
  const firstObj = s.indexOf("{");
  const firstArr = s.indexOf("[");
  const start =
    firstObj === -1 ? firstArr :
    firstArr === -1 ? firstObj :
    Math.min(firstObj, firstArr);
    
  if (start === -1) throw new Error("No JSON object/array found in AI response");
  
  const isArray = s[start] === "[";
  let end = isArray ? s.lastIndexOf("]") : s.lastIndexOf("}");
  
  // If no matching closing bracket found, we slice until the end to attempt repair
  if (end === -1 || end < start) {
    end = s.length - 1;
  }
  
  s = s.slice(start, end + 1);

  // Remove trailing commas before } or ]
  const cleaned = s.replace(/,(\s*[}\]])/g, "$1");

  try {
    return JSON.parse(cleaned);
  } catch (e1) {
    // Repair attempt 1: escape unescaped double quotes inside string values.
    const repaired = repairUnescapedQuotes(cleaned);
    if (repaired !== cleaned) {
      try { 
        const result = JSON.parse(repaired);
        log.info("AI JSON repaired successfully (quotes)", { 
          original_len: cleaned.length, 
          repaired_len: repaired.length 
        });
        return result;
      } catch { /* fall through */ }
    }

    // Repair attempt 2: auto-close missing brackets if truncated
    const base = repaired !== cleaned ? repaired : cleaned;
    
    // Heuristic for multi-bracket repair:
    // We try adding up to 5 levels of brackets
    let patched = base;
    for (let i = 1; i <= 8; i++) {
      // Very simple: try closing objects, then try closing arrays
      // This is hit-or-miss but better than nothing
      const opensObj = (patched.match(/{/g) || []).length;
      const closesObj = (patched.match(/}/g) || []).length;
      const opensArr = (patched.match(/\[/g) || []).length;
      const closesArr = (patched.match(/\]/g) || []).length;

      if (opensObj > closesObj) patched += "}";
      else if (opensArr > closesArr) patched += "]";

      try {
        const result = JSON.parse(patched);
        log.info("AI JSON repaired successfully (truncated)", { 
          original_len: base.length, 
          patched_len: patched.length,
          attempts: i
        });
        return result;
      } catch {
        // If still failing, continue adding brackets or move to error
      }
    }

    log.error("AI JSON parse failed final attempt", { 
      snippet: cleaned.slice(0, 500),
      repaired_snippet: base.slice(0, 500),
      error: e1 instanceof Error ? e1.message : String(e1)
    });
    throw e1;
  }
}

function repairUnescapedQuotes(input: string): string {
  const log = getLogger();
  const out: string[] = [];
  let inString = false;
  let escape = false;
  let repairedCount = 0;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (escape) {
      out.push(ch);
      escape = false;
      continue;
    }
    if (ch === "\\") {
      out.push(ch);
      escape = true;
      continue;
    }
    if (ch === '"') {
      if (!inString) {
        inString = true;
        out.push(ch);
      } else {
        // Look ahead: is this a real string terminator?
        let j = i + 1;
        while (j < input.length && (input[j] === " " || input[j] === "\t" || input[j] === "\n" || input[j] === "\r")) j++;
        const next = input[j];
        if (next === undefined || next === "," || next === "}" || next === "]" || next === ":") {
          inString = false;
          out.push(ch);
        } else {
          // Unescaped quote inside string value — escape it
          out.push("\\", '"');
          repairedCount++;
        }
      }
      continue;
    }
    out.push(ch);
  }

  if (repairedCount > 0) {
    log.info("AI JSON quotes repaired", { repairedCount });
  }

  return out.join("");
}

/**
 * Safely parse request body JSON.
 * Returns null if body is empty or malformed.
 */
export async function safeJson(req: Request): Promise<unknown | null> {
  try {
    const text = await req.text();
    if (!text || text.trim() === "") return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}
