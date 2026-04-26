/**
 * P0 — Catálogo: DB externo (Promobrind) offline.
 *
 * Esperado: app NÃO quebra, exibe cache + banner "modo degradado",
 * desabilita ações que escrevem (orçamento, pedido).
 */
import { test, expect } from "../../fixtures/test-base";
import { mockExternalDbOffline } from "./_mocks";

test.describe("P0 — Catálogo degradado", () => {
  test.skip("external-db-bridge 503: catálogo serve cache e mostra banner", async ({ page }) => {
    await mockExternalDbOffline(page);
    await page.goto("/catalogo");
    await expect(page.getByRole("alert")).toContainText(/modo degradado|atualizado.+há/i);
    // Cache local ainda renderiza algum produto (ou estado vazio amigável).
    const empty = page.getByText(/nenhum produto|cache indispon/i);
    const hasProducts = page.locator('[data-testid="product-card"]').first();
    await expect(empty.or(hasProducts)).toBeVisible({ timeout: 10_000 });
  });

  test.skip("ações de escrita ficam desabilitadas em modo degradado", async ({ page }) => {
    await mockExternalDbOffline(page);
    await page.goto("/catalogo");
    const addToQuote = page.getByRole("button", { name: /adicionar.*orçamento/i }).first();
    if (await addToQuote.isVisible().catch(() => false)) {
      await expect(addToQuote).toBeDisabled();
    }
  });

  test.skip("Cloudflare Stream offline: vídeo cai pra imagem sem erro no console", async ({ page }) => {
    await page.route(/videodelivery\.net/, route => route.fulfill({ status: 530, body: "" }));
    const errors: string[] = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.goto("/produto/exemplo");
    expect(errors).toHaveLength(0);
  });
});
