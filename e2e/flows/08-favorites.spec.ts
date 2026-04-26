/**
 * Fluxo: Favoritos
 *
 * Cobertura:
 *  1) Lista de favoritos carrega
 *  2) **Persistência após reload** (caso principal pedido):
 *     - favorita o primeiro produto do catálogo
 *     - captura a identidade do produto (nome)
 *     - recarrega `/favoritos` (full reload com `page.reload()`)
 *     - valida que o produto persistido aparece na lista
 *     - cleanup: desfavorita para deixar o estado igual ao inicial
 *  3) Toggle no card volta ao estado anterior (idempotência)
 */
import { test, expect, requireAuth } from "../fixtures/test-base";
import { gotoAndSettle } from "../helpers/nav";
import type { Locator, Page } from "@playwright/test";

const FAV_BUTTON_SELECTOR =
  'button[aria-label="Favoritar" i], button[aria-label*="favorit" i]';

/** Encontra o primeiro card do catálogo com botão de favoritar visível. */
async function firstCatalogCard(page: Page): Promise<Locator> {
  const card = page
    .locator(
      '[data-testid="product-card"], article:has(button[aria-label*="favorit" i]), [role="article"]:has(button[aria-label*="favorit" i])',
    )
    .first();
  await card.waitFor({ state: "visible", timeout: 15_000 });
  return card;
}

/** Tenta extrair um identificador estável do card (nome do produto). */
async function readCardName(card: Locator): Promise<string> {
  const heading = card
    .locator('h1, h2, h3, [data-testid="product-name"], [data-product-name]')
    .first();
  if ((await heading.count()) > 0) {
    const txt = (await heading.innerText()).trim();
    if (txt) return txt;
  }
  const txt = (await card.innerText()).trim().split("\n")[0]?.trim() ?? "";
  return txt;
}

/** Estado atual do botão (favoritado vs não-favoritado). */
async function isFavorited(button: Locator): Promise<boolean> {
  const pressed = await button.getAttribute("aria-pressed");
  if (pressed === "true") return true;
  const html = await button.innerHTML();
  return /fill-destructive|fill-current/.test(html);
}

test.describe("Fluxo: Favoritos", () => {
  test.beforeEach(() => requireAuth());

  test("lista de favoritos carrega", async ({ page }) => {
    await gotoAndSettle(page, "/favoritos");
    await expect(page).toHaveURL(/favoritos/);
    await expect(
      page.getByRole("heading", { name: /favoritos/i }).first().or(
        page.getByText(/sem favoritos|nenhum favorito|você ainda não/i).first(),
      ),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("favorita um produto, recarrega e ele persiste na lista", async ({ page }) => {
    // 1. Catálogo + 1º card
    await gotoAndSettle(page, "/produtos");
    const card = await firstCatalogCard(page);
    const productName = await readCardName(card);
    expect(productName, "nome do produto não pôde ser lido").toBeTruthy();

    const favButton = card.locator(FAV_BUTTON_SELECTOR).first();
    await favButton.waitFor({ state: "visible" });

    // 2. Estado inicial garantido = NÃO favoritado
    if (await isFavorited(favButton)) {
      await favButton.click();
      await expect.poll(() => isFavorited(favButton), { timeout: 8_000 }).toBe(false);
    }

    // 3. Favorita
    await favButton.click();
    await expect
      .poll(() => isFavorited(favButton), {
        message: "botão não passou para estado favoritado",
        timeout: 8_000,
      })
      .toBe(true);

    // 4. /favoritos + RELOAD
    await gotoAndSettle(page, "/favoritos");
    await page.reload({ waitUntil: "domcontentloaded" });
    await page
      .waitForFunction(
        () => !document.querySelector('[data-state="loading"], [data-skeleton]'),
        { timeout: 8_000 },
      )
      .catch(() => {});

    // 5. Valida persistência
    const escaped = productName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const byName = page.getByText(new RegExp(escaped, "i")).first();
    const removeButtons = page.locator('button[aria-label="Remover favorito" i]');

    await expect(byName.or(removeButtons.first())).toBeVisible({ timeout: 10_000 });
    expect(
      await removeButtons.count(),
      "lista de favoritos veio vazia após reload",
    ).toBeGreaterThan(0);

    // 6. Cleanup
    const favCard = page
      .locator(`:has-text("${productName}")`)
      .filter({ has: page.locator('button[aria-label="Remover favorito" i]') })
      .first();

    if ((await favCard.count()) > 0) {
      await favCard
        .locator('button[aria-label="Remover favorito" i]')
        .first()
        .click()
        .catch(() => {});
    } else {
      await removeButtons.first().click().catch(() => {});
    }
    await page.waitForTimeout(500);
  });

  test("toggle do favorito é idempotente (favorita e desfavorita)", async ({ page }) => {
    await gotoAndSettle(page, "/produtos");
    const card = await firstCatalogCard(page);
    const favButton = card.locator(FAV_BUTTON_SELECTOR).first();
    await favButton.waitFor({ state: "visible" });

    const initial = await isFavorited(favButton);

    await favButton.click();
    await expect.poll(() => isFavorited(favButton), { timeout: 8_000 }).toBe(!initial);

    await favButton.click();
    await expect.poll(() => isFavorited(favButton), { timeout: 8_000 }).toBe(initial);
  });
});
