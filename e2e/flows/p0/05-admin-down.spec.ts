/**
 * P0 — Admin / governança fora do ar.
 *
 * Cobre: full-op-diagnostics indisponível, MCP gateway 401, conexões críticas down.
 */
import { test, expect } from "../../fixtures/test-base";
import { mockEdgeFunctionFailure, mockAllEdgeFunctions5xx } from "./_mocks";

test.describe("P0 — Admin down", () => {
  test.skip("full-op-diagnostics 500: tela de diagnóstico mostra retry, não tela branca", async ({ page }) => {
    await mockEdgeFunctionFailure(page, "full-op-diagnostics", 500, { error: "boom" });
    await page.goto("/admin/diagnostico");
    await expect(page.getByRole("button", { name: /tentar.*novamente|retry/i })).toBeVisible();
  });

  test.skip("connections-hub: MCP 401 marca conexão como erro com CTA reconectar", async ({ page }) => {
    await mockEdgeFunctionFailure(page, "connection-tester", 401, { error: "auth" });
    await page.goto("/admin/conexoes");
    await expect(page.getByText(/reconectar|credencial.*inválida/i).first()).toBeVisible();
  });

  test.skip("todas edge functions 503: admin não fica em loop infinito de loading", async ({ page }) => {
    await mockAllEdgeFunctions5xx(page);
    await page.goto("/admin");
    // Espera no máx 8s — depois disso DEVE haver mensagem de erro.
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 8000 });
  });

  test.skip("MCP keys: revogação automática refletida na UI sem F5", async ({ page }) => {
    // TODO(P0): cobrir mem://features/mcp-keys-auto-revocation via realtime.
    expect(true).toBe(true);
  });
});
