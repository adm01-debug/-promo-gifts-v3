/**
 * Centralized JSON parsing utilities for Edge Functions.
 * Handles AI response extraction and safe request body parsing.
 */
import { createStructuredLogger } from "./structured-logger.ts";

const log = createStructuredLogger("json-parser");

/**
 * Robustly extract & parse JSON from an LLM response.
 * Handles markdown fences, prose around JSON, trailing commas, and minor
 * truncation (auto-closes one missing `]` or `}` at the end).
 */
export function extractAndParseAIJSON(raw: string): unknown {
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
  const end = isArray ? s.lastIndexOf("]") : s.lastIndexOf("}");
  s = end > start ? s.slice(start, end + 1) : s.slice(start);

  // Remove trailing commas before } or ]
  const cleaned = s.replace(/,(\s*[}\]])/g, "$1");

  try {
    return JSON.parse(cleaned);
  } catch (e1) {
    // Repair attempt 1: escape unescaped double quotes inside string values.
    // Heuristic: walk the string tracking whether we're inside a JSON string.
    // A `"` is treated as a string terminator only if followed (after whitespace)
    // by one of: , } ] : or end-of-input. Otherwise it's escaped.
    const repaired = repairUnescapedQuotes(cleaned);
    if (repaired !== cleaned) {
      try { return JSON.parse(repaired); } catch { /* fall through */ }
    }

    // Repair attempt 2: auto-close missing brackets if truncated
    const base = repaired !== cleaned ? repaired : cleaned;
    const opens = (base.match(/[{[]/g) || []).length;
    const closes = (base.match(/[}\]]/g) || []).length;
    if (opens > closes) {
      const patched = base + (isArray ? "]" : "}").repeat(opens - closes);
      try { return JSON.parse(patched); } catch { /* fall through */ }
    }
    console.error("[json-parser] AI JSON parse failed. Snippet:", cleaned.slice(0, 500));
    throw e1;
  }
}

function repairUnescapedQuotes(input: string): string {
  const out: string[] = [];
  let inString = false;
  let escape = false;
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
        }
      }
      continue;
    }
    out.push(ch);
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
