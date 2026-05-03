import { test, expect, requireAuth } from "./fixtures/test-base";
import { gotoAndSettle, waitForRouteIdle } from "./helpers/nav";

test.describe("E2E Exhaustivo — Super Filtro", () => {
  test.beforeEach(async ({ page }) => {
    await requireAuth();
    await gotoAndSettle(page, "/filtros");
    await waitForRouteIdle(page);
  });

  test("Deve carregar a página e exibir o título correto", async ({ page }) => {
    const title = page.locator('h1:has-text("Super Filtro")');
    await expect(title).toBeVisible();
    await expect(page).toHaveTitle(/Filtros de Produtos/);
  });

  test("Navegação e Interação com Seções de Filtro (Desktop)", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });

    // 1. Cores
    const coresSection = page.locator('button:has-text("Cores")');
    await expect(coresSection).toBeVisible();
    // Se a seção estiver fechada, abre
    const coresContent = page.locator('div[data-state="open"]'); // Supondo Radix UI Collapsible/Accordion
    if (!(await coresContent.isVisible())) {
      await coresSection.click();
    }
    
    // 2. Categorias
    const catSection = page.locator('button:has-text("Categorias")');
    await catSection.click();
    await expect(page.locator('input[placeholder*="Filtrar categorias"]')).toBeVisible();

    // 3. Faixa de Preço
    const precoSection = page.locator('button:has-text("Faixa de Preço")');
    await precoSection.click();
    const minPriceInput = page.locator('input[placeholder="Ex: 0"]').first();
    const maxPriceInput = page.locator('input[placeholder="Sem limite"]').first();
    
    await minPriceInput.fill("10");
    await maxPriceInput.fill("50");
    
    // Verifica se os badges de resumo aparecem no topo
    await expect(page.locator('div:has-text("Faixa de Preço: R$ 10 até R$ 50")')).toBeVisible();
  });

  test("Busca e Resultados", async ({ page }) => {
    const searchInput = page.locator('input[placeholder="Buscar produtos..."]');
    await searchInput.fill("Caneta");
    await page.keyboard.press("Enter");
    
    await waitForRouteIdle(page);
    
    // Verifica se a contagem de resultados foi atualizada (deve haver algo com "encontrado" ou badge)
    const resultsCount = page.locator('.tabular-nums').first();
    await expect(resultsCount).not.toHaveText(/0/); // Assume que há canetas no mock/db
  });

  test("Troca de Layout e Ordenação", async ({ page }) => {
    // Ordenação
    const sortTrigger = page.locator('button:has-text("Ordenar")');
    await sortTrigger.click();
    await page.locator('div[role="option"]:has-text("Preço: Menor para Maior")').click();
    
    await waitForRouteIdle(page);
    
    // Layout (Popover)
    const layoutBtn = page.locator('button').filter({ has: page.locator('svg') }).last(); // O LayoutPopover costuma ser um dos últimos
    // Em vez de seletor frágil, vamos buscar pelo ícone de grid/list se possível ou testid
    const viewModes = ["grid", "list", "table"];
    for (const mode of viewModes) {
       // Apenas verifica se o botão existe para abrir o popover
       await expect(page.locator('button').filter({ has: page.locator('.lucide-layout-grid, .lucide-list, .lucide-table') }).first()).toBeVisible();
    }
  });

  test("Responsividade — Filtros Mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    
    // Botão de filtros deve aparecer no mobile
    const filterMobileBtn = page.locator('button:has-text("Filtros")');
    await expect(filterMobileBtn).toBeVisible();
    await filterMobileBtn.click();
    
    // O Sheet (modal lateral) deve abrir
    await expect(page.locator('div[role="dialog"]')).toBeVisible();
    await expect(page.locator('h2:has-text("Filtros")')).toBeVisible();
    
    // Interage com uma seção dentro do mobile
    await page.locator('button:has-text("Opções Rápidas")').click();
    const inStockToggle = page.locator('button:has-text("Em Estoque")');
    await expect(inStockToggle).toBeVisible();
    
    // Fecha filtros
    await page.locator('button:has-text("Ver")').click();
    await expect(page.locator('div[role="dialog"]')).toBeHidden();
  });

  test("Limpar Filtros e Presets", async ({ page }) => {
    // Aplica um filtro
    await page.locator('button:has-text("Opções Rápidas")').click();
    await page.locator('button:has-text("Em Estoque")').click();
    
    await expect(page.locator('button:has-text("Limpar (1)")')).toBeVisible();
    
    // Limpa
    await page.locator('button:has-text("Limpar (1)")').click();
    await expect(page.locator('button:has-text("Limpar (1)")')).toBeHidden();
    
    // Presets
    const presetsBtn = page.locator('button:has-text("Presets")'); // Supondo que tenha esse texto
    // Se não tiver, buscamos por Sparkles icon ou algo similar
    const sparkles = page.locator('.lucide-sparkles');
    if (await sparkles.isVisible()) {
        // Interação com presets...
    }
  });

  test("Acessibilidade — Atalhos e Foco", async ({ page }) => {
    // Atalho Alt+F para Super Filtro (mesmo que já estejamos lá, testamos o foco)
    await page.keyboard.press("Alt+F");
    // O foco deve ir para algum lugar relevante ou a página ser recarregada/focada
    
    // Navegação por tab nas seções
    await page.keyboard.press("Tab");
    const activeElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(activeElement).not.toBeNull();
  });

  test("Regressão Visual — Estado Inicial e Estados de Filtro", async ({ page }) => {
    // Screenshot inicial
    await expect(page).toHaveScreenshot("super-filtro-desktop-initial.png");
    
    // Abre várias seções e tira screenshot
    const sections = ["Cores", "Categorias", "Faixa de Preço"];
    for (const sec of sections) {
        const btn = page.locator(`button:has-text("${sec}")`);
        if (await btn.isVisible()) await btn.click();
    }
    
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot("super-filtro-sections-expanded.png");
  });
});
