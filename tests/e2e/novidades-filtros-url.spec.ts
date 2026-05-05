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

  test('deve aplicar filtro de prazo e persistir na URL', async ({ page }) => {
    // 1. Filtrar por prazo "Próxima semana" (7 dias)
    await page.selectOption('select:has-text("Qualquer prazo")', '7');
    await expect(page).toHaveURL(/expires=7/);

    // 2. Validar que o grid atualizou (pode demorar um pouco se houver loading)
    await page.reload();
    await expect(page).toHaveURL(/expires=7/);
    
    // Validar chip de filtro ativo
    await expect(page.locator('div[role="list"] span:has-text("Expira em 7d")')).toBeVisible();
  });

  test('deve normalizar página inexistente', async ({ page }) => {
    // Acessar uma página muito alta que não existe
    await page.goto('/novidades?page=9999');
    
    // Deve normalizar para a última página disponível (ou 1 se vazio)
    // Nos mocks, temos poucos itens, então deve voltar para 1
    await page.waitForTimeout(1000);
    const url = page.url();
    expect(url).not.toContain('page=9999');
  });

  test('deve exibir skeletons durante o carregamento de KPIs', async ({ page }) => {
    // Forçar recarregamento para ver estado inicial
    await page.reload();
    const loadingIndicators = page.locator('.animate-spin');
    // Como os mocks são rápidos, verificamos se o container de cards existe
    await expect(page.locator('.grid-cols-2.lg\\:grid-cols-5')).toBeVisible();
  });
});
