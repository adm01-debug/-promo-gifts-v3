import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useLoginAttempts } from "./useLoginAttempts";
import { supabase } from "@/integrations/supabase/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => {
  const mockQuery = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
  };
  return {
    supabase: {
      from: vi.fn(() => mockQuery),
    },
  };
});

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
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
    
    // Get the mock query object from the spy's return value
    const mockQuery = fromSpy() as any;
    mockQuery.range.mockResolvedValue({ data: mockData, count: 1, error: null });

    const { result } = renderHook(() => useLoginAttempts({ emailFilter: "test" }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fromSpy).toHaveBeenCalledWith("login_attempts");
    expect(mockQuery.ilike).toHaveBeenCalledWith("email", "%test%");
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
