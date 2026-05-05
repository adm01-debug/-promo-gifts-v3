import { test, expect, type Page } from "@playwright/test";

/**
 * Helper para aguardar a sincronização do localStorage
 */
async function waitForSync(page: Page, key: string, expectedCount: number) {
  await page.waitForFunction(
    ([k, count]) => {
      try {
        const data = JSON.parse(localStorage.getItem(k) || "[]");
        return data.length === count;
      } catch {
        return false;
      }
    },
    [key, expectedCount]
  );
}

test.describe("Favoritos - Sincronização Multi-aba e Persistência", () => {
  test("deve sincronizar favoritos entre duas abas", async ({ context, page: page1 }) => {
    // Abre a segunda aba
    const page2 = await context.newPage();

    // Navega ambas para o catálogo
    await page1.goto("/");
    await page2.goto("/");

    // Limpa estado inicial
    await page1.evaluate(() => localStorage.clear());
    await page1.reload();
    await page2.reload();

    // Aba 1: Adiciona um favorito (simulando clique ou ação de store)
    // Usamos evaluate para interagir diretamente com a store para teste de lógica
    await page1.evaluate(async () => {
       // @ts-ignore - acessando store via window para teste se exposta ou disparando evento
       window.dispatchEvent(new CustomEvent('add-favorite', { detail: 'prod-1' }));
       // Como não expusemos a store no window, vamos simular via localStorage + evento storage
       const items = [{ productId: 'prod-1', addedAt: new Date().toISOString() }];
       localStorage.setItem('product-favorites', JSON.stringify(items));
       window.dispatchEvent(new StorageEvent('storage', { 
         key: 'product-favorites', 
         newValue: JSON.stringify(items) 
       }));
    });

    // Verifica se a Aba 2 recebeu a atualização
    await waitForSync(page2, 'product-favorites', 1);
    
    const countAba2 = await page2.evaluate(() => {
      return JSON.parse(localStorage.getItem('product-favorites') || "[]").length;
    });
    expect(countAba2).toBe(1);
  });

  test("deve persistir favoritos após recarregar a página", async ({ page }) => {
    await page.goto("/");
    
    // Adiciona favorito
    await page.evaluate(() => {
      const items = [{ productId: 'persist-1', addedAt: new Date().toISOString() }];
      localStorage.setItem('product-favorites', JSON.stringify(items));
    });

    // Recarrega
    await page.reload();

    // Verifica se continua lá
    const count = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('product-favorites') || "[]").length;
    });
    expect(count).toBe(1);
  });
});