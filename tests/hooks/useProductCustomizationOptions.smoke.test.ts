/**
 * Smoke + funcional mínimo para useProductCustomizationOptions.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { renderHookWithProviders } from "./_helpers/render-hook-providers";
import { supabase } from "@/integrations/supabase/client";
import { useProductCustomizationOptions } from "@/hooks/useProductCustomizationOptions";
import { OPTIONS_PAYLOAD_PT } from "../fixtures/personalization-payloads";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useProductCustomizationOptions (smoke)", () => {
  it("não chama RPC quando productId é null", async () => {
    const invoke = supabase.functions.invoke as unknown as ReturnType<typeof vi.fn>;
    const { result, unmount } = renderHookWithProviders(() =>
      useProductCustomizationOptions(null),
    );
    // Query desabilitada → nunca dispara fetch
    await new Promise((r) => setTimeout(r, 30));
    expect(invoke).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
    unmount();
  });

  it("adapta payload PT canônico em estrutura normalizada", async () => {
    const invoke = supabase.functions.invoke as unknown as ReturnType<typeof vi.fn>;
    invoke.mockResolvedValue({
      data: { success: true, data: OPTIONS_PAYLOAD_PT },
      error: null,
    });

    const { result } = renderHookWithProviders(() =>
      useProductCustomizationOptions("prod-1"),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const data = result.current.data!;
    expect(data.product_id).toBe("prod-1");
    expect(data.locations).toHaveLength(2);
    expect(data.locations[0].location_code).toBe("FRENTE");
    expect(data.locations[0].options).toHaveLength(2);
    expect(data.locations[0].options[0].technique_id).toBe("tech-1");
    expect(data.locations[0].options[0].cobra_por_cor).toBe(false);
    expect(data.locations[0].options[1].usa_dimensao).toBe(true);
    expect(data.locations[1].options[0].grupo_tecnica).toBe("UV");
  });
});
