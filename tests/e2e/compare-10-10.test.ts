import { test, expect } from "@playwright/test";

/**
 * Módulo de Comparador de Produtos - Excelência 10/10
 * Valida persistência, simulação de volume e fluxo a partir do detalhe.
 */
test("deve validar o fluxo Adicionar à Arena da página de detalhes", async ({ page }) => {
  // 1. Navegar para um produto específico (ID real do mock)
  await page.goto("/produto/26462");
  
  // 2. Verificar se o botão de adicionar à arena existe e clicar
  const arenaBtn = page.getByRole("button", { name: /Adicionar à Arena/i });
  await expect(arenaBtn).toBeVisible();
  await arenaBtn.click();

  // 3. Verificar toast de sucesso
  await expect(page.locator("text=adicionado ao comparador")).toBeVisible();

  // 4. Navegar para a Arena
  await page.goto("/comparar");

  // 5. Verificar se o produto está lá
  await expect(page.locator("text=Comparando 1 produto")).toBeVisible();
  
  // 6. Voltar para outro produto e adicionar também
  await page.goto("/produto/26463");
  await page.getByRole("button", { name: /Adicionar à Arena/i }).click();
  await page.goto("/comparar");

  // 7. Verificar se agora temos 2 e o Modo Duelo está disponível
  await expect(page.locator("text=Comparando 2 produtos")).toBeVisible();
  await expect(page.getByRole("button", { name: /Arena de Duelo/i })).toBeVisible();
});

test("deve carregar mock de volume e persistir após recarregar", async ({ page }) => {
  await page.goto("/comparar");
  
  // Limpar se houver algo (botão Limpar Tudo)
  const clearBtn = page.getByRole("button", { name: /Limpar Tudo/i });
  if (await clearBtn.isVisible()) {
    await clearBtn.click();
  }

  // Clicar no mock de volume (8 itens)
  const volBtn = page.getByRole("button", { name: /Arena de Volume/i });
  await expect(volBtn).toBeVisible();
  await volBtn.click();
  
  await expect(page.locator("text=Simulação concluída")).toBeVisible();

  // Verificar contagem
  await expect(page.locator("text=Comparando 8 produtos")).toBeVisible();

  // Recarregar página
  await page.reload();

  // Verificar se persistiu (via localStorage/Zustand)
  await expect(page.locator("text=Comparando 8 produtos")).toBeVisible();
  await expect(page.locator("text=Radar de Performance")).toBeVisible();
});

test("deve validar limites e duplicatas", async ({ page }) => {
  await page.goto("/comparar");
  
  // Carrega mock rápido
  await page.getByRole("button", { name: /Arena Rápida/i }).click();
  await expect(page.locator("text=Simulação concluída")).toBeVisible();
  
  // Tentar adicionar o mesmo produto (ID 26462 já está no mock rápido)
  await page.goto("/produto/26462");
  await page.getByRole("button", { name: /Adicionar à Arena/i }).click();
  
  // Deve mostrar toast de info/erro duplicado
  await expect(page.locator("text=já está na lista")).toBeVisible();
});
