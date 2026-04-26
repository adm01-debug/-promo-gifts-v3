/**
 * Fluxo: Remover favorito em /favoritos → reload → item sumiu
 *
 * Garante que a remoção é PERSISTIDA (localStorage + UI):
 *  1. Snapshot inicial do storage e do header
 *  2. Favorita o 1º card do catálogo (estado conhecido)
 *  3. Vai para /favoritos e captura o nome do produto recém-adicionado
 *  4. Remove esse item via botão "Remover favorito" (com confirm tolerante)
 *  5. Header volta a countBefore (sem reload)
 *  6. page.reload() → header continua em countBefore
 *  7. O nome do produto NÃO aparece mais no texto da página (toHaveCount(0))
 *  8. Cleanup: restaura o storage original
 */
import { test, expect, requireAuth } from "../fixtures/test-base";
import { gotoAndSettle, settleAfterAction } from "../helpers/nav";
import { installFavoritesCleanup } from "../helpers/favorites";
import { Sel } from "../fixtures/selectors";
import type { Locator, Page } from "@playwright/test";

const STORAGE_KEY = "product-favorites";

interface FavoriteItem {
  productId: string;
  addedAt: string;
}

async function readStorage(page: Page): Promise<FavoriteItem[]> {
  return page.evaluate((key) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as FavoriteItem[]) : [];
    } catch {
      return [];
    }
  }, STORAGE_KEY);
}

async function writeStorage(page: Page, items: FavoriteItem[]): Promise<void> {
  await page.evaluate(
    ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
    { key: STORAGE_KEY, value: items },
  );
}

async function readFavoritesCount(page: Page): Promise<number> {
  const loc = page.locator(Sel.favorites.countItems);
  await loc.first().waitFor({ state: "visible", timeout: 10_000 });
  const txt = (await loc.first().innerText()).trim();
  return Number.parseInt(txt, 10) || 0;
}

/** Lê o texto completo do bloco `favorites-count` (ex.: "3 itens • 2 listas"). */
async function readFavoritesCountText(page: Page): Promise<string> {
  const loc = page.locator(Sel.favorites.count).first();
  await loc.waitFor({ state: "visible", timeout: 10_000 });
  return (await loc.innerText()).trim().replace(/\s+/g, " ");
}

/** Conta cards renderizados na lista de favoritos. */
async function readFavoritesListSize(page: Page): Promise<number> {
  return page.locator(Sel.favorites.item).count();
}

async function isFavorited(button: Locator): Promise<boolean> {
  const pressed = await button.getAttribute("aria-pressed");
  if (pressed === "true") return true;
  const html = await button.innerHTML();
  return /fill-destructive|fill-current/.test(html);
}

/** Aceita diálogo de confirmação se aparecer (best-effort, via testid global). */
async function acceptConfirmIfAny(page: Page): Promise<void> {
  const confirm = page.locator(Sel.dialog.confirmYes).first();
  if (await confirm.isVisible().catch(() => false)) {
    await confirm.click().catch(() => {});
  }
}

