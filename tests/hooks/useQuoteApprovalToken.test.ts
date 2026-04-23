/**
 * useQuoteApprovalToken — useQuery wrapper para get_quote_token_by_value RPC.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import "../components/render-helpers";
import { waitFor } from "@testing-library/react";
import { renderHookWithProviders } from "./_helpers/render-hook-providers";
import { mockRpcOnce, resetSupabaseMocks } from "./_helpers/mock-supabase-builder";
import { useQuoteApprovalToken } from "@/hooks/useQuoteApprovalToken";

beforeEach(() => {
  resetSupabaseMocks();
});

describe("useQuoteApprovalToken", () => {
  it("não dispara query quando token vazio", () => {
    const { result } = renderHookWithProviders(() => useQuoteApprovalToken(null));
    expect(result.current.isFetching).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it("retorna o primeiro item quando RPC devolve array", async () => {
    mockRpcOnce({ data: [{ token: "abc", quote_id: "q1" }], error: null });
    const { result } = renderHookWithProviders(() => useQuoteApprovalToken("abc"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ token: "abc", quote_id: "q1" });
  });

  it("retorna o objeto direto quando RPC devolve obj", async () => {
    mockRpcOnce({ data: { token: "abc", quote_id: "q1" }, error: null });
    const { result } = renderHookWithProviders(() => useQuoteApprovalToken("abc"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ token: "abc", quote_id: "q1" });
  });

  it("propaga erro como isError", async () => {
    mockRpcOnce({ data: null, error: { message: "not found" } });
    const { result } = renderHookWithProviders(() => useQuoteApprovalToken("zzz"));
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
