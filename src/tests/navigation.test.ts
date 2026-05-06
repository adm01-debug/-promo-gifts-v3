import { test, expect } from '@playwright/test';

test.describe('Navigation Redirects', () => {
  test('should redirect /mockup-generator to /ferramentas/mockup-generator', async ({ page }) => {
    await page.goto('/mockup-generator');
    await expect(page).toHaveURL(/\/ferramentas\/mockup-generator/);
  });

  test('should redirect /simulador to /ferramentas/simulador-wizard', async ({ page }) => {
    await page.goto('/simulador');
    await expect(page).toHaveURL(/\/ferramentas\/simulador-wizard/);
  });

  test('should redirect /montar-kit to /ferramentas/kit-builder', async ({ page }) => {
    await page.goto('/montar-kit');
    await expect(page).toHaveURL(/\/ferramentas\/kit-builder/);
  });

  test('should redirect /meus-kits to /ferramentas/kit-library', async ({ page }) => {
    await page.goto('/meus-kits');
    await expect(page).toHaveURL(/\/ferramentas\/kit-library/);
  });

  test('should redirect /busca-preco to /ferramentas/busca-avancada-preco', async ({ page }) => {
    await page.goto('/busca-preco');
    await expect(page).toHaveURL(/\/ferramentas\/busca-avancada-preco/);
  });
});
