import { test, expect } from "./fixtures/test-base";
import { loginAs } from "./helpers/auth";

test.describe("Lazy Loading Integrity", () => {
  test.beforeEach(async ({ page }) => {
    // Requires a logged in user to access protected routes
    await loginAs(page, "admin"); 
  });

  const routes = [
    "/orcamentos/novo",
    "/filtros",
    "/estoque",
    "/produtos",
    "/favoritos"
  ];

  for (const route of routes) {
    test(`Route ${route} should render without "Falha no Módulo"`, async ({ page }) => {
      await page.goto(route);
      
      // Wait for network idle or a specific selector to ensure loading started
      await page.waitForLoadState("networkidle");

      // Check if "Falha no Módulo" is present
      const failureText = page.getByText("Falha no Módulo");
      await expect(failureText).not.toBeVisible();
      
      // Also check for standard error indicators if any
      const errorText = page.getByText(/Erro ao carregar|Ocorreu um erro/i);
      await expect(errorText).not.toBeVisible();
    });
  }
});
