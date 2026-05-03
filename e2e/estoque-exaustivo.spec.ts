import { test, expect } from '@playwright/test';

/**
 * Módulo: Dashboard de Estoque
 * Objetivo: Testes E2E exaustivos cobrindo funcionalidades de monitoramento, 
 * filtros avançados, alertas, integração de estoque e análise de risco.
 */

test.describe('Módulo Dashboard de Estoque - Testes Exaustivos', () => {
  test.beforeEach(async ({ page }) => {
    // Navega para a página de estoque
    await page.goto('/estoque');
    
    // Aguarda o carregamento inicial (skeleton desaparece)
    // O componente StockDashboard mostra um skeleton enquanto isLoading é true
    await page.waitForSelector('[aria-busy="true"]', { state: 'hidden', timeout: 30000 });
  });

  test('Deve carregar a estrutura básica do dashboard corretamente', async ({ page }) => {
    // Título e SEO
    await expect(page).toHaveTitle(/Estoque/i);
    await expect(page.getByRole('heading', { name: 'Visão Geral' })).toBeVisible();
    
    // Badge de Saúde do Estoque
    await expect(page.locator('text=/Saúde:/i')).toBeVisible();
    
    // Grid de sumário (KPIs)
    const summaryCards = ['Total de Produtos', 'Em Estoque', 'Estoque Baixo', 'Sem Estoque', 'Estoque Futuro'];
    for (const card of summaryCards) {
      await expect(page.locator(`text=${card}`)).toBeVisible();
    }
    
    // Tabela de estoque
    await expect(page.locator('text=/Estoque por Cor/Variação/i')).toBeVisible();
    
    // Verificação de colunas da tabela
    const tableHeaders = ['Produto', 'Em Estoque', 'Disponível', 'Status'];
    for (const header of tableHeaders) {
      await expect(page.getByRole('columnheader', { name: header })).toBeVisible();
    }
  });

  test('Deve alternar filtros rápidos através dos cards de sumário', async ({ page }) => {
    // Filtro: Em Estoque
    await page.click('text=/Em Estoque/i');
    await expect(page.locator('text=/Filtro ativo: Em Estoque/i')).toBeVisible();
    
    // Filtro: Sem Estoque
    await page.click('text=/Sem Estoque/i');
    await expect(page.locator('text=/Filtro ativo: Sem Estoque/i')).toBeVisible();
    
    // Verifica se o badge de "Filtro ativo" pode ser removido
    await page.locator('button[aria-label="Remover filtro"]').click();
    await expect(page.locator('text=/Filtro ativo:/i')).not.toBeVisible();
    
    // Filtro: Estoque Futuro
    await page.click('text=/Estoque Futuro/i');
    await expect(page.locator('text=/Filtro ativo: Estoque Futuro/i')).toBeVisible();
  });

  test('Deve abrir e interagir com filtros avançados', async ({ page }) => {
    const filtersButton = page.getByRole('button', { name: /Filtros/i });
    await filtersButton.click();
    
    // Verifica se o popover abriu
    await expect(page.locator('text=/Filtros Avançados/i')).toBeVisible();
    
    // Testa filtro de Fornecedores
    const supplierSection = page.locator('button:has-text("Fornecedores")');
    await supplierSection.click();
    
    const supplierSelect = page.getByRole('combobox').filter({ hasText: 'Todos os fornecedores' });
    if (await supplierSelect.isVisible()) {
      await supplierSelect.click();
      // Seleciona a primeira opção (não-Todos)
      const options = page.getByRole('option');
      if (await options.count() > 1) {
        const firstOptionText = await options.nth(1).innerText();
        await options.nth(1).click();
        
        // Verifica se o badge de filtro apareceu na toolbar (fora do popover)
        await page.keyboard.press('Escape'); // Fecha popover
        await expect(page.locator(`.animate-in >> text=${firstOptionText.split(' (')[0]}`)).toBeVisible();
      }
    }
  });

  test('Deve buscar produtos por texto (Nome, SKU ou Cor)', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/Buscar produto, SKU ou cor.../i);
    
    // Pega um nome real da tabela para testar
    const firstRow = page.locator('table tr').nth(1);
    const productName = await firstRow.locator('.font-medium').first().innerText();
    
    await searchInput.fill(productName);
    await page.waitForTimeout(500); // Aguarda debounce
    
    // Verifica se todos os resultados contém o termo buscado
    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      // Ignora linhas de variante (que tem bg-muted/30)
      const isVariant = await rows.nth(i).evaluate(el => el.classList.contains('bg-muted/30'));
      if (!isVariant) {
        const text = await rows.nth(i).innerText();
        expect(text.toLowerCase()).toContain(productName.toLowerCase());
      }
    }
  });

  test('Deve expandir linhas para ver estoque por cor/variante', async ({ page }) => {
    const expandButton = page.locator('table button[aria-label^="Expandir"]').first();
    
    if (await expandButton.isVisible()) {
      await expandButton.click();
      
      // Verifica se a linha de variante (nested) apareceu
      const variantRow = page.locator('table tr.bg-muted\\/30');
      await expect(variantRow.first()).toBeVisible();
      
      // Verifica conteúdo da variante (SKU da variante)
      await expect(variantRow.first().locator('.font-mono')).toBeVisible();
      
      // Recolhe
      await page.locator('table button[aria-label^="Recolher"]').first().click();
      await expect(variantRow.first()).not.toBeAttached();
    }
  });

  test('Deve testar o atalho de teclado para atualização', async ({ page }) => {
    // Ctrl+Shift+R
    await page.keyboard.press('Control+Shift+R');
    
    // Verifica toast de sucesso/atualização
    await expect(page.locator('text=/Atualizando estoque/i')).toBeVisible();
  });

  test('Deve verificar o Painel de Risco do Fornecedor', async ({ page }) => {
    const riskPanelToggle = page.locator('button:has-text("Painel de Risco do Fornecedor")');
    await expect(riskPanelToggle).toBeVisible();
    
    // O painel geralmente inicia aberto ou fechado. Vamos garantir que abre.
    const riskContent = page.locator('text=/Análise de Ruptura e Giro/i');
    
    if (!(await riskContent.isVisible())) {
      await riskPanelToggle.click();
    }
    
    await expect(riskContent).toBeVisible();
    
    // Verifica elementos do painel de risco
    await expect(page.locator('text=/Risco de Ruptura/i')).toBeVisible();
    await expect(page.locator('text=/Giro de Estoque/i')).toBeVisible();
  });

  test('Deve permitir exportar dados filtrados para CSV', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /Exportar/i });
    
    // Só testa se o botão não estiver desabilitado (pode estar desabilitado se não houver produtos)
    if (await exportButton.isEnabled()) {
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        exportButton.click(),
      ]);
      
      expect(download.suggestedFilename()).toContain('estoque_');
      expect(download.suggestedFilename()).toContain('.csv');
    }
  });

  test('Deve responder ao filtro de tiragem (quantidade necessária)', async ({ page }) => {
    const quantityInput = page.getByPlaceholder(/Preciso de X un.../i);
    
    // Define uma quantidade alta para filtrar a maioria
    await quantityInput.fill('99999');
    await page.waitForTimeout(600); // Debounce longo (500ms no código)
    
    // Verifica se o badge de filtro apareceu
    await expect(page.locator('text=/≥ 99999 un/i')).toBeVisible();
    
    // Verifica se o número de produtos filtrados diminuiu (ou se a tabela está vazia se nada tiver 99k)
    const filteredText = await page.locator('text=/de \\d+ produtos/i').first().innerText();
    // Ex: "0 de 450 produtos" ou algo assim
    expect(filteredText).toMatch(/^0 de \d+/); 
  });
});
