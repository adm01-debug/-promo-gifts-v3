import { test, expect } from '@playwright/test';

test.describe('Módulo de Novidades - Ações e Acessibilidade', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/novidades');
    // Esperar pelo grid de produtos
    await page.waitForSelector('[data-testid^="novelty-card-"]', { timeout: 15000 });
  });

  test('deve adicionar um produto à comparação e persistir após refresh', async ({ page }) => {
    const firstCard = page.locator('[data-testid^="novelty-card-"]').first();
    await firstCard.hover();

    const compareButton = page.getByLabel(/Adicionar à comparação/i).first();
    await compareButton.click();
    
    // Verifica se o label mudou para indicar que está na comparação
    await expect(compareButton).toHaveAttribute('aria-label', /Remover da comparação/i);

    await page.reload();
    await page.waitForSelector('[data-testid^="novelty-card-"]');
    await page.locator('[data-testid^="novelty-card-"]').first().hover();
    await expect(page.getByLabel(/Remover da comparação/i).first()).toBeVisible();
  });

  test('deve favoritar e desfavoritar um produto e persistir após refresh', async ({ page }) => {
    const firstCard = page.locator('[data-testid^="novelty-card-"]').first();
    await firstCard.hover();

    const favButton = page.getByTestId('product-card-favorite').first();
    
    // Garante que está desfavoritado inicialmente
    const isInitiallyFavorited = await favButton.getAttribute('aria-pressed') === 'true';
    if (isInitiallyFavorited) {
      await favButton.click();
      await expect(favButton).toHaveAttribute('aria-pressed', 'false');
    }

    // Favoritar
    await favButton.click();
    await expect(favButton).toHaveAttribute('aria-pressed', 'true');
    await page.reload();
    await page.waitForSelector('[data-testid^="novelty-card-"]');
    await page.locator('[data-testid^="novelty-card-"]').first().hover();
    await expect(page.getByTestId('product-card-favorite').first()).toHaveAttribute('aria-pressed', 'true');

    // Desfavoritar
    const favButtonAfter = page.getByTestId('product-card-favorite').first();
    await favButtonAfter.click();
    await expect(favButtonAfter).toHaveAttribute('aria-pressed', 'false');
    await page.reload();
    await page.waitForSelector('[data-testid^="novelty-card-"]');
    await page.locator('[data-testid^="novelty-card-"]').first().hover();
    await expect(page.getByTestId('product-card-favorite').first()).toHaveAttribute('aria-pressed', 'false');
  });

  test('deve abrir quick view em modo mobile e persistir ações após refresh', async ({ page }) => {
    // Definir viewport mobile
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    
    const firstCard = page.locator('[data-testid^="novelty-card-"]').first();
    // Em mobile as ações podem estar visíveis ou requerer clique no FAB
    const fabTrigger = page.getByTestId('product-card-actions-toggle').first();
    await fabTrigger.click();

    await page.getByTestId('product-card-quickview').first().click();
    
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    // Ação dentro do Quick View: Favoritar
    const modalFav = modal.getByTestId('product-favorite');
    await modalFav.click();
    await expect(modalFav).toHaveAttribute('aria-pressed', 'true');

    await page.reload();
    // Após refresh o modal fecha, mas o estado deve persistir no card
    await page.waitForSelector('[data-testid^="novelty-card-"]');
    const fabTriggerAfter = page.getByTestId('product-card-actions-toggle').first();
    await fabTriggerAfter.click();
    await expect(page.getByTestId('product-card-favorite').first()).toHaveAttribute('aria-pressed', 'true');
  });

  test('deve validar aria-labels e navegação por teclado sem armadilhas', async ({ page }) => {
    const firstCard = page.locator('[data-testid^="novelty-card-"]').first();
    await firstCard.hover();

    const favButton = page.getByTestId('product-card-favorite').first();
    const compareButton = page.getByLabel(/Adicionar à comparação/i).first();
    const quickViewButton = page.getByTestId('product-card-quickview').first();

    await expect(favButton).toHaveAttribute('aria-label', /favoritos/i);
    await expect(quickViewButton).toHaveAttribute('aria-label', /Visualização Rápida/i);

    // Teste de foco: Tab deve percorrer os botões de ação se estiverem abertos
    await page.getByTestId('product-card-actions-toggle').first().click();
    await page.keyboard.press('Tab');
    // Verifica se o foco está em algum dos botões de ação (aproximado)
    const focusedTag = await page.evaluate(() => document.activeElement?.tagName);
    expect(['BUTTON', 'A']).toContain(focusedTag);
  });
});
