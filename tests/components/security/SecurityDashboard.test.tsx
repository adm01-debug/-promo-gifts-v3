/**
 * Render tests for SecurityDashboard (680 lines)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderWithProviders } from "../render-helpers";
import React from "react";

vi.mock("@/hooks/use2FA", () => ({
  use2FA: vi.fn().mockReturnValue({
    is2FAEnabled: false,
    isLoading: false,
    enable2FA: vi.fn(),
    disable2FA: vi.fn(),
    verify2FA: vi.fn(),
    qrCodeUrl: null,
    secret: null,
  }),
}));

vi.mock("@/hooks/useAllowedIPs", () => ({
  useAllowedIPs: vi.fn().mockReturnValue({
    allowedIPs: [],
    isLoading: false,
    addIP: vi.fn(),
    removeIP: vi.fn(),
  }),
}));

vi.mock("@/components/security/TwoFactorSetup", () => ({
  TwoFactorSetup: () => <div data-testid="2fa-setup" />,
}));

vi.mock("@/components/security/IPRestrictionManager", () => ({
  IPRestrictionManager: () => <div data-testid="ip-manager" />,
}));

vi.mock("@/components/security/GeoBlockingManager", () => ({
  GeoBlockingManager: () => <div data-testid="geo-manager" />,
}));

vi.mock("@/components/auth/KnownDevicesManager", () => ({
  KnownDevicesManager: () => <div data-testid="devices-manager" />,
}));

vi.mock("@/components/security/PasskeyManager", () => ({
  PasskeyManager: () => <div data-testid="passkey-manager" />,
}));

vi.mock("@/components/security/PushNotificationSettings", () => ({
  PushNotificationSettings: () => <div data-testid="push-settings" />,
}));

describe("SecurityDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", async () => {
    const { SecurityDashboard } = await import("@/components/security/SecurityDashboard");
    renderWithProviders(<SecurityDashboard />);
    expect(document.body).toBeTruthy();
  });
});
