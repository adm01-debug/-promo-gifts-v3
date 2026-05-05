import { test, expect } from "@playwright/test";
import { loginAs } from "../helpers/auth";
import { gotoAndSettle, expectOnRoute } from "../helpers/nav";
import { Sel } from "../fixtures/selectors";

test.describe("[E2E:Catalog] Blindagem de Navegação em Ações Rápidas", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "admin");
  });

  test("deve clicar em ações rápidas sem navegar para a PDP no Grid", async ({ page }) => {
    await gotoAndSettle(page, "/produtos");

    // Localiza o primeiro card de produto
    const card = page.locator(Sel.product.card).first();
    await expect(card).toBeVisible();

    // 1. Abrir FAB de ações rápidas
    const toggle = card.locator(Sel.product.actionsToggle);
    await toggle.click();
    
    // Verifica se as ações expandiram
    await expect(toggle).toHaveAttribute("data-actions-open", "true");
    
    // Não deve ter navegado
    await expectOnRoute(page, "/produtos");

    // 2. Clicar em Favoritar
    const favBtn = card.locator(Sel.product.favorite).first();
    await favBtn.click();
    
    // Verificamos apenas se a URL continua a mesma (PDP não abriu)
    await expectOnRoute(page, "/produtos");

    // 3. Clicar em Visualização Rápida (Eye icon)
    const quickViewBtn = card.locator('[data-testid="product-card-quickview"]').first();
    if (await quickViewBtn.isVisible()) {
      await quickViewBtn.click();
      // O diálogo de quickview deve abrir
      await expect(page.locator('[role="dialog"]')).toBeVisible();
      // Não deve ter navegado para PDP
      await expectOnRoute(page, "/produtos");
      
      // Fecha o diálogo para continuar
      await page.keyboard.press("Escape");
    }
  });

  test("deve suportar seleção em massa clicando no card sem abrir PDP", async ({ page }) => {
    await gotoAndSettle(page, "/produtos");

    // Ativa modo de seleção
    const selectToggle = page.locator('[aria-label="Ativar modo de seleção em massa"]');
    await selectToggle.click();

    // Localiza o primeiro card
    const card = page.locator(Sel.product.card).first();
    await expect(card).toBeVisible();

    // Clica no card inteiro
    await card.click();

    // Verifica se o card foi selecionado (ring de seleção ou badge de contagem)
    const badge = page.locator('[data-testid="product-card-quick-add"]').isHidden(); // Apenas check de sanidade
    
    // O ponto principal: NÃO deve ter navegado
    await expectOnRoute(page, "/produtos");
    
    // Verifica se o contador de selecionados aumentou
    const selectedBadge = page.locator('.bg-destructive.text-destructive-foreground').first();
    await expect(selectedBadge).toBeVisible();
    await expect(selectedBadge).toContainText("1");
  });

  test("deve trocar variante de cor via carrossel sem abrir PDP", async ({ page }) => {
    await gotoAndSettle(page, "/produtos");

    // Localiza um card que tenha múltiplos pontos de cor (carrossel)
    const cardWithColors = page.locator('[role="tablist"][aria-label*="Variantes de cor"]').first().locator('..');
    if (!(await cardWithColors.count())) {
      test.skip(true, "Nenhum produto com múltiplas cores encontrado no catálogo");
    }

    const firstColorDot = cardWithColors.locator('[role="tab"]').first();
    const secondColorDot = cardWithColors.locator('[role="tab"]').nth(1);

    // Clica no segundo ponto de cor
    if (await secondColorDot.isVisible()) {
      await secondColorDot.click();
      
      // Não deve ter navegado
      await expectOnRoute(page, "/produtos");
      
      // O ponto clicado deve estar selecionado
      await expect(secondColorDot).toHaveAttribute("aria-selected", "true");
    }
  });
});
