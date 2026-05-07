import { test, expect } from "../fixtures/test-base";
import { requireAuth } from "../fixtures/test-base";
import { gotoAndSettle } from "../helpers/nav";
import { Sel } from "../fixtures/selectors";

test.describe("Fluxo: Catálogo Avançado", () => {
  test.beforeEach(async ({ page }) => {
    requireAuth();
    await gotoAndSettle(page, "/produtos");
  });

  test("deve filtrar por categorias e cores simultaneamente", async ({ page }) => {
    // 1. Abrir filtros se estiverem escondidos (mobile) ou usar sidebar
    const filterPanel = page.locator(TID("catalog-filters-panel"));
    await expect(filterPanel).toBeVisible();

    // 2. Selecionar uma categoria
    const categoryBtn = page.locator('[data-testid^="filter-category-"]').first();
    const categoryName = await categoryBtn.innerText();
    await categoryBtn.click();

    // 3. Selecionar uma cor
    const colorBtn = page.locator('[data-testid^="filter-color-"]').first();
    await colorBtn.click();

    // 4. Validar que a URL reflete os filtros
    await expect(page).toHaveURL(/category_id=/);
    await expect(page).toHaveURL(/color=/);

    // 5. Validar que resultados aparecem ou estado vazio consistente
    const productCount = await page.locator(Sel.product.card).count();
    if (productCount === 0) {
      await expect(page.locator(TID("catalog-empty-state"))).toBeVisible();
    } else {
      await expect(page.locator(Sel.product.card).first()).toBeVisible();
    }
  });

  test("deve ordenar produtos e manter estado", async ({ page }) => {
    const sortTrigger = page.locator(TID("catalog-sort-trigger"));
    await sortTrigger.click();

    // Selecionar "Maior Preço"
    await page.getByRole("option", { name: /maior preço/i }).click();

    // Validar URL
    await expect(page).toHaveURL(/sort=price-desc/);

    // Validar que o primeiro item mudou ou continua visível
    await expect(page.locator(Sel.product.card).first()).toBeVisible();
  });

  test("deve exibir estado vazio para busca sem resultados", async ({ page }) => {
    const search = page.locator(Sel.catalog.searchInput).first();
    await search.fill("termo_inexistente_xyz_123");
    await page.keyboard.press("Enter");

    await expect(page.locator(TID("catalog-empty-state"))).toBeVisible();
    await expect(page.getByText(/nenhum produto encontrado/i)).toBeVisible();
  });
});
