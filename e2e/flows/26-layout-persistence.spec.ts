import { test, expect } from "@playwright/test";
import { loginAs } from "../helpers/auth";
import { gotoAndSettle, expectOnRoute } from "../helpers/nav";
import { Sel } from "../fixtures/selectors";

test.describe("[E2E:Layout] Validação de Layout Global Fixo", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "admin");
  });

  const ROUTES_TO_TEST = [
    "/",
    "/produtos",
    "/favoritos",
    "/orcamentos",
    "/meus-kits",
    "/admin/usuarios",
    "/ferramentas/mockup-generator",
    "/status"
  ];

  for (const route of ROUTES_TO_TEST) {
    test(`deve garantir que Header, Sidebar e Breadcrumb estão fixos e visíveis em: ${route}`, async ({ page }) => {
      await gotoAndSettle(page, route);

      // 1. Validar visibilidade
      const header = page.locator(Sel.app.layout.header);
      const sidebar = page.locator('[data-tour="sidebar"]');
      const breadcrumb = page.locator(Sel.app.layout.breadcrumbBar);

      await expect(header, `Header deveria estar visível em ${route}`).toBeVisible();
      await expect(sidebar, `Sidebar deveria estar visível em ${route}`).toBeVisible();
      
      // Breadcrumb não aparece na home
      if (route !== "/") {
        await expect(breadcrumb, `Breadcrumb deveria estar visível em ${route}`).toBeVisible();
      }

      // 2. Validar que são FIXOS/STICKY (não somem ao scroll)
      // Faz scroll para baixo
      await page.evaluate(() => window.scrollTo(0, 1000));
      await page.waitForTimeout(200); // Pequena espera para estabilizar scroll

      // Verifica se o Header ainda está no topo da viewport (getBoundingClientRect.top ~ 0)
      const headerBox = await header.boundingBox();
      expect(headerBox?.y, `Header deveria estar no topo após scroll em ${route}`).toBeCloseTo(0, 1);

      // Sidebar deve continuar visível e ocupando a lateral
      const sidebarBox = await sidebar.boundingBox();
      expect(sidebarBox?.x, `Sidebar deveria estar na esquerda após scroll em ${route}`).toBeCloseTo(0, 1);

      if (route !== "/") {
        // Breadcrumb é sticky, deve estar logo abaixo do header
        const breadcrumbBox = await breadcrumb.boundingBox();
        const headerHeight = headerBox?.height || 56;
        expect(breadcrumbBox?.y, `Breadcrumb deveria estar fixo abaixo do Header em ${route}`).toBeCloseTo(headerHeight, 1);
      }
    });
  }

  test("deve garantir que modais fiquem SEMPRE à frente do Header (z-index check)", async ({ page }) => {
    await gotoAndSettle(page, "/");
    
    // Abre um modal qualquer (ex: Perfil do usuário ou busca rápida)
    // Vamos usar a busca rápida que é um overlay global (GlobalCommandBar)
    await page.keyboard.press("Control+k");
    
    // O command bar deve aparecer
    const commandBar = page.locator('[role="dialog"], [data-radix-popper-content-wrapper]').first();
    await expect(commandBar).toBeVisible();

    // Verifica se o overlay do modal está acima do header
    // No Playwright, podemos checar se um ponto no modal está "clickable" ou usar evaluate para comparar z-index
    const zIndexes = await page.evaluate(() => {
      const getZ = (el: Element | null) => el ? parseInt(window.getComputedStyle(el).zIndex) || 0 : 0;
      return {
        header: getZ(document.querySelector('[data-testid="app-header"]')),
        overlay: getZ(document.querySelector('[role="dialog"]')?.parentElement || null),
      };
    });

    // Se o modal estiver usando Radix Portal, ele geralmente tem z-index alto (50+)
    // Nosso header agora é 10.
    expect(zIndexes.overlay, "O modal/overlay deveria ter z-index maior que o Header").toBeGreaterThan(zIndexes.header);
  });
});
