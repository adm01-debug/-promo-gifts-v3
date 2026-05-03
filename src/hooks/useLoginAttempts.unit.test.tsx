import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useLoginAttempts } from "./useLoginAttempts";
import { supabase } from "@/integrations/supabase/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock Supabase completely inline
vi.mock("@/integrations/supabase/client", () => {
  const queryMock = {
    select: vi.fn(),
    order: vi.fn(),
    range: vi.fn(),
    ilike: vi.fn(),
    eq: vi.fn(),
  };
  
  queryMock.select.mockReturnValue(queryMock);
  queryMock.order.mockReturnValue(queryMock);
  queryMock.range.mockReturnValue(queryMock);
  queryMock.ilike.mockReturnValue(queryMock);
  queryMock.eq.mockReturnValue(queryMock);

  return {
    supabase: {
      from: vi.fn(() => queryMock),
    },
  };
});

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
  });

  it("fetches login attempts with correct parameters", async () => {
    const mockData = [{ id: "1", email: "test@example.com", success: true }];
    const fromSpy = vi.mocked(supabase.from);
    const mockQuery = fromSpy() as any;
    
    mockQuery.range.mockResolvedValue({ data: mockData, count: 1, error: null });

    const { result } = renderHook(() => useLoginAttempts({ emailFilter: "test" }), { wrapper });

    await waitFor(() => {
      if (result.current.isError) throw result.current.error;
      expect(result.current.isSuccess).toBe(true);
    }, { timeout: 2000 });

    expect(fromSpy).toHaveBeenCalledWith("login_attempts");
    expect(mockQuery.ilike).toHaveBeenCalled();
    expect(result.current.data?.attempts).toEqual(mockData);
  });

  it("handles errors from supabase gracefully", async () => {
    const fromSpy = vi.mocked(supabase.from);
    const mockQuery = fromSpy() as any;
    
    mockQuery.range.mockResolvedValue({ data: null, error: { message: "DB Error" } });

    const { result } = renderHook(() => useLoginAttempts(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
  });
});
