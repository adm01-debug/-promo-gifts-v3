import { test, expect } from "./fixtures/test-base";
import { loginAs } from "./helpers/auth";

test.describe("Admin and Tools Navigation @smoke", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "admin"); 
  });

  const adminRoutes = [
    "/admin/usuarios",
    "/admin/seguranca",
    "/admin/telemetria",
    "/admin/design-tokens",
  ];

  const toolsRoutes = [
    "/ferramentas/mockup",
    "/ferramentas/magic-up",
    "/ferramentas/simulador",
    "/montar-kit",
  ];

  for (const route of [...adminRoutes, ...toolsRoutes]) {
    test(`Route ${route} should load successfully without "Falha no Módulo"`, async ({ page }) => {
      await page.goto(route);
      
      // Wait for network idle to ensure lazy chunks loaded
      await page.waitForLoadState("networkidle");

      // Check for module failure message
      const failureText = page.getByText("Falha no Módulo");
      await expect(failureText).not.toBeVisible();
      
      // Verify main content structure is present
      const mainContent = page.locator("main, #root > div");
      await expect(mainContent).toBeVisible();
      
      // Ensure no blank page
      const bodyText = await page.innerText("body");
      expect(bodyText.trim().length).toBeGreaterThan(0);
    });
  }
});
