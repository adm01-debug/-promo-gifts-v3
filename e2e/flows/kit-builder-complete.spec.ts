import { test, expect } from "../fixtures/test-base";
import { requireAuth } from "../fixtures/test-base";
import { gotoAndSettle } from "../helpers/nav";
import { e2eName } from "../fixtures/test-user";
import { TID } from "../fixtures/selectors";

test.describe("Fluxo: Kit Builder Completo", () => {
  test.beforeEach(async ({ page }) => {
    requireAuth();
    await gotoAndSettle(page, "/kit-builder");
  });

  test("deve criar, editar e remover itens no Kit Builder", async ({ page }) => {
    const kitName = e2eName("kit-teste");

    // 1. Iniciar criação de kit
    await page.locator(TID("kit-builder-start-btn")).click();
    await expect(page.locator(TID("kit-builder-wizard"))).toBeVisible();

    // 2. Passo 1: Informações Básicas
    await page.locator(TID("kit-name-input")).fill(kitName);
    await page.locator(TID("kit-next-step-btn")).click();

    // 3. Passo 2: Seleção de Produtos
    // Adicionar primeiro produto
    await page.locator(TID("kit-add-product-btn")).first().click();
    await expect(page.locator(TID("kit-selected-items-count"))).toHaveText("1");

    // Adicionar segundo produto
    await page.locator(TID("kit-add-product-btn")).nth(1).click();
    await expect(page.locator(TID("kit-selected-items-count"))).toHaveText("2");

    // 4. Editar item
    const firstItemQty = page.locator(TID("kit-item-qty-input")).first();
    await firstItemQty.fill("10");
    await expect(firstItemQty).toHaveValue("10");

    // 5. Remover item
    await page.locator(TID("kit-remove-item-btn")).first().click();
    await expect(page.locator(TID("kit-selected-items-count"))).toHaveText("1");

    // 6. Validar Resumo Final
    await page.locator(TID("kit-next-step-btn")).click(); // Vai para o resumo
    await expect(page.locator(TID("kit-summary-title"))).toBeVisible();
    await expect(page.getByText(kitName)).toBeVisible();

    // 7. Salvar e validar sucesso
    await page.locator(TID("kit-save-btn")).click();
    await expect(page.locator(TID("kit-success-toast"))).toBeVisible();
  });

  test("deve validar campos obrigatórios e estados de erro", async ({ page }) => {
    await page.locator(TID("kit-builder-start-btn")).click();
    
    // Tentar avançar sem nome
    await page.locator(TID("kit-next-step-btn")).click();
    await expect(page.getByText(/nome do kit é obrigatório/i)).toBeVisible();

    // Preencher nome e avançar
    await page.locator(TID("kit-name-input")).fill("Validacao Erro");
    await page.locator(TID("kit-next-step-btn")).click();

    // Tentar avançar sem produtos
    await page.locator(TID("kit-next-step-btn")).click();
    await expect(page.getByText(/adicione pelo menos um produto/i)).toBeVisible();
  });
});
