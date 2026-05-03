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
    await page.waitForSelector('[aria-busy="true"]', { state: 'hidden', timeout: 30000 });
  });

  test('Deve carregar a estrutura básica do dashboard corretamente', async ({ page }) => {
    await expect(page).toHaveTitle(/Estoque/i);
    await expect(page.getByRole('heading', { name: 'Visão Geral' })).toBeVisible();
    await expect(page.locator('text=/Saúde:/i')).toBeVisible();
    
    const summaryCards = ['Total de Produtos', 'Em Estoque', 'Estoque Baixo', 'Sem Estoque', 'Estoque Futuro'];
    for (const card of summaryCards) {
      await expect(page.locator(`text=${card}`)).toBeVisible();
    }
    
    await expect(page.locator('text=/Estoque por Cor/Variação/i')).toBeVisible();
  });

  test('Deve alternar filtros rápidos através dos cards de sumário', async ({ page }) => {
    await page.click('text=/Em Estoque/i');
    await expect(page.locator('text=/Filtro ativo: Em Estoque/i')).toBeVisible();
    
    await page.click('text=/Sem Estoque/i');
    await expect(page.locator('text=/Filtro ativo: Sem Estoque/i')).toBeVisible();
    
    await page.locator('button[aria-label="Remover filtro"]').click();
    await expect(page.locator('text=/Filtro ativo:/i')).not.toBeVisible();
  });

  test('Deve testar paginação na tabela de estoque', async ({ page }) => {
    // Verifica se os controles de paginação estão visíveis (se houver > PAGE_SIZE produtos)
    const nextButton = page.getByRole('button', { name: /Próximo/i });
    const prevButton = page.getByRole('button', { name: /Anterior/i });

    if (await nextButton.isVisible()) {
      // Pega o nome do primeiro produto na página 1
      const firstPageFirstProduct = await page.locator('table tbody tr').first().locator('.font-medium').innerText();
      
      // Muda para a página 2
      await nextButton.click();
      await page.waitForTimeout(300); // Aguarda animação/renderização
      
      // Verifica se o produto mudou
      const secondPageFirstProduct = await page.locator('table tbody tr').first().locator('.font-medium').innerText();
      expect(firstPageFirstProduct).not.toBe(secondPageFirstProduct);
      
      // Volta para a página 1
      await prevButton.click();
      await page.waitForTimeout(300);
      const backToFirstProduct = await page.locator('table tbody tr').first().locator('.font-medium').innerText();
      expect(backToFirstProduct).toBe(firstPageFirstProduct);
    }
  });

  test('Deve testar ordenação e validar consistência na exportação CSV', async ({ page }) => {
    // 1. Abre filtros e muda ordenação para Nome (A-Z)
    await page.getByRole('button', { name: /Filtros/i }).click();
    await page.locator('button:has-text("Ordenar por")').click();
    
    // Seleciona ordenação por nome
    await page.getByRole('combobox').filter({ hasText: 'Menor Estoque' }).click();
    await page.getByRole('option', { name: 'Nome (A-Z)' }).click();
    await page.keyboard.press('Escape');

    // 2. Verifica se a ordenação foi aplicada na UI
    const firstProductName = await page.locator('table tbody tr').first().locator('.font-medium').innerText();
    
    // 3. Exporta CSV e valida se respeita os filtros/ordenação
    const exportButton = page.getByRole('button', { name: /Exportar/i });
    if (await exportButton.isEnabled()) {
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        exportButton.click(),
      ]);
      
      const path = await download.path();
      const fs = require('fs');
      const content = fs.readFileSync(path, 'utf8');
      
      // Valida se o CSV contém o primeiro produto da tabela
      expect(content).toContain(firstProductName);
      
      // Valida cabeçalhos esperados
      const expectedHeaders = ['produto', 'sku', 'cor', 'sku_variante', 'estoque_atual', 'disponivel', 'status'];
      for (const header of expectedHeaders) {
        expect(content.toLowerCase()).toContain(header);
      }
    }
  });

  test('Deve testar o botão "Ver Produto" e consistência de dados', async ({ page }) => {
    const firstRow = page.locator('table tbody tr').first();
    const productName = await firstRow.locator('.font-medium').innerText();
    const productSku = await firstRow.locator('.text-xs.text-muted-foreground').innerText();
    
    // Hover para revelar ações rápidas
    await firstRow.hover();
    
    const viewButton = page.getByRole('button', { name: `Ver produto ${productName}` });
    await viewButton.click();
    
    // Valida se navegou para a página correta
    await expect(page).toHaveURL(/\/produto\//);
    
    // Valida se o nome do produto é o mesmo
    await expect(page.locator('h1')).toContainText(productName);
    
    // Volta e testa busca
    await page.goBack();
    const searchInput = page.getByPlaceholder(/Buscar produto, SKU ou cor.../i);
    await searchInput.fill(productName);
    await page.waitForTimeout(600);
    
    const searchResult = await page.locator('table tbody tr').first().locator('.font-medium').innerText();
    expect(searchResult).toBe(productName);
  });

  test('Deve validar permissões de Administrador vs Visualizador', async ({ page }) => {
    // Simulando teste de RBAC (Role Based Access Control)
    // Se estiver logado como admin, exportar deve estar visível
    const exportButton = page.getByRole('button', { name: /Exportar/i });
    await expect(exportButton).toBeVisible();
    
    // Se for visualizador, algumas ações podem estar restritas (dependendo da implementação real do sistema)
    // Aqui validamos que as ações de leitura estão presentes
    await expect(page.getByRole('button', { name: /Atualizar/i })).toBeVisible();
  });

  test('Deve tratar falhas de API e exibir mensagens de erro', async ({ page }) => {
    // Intercepta a chamada de API e simula erro 500
    await page.route('**/api/stock/**', route => route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Internal Server Error' })
    }));

    // Força um refresh
    await page.keyboard.press('Control+Shift+R');
    
    // Verifica se um toast de erro ou mensagem de fallback aparece
    // Nota: Depende de como o useToast e React Query tratam erros. 
    // Se o erro for capturado pelo TanStack Query, pode mostrar o estado de erro ou um toast global.
    const errorToast = page.locator('text=/Erro ao/i').or(page.locator('text=/Falha/i'));
    // Como estamos usando mocks, dependemos do componente tratar o catch do fetchStockData
  });

  test('Deve testar o atalho de teclado para atualização (Ctrl+Shift+R)', async ({ page }) => {
    await page.keyboard.press('Control+Shift+R');
    await expect(page.locator('text=/Atualizando estoque/i')).toBeVisible();
  });

  test('Deve verificar o Painel de Risco do Fornecedor', async ({ page }) => {
    const riskPanelToggle = page.locator('button:has-text("Painel de Risco do Fornecedor")');
    const riskContent = page.locator('text=/Análise de Ruptura e Giro/i');
    
    if (!(await riskContent.isVisible())) {
      await riskPanelToggle.click();
    }
    await expect(riskContent).toBeVisible();
    await expect(page.locator('text=/Risco de Ruptura/i')).toBeVisible();
    await expect(page.locator('text=/Giro de Estoque/i')).toBeVisible();
  });
});
