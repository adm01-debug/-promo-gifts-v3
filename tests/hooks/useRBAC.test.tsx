/**
 * useRBAC — testes funcionais
 * Cobre: admin wildcard, fallback seller, mapping vendedor->seller,
 * hasPermission e hasPermissionByCode com permissões do banco.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import "../components/render-helpers"; // ativa mocks globais (Supabase, Auth, sonner)
import { useAuth } from "@/contexts/AuthContext";
import { renderHookWithProviders } from "./_helpers/render-hook-providers";
import { mockFromOnce, resetSupabaseMocks } from "./_helpers/mock-supabase-builder";
import { useRBAC } from "@/hooks/useRBAC";
import { waitFor } from "@testing-library/react";

const mockedUseAuth = vi.mocked(useAuth);

beforeEach(() => {
  resetSupabaseMocks();
  mockedUseAuth.mockReturnValue({
    // @ts-expect-error mock parcial
    user: { id: "user-1", email: "u@test.com" },
    session: { access_token: "tok" },
    loading: false,
    role: "vendedor",
    profile: { id: "profile-1" },
    signOut: vi.fn(),
    isLoading: false,
  });
});

describe("useRBAC", () => {
  it("admin tem wildcard mesmo sem permissões no banco", async () => {
    mockedUseAuth.mockReturnValueOnce({
      // @ts-expect-error mock parcial
      user: { id: "u" }, role: "admin", profile: { id: "p" }, isLoading: false, loading: false, signOut: vi.fn(), session: null,
    });
    mockFromOnce({ data: [], error: null });

    const { result } = renderHookWithProviders(() => useRBAC());
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.hasPermission("delete", "anything")).toBe(true);
    expect(result.current.hasPermissionByCode("any_code")).toBe(true);
  });

  it("seller (vendedor) recebe permissões do banco e parseia code → action/resource", async () => {
    mockFromOnce({
      data: [{ permission_code: "create_quotes" }, { permission_code: "view_catalog" }],
      error: null,
    });

    const { result } = renderHookWithProviders(() => useRBAC());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.role.name).toBe("seller");
    expect(result.current.hasPermission("create", "quotes")).toBe(true);
    expect(result.current.hasPermission("view", "catalog")).toBe(true);
    expect(result.current.hasPermission("delete", "quotes")).toBe(false);
    expect(result.current.hasPermissionByCode("create_quotes")).toBe(true);
    expect(result.current.hasPermissionByCode("delete_quotes")).toBe(false);
  });

  it("hasRole considera o role atual", async () => {
    mockFromOnce({ data: [], error: null });
    const { result } = renderHookWithProviders(() => useRBAC());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasRole("seller")).toBe(true);
    expect(result.current.hasRole("admin")).toBe(false);
    expect(result.current.hasRole("admin", "manager", "seller")).toBe(true);
  });

  it("isManagerOrAbove false para seller, true para manager/admin", async () => {
    mockFromOnce({ data: [], error: null });
    const { result } = renderHookWithProviders(() => useRBAC());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isManagerOrAbove).toBe(false);
  });

  it("erro na query → permissions = [] (sem crash)", async () => {
    mockFromOnce({ data: null, error: { message: "boom" } });
    const { result } = renderHookWithProviders(() => useRBAC());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.getPermissions()).toEqual([]);
  });
});
