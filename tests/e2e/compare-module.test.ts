import { test, expect } from "@playwright/test";

/**
 * Módulo: Comparar (E2E)
 * Cenários: Transição de modo Duelo, Persistência de estado entre visualizações e Performance de Gráficos.
 */

test.describe("Módulo de Comparação - Testes E2E Detalhados", () => {
  
  test.beforeEach(async ({ page }) => {
    // Acessa a página principal de produtos
    await page.goto("/produtos");
    
    // Adiciona 2 produtos à comparação para habilitar o módulo
    const compareButtons = page.locator('button[aria-label*="comparar"], button:has-text("Comparar")');
    await compareButtons.nth(0).click();
    await compareButtons.nth(1).click();
    
    // Vai para a página de comparação
    await page.goto("/comparar");
  });

  test("Cenário: Transição automática do Modo Duelo ao adicionar um 3º produto", async ({ page }) => {
    // Com 2 produtos, o Modo Duelo deve estar disponível ou ativo por padrão
    await expect(page.locator("text=Modo Duelo ativo").or(page.locator("text=Ativar Modo Duelo"))).toBeVisible();

    // Adiciona um 3º produto a partir da rail de similares ou voltando à home
    // No preview, usaremos a navegação para garantir o estado
    await page.goto("/produtos");
    const compareButtons = page.locator('button[aria-label*="comparar"], button:has-text("Comparar")');
    await compareButtons.nth(2).click();
    
    await page.goto("/comparar");

    // Com 3 produtos, o Modo Duelo deve desaparecer automaticamente (transição UI)
    await expect(page.locator("text=Modo Duelo ativo")).not.toBeVisible();
    await expect(page.locator("text=Galeria Visual")).toBeVisible();
    await expect(page.locator("text=Tabela Detalhada")).toBeVisible();
    
    // Agora remove o 3º produto para ver se volta o Modo Duelo
    const removeButtons = page.locator('button[aria-label="Remover"]');
    await removeButtons.last().click();
    
    await expect(page.locator("text=Ativar Modo Duelo").or(page.locator("text=Modo Duelo ativo"))).toBeVisible();
  });

  test("Cenário: Alternância entre Galeria Visual e Tabela Detalhada com re-render", async ({ page }) => {
    // Muda para Tabela Detalhada
    await page.click("text=Tabela Detalhada");
    await expect(page.locator("table")).toBeVisible();

    // Ativa filtro de diferenças
    await page.click("text=Só diferenças");
    await expect(page.locator("text=Mostrando diferenças")).toBeVisible();

    // Simula interação que causa re-render no MainLayout (ex: abrir menu lateral)
    // Se o estado estiver no store global (Zustand), ele deve persistir
    await page.reload(); 

    await expect(page.locator("text=Mostrando diferenças")).toBeVisible();
    // Verifica se a aba 'Tabela Detalhada' ainda está ativa (via atributo data-state ou aria-selected)
    const tableTab = page.locator('button[role="tab"]:has-text("Tabela Detalhada")');
    await expect(tableTab).toHaveAttribute("data-state", "active");
  });

  test("Cenário: Performance e Feedback do Radar Chart (Recharts)", async ({ page }) => {
    // Adiciona o máximo de produtos suportados (4)
    await page.goto("/produtos");
    const compareButtons = page.locator('button[aria-label*="comparar"], button:has-text("Comparar")');
    await compareButtons.nth(2).click();
    await compareButtons.nth(3).click();
    await page.goto("/comparar");

    // Verifica presença do gráfico
    const radarContainer = page.locator(".recharts-responsive-container");
    await expect(radarContainer).toBeVisible();

    // Testa atalho de teclado 'R' para toggle rápido
    const startTime = Date.now();
    await page.keyboard.press("r");
    await expect(radarContainer).not.toBeVisible();
    const duration = Date.now() - startTime;
    
    // Performance: Ocultar o gráfico deve ser instantâneo na UI
    expect(duration).toBeLessThan(500);

    // Valida que o Advisor AI está processando/exibindo dados
    await expect(page.locator("text=Advisor AI").or(page.locator("text=Recomendação da IA"))).toBeVisible();
  });

  test("Cenário: Acessibilidade e Toast de Feedback", async ({ page }) => {
    // Verifica ARIA-live message ao remover produto
    const ariaLive = page.locator('[aria-live="polite"]');
    const removeButtons = page.locator('button[aria-label="Remover"]');
    await removeButtons.first().click();
    
    await expect(ariaLive).toContainText(/removido/i);
    
    // Verifica se o título da página é acessível
    const h1 = page.locator("h1");
    await expect(h1).toContainText("Comparador de Produtos");
  });
});

