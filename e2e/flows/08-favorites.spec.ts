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
import { installFavoritesCleanup } from "../helpers/favorites";
import { Sel } from "../fixtures/selectors";
import type { Locator, Page } from "@playwright/test";

const FAV_BUTTON_SELECTOR = Sel.product.favorite;

/** Encontra o primeiro card do catálogo com botão de favoritar visível. */
async function firstCatalogCard(page: Page): Promise<Locator> {
  const card = page.locator(Sel.product.card).first();
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

/** Lê a contagem numérica exibida no header de Favoritos. */
async function readFavoritesCount(page: Page): Promise<number> {
  const loc = page.locator(Sel.favorites.countItems);
  await loc.first().waitFor({ state: "visible", timeout: 10_000 });
  const txt = (await loc.first().innerText()).trim();
  return Number.parseInt(txt, 10) || 0;
}

/** Valida título, ícone/label e contagem do header de Favoritos. */
async function assertFavoritesHeader(
  page: Page,
  expectedCount: number,
  opts: { checkCardsMatch?: boolean } = {},
) {
  // Título
  await expect(page.locator(Sel.favorites.title)).toHaveText("Meus Favoritos");
  // Ícone + label de acessibilidade + svg renderizado
  const icon = page.locator(Sel.favorites.icon);
  await expect(icon).toBeVisible();
  await expect(icon).toHaveAttribute("aria-label", "Favoritos");
  await expect(icon.locator("svg")).toBeVisible();
  // Contagem numérica no header
  await expect
    .poll(() => readFavoritesCount(page), {
      message: `header favorites-count-items deveria ser ${expectedCount}`,
      timeout: 10_000,
    })
    .toBe(expectedCount);
  // (opcional) número de cards renderizados bate com a contagem
  if (opts.checkCardsMatch) {
    const cards = await page.locator(Sel.favorites.remove).count();
    expect(cards, "qtde de cards renderizados deve bater com a contagem do header").toBe(
      expectedCount,
    );
  }
}

test.describe("Fluxo: Favoritos", () => {
  test.beforeEach(() => requireAuth());
  installFavoritesCleanup(test);

  test("lista de favoritos carrega", async ({ page }) => {
    await gotoAndSettle(page, "/favoritos");
    await expect(page).toHaveURL(/favoritos/);
    await expect(
      page.locator(Sel.page.title("favoritos")).first().or(
        page.getByText(/sem favoritos|nenhum favorito|você ainda não/i).first(),
      ),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("favorita um produto, recarrega e ele persiste na lista", async ({ page }) => {
    // 0. Snapshot inicial do header de favoritos (antes de qualquer ação)
    await gotoAndSettle(page, "/favoritos");
    await expect(page.locator(Sel.favorites.title)).toHaveText("Meus Favoritos");
    const countBefore = await readFavoritesCount(page);

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

    // 4. /favoritos — validações ANTES do reload
    await gotoAndSettle(page, "/favoritos");
    await assertFavoritesHeader(page, countBefore + 1, { checkCardsMatch: true });

    // 5. RELOAD e revalida título, ícone, label e contagem
    await page.reload({ waitUntil: "domcontentloaded" });
    await page
      .waitForFunction(
        () => !document.querySelector('[data-state="loading"], [data-skeleton]'),
        { timeout: 8_000 },
      )
      .catch(() => {});

    await assertFavoritesHeader(page, countBefore + 1, { checkCardsMatch: true });

    // 6. Persistência do produto específico
    const escaped = productName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const byName = page.getByText(new RegExp(escaped, "i")).first();
    const removeButtons = page.locator(Sel.favorites.remove);
    await expect(byName.or(removeButtons.first())).toBeVisible({ timeout: 10_000 });

    // 7. Cleanup: desfaz o favorito e confirma que SOME após reload
    const productRegex = new RegExp(escaped, "i");
    const favCard = page
      .locator(`:has-text("${productName}")`)
      .filter({ has: page.locator(Sel.favorites.remove) })
      .first();

    if ((await favCard.count()) > 0) {
      await favCard.locator(Sel.favorites.remove).first().click().catch(() => {});
    } else {
      await removeButtons.first().click().catch(() => {});
    }

    // Se aparecer um diálogo de confirmação, aceita
    const confirm = page
      .locator('[role="alertdialog"], [role="dialog"]')
      .getByRole("button", { name: /remover|confirmar|sim|excluir/i })
      .first();
    if (await confirm.isVisible().catch(() => false)) {
      await confirm.click().catch(() => {});
    }

    // Header volta ao estado inicial (sem reload)
    await expect
      .poll(() => readFavoritesCount(page), {
        message: "contagem não voltou ao inicial após remover",
        timeout: 10_000,
      })
      .toBe(countBefore);

    // Reload e revalida ausência persistida
    await page.reload({ waitUntil: "domcontentloaded" });
    await page
      .waitForFunction(
        () => !document.querySelector('[data-state="loading"], [data-skeleton]'),
        { timeout: 8_000 },
      )
      .catch(() => {});

    await assertFavoritesHeader(page, countBefore, { checkCardsMatch: true });

    // O produto removido NÃO deve mais aparecer na lista de favoritos
    await expect(
      page.getByText(productRegex),
      `produto "${productName}" deveria ter sumido da lista após cleanup + reload`,
    ).toHaveCount(0, { timeout: 10_000 });
  });

  test("header de favoritos permanece consistente após reload (título, ícone, contagem)", async ({
    page,
  }) => {
    await gotoAndSettle(page, "/favoritos");
    const before = await readFavoritesCount(page);
    await assertFavoritesHeader(page, before);

    await page.reload({ waitUntil: "domcontentloaded" });
    await page
      .waitForFunction(
        () => !document.querySelector('[data-state="loading"], [data-skeleton]'),
        { timeout: 8_000 },
      )
      .catch(() => {});

    await assertFavoritesHeader(page, before);
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
