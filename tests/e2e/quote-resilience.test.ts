import { test, expect } from "@playwright/test";

test.describe("Módulo Orçamentos - Resiliência e AutoSave", () => {
  const STORAGE_KEY = "quote_builder_autosave";

  test("Deve restaurar itens e campos após refresh da página", async ({ page }) => {
    await page.goto("/orcamentos/novo");
    
    // 1. Preenche Empresa (dispara AutoSave)
    const companyInput = page.locator('input[placeholder*="Buscar empresa"]');
    await companyInput.fill("Cliente Playwright");
    await page.keyboard.press("Enter");
    
    // 2. Adiciona um produto
    await page.click('button:has-text("Produto")');
    const firstProductAdd = page.locator('button:has-text("Adicionar")').first();
    await firstProductAdd.click();
    
    // Aguarda o debounce do AutoSave (2000ms + margem)
    await page.waitForTimeout(3000);
    
    // Verifica se algo foi salvo no localStorage
    const savedData = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
    expect(savedData).not.toBeNull();
    
    // 3. Força Refresh
    await page.reload();
    
    // 4. Confirma restauração
    // O toast de sucesso deve aparecer
    await expect(page.locator("text=restaurado")).toBeVisible();
    
    // O campo de empresa deve estar preenchido ou os itens devem estar na lista
    const itemsCount = page.locator("text=1 item(ns) adicionado(s)");
    await expect(itemsCount).toBeVisible();
  });

  test("Stepper deve refletir o progresso corretamente", async ({ page }) => {
    await page.goto("/orcamentos/novo");
    
    // Passo inicial: Cliente (Active)
    const clientStep = page.locator('text=Cliente');
    await expect(clientStep).toHaveClass(/text-primary/);
    
    // Preenche cliente para avançar
    await page.locator('input[placeholder*="Buscar empresa"]').fill("Teste Stepper");
    await page.keyboard.press("Enter");
    
    // Passo 2: Itens deve se tornar ativo
    const itemsStep = page.locator('text=Itens');
    await expect(itemsStep).toHaveClass(/text-primary/);
    
    // O conector entre Cliente e Itens deve estar colorido (bg-primary)
    // Buscamos o div do conector após o passo Cliente
    const connector = page.locator('[data-testid="quote-wizard"] .bg-primary').first();
    await expect(connector).toBeVisible();
  });
});
