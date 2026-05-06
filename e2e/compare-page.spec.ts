import { test, expect } from '@playwright/test';

test.describe('Módulo de Comparador de Produtos - E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navega para a página do comparador
    await page.goto('/comparar');
  });

  test('deve carregar mocks e exibir o Radar e Score', async ({ page }) => {
    // Clica no botão de Mock Rápido (3 itens)
    const mockBtn = page.getByRole('button', { name: /Mock Rápido/i });
    await expect(mockBtn).toBeVisible();
    await mockBtn.click();

    // Verifica se os toasts de loading apareceram e sumiram
    await expect(page.locator('text=produtos carregados')).toBeVisible();

    // Verifica se o título da página está correto
    await expect(page.getByTestId('page-title-comparador')).toBeVisible();

    // Verifica se o Score Card está visível
    await expect(page.locator('text=Recomendado')).toBeVisible();

    // Verifica se o Radar Chart está renderizado (geralmente um SVG ou canvas)
    // Procuramos pelo container ou texto dentro dele
    await expect(page.locator('text=Radar de Atributos')).toBeVisible();
  });

  test('deve validar o Modo Duelo com 2 produtos', async ({ page }) => {
    // Carrega o mock
    await page.getByRole('button', { name: /Mock Rápido/i }).click();
    
    // Remove um produto para sobrar 2 (Modo Duelo exige 2)
    const removeButtons = page.locator('button[aria-label="Remover"]');
    await removeButtons.first().click();
    
    // Verifica se o botão de Modo Duelo aparece
    const duelBtn = page.getByRole('button', { name: /Modo Duelo/i });
    await expect(duelBtn).toBeVisible();
    
    // Ativa o Modo Duelo se não estiver ativo
    const isActive = await duelBtn.innerText();
    if (isActive.includes('Ativar')) {
      await duelBtn.click();
    }
    
    // Verifica se a visualização de duelo está visível (ex: Swords icon ou layout específico)
    await expect(page.locator('text=Duelo 1v1 Disponível')).toBeVisible();
  });

  test('deve limpar a comparação e voltar ao estado vazio', async ({ page }) => {
    // Carrega mock
    await page.getByRole('button', { name: /Mock Rápido/i }).click();
    
    // Clica em Limpar Tudo
    await page.getByRole('button', { name: /Limpar Tudo/i }).click();
    
    // Verifica toast
    await expect(page.locator('text=Comparação limpa')).toBeVisible();
    
    // Deve estar de volta no empty state
    await expect(page.locator('text=Selecione pelo menos 2 produtos')).toBeVisible();
  });
});
