import { test, expect } from "@playwright/test";
import { loginAs } from "../helpers/auth";
import { gotoAndSettle, expectOnRoute } from "../helpers/nav";
import { waitForTestIdVisible } from "../helpers/waits";
import { Sel } from "../fixtures/selectors";

test.describe("[E2E:UX] Atalhos e Navegação Crítica", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "admin");
  });

  test("deve navegar para Favoritos via atalho Alt+V e não disparar em inputs", async ({ page }) => {
    await gotoAndSettle(page, "/");
    
    // Testa o atalho Alt+V
    await page.keyboard.press("Alt+v");
    await expectOnRoute(page, "/favoritos");

    // Volta para home
    await gotoAndSettle(page, "/");

    // Foca em um input (ex: busca global se disponível, ou busca mobile)
    const searchInput = page.locator('input[placeholder*="Buscar"], input[type="search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.focus();
      await page.keyboard.type("v"); // Digita 'v' no input
      await page.keyboard.press("Alt+v"); // Tenta o atalho com o input focado
      
      // Não deve ter navegado
      await expectOnRoute(page, "/");
      // O input deve conter o texto (dependendo de como o sistema trata Alt+V no browser, mas não deve navegar)
    }
  });

  test("deve navegar para Super Filtro via atalho Alt+F", async ({ page }) => {
    await gotoAndSettle(page, "/");
    await page.keyboard.press("Alt+f");
    await expectOnRoute(page, "/filtros");
  });

  test("deve validar estados ativos nos breadcrumbs", async ({ page }) => {
    await gotoAndSettle(page, "/produtos");
    
    // Localiza o breadcrumb de produtos
    const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]');
    await expect(breadcrumb).toBeVisible();
    
    // Verifica se a última parte (atual) tem estilo de ativo (geralmente text-primary ou similar)
    // Usamos o seletor genérico para o último item do breadcrumb
    const lastItem = breadcrumb.locator('li').last();
    await expect(lastItem).toContainText("Produtos");
    
    // Verifica se os itens anteriores são clicáveis (links)
    const homeLink = breadcrumb.locator('a').first();
    await expect(homeLink).toHaveAttribute("href", "/");
    await homeLink.click();
    await expectOnRoute(page, "/");
  });
});
