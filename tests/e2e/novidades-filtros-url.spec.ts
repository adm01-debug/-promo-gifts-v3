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

  test('deve atualizar KPIs corretamente ao mudar filtros e busca', async ({ page }) => {
    // Captura o valor inicial de um KPI (ex: Novidades Ativas)
    const activeKpi = page.locator('p', { hasText: /Novidades Ativas/i }).locator('..').locator('p').first();
    const initialValue = await activeKpi.innerText();

    // Aplica filtro de fornecedor
    const supplierSelect = page.locator('button').filter({ hasText: /Fornecedor/i });
    await supplierSelect.click();
    await page.getByRole('option').nth(1).click(); // Seleciona o primeiro fornecedor da lista

    // Espera o loading terminar e o valor mudar
    await expect(activeKpi).not.toHaveText(initialValue, { timeout: 10000 });
    
    // Faz uma busca que deve zerar ou reduzir drasticamente os KPIs
    const searchInput = page.getByPlaceholder(/Buscar novidades/i);
    await searchInput.fill('PRODUTO_INEXISTENTE_XYZ');
    
    await expect(activeKpi).toHaveText('0');
  });

  test('deve normalizar URL em casos de borda (página inexistente)', async ({ page }) => {
    // Navega para uma página absurda
    await page.goto('/novidades?page=999');
    
    // Verifica se a URL foi corrigida para a última página disponível ou se o grid mostra vazio de forma elegante
    // O componente NoveltyProductGrid tem um useEffect que normaliza o currentPage
    await expect(page).not.toHaveURL(/page=999/, { timeout: 10000 });
  });

  test('deve normalizar filtros com valores inválidos', async ({ page }) => {
    // Status inexistente
    await page.goto('/novidades?status=invalid_status_xyz');
    
    // O grid deve ignorar o filtro inválido e mostrar produtos ativos (default)
    await expect(page.locator('[data-testid^="novelty-card-"]').first()).toBeVisible();
    
    // Busca vazia não deve afetar a listagem
    await page.goto('/novidades?q=');
    await expect(page.locator('[data-testid^="novelty-card-"]').first()).toBeVisible();
    
    // Status 'all' deve mostrar todos
    await page.goto('/novidades?status=all');
    await expect(page.locator('[data-testid^="novelty-card-"]').first()).toBeVisible();
  });
});

