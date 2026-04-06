/**
 * AI Usage Tracking Helper
 * Tracks AI consumption per user with quota checking and cost estimation.
 */
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

// Cost per 1M tokens (USD) — updated 2026-04
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "google/gemini-2.5-pro":           { input: 1.25, output: 10.0 },
  "google/gemini-3.1-pro-preview":   { input: 1.25, output: 10.0 },
  "google/gemini-3-flash-preview":   { input: 0.10, output: 0.40 },
  "google/gemini-2.5-flash":         { input: 0.15, output: 0.60 },
  "google/gemini-2.5-flash-lite":    { input: 0.04, output: 0.15 },
  "google/gemini-2.5-flash-image":   { input: 0.10, output: 0.40 },
  "google/gemini-3-pro-image-preview": { input: 1.25, output: 10.0 },
  "google/gemini-3.1-flash-image-preview": { input: 0.10, output: 0.40 },
  "openai/gpt-5":                    { input: 2.50, output: 10.0 },
  "openai/gpt-5-mini":              { input: 0.40, output: 1.60 },
  "openai/gpt-5-nano":              { input: 0.10, output: 0.40 },
  "openai/gpt-5.2":                 { input: 3.00, output: 12.0 },
};

function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = MODEL_PRICING[model] || { input: 0.50, output: 2.0 };
  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
}

function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

interface QuotaResult {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
  unlimited?: boolean;
  reason?: string;
}

/**
 * Check if user has available AI quota for this month.
 */
export async function checkAiQuota(userId: string): Promise<QuotaResult> {
  const supabase = getServiceClient();
  const { data, error } = await supabase.rpc("check_ai_quota", { _user_id: userId });
  if (error) {
    console.error("[ai-usage] Quota check failed:", error.message);
    return { allowed: true, used: 0, limit: -1, remaining: -1, reason: "quota_check_failed" };
  }
  return data as QuotaResult;
}

interface LogParams {
  userId: string;
  functionName: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  durationMs?: number;
  status?: "success" | "error";
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Log an AI usage event. Fire-and-forget — errors are logged but won't crash the caller.
 */
export async function logAiUsage(params: LogParams): Promise<void> {
  const {
    userId,
    functionName,
    model,
    inputTokens = 0,
    outputTokens = 0,
    durationMs,
    status = "success",
    errorMessage,
    metadata = {},
  } = params;

  const totalTokens = inputTokens + outputTokens;
  const cost = estimateCost(model, inputTokens, outputTokens);

  try {
    const supabase = getServiceClient();
    const { error } = await supabase.from("ai_usage_logs").insert({
      user_id: userId,
      function_name: functionName,
      model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: totalTokens,
      estimated_cost_usd: cost,
      duration_ms: durationMs,
      status,
      error_message: errorMessage,
      metadata,
    });
    if (error) console.error("[ai-usage] Failed to log:", error.message);
  } catch (e) {
    console.error("[ai-usage] Log error:", e);
  }
}

/**
 * Extract token counts from an OpenAI-compatible response body.
 */
export function extractTokensFromResponse(responseBody: any): { input: number; output: number } {
  const usage = responseBody?.usage;
  return {
    input: usage?.prompt_tokens ?? usage?.input_tokens ?? 0,
    output: usage?.completion_tokens ?? usage?.output_tokens ?? 0,
  };
}

/**
 * Wraps an AI gateway call with quota check + usage logging.
 * Returns the AI response or throws if quota exceeded.
 */
export async function callAiWithTracking(options: {
  userId: string;
  functionName: string;
  model: string;
  requestBody: Record<string, unknown>;
  apiKey: string;
  stream?: boolean;
}): Promise<Response> {
  const { userId, functionName, model, requestBody, apiKey, stream = false } = options;

  // 1. Check quota
  const quota = await checkAiQuota(userId);
  if (!quota.allowed) {
    throw new QuotaExceededError(quota);
  }

  // 2. Call AI
  const startMs = Date.now();
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, stream, ...requestBody }),
  });

  const durationMs = Date.now() - startMs;

  // For streaming, log with estimated tokens (actual will be unknown)
  if (stream) {
    // Fire-and-forget log with estimated tokens
    logAiUsage({
      userId,
      functionName,
      model,
      durationMs,
      status: response.ok ? "success" : "error",
      errorMessage: response.ok ? undefined : `HTTP ${response.status}`,
      metadata: { stream: true },
    });
    return response;
  }

  // 3. For non-streaming, extract tokens and log
  const cloned = response.clone();
  try {
    const body = await cloned.json();
    const tokens = extractTokensFromResponse(body);
    await logAiUsage({
      userId,
      functionName,
      model,
      inputTokens: tokens.input,
      outputTokens: tokens.output,
      durationMs,
      status: response.ok ? "success" : "error",
      errorMessage: response.ok ? undefined : body?.error?.message || `HTTP ${response.status}`,
    });
  } catch {
    await logAiUsage({
      userId,
      functionName,
      model,
      durationMs,
      status: "error",
      errorMessage: "Failed to parse AI response",
    });
  }

  return response;
}

export class QuotaExceededError extends Error {
  public quota: QuotaResult;
  constructor(quota: QuotaResult) {
    super(`AI quota exceeded: ${quota.used}/${quota.limit} requests used this month`);
    this.name = "QuotaExceededError";
    this.quota = quota;
  }
}
