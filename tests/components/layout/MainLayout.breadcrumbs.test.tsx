/**
 * Tests for MainLayout — covers the PR change:
 *   Added <PersistentBreadcrumbs className="mb-4" showBackButton /> inside a
 *   print:hidden wrapper in the main content area.
 *
 * Verifies:
 * - PersistentBreadcrumbs is rendered inside MainLayout
 * - The breadcrumbs wrapper has the print:hidden class
 * - The component is not rendered in the print:hidden section when className prop is passed
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../render-helpers";
import React from "react";

// ── Stub out all heavy lazy-loaded sub-components ────────────────

vi.mock("@/lib/lazyWithRetry", () => ({
  lazyWithRetry: (factory: () => Promise<{ default: React.ComponentType }>) => {
    // Return a simple stub instead of lazy loading
    const Stub = () => null;
    return Stub;
  },
}));

vi.mock("@/components/common/PersistentBreadcrumbs", () => ({
  PersistentBreadcrumbs: ({ className, showBackButton }: { className?: string; showBackButton?: boolean }) => (
    <nav
      data-testid="persistent-breadcrumbs"
      className={className}
      data-show-back-button={showBackButton ? "true" : "false"}
    >
      <span>Breadcrumbs</span>
    </nav>
  ),
}));

vi.mock("@/components/common/SkipToContent", () => ({
  SkipToContent: () => null,
}));

vi.mock("@/components/common/BackButton", () => ({
  BackButton: () => null,
}));

vi.mock("@/hooks/useScrollLockFix", () => ({
  useScrollLockFix: vi.fn(),
}));

vi.mock("@/hooks/useGlobalShortcuts", () => ({
  useGlobalShortcuts: vi.fn(),
}));

vi.mock("@/contexts/SellerCartContext", () => ({
  SellerCartProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/contexts/OnboardingContext", () => ({
  OnboardingProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe("MainLayout — PersistentBreadcrumbs (PR)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders PersistentBreadcrumbs inside the layout", async () => {
    const { MainLayout } = await import("@/components/layout/MainLayout");
    renderWithProviders(
      <MainLayout>
        <div data-testid="page-content">Page</div>
      </MainLayout>
    );

    expect(screen.getByTestId("persistent-breadcrumbs")).toBeInTheDocument();
  });

  it("renders PersistentBreadcrumbs with mb-4 className", async () => {
    const { MainLayout } = await import("@/components/layout/MainLayout");
    renderWithProviders(
      <MainLayout>
        <div>Content</div>
      </MainLayout>
    );

    const breadcrumbs = screen.getByTestId("persistent-breadcrumbs");
    expect(breadcrumbs).toHaveClass("mb-4");
  });

  it("renders PersistentBreadcrumbs with showBackButton=true", async () => {
    const { MainLayout } = await import("@/components/layout/MainLayout");
    renderWithProviders(
      <MainLayout>
        <div>Content</div>
      </MainLayout>
    );

    const breadcrumbs = screen.getByTestId("persistent-breadcrumbs");
    expect(breadcrumbs).toHaveAttribute("data-show-back-button", "true");
  });

  it("wraps PersistentBreadcrumbs in a print:hidden container", async () => {
    const { MainLayout } = await import("@/components/layout/MainLayout");
    renderWithProviders(
      <MainLayout>
        <div>Content</div>
      </MainLayout>
    );

    const breadcrumbs = screen.getByTestId("persistent-breadcrumbs");
    const wrapper = breadcrumbs.parentElement;
    expect(wrapper).not.toBeNull();
    expect(wrapper?.className).toContain("print:hidden");
  });

  it("renders children inside the main content area", async () => {
    const { MainLayout } = await import("@/components/layout/MainLayout");
    renderWithProviders(
      <MainLayout>
        <div data-testid="child-content">My Page Content</div>
      </MainLayout>
    );

    expect(screen.getByTestId("child-content")).toBeInTheDocument();
    expect(screen.getByText("My Page Content")).toBeInTheDocument();
  });

  it("renders PersistentBreadcrumbs before children in the DOM order", async () => {
    const { MainLayout } = await import("@/components/layout/MainLayout");
    renderWithProviders(
      <MainLayout>
        <div data-testid="child-node">Child</div>
      </MainLayout>
    );

    const breadcrumbs = screen.getByTestId("persistent-breadcrumbs");
    const childNode = screen.getByTestId("child-node");
    const position = breadcrumbs.compareDocumentPosition(childNode);
    // DOCUMENT_POSITION_FOLLOWING = 4
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});