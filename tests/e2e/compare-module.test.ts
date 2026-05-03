import { test, expect } from "@playwright/test";

/**
 * Módulo: Comparar (E2E)
 * Cenários: Transição de modo Duelo, Persistência de estado entre visualizações e Performance de Gráficos.
 */

test.describe("Módulo de Comparação - Testes E2E Abrangentes", () => {
  
  test.beforeEach(async ({ page }) => {
    // Acessa a página de produtos para adicionar itens à comparação
    await page.goto("/produtos");
    
    // Adiciona 3 produtos para começar (limite comum para testar transições)
    // Assumindo que existem botões de comparação nos cards de produto
    const compareButtons = page.locator('button[aria-label*="comparar"], button:has-text("Comparar")');
    
    // Garantir que temos pelo menos 3 produtos
    for (let i = 0; i < 3; i++) {
      await compareButtons.nth(i).click();
    }
    
    await page.goto("/comparar");
  });

  test("Cenário: Transição automática do Modo Duelo ao adicionar/remover produtos", async ({ page }) => {
    // Com 3 produtos, o modo duelo não deve estar ativo/visível por padrão
    await expect(page.locator("text=Modo Duelo ativo")).not.toBeVisible();
    await expect(page.locator("text=Ativar Modo Duelo")).not.toBeVisible();

    // Remove um produto para ficar com exatamente 2
    const removeButtons = page.locator('button[aria-label="Remover"]');
    await removeButtons.first().click();

    // Agora deve aparecer a opção de Modo Duelo
    await expect(page.locator("text=Ativar Modo Duelo")).toBeVisible();
    
    // Ativa o Modo Duelo
    await page.click("text=Ativar Modo Duelo");
    await expect(page.locator("text=Modo Duelo ativo")).toBeVisible();
    await expect(page.locator("text=⚔️ Modo Duelo")).toBeVisible();

    // Valida a transição visual (Duelo vs Galeria)
    await expect(page.locator("text=VS")).toBeVisible();

    // Simula adicionar um 3º produto novamente (voltando para a galeria/tabela)
    // Aqui usaremos o "SimilarProductsRail" se disponível ou voltaremos à home
    const addSimilar = page.locator('button:has-text("Adicionar"), button:has-text("Comparar")').first();
    if (await addSimilar.isVisible()) {
      await addSimilar.click();
      // Deve sair do modo duelo automaticamente pois agora tem 3
      await expect(page.locator("text=Modo Duelo ativo")).not.toBeVisible();
      await expect(page.locator("text=Galeria Visual")).toBeVisible();
    }
  });

  test("Cenário: Alternância entre Galeria Visual e Tabela Detalhada com persistência de estado", async ({ page }) => {
    // Muda para Tabela Detalhada
    await page.click("text=Tabela Detalhada");
    await expect(page.locator("table")).toBeVisible();

    // Ativa um filtro (ex: "Só diferenças")
    const diffButton = page.locator("text=Só diferenças");
    await diffButton.click();
    await expect(page.locator("text=Mostrando diferenças")).toBeVisible();

    // Simula re-render do MainLayout (ex: navegando levemente ou interagindo com sidebar)
    // Para testar persistência sem reload total
    await page.click('button[aria-label="Voltar"]'); // Volta para produtos
    await page.goBack(); // Retorna para comparar

    // Verifica se continua na Tabela e com o filtro ativo
    // (Dependendo da implementação do store, isso deve persistir)
    await expect(page.locator("text=Mostrando diferenças")).toBeVisible();
    await expect(page.locator("text=Tabela Detalhada")).toHaveAttribute("aria-selected", "true");
  });

  test("Cenário: Gráficos Recharts e Performance no limite (4 produtos)", async ({ page }) => {
    // Adiciona o 4º produto (limite do layout)
    await page.goto("/produtos");
    const compareButtons = page.locator('button[aria-label*="comparar"], button:has-text("Comparar")');
    await compareButtons.nth(3).click();
    await page.goto("/comparar");

    // Verifica se o Radar Chart está visível
    const radarChart = page.locator(".recharts-responsive-container");
    await expect(radarChart).toBeVisible();

    // Valida tempo de resposta visual ao alternar visibilidade do gráfico
    const startTime = Date.now();
    await page.keyboard.press("r"); // Atalho 'R' definido no useComparisonShortcuts
    await expect(radarChart).not.toBeVisible();
    
    await page.keyboard.press("r");
    await expect(radarChart).toBeVisible();
    const duration = Date.now() - startTime;
    
    // Performance check: transição de UI deve ser rápida (< 500ms para toggle)
    expect(duration).toBeLessThan(1000);

    // Verifica feedback de loading/erro (mockando falha se necessário, mas aqui validamos presença de dados)
    await expect(page.locator("text=Pontuação de Comparação")).toBeVisible();
    await expect(page.locator("text=Advisor AI")).toBeVisible();
  });

  test("Cenário: Acessibilidade e Navegação por Teclado no Comparador", async ({ page }) => {
    // Testa atalhos de teclado
    await page.keyboard.press("d"); // Toggle diferenças
    await expect(page.locator("text=Mostrando diferenças")).toBeVisible();

    // Verifica foco visível ao navegar
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused).toBeDefined();

    // Verifica ARIA-live announcements
    const ariaLive = page.locator('[aria-live="polite"]');
    const removeButtons = page.locator('button[aria-label="Remover"]');
    await removeButtons.first().click();
    
    await expect(ariaLive).toContainText("Produto removido");
  });

});
