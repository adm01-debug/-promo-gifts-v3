/**
 * Fluxo: Favoritar a partir da PÁGINA DE DETALHE do produto
 *
 * 1) Abre o catálogo, escolhe o 1º card e navega para `/produto/:id`
 * 2) Captura nome do produto na página de detalhe
 * 3) Clica no botão "Favoritar" (Hero / StickyHeader / MobileActions)
 * 4) Se o VariantPickerDialog abrir, escolhe "Sem cor específica"
 * 5) Vai para `/favoritos`, valida presença + contagem (countBefore + 1)
 * 6) RELOAD e revalida que o produto continua na lista
 * 7) Cleanup: desfavorita pela lista, reload e confirma sumiço
 */
import { test, expect, requireAuth } from "../fixtures/test-base";
import { gotoAndSettle } from "../helpers/nav";
import { installFavoritesCleanup } from "../helpers/favorites";
import { Sel } from "../fixtures/selectors";
import type { Locator, Page } from "@playwright/test";

/** Lê a contagem numérica exibida no header de Favoritos. */
async function readFavoritesCount(page: Page): Promise<number> {
  const loc = page.locator(Sel.favorites.countItems);
  await loc.first().waitFor({ state: "visible", timeout: 10_000 });
  const txt = (await loc.first().innerText()).trim();
  return Number.parseInt(txt, 10) || 0;
}

/** Aguarda skeletons sumirem. */
async function waitForReady(page: Page) {
  await page
    .waitForFunction(
      () => !document.querySelector('[data-state="loading"], [data-skeleton]'),
      { timeout: 8_000 },
    )
    .catch(() => {});
}

/** Botão de favoritar visível na página de detalhe (Hero / Sticky / Mobile). */
function detailFavoriteButton(page: Page): Locator {
  return page
    .locator(
      [
        '[data-testid="product-favorite"]',
        'button[aria-label="Favoritar" i]',
        'button[aria-label*="favorit" i]',
        'button:has-text("Favoritar")',
        'button:has-text("Favoritado")',
      ].join(", "),
    )
    .first();
}

/** Lê o título do produto na página de detalhe. */
async function readDetailProductName(page: Page): Promise<string> {
  const heading = page.locator("h1, h2").first();
  await heading.waitFor({ state: "visible", timeout: 15_000 });
  return (await heading.innerText()).trim().split("\n")[0]?.trim() ?? "";
}

/** Detecta estado favoritado via texto do botão ou aria-pressed. */
async function isFavoritedDetail(btn: Locator): Promise<boolean> {
  return btn
    .evaluate(
      (el) =>
        /Favoritado/i.test(el.textContent || "") ||
        el.getAttribute("aria-pressed") === "true",
    )
    .catch(() => false);
}

test.describe("Fluxo: Favoritar a partir da página de detalhe", () => {
  test.beforeEach(() => requireAuth());
  installFavoritesCleanup(test);

  test("favorita no detalhe, recarrega /favoritos e o produto aparece na lista", async ({
    page,
  }) => {
    // 0. Snapshot do header de favoritos
    await gotoAndSettle(page, "/favoritos");
    await expect(page.locator(Sel.favorites.title)).toHaveText("Meus Favoritos");
    const countBefore = await readFavoritesCount(page);

    // 1. Catálogo → 1º card → detalhe
    await gotoAndSettle(page, "/produtos");
    const card = page.locator(Sel.product.card).first();
    await card.waitFor({ state: "visible", timeout: 15_000 });

    const detailLink = card.locator('a[href^="/produto/"]').first();
    let detailHref: string | null = null;
    if ((await detailLink.count()) > 0) {
      detailHref = await detailLink.getAttribute("href");
    }

    if (detailHref) {
      await gotoAndSettle(page, detailHref);
    } else {
      await card.click();
      await page.waitForURL(/\/produto\/[^/]+/, { timeout: 15_000 });
    }
    await waitForReady(page);
    await expect(page).toHaveURL(/\/produto\/[^/]+/);

    // 2. Nome do produto a partir do detalhe
    const productName = await readDetailProductName(page);
    expect(productName, "nome do produto no detalhe não pôde ser lido").toBeTruthy();

    // 3. Garante estado inicial = NÃO favoritado
    const favBtn = detailFavoriteButton(page);
    await favBtn.waitFor({ state: "visible", timeout: 10_000 });

    if (await isFavoritedDetail(favBtn)) {
      await favBtn.click();
      await expect
        .poll(() => isFavoritedDetail(favBtn), { timeout: 8_000 })
        .toBe(false);
    }

    // 4. Clica em Favoritar — pode abrir VariantPickerDialog
    await favBtn.click();

    const semCor = page
      .locator('[role="dialog"]')
      .getByText(/sem cor espec[íi]fica/i)
      .first();
    if (await semCor.isVisible().catch(() => false)) {
      await semCor.click();
    }

    // Confirma estado favoritado no detalhe
    await expect
      .poll(() => isFavoritedDetail(favBtn), {
        message: "botão do detalhe não passou para 'Favoritado'",
        timeout: 10_000,
      })
      .toBe(true);

    // 5. /favoritos antes do reload
    await gotoAndSettle(page, "/favoritos");
    await expect
      .poll(() => readFavoritesCount(page), { timeout: 10_000 })
      .toBe(countBefore + 1);

    const escaped = productName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const productRegex = new RegExp(escaped, "i");
    await expect(
      page.getByText(productRegex).first(),
      `produto "${productName}" deveria aparecer em /favoritos`,
    ).toBeVisible({ timeout: 10_000 });

    // 6. RELOAD — produto persiste
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForReady(page);

    await expect
      .poll(() => readFavoritesCount(page), {
        message: "contagem deveria persistir após reload",
        timeout: 10_000,
      })
      .toBe(countBefore + 1);
    await expect(
      page.getByText(productRegex).first(),
      `produto "${productName}" deveria persistir após reload`,
    ).toBeVisible({ timeout: 10_000 });

    // 7. Cleanup — desfavorita pela lista, reload e confirma sumiço
    const favCard = page
      .locator(`:has-text("${productName}")`)
      .filter({ has: page.locator(Sel.favorites.remove) })
      .first();

    if ((await favCard.count()) > 0) {
      await favCard.locator(Sel.favorites.remove).first().click().catch(() => {});
    } else {
      await page.locator(Sel.favorites.remove).first().click().catch(() => {});
    }

    const confirm = page
      .locator('[role="alertdialog"], [role="dialog"]')
      .getByRole("button", { name: /remover|confirmar|sim|excluir/i })
      .first();
    if (await confirm.isVisible().catch(() => false)) {
      await confirm.click().catch(() => {});
    }

    await expect
      .poll(() => readFavoritesCount(page), { timeout: 10_000 })
      .toBe(countBefore);

    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForReady(page);

    await expect
      .poll(() => readFavoritesCount(page), { timeout: 10_000 })
      .toBe(countBefore);
    await expect(
      page.getByText(productRegex),
      `produto "${productName}" deveria sumir após cleanup + reload`,
    ).toHaveCount(0, { timeout: 10_000 });
  });
});
