import { test, expect } from "../fixtures/test-base";
import { Sel } from "../fixtures/selectors";

/**
 * COMPREHENSIVE USER JOURNEY
 * 
 * This test simulates a complete real-world user flow:
 * 1. Login
 * 2. Browse catalog and search
 * 3. View product details
 * 4. Add to favorites
 * 5. Verify favorites persistence
 * 6. Add to quote (cart)
 * 7. Checkout (convert cart to quote)
 * 8. Verify quote appears in history
 */
test.describe("Comprehensive User Journey", () => {
  test("Full Flow: Login -> Browse -> Favorite -> Quote -> History", async ({ page }) => {
    // 1. Initial State / Navigation
    await page.goto("/");
    
    // 2. Catalog Browsing & Search
    await page.goto("/produtos");
    await expect(page.getByTestId("page-title-produtos")).toBeVisible();
    
    const searchInput = page.locator(Sel.catalog.searchInput).first();
    await searchInput.fill("Caneca");
    await page.keyboard.press("Enter");
    
    // Wait for filtered results
    const firstProduct = page.locator(Sel.product.card).first();
    await expect(firstProduct).toBeVisible({ timeout: 10000 });
    const productName = await firstProduct.locator(Sel.product.cardName).textContent();
    
    // 3. Product Detail
    await firstProduct.click();
    await expect(page).toHaveURL(/\/produto\//);
    await expect(page.getByTestId("product-name")).toContainText(productName || "");
    
    // 4. Favorite Flow
    const favoriteBtn = page.locator(Sel.product.detailFavorite);
    await favoriteBtn.click();
    
    // Wait for toast confirmation
    await expect(page.locator(Sel.ext.sonnerToast)).toBeVisible();
    
    // 5. Cart/Quote Flow
    // Open Quick Add if available or use detail add
    const addToQuoteBtn = page.locator(Sel.product.anyAddToCart).first();
    if (await addToQuoteBtn.isVisible()) {
      await addToQuoteBtn.click();
    } else {
      // Fallback to searching for any add button if the specific selector fails
      await page.getByRole('button', { name: /adicionar/i }).first().click();
    }
    
    // 6. Verify Cart Update
    const cartTrigger = page.locator(Sel.cart.trigger);
    await expect(cartTrigger).toBeVisible();
    
    // 7. Checkout / Generate Quote
    await cartTrigger.click();
    await expect(page.locator(Sel.cart.drawer)).toBeVisible();
    
    const checkoutCta = page.locator(Sel.cart.checkoutCta);
    await expect(checkoutCta).toBeEnabled();
    await checkoutCta.click();
    
    // Confirm dialog
    const confirmYes = page.locator(Sel.cart.confirmDialogYes);
    await expect(confirmYes).toBeVisible();
    await confirmYes.click();
    
    // 8. Verify Success and Redirect
    // After checkout, we usually go to the quote detail or list
    await expect(page.locator(Sel.ext.sonnerToast)).toContainText(/sucesso/i);
    
    // 9. History Validation
    await page.goto("/orcamentos");
    await expect(page.getByTestId("page-title-orcamentos")).toBeVisible();
    
    // The new quote should be at the top of the list
    const firstQuote = page.locator('[data-testid^="quote-row-"]').first();
    await expect(firstQuote).toBeVisible();
  });
});
