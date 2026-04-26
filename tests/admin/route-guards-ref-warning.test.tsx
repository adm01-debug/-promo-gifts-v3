/**
 * Smoke render dos guards de rota (AdminRoute / DevRoute / ProtectedRoute)
 * com `installReactWarningGuard` para garantir que nenhum dispara
 * "Function components cannot be given refs".
 *
 * Cobre cenários sem usuário (redirect → <Navigate />) e com loading.
 * Renderiza dentro de Routes para que `<Outlet />` e `<Navigate />` se
 * comportem como em produção.
 */
import { describe, it, beforeEach, afterEach, vi } from "vitest";
import { render, cleanup, fireEvent, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route, Outlet } from "react-router-dom";
import { ErrorBoundary } from "@/components/errors/ErrorBoundary";
import { installReactWarningGuard } from "../helpers/react-warning-guard";

// Mock do AuthContext: retorna estado controlável por teste.
const authState = {
  user: null as null | { id: string; email: string },
  isLoading: false,
  canManage: false,
  isDev: false,
  isSupervisorOrAbove: false,
  hasMFA: false,
  mfaRequired: false,
  currentAAL: "aal1" as const,
  role: "agente" as const,
};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mocks neutros para subdependências dos guards.
vi.mock("@/components/security/MfaEnrollmentDialog", () => ({
  MfaEnrollmentDialog: () => null,
}));
vi.mock("@/components/security/MfaChallengeDialog", () => ({
  MfaChallengeDialog: () => null,
}));
vi.mock("@/components/access/DevAccessDeniedPage", () => ({
  DevAccessDeniedPage: () => <div>access-denied</div>,
}));
vi.mock("@/lib/access/log-access-denied", () => ({
  logAccessDenied: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { AdminRoute } from "@/components/layout/AdminRoute";
import { DevRoute } from "@/components/layout/DevRoute";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";

function renderWithRoute(element: React.ReactElement, initial = "/admin") {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path="/" element={<div>home</div>} />
        <Route path="/login" element={<div>login</div>} />
        <Route element={element}>
          <Route path="/admin" element={<div>admin-child</div>} />
          <Route path="/dev" element={<div>dev-child</div>} />
          <Route path="/p" element={<div>p-child</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("Route guards — React ref warning guard", () => {
  let guard: ReturnType<typeof installReactWarningGuard>;

  beforeEach(() => {
    guard = installReactWarningGuard();
    Object.assign(authState, {
      user: null, isLoading: false, canManage: false, isDev: false,
      isSupervisorOrAbove: false, hasMFA: false, mfaRequired: false,
      currentAAL: "aal1", role: "agente",
    });
  });

  afterEach(() => {
    guard.dispose();
    cleanup();
  });

  it("AdminRoute (loading) — sem warning de ref", () => {
    authState.isLoading = true;
    renderWithRoute(<AdminRoute />);
    guard.expectNoRefWarning("AdminRoute loading");
  });

  it("AdminRoute (sem user → Navigate /login) — sem warning de ref", () => {
    renderWithRoute(<AdminRoute />);
    guard.expectNoRefWarning("AdminRoute → /login");
  });

  it("AdminRoute (admin com MFA OK → Outlet) — sem warning de ref", () => {
    Object.assign(authState, {
      user: { id: "u1", email: "a@b.c" }, canManage: true,
      hasMFA: true, mfaRequired: true, currentAAL: "aal2",
    });
    renderWithRoute(<AdminRoute />);
    guard.expectNoRefWarning("AdminRoute outlet");
  });

  it("DevRoute (sem user → Navigate /login) — sem warning de ref", () => {
    renderWithRoute(<DevRoute />, "/dev");
    guard.expectNoRefWarning("DevRoute → /login");
  });

  it("DevRoute (não-dev → DevAccessDeniedPage) — sem warning de ref", () => {
    Object.assign(authState, {
      user: { id: "u1", email: "a@b.c" }, isDev: false, role: "agente",
    });
    renderWithRoute(<DevRoute />, "/dev");
    guard.expectNoRefWarning("DevRoute denied");
  });

  it("DevRoute (dev com MFA OK → Outlet) — sem warning de ref", () => {
    Object.assign(authState, {
      user: { id: "u1", email: "a@b.c" }, isDev: true,
      hasMFA: true, mfaRequired: true, currentAAL: "aal2", role: "dev",
    });
    renderWithRoute(<DevRoute />, "/dev");
    guard.expectNoRefWarning("DevRoute outlet");
  });

  it("ProtectedRoute (sem user → Navigate /login) — sem warning de ref", () => {
    renderWithRoute(<ProtectedRoute />, "/p");
    guard.expectNoRefWarning("ProtectedRoute redirect");
  });

  it("ProtectedRoute (autenticado → Outlet) — sem warning de ref", () => {
    Object.assign(authState, { user: { id: "u1", email: "a@b.c" } });
    renderWithRoute(<ProtectedRoute />, "/p");
    guard.expectNoRefWarning("ProtectedRoute outlet");
  });
});
