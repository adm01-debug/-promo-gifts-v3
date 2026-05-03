import { test, expect } from "../fixtures/test-base";
import { requireAuth } from "../fixtures/test-base";
import { gotoAndSettle } from "../helpers/nav";
import path from "node:path";

test.describe("Mockup History E2E Flow", () => {
  test.beforeEach(async ({ page }) => {
    requireAuth();
  });

  test("should generate a mockup and verify it appears in history", async ({ page }) => {
    // 1. Go to Generator
    await gotoAndSettle(page, "/mockup-generator");

    // 2. Full generation flow
    // Select Client
    const clientSearch = page.getByTestId("mockup-client-search-input");
    await clientSearch.click();
    const firstClient = page.locator('[data-testid^="mockup-client-option-"]').first();
    await firstClient.waitFor({ state: "visible", timeout: 15000 });
    const clientName = (await firstClient.innerText()).trim();
    await clientName; // explicitly using it if needed
    await firstClient.click();

    // Select Product
    await page.getByTestId("mockup-product-combobox-trigger").click();
    const firstProduct = page.locator('[data-testid^="mockup-product-option-"]').first();
    await firstProduct.waitFor({ state: "visible" });
    const productNameRaw = await firstProduct.locator('p').first().innerText();
    const productName = productNameRaw.trim();
    await firstProduct.click();

    // Select Technique
    await page.getByTestId("mockup-technique-select-trigger").click();
    const firstTechnique = page.locator('[role="option"]').first();
    await firstTechnique.waitFor({ state: "visible" });
    await firstTechnique.click();

    // Upload Logo
    const fileInput = page.locator('input[data-testid^="mockup-logo-upload-input-"]').first();
    const logoPath = path.resolve("public/placeholder.svg");
    await fileInput.setInputFiles(logoPath);
    await expect(page.locator("img[alt='Logo']")).toBeVisible({ timeout: 10000 });

    // Generate Layout - IA
    const generateBtn = page.getByRole("button", { name: /Gerar Layout - IA/i });
    await generateBtn.click();

    // Wait for result
    await expect(page.getByTestId("mockup-result-card")).toBeVisible({ timeout: 60000 });
    
    // 3. Go to History
    await gotoAndSettle(page, "/mockup-historico");

    // 4. Verify items in history
    const historyItem = page.locator('[data-testid="mockup-history-item"]').first();
    await expect(historyItem).toBeVisible({ timeout: 15000 });

    // Verify consistency
    await expect(historyItem.locator('[data-testid="mockup-history-product-name"]')).toContainText(productName);
    
    // Verify preview image
    const previewImg = historyItem.locator('[data-testid="mockup-history-preview"]');
    await expect(previewImg).toBeVisible();

    // 5. "Open again" verification (checking image details in new tab)
    const downloadBtn = historyItem.locator('[data-testid="mockup-history-download-btn"]');
    await expect(downloadBtn).toBeVisible();
    
    // Validate we can click download (simulation of opening)
    const [newPage] = await Promise.all([
      page.context().waitForEvent('page'),
      downloadBtn.click(),
    ]);
    await newPage.waitForLoadState();
    expect(newPage.url()).toContain('supabase'); // Should be a supabase storage URL

    // 6. Test Delete action
    const deleteBtn = historyItem.locator('[data-testid="mockup-history-delete-btn"]');
    await deleteBtn.click();
    
    // Verify toast or item removal
    await expect(page.getByText(/Mockup removido/i)).toBeVisible();
    await expect(historyItem).not.toBeVisible();
  });

  test("should be able to search for generated mockups in history", async ({ page }) => {
    await gotoAndSettle(page, "/mockup-historico");
    
    const searchInput = page.locator('input[placeholder*="Buscar por produto"]');
    await expect(searchInput).toBeVisible();
    
    await searchInput.fill("PRODUTO_INEXISTENTE_XYZ");
    await expect(page.getByText(/Nenhum mockup gerado ainda/i)).toBeVisible();
    
    await searchInput.fill("");
    // Should return to normal state
  });
});
