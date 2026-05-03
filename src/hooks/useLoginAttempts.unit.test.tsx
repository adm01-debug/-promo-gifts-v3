import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useLoginAttempts } from "./useLoginAttempts";
import { supabase } from "@/integrations/supabase/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Create the mock query object outside
const mockQuery: any = {
  select: vi.fn(),
  order: vi.fn(),
  range: vi.fn(),
  ilike: vi.fn(),
  eq: vi.fn(),
};

// Ensure all chainable methods return the same mock object
mockQuery.select.mockImplementation(() => mockQuery);
mockQuery.order.mockImplementation(() => mockQuery);
mockQuery.range.mockImplementation(() => mockQuery);
mockQuery.ilike.mockImplementation(() => mockQuery);
mockQuery.eq.mockImplementation(() => mockQuery);

// Mock Supabase with a stable implementation
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
    // Re-setup the mock chain just in case
    mockQuery.select.mockReturnValue(mockQuery);
    mockQuery.order.mockReturnValue(mockQuery);
    mockQuery.range.mockReturnValue(mockQuery);
    mockQuery.ilike.mockReturnValue(mockQuery);
    mockQuery.eq.mockReturnValue(mockQuery);
  });

  it("fetches login attempts with correct parameters", async () => {
    const mockData = [{ id: "1", email: "test@example.com", success: true }];
    const fromSpy = vi.mocked(supabase.from);
    
    mockQuery.range.mockResolvedValue({ data: mockData, count: 1, error: null });

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
    
    mockQuery.range.mockResolvedValue({ data: null, error: { message: "DB Error" } });

    const { result } = renderHook(() => useLoginAttempts(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
  });
});
