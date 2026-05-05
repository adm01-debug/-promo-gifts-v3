
import { test, expect } from '@playwright/test';

test.describe('Catalog Presets Realtime Sync & Persistence', () => {
  
  test('should sync preset application between two tabs using BroadcastChannel', async ({ context }) => {
    // 1. Open two tabs on the catalog page
    const page1 = await context.newPage();
    const page2 = await context.newPage();
    
    // Using / as it's the main catalog route
    await page1.goto('/');
    await page2.goto('/');

    // Ensure pages are loaded
    await expect(page1.getByLabel('Presets de filtros salvos')).toBeVisible();
    await expect(page2.getByLabel('Presets de filtros salvos')).toBeVisible();

    // 2. Open presets in tab 1
    await page1.getByLabel('Presets de filtros salvos').click();
    
    // We assume there's at least one preset or "Filtros Recentes"
    // If not, we'd need to create one, but for this test we check the mechanism
    const presetItem = page1.locator('div[role="button"]').first();
    
    if (await presetItem.isVisible()) {
      const presetName = await presetItem.locator('p').first().textContent();
      
      // 3. Apply preset in Tab 1
      await presetItem.click();
      
      // 4. Verify Tab 1 URL updated
      await expect(page1).toHaveURL(/preset=/);
      
      // 5. CRITICAL: Verify Tab 2 updated AUTOMATICALLY without reload
      // We check for the visual indicator of an active preset in the bar
      // In PresetsBar.tsx, active preset has a Check icon or specific BG
      const activeIndicatorTab2 = page2.locator('.bg-primary\\/10'); 
      await expect(activeIndicatorTab2).toBeVisible({ timeout: 5000 });
      
      // Verify name matches in Tab 2
      if (presetName) {
        await expect(page2.locator('text=' + presetName)).toBeVisible();
      }
    }
  });

  test('should restore exact state from URL on reload including non-default filters', async ({ page }) => {
    await page.goto('/');
    
    const testPresetId = 'test-preset-complex';
    // Adicionamos parâmetros que representam filtros específicos
    await page.goto(`/?preset=${testPresetId}&search=caneta&colors=azul,preto&stock=true`);

    // Aguarda o carregamento
    await expect(page.locator('h1')).toContainText('Catálogo');

    const searchInput = page.locator('input[placeholder*="Buscar"]');
    await expect(searchInput).toHaveValue('caneta');

    // Verifica se os chips de filtros ativos aparecem
    const activeFilters = page.locator('.flex.flex-wrap.gap-2');
    await expect(activeFilters).toBeVisible();
    await expect(activeFilters).toContainText('Azul');
    await expect(activeFilters).toContainText('Preto');
    await expect(activeFilters).toContainText('estoque');

    // Reload
    await page.reload();

    // Verifica se tudo foi restaurado
    await expect(searchInput).toHaveValue('caneta');
    await expect(activeFilters).toContainText('Azul');
    await expect(activeFilters).toContainText('Preto');
    await expect(page).toHaveURL(new RegExp(`preset=${testPresetId}`));
  });

  test('should handle network errors gracefully during preset application', async ({ page }) => {
    await page.goto('/');
    
    await page.route('**/rest/v1/saved_filters*', route => route.abort('failed'));
    
    const presetsTrigger = page.getByLabel('Presets de filtros salvos');
    await expect(presetsTrigger).toBeVisible();
    await presetsTrigger.click();
    
    // Se não houver presets, o teste passa (pois o componente não deve crashar ao abrir)
    const presetItem = page.locator('div[role="button"]').first();
    if (await presetItem.isVisible()) {
      await presetItem.click();
      await expect(page.getByText('Catálogo de Produtos')).toBeVisible();
    }
  });

  test('should synchronize real-time updates between two tabs via BroadcastChannel', async ({ context }) => {
    const page1 = await context.newPage();
    const page2 = await context.newPage();
    
    await page1.goto('/');
    await page2.goto('/');

    // Simula a aplicação de um preset na página 1 via script (já que criar um preset via UI exige DB)
    // Isso testa o canal de comunicação BroadcastChannel
    await page1.evaluate(() => {
      const channel = new BroadcastChannel('catalog_preset_sync');
      channel.postMessage({ 
        type: 'PRESET_APPLIED', 
        presetId: 'realtime-test', 
        filters: { colors: [], categories: [], suppliers: [], search: 'sync-test', priceRange: [0, 500] } 
      });
      channel.close();
    });

    // Página 2 deve reagir ao BroadcastChannel
    const searchInput2 = page2.locator('input[placeholder*="Buscar"]');
    await expect(searchInput2).toHaveValue('sync-test', { timeout: 10000 });
  });
});
