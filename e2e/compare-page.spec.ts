import { test, expect } from '@playwright/test';

test.describe('Módulo de Comparador de Produtos - E2E', () => {
  test('deve validar o fluxo "Adicionar à Arena" da página de detalhes', async ({ page }) => {
    // 1. Navegar para um produto específico (ID real do mock)
    await page.goto('/produto/26462');
    
    // 2. Verificar se o botão de adicionar à arena existe e clicar
    const arenaBtn = page.getByRole('button', { name: /Adicionar à Arena/i });
    await expect(arenaBtn).toBeVisible();
    await arenaBtn.click();

    // 3. Verificar toast de sucesso
    await expect(page.locator('text=adicionado ao comparador')).toBeVisible();

    // 4. Clicar no link "Ver agora" do toast ou navegar manualmente
    await page.goto('/comparar');

    // 5. Verificar se o produto está lá
    await expect(page.locator('text=Comparando 1 produto')).toBeVisible();
    
    // 6. Voltar para outro produto e adicionar também
    await page.goto('/produto/26463');
    await page.getByRole('button', { name: /Adicionar à Arena/i }).click();
    await page.goto('/comparar');

    // 7. Verificar se agora temos 2 e o Modo Duelo está disponível
    await expect(page.locator('text=Comparando 2 produtos')).toBeVisible();
    await expect(page.getByRole('button', { name: /Modo Duelo/i })).toBeVisible();
  });

  test('deve carregar mock de volume e persistir após recarregar', async ({ page }) => {
    await page.goto('/comparar');
    
    // Limpar se houver algo
    if (await page.getByRole('button', { name: /Limpar Tudo/i }).isVisible()) {
      await page.getByRole('button', { name: /Limpar Tudo/i }).click();
    }

    // Clicar no mock de volume (8 itens)
    await page.getByRole('button', { name: /Arena de Volume/i }).click();
    await expect(page.locator('text=Simulação concluída')).toBeVisible();

    // Verificar contagem
    await expect(page.locator('text=Comparando 8 produtos')).toBeVisible();

    // Recarregar página
    await page.reload();

    // Verificar se persistiu (via localStorage/Zustand)
    await expect(page.locator('text=Comparando 8 produtos')).toBeVisible();
    await expect(page.locator('text=Radar de Performance')).toBeVisible();
  });

  test('deve validar limites e duplicatas', async ({ page }) => {
    await page.goto('/comparar');
    await page.getByRole('button', { name: /Arena Rápida/i }).click();
    
    // Tentar adicionar o mesmo produto (ID 26462 já está no mock rápido)
    await page.goto('/produto/26462');
    await page.getByRole('button', { name: /Adicionar à Arena/i }).click();
    
    // Deve mostrar toast de info/erro duplicado
    await expect(page.locator('text=já está na lista')).toBeVisible();
  });
});