test.describe("Fluxo: remover favorito persiste após reload", () => {
  test.beforeEach(() => requireAuth());
  installFavoritesCleanup(test);

  test("remove em /favoritos, page.reload() e item some da lista (e do texto)", async ({
    page,
  }) => {
    // 0. Snapshot inicial
    await gotoAndSettle(page, "/favoritos");
    await expect(page.locator(Sel.favorites.title)).toHaveText("Meus Favoritos");
    const original = await readStorage(page);
    const countBefore = await readFavoritesCount(page);

    // 1. Garante que existe um item para remover — favorita o 1º card do catálogo
    await gotoAndSettle(page, "/produtos");
    const card = page.locator(Sel.product.card).first();
    await card.waitFor({ state: "visible", timeout: 15_000 });

    const favBtn = card.locator(Sel.product.favorite).first();
    await favBtn.waitFor({ state: "visible", timeout: 10_000 });

    if (await isFavorited(favBtn)) {
      await favBtn.click();
      await expect.poll(() => isFavorited(favBtn), { timeout: 8_000 }).toBe(false);
    }
    await favBtn.click();
    await expect
      .poll(() => isFavorited(favBtn), {
        message: "botão não passou para estado favoritado",
        timeout: 8_000,
      })
      .toBe(true);

    // Storage refletiu +1
    await expect
      .poll(async () => (await readStorage(page)).length, { timeout: 8_000 })
      .toBe(original.length + 1);

    const afterAdd = await readStorage(page);
    const beforeIds = new Set(original.map((f) => f.productId));
    const addedId = afterAdd.find((f) => !beforeIds.has(f.productId))?.productId;
    expect(addedId, "productId recém-adicionado não pôde ser identificado").toBeTruthy();

    // 2. /favoritos: confirma +1 no header e captura snapshots ANTES da remoção
    await gotoAndSettle(page, "/favoritos");
    await expect
      .poll(() => readFavoritesCount(page), { timeout: 10_000 })
      .toBe(countBefore + 1);

    // Snapshot do bloco favorites-count (texto humano) e tamanho da lista
    const countTextWithItem = await readFavoritesCountText(page);
    const listSizeWithItem = await readFavoritesListSize(page);
    expect(listSizeWithItem, "lista deveria conter ao menos 1 card visível").toBeGreaterThan(0);

    // Localiza o card do produto adicionado por data-product-id (presente em ProductCard)
    const targetCard = page.locator(`[data-product-id="${addedId}"]`).first();
    await targetCard.waitFor({ state: "visible", timeout: 10_000 });

    // Confirma que o card alvo está visível ANTES da remoção (via data-product-id)
    await expect(
      targetCard,
      `card de favorito ${addedId} deveria estar visível antes da remoção`,
    ).toBeVisible({ timeout: 10_000 });

    // 3. Remove via botão "Remover favorito" do card alvo
    const removeBtn = targetCard.locator(Sel.favorites.remove).first();
    await removeBtn.waitFor({ state: "visible", timeout: 10_000 });
    await removeBtn.click();
    await acceptConfirmIfAny(page);
    await settleAfterAction(page);

    // 4. Header volta ao baseline SEM reload
    await expect
      .poll(() => readFavoritesCount(page), {
        message: "contagem deveria voltar a countBefore após remover",
        timeout: 10_000,
      })
      .toBe(countBefore);

    // Storage também caiu para o baseline
    await expect
      .poll(async () => (await readStorage(page)).length, { timeout: 8_000 })
      .toBe(original.length);

    // 5. page.reload() — remoção é persistida
    await page.reload({ waitUntil: "domcontentloaded" });
    await page
      .waitForFunction(
        () => !document.querySelector('[data-state="loading"], [data-skeleton]'),
        { timeout: 8_000 },
      )
      .catch(() => {});

    // Header continua no baseline após reload
    await expect
      .poll(() => readFavoritesCount(page), {
        message: "contagem deveria continuar em countBefore após reload",
        timeout: 10_000,
      })
      .toBe(countBefore);

    // 6. favorites-count (texto humano) reflete o baseline e MUDOU em relação ao estado +1
    const countTextAfterReload = await readFavoritesCountText(page);
    expect(
      countTextAfterReload,
      `favorites-count após reload deveria diferir do estado com item adicionado ` +
        `(antes="${countTextWithItem}", depois="${countTextAfterReload}")`,
    ).not.toBe(countTextWithItem);
    // Texto deve começar com o número de itens do baseline ("0 item", "3 itens", ...)
    expect(
      countTextAfterReload.startsWith(`${countBefore} `),
      `favorites-count deveria começar com "${countBefore} " (got "${countTextAfterReload}")`,
    ).toBe(true);

    // 7. Card do produto removido NÃO existe mais (SSOT por data-product-id)
    await expect(
      page.locator(`${Sel.favorites.item}[data-product-id="${addedId}"]`),
      `card do produto ${addedId} não deveria existir após reload`,
    ).toHaveCount(0, { timeout: 10_000 });

    // 8. Tamanho da lista caiu exatamente em 1 (de listSizeWithItem para listSizeWithItem-1)
    const listSizeAfterReload = await readFavoritesListSize(page);
    expect(
      listSizeAfterReload,
      `tamanho da lista deveria ser ${listSizeWithItem - 1} após reload ` +
        `(antes da remoção=${listSizeWithItem}, depois=${listSizeAfterReload})`,
    ).toBe(listSizeWithItem - 1);

    // 9. Cleanup defensivo — garante que o storage está no estado original
    await writeStorage(page, original);
  });
});
