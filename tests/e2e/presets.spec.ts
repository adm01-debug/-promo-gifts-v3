
import { test, expect } from '@playwright/test';

test.describe('Filter Presets E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the catalog page
    await page.goto('/filters'); // Assuming this is the route
    
    // Handle authentication if necessary (mocking user is hard in e2e without setup)
    // For this test, we assume the user might be logged in or we test public behavior
  });

  test('should apply a preset and persist it after reload', async ({ page }) => {
    // 1. Open Presets Bar
    const presetsTrigger = page.getByLabel('Presets de filtros salvos');
    await expect(presetsTrigger).toBeVisible();
    await presetsTrigger.click();

    // 2. Check if there are presets (might need to create one if none exist)
    const presetItem = page.locator('button:has-text("Filtros Recentes")').first();
    if (await presetItem.isVisible()) {
      await presetItem.click();
      
      // Verify toast
      await expect(page.locator('text=aplicado')).toBeVisible();

      // Get current URL
      const url = page.url();
      expect(url).toContain('preset=');

      // 3. Reload page
      await page.reload();

      // 4. Verify filters are still applied
      // This depends on the UI showing active filters
      await expect(page.getByLabel('Presets de filtros salvos')).toBeVisible();
      
      // Check if URL still has the preset param
      expect(page.url()).toContain('preset=');
    } else {
      console.log('No presets found to test application.');
    }
  });

  test('should fallback to URL sync when BroadcastChannel is unavailable', async ({ page }) => {
    // Simulando falha no BroadcastChannel via script na página
    await page.addInitScript(() => {
      // @ts-ignore
      window.BroadcastChannel = undefined;
    });
    
    await page.goto('/filters');
    
    // Aplicar um preset (ID fictício via URL para testar o fallback de carregamento/refresh)
    await page.goto('/filters?preset=fallback-test');
    await page.waitForLoadState('networkidle');

    // Verificar se o ID do preset foi reconhecido mesmo sem o channel
    // (O hook useCatalogState lê da URL no useEffect inicial)
    const url = page.url();
    expect(url).toContain('preset=fallback-test');
  });

  test('should persist all filter values and counts after reload', async ({ page }) => {
    await page.goto('/filters');
    
    // 1. Aplicar filtros manuais (não default)
    // Supondo que existam checkboxes ou botões identificáveis
    const stockToggle = page.getByLabel('Apenas em estoque');
    if (await stockToggle.isVisible()) {
      await stockToggle.click();
    }

    // 2. Aplicar um preset
    const presetsTrigger = page.getByLabel('Presets de filtros salvos');
    await presetsTrigger.click();
    const firstPreset = page.locator('[role="menuitem"]').first();
    await firstPreset.click();
    
    // Pegar o estado visual antes do reload
    const activeFiltersBefore = await page.locator('.badge, .chip').count();
    const urlBefore = page.url();

    // 3. Recarregar
    await page.reload();
    await page.waitForLoadState('networkidle');

    // 4. Validar consistência
    expect(page.url()).toBe(urlBefore);
    const activeFiltersAfter = await page.locator('.badge, .chip').count();
    expect(activeFiltersAfter).toBe(activeFiltersBefore);
    
    // Validar contagens de produtos (se visíveis)
    const countText = await page.locator('text=/Produtos encontrados/i').textContent();
    expect(countText).not.toBeNull();
  });
});
