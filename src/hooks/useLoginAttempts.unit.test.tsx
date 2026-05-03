import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useLoginAttempts } from "./useLoginAttempts";
import { supabase } from "@/integrations/supabase/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock Supabase
const mockQuery = {
  select: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  range: vi.fn().mockReturnThis(),
  ilike: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => mockQuery),
  },
}));

const queryClient = new QueryClient({
  defaultOptions: { 
    queries: { 
      retry: false,
      gcTime: 0,
      staleTime: 0,
    } 
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe("useLoginAttempts Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it("fetches login attempts with correct parameters", async () => {
    const mockData = [{ id: "1", email: "test@example.com", success: true }];
    const fromSpy = vi.mocked(supabase.from);
    
    (mockQuery.range as any).mockResolvedValue({ data: mockData, count: 1, error: null });

    const { result } = renderHook(() => useLoginAttempts({ emailFilter: "test" }), { wrapper });

    await waitFor(() => {
      if (result.current.isError) throw result.current.error;
      expect(result.current.isSuccess).toBe(true);
    }, { timeout: 2000 });

    expect(fromSpy).toHaveBeenCalledWith("login_attempts");
    expect(mockQuery.ilike).toHaveBeenCalledWith("email", "%test%");
    expect(result.current.data?.attempts).toEqual(mockData);
  });

  it("handles errors from supabase gracefully", async () => {
    const fromSpy = vi.mocked(supabase.from);
    (mockQuery.range as any).mockResolvedValue({ data: null, error: { message: "DB Error" } });

    const { result } = renderHook(() => useLoginAttempts(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
  });
});
