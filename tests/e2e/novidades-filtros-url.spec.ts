import { test, expect } from '@playwright/test';

test.describe('Módulo de Novidades - Ações, Persistência e Acessibilidade', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/novidades');
    // Esperar pelo grid de produtos
    await page.waitForSelector('[data-testid^="novelty-card-"]', { timeout: 15000 });
  });

  test('deve adicionar um produto à comparação e persistir após refresh', async ({ page }) => {
    const firstCard = page.locator('[data-testid^="novelty-card-"]').first();
    
    // Abre o menu de ações rápidas
    await firstCard.getByTestId('product-card-actions-toggle').click();
    
    const compareButton = page.getByLabel(/Adicionar à comparação/i).first();
    await compareButton.click();
    
    // Verifica se o label mudou para indicar que está na comparação
    await expect(compareButton).toHaveAttribute('aria-label', /Remover da comparação/i);

    // Recarrega a página
    await page.reload();
    await page.waitForSelector('[data-testid^="novelty-card-"]');
    
    // Reabre o menu para verificar o estado
    await page.locator('[data-testid^="novelty-card-"]').first().getByTestId('product-card-actions-toggle').click();
    await expect(page.getByLabel(/Remover da comparação/i).first()).toBeVisible();
  });

  test('deve favoritar e desfavoritar um produto e persistir após refresh', async ({ page }) => {
    const firstCard = page.locator('[data-testid^="novelty-card-"]').first();
    await firstCard.getByTestId('product-card-actions-toggle').click();

    const favButton = page.getByTestId('product-card-favorite').first();
    
    // Favoritar
    await favButton.click();
    await expect(favButton).toHaveAttribute('aria-pressed', 'true');
    
    await page.reload();
    await page.waitForSelector('[data-testid^="novelty-card-"]');
    await page.locator('[data-testid^="novelty-card-"]').first().getByTestId('product-card-actions-toggle').click();
    await expect(page.getByTestId('product-card-favorite').first()).toHaveAttribute('aria-pressed', 'true');

    // Desfavoritar
    await page.getByTestId('product-card-favorite').first().click();
    await expect(page.getByTestId('product-card-favorite').first()).toHaveAttribute('aria-pressed', 'false');
    
    await page.reload();
    await page.waitForSelector('[data-testid^="novelty-card-"]');
    await page.locator('[data-testid^="novelty-card-"]').first().getByTestId('product-card-actions-toggle').click();
    await expect(page.getByTestId('product-card-favorite').first()).toHaveAttribute('aria-pressed', 'false');
  });

  test('deve abrir quick view em modo mobile e persistir ações após refresh', async ({ page }) => {
    // Definir viewport mobile
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await page.waitForSelector('[data-testid^="novelty-card-"]');
    
    const fabTrigger = page.getByTestId('product-card-actions-toggle').first();
    await fabTrigger.click();

    await page.getByTestId('product-card-quickview').first().click();
    
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    // Ação dentro do Quick View: Favoritar
    // O modal do Quick View usa data-testid="product-favorite"
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
    await firstCard.getByTestId('product-card-actions-toggle').click();

    const favButton = page.getByTestId('product-card-favorite').first();
    const quickViewButton = page.getByTestId('product-card-quickview').first();

    await expect(favButton).toHaveAttribute('aria-label', /favoritos/i);
    await expect(quickViewButton).toHaveAttribute('aria-label', /Visualização Rápida/i);

    // Teste de navegação por teclado
    await page.keyboard.press('Tab');
    const focusedTag = await page.evaluate(() => document.activeElement?.tagName);
    expect(['BUTTON', 'A', 'INPUT']).toContain(focusedTag);
    
    // ESC deve fechar o menu de ações
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('product-card-actions-toggle').first()).toHaveAttribute('aria-expanded', 'false');
  });

  test('deve persistir ordenação (sortMode) na URL e após refresh', async ({ page }) => {
    // Seleciona ordenação por preço crescente
    const sortSelect = page.locator('button').filter({ hasText: /Ordenar/i });
    await sortSelect.click();
    await page.getByRole('option', { name: /Menor preço/i }).or(page.getByRole('option', { name: /Preço: Menor/i })).click();

    // Verifica URL
    await expect(page).toHaveURL(/sort=price-asc/);

    // Refresh
    await page.reload();
    await page.waitForSelector('[data-testid^="novelty-card-"]');
    
    // Verifica se a URL mantém o parâmetro
    await expect(page).toHaveURL(/sort=price-asc/);
  });
});
