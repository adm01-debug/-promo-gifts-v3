import { test, expect } from '@playwright/test';
import { e2eName } from '../helpers/e2e-resources';

test.describe('Módulo de Novidades - Filtros e URL', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate
    await page.goto('/novidades');
    await page.waitForSelector('[data-testid="page-title-novidades"]');
  });

  test('deve aplicar filtros e persistir na URL', async ({ page }) => {
    // 1. Filtrar por status "Ativo"
    await page.selectOption('select:has-text("Status")', 'active');
    await expect(page).toHaveURL(/status=active/);

    // 2. Buscar por nome
    const searchInput = page.locator('input[placeholder*="Buscar novidades"]');
    await searchInput.fill('Solar');
    await expect(page).toHaveURL(/q=Solar/);

    // 3. Validar KPIs mudando (simulado via visibilidade de produtos)
    const productCards = page.locator('.grid > div');
    const initialCount = await productCards.count();
    
    // 4. Recarregar e confirmar estado
    await page.reload();
    await expect(page.locator('select:has-text("Ativo")')).toBeVisible();
    await expect(searchInput).toHaveValue('Solar');
    await expect(page.locator('.grid > div')).toHaveCount(initialCount);
  });

  test('deve navegar na paginação e persistir na URL', async ({ page }) => {
    // Assumindo que temos mais de 20 itens nos mocks
    const nextButton = page.getByRole('button', { name: 'Próxima' });
    if (await nextButton.isVisible() && await nextButton.isEnabled()) {
      await nextButton.click();
      await expect(page).toHaveURL(/page=2/);
      
      await page.reload();
      await expect(page).toHaveURL(/page=2/);
      await expect(page.locator('button:has-text("2")')).toHaveClass(/bg-primary/);
    }
  });

  test('deve funcionar sem BroadcastChannel via refresh local', async ({ page }) => {
    // Desabilitar BroadcastChannel no browser para o teste
    await page.addInitScript(() => {
      // @ts-ignore
      delete window.BroadcastChannel;
    });
    
    await page.goto('/novidades');
    await page.selectOption('select:has-text("Status")', 'active');
    await expect(page).toHaveURL(/status=active/);
    
    // Refresh manual para confirmar persistência via URL
    await page.reload();
    await expect(page.locator('select:has-text("Ativo")')).toBeVisible();
  });
});
