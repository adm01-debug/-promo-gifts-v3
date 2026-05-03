import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useLoginAttempts } from "./useLoginAttempts";
import { supabase } from "@/integrations/supabase/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock implementation that actually returns itself
const createMockQuery = () => {
  const mock: any = {
    select: vi.fn(),
    order: vi.fn(),
    range: vi.fn(),
    ilike: vi.fn(),
    eq: vi.fn(),
  };
  mock.select.mockReturnValue(mock);
  mock.order.mockReturnValue(mock);
  mock.range.mockReturnValue(mock);
  mock.ilike.mockReturnValue(mock);
  mock.eq.mockReturnValue(mock);
  return mock;
};

const globalMockQuery = createMockQuery();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => globalMockQuery),
  },
}));

const queryClient = new QueryClient({
  defaultOptions: { 
    queries: { 
      retry: false,
      gcTime: 0,
    } 
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

describe("useLoginAttempts Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
    // Reset implementations to return the object
    globalMockQuery.select.mockReturnValue(globalMockQuery);
    globalMockQuery.order.mockReturnValue(globalMockQuery);
    globalMockQuery.range.mockReturnValue(globalMockQuery);
    globalMockQuery.ilike.mockReturnValue(globalMockQuery);
    globalMockQuery.eq.mockReturnValue(globalMockQuery);
  });

  it("fetches login attempts with filters", async () => {
    const mockData = [{ id: "1", email: "test@example.com", success: true }];
    const fromSpy = vi.mocked(supabase.from);
    
    globalMockQuery.range.mockResolvedValue({ data: mockData, count: 1, error: null });

    const { result } = renderHook(() => useLoginAttempts({ emailFilter: "test", successFilter: false }), { wrapper });

    await waitFor(() => {
      if (result.current.isError) throw result.current.error;
      expect(result.current.isSuccess).toBe(true);
    }, { timeout: 2000 });

    expect(fromSpy).toHaveBeenCalledWith("login_attempts");
    expect(globalMockQuery.ilike).toHaveBeenCalledWith("email", "%test%");
    expect(globalMockQuery.eq).toHaveBeenCalledWith("success", false);
    expect(result.current.data?.attempts).toEqual(mockData);
  });

  it("handles errors from supabase gracefully", async () => {
    globalMockQuery.range.mockResolvedValue({ data: null, error: { message: "DB Error" } });

    const { result } = renderHook(() => useLoginAttempts(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
  });
});
