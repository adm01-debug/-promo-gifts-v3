import { test, expect } from '@playwright/test';

test.describe('Módulo de Novidades - Ações e Acessibilidade', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/novidades');
    // Esperar pelo grid de produtos
    await page.waitForSelector('[data-testid^="novelty-card-"]', { timeout: 15000 });
  });

  test('deve favoritar um produto e persistir após refresh', async ({ page }) => {
    const firstCard = page.locator('[data-testid^="novelty-card-"]').first();
    await firstCard.hover();

    const favButton = page.getByTestId('product-card-favorite').first();
    const isInitiallyFavorited = await favButton.getAttribute('aria-pressed') === 'true';

    // Clicar para favoritar (ou desfavoritar e favoritar de novo para garantir)
    await favButton.click();
    await expect(favButton).toHaveAttribute('aria-pressed', isInitiallyFavorited ? 'false' : 'true');

    if (isInitiallyFavorited) {
      await favButton.click(); // Volta a ser favorito
    }

    await page.reload();
    await page.waitForSelector('[data-testid^="novelty-card-"]');
    await page.locator('[data-testid^="novelty-card-"]').first().hover();
    await expect(page.getByTestId('product-card-favorite').first()).toHaveAttribute('aria-pressed', 'true');
  });

  test('deve abrir quick view e validar acessibilidade do teclado', async ({ page }) => {
    const firstCard = page.locator('[data-testid^="novelty-card-"]').first();
    await firstCard.hover();

    await page.getByTestId('product-card-quickview').first().click();
    
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await expect(modal.getByTestId('product-quickview-name')).toBeVisible();

    // Fechar com ESC
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });

  test('filtros devem ter labels de acessibilidade', async ({ page }) => {
    await expect(page.getByLabel('Filtrar por status')).toBeVisible();
    await expect(page.getByLabel('Filtrar por fornecedor')).toBeVisible();
    await expect(page.getByLabel('Filtrar por categoria')).toBeVisible();
    await expect(page.getByLabel('Filtrar por prazo de expiração')).toBeVisible();
  });
});
