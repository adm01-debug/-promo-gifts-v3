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

async function readFavoritesTitle(page: Page): Promise<string> {
  const loc = page.locator(Sel.favorites.title).first();
  await loc.waitFor({ state: "visible", timeout: 10_000 });
  return (await loc.innerText()).trim();
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

interface FavoritesSnapshot {
  title: string;
  count: number;
  countText: string;
  listSize: number;
}

/** Lê título + contadores + tamanho da lista em paralelo (snapshot reutilizável). */
async function readFavoritesSnapshot(page: Page): Promise<FavoritesSnapshot> {
  const [title, count, countText, listSize] = await Promise.all([
    readFavoritesTitle(page),
    readFavoritesCount(page),
    readFavoritesCountText(page),
    readFavoritesListSize(page),
  ]);
  return { title, count, countText, listSize };
}

/** Asserta que o snapshot atual bate com `expected` (uso pré e pós-reload). */
async function expectFavoritesSnapshot(
  page: Page,
  expected: FavoritesSnapshot,
  label: string,
): Promise<FavoritesSnapshot> {
  await expect
    .poll(() => readFavoritesCount(page), {
      message: `[${label}] favorites-count-items deveria ser ${expected.count}`,
      timeout: 10_000,
    })
    .toBe(expected.count);

  const actual = await readFavoritesSnapshot(page);
  expect(actual.title, `[${label}] título mudou`).toBe(expected.title);
  expect(actual.countText, `[${label}] favorites-count text mudou`).toBe(expected.countText);
  expect(actual.listSize, `[${label}] tamanho da lista mudou`).toBe(expected.listSize);
  return actual;
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
    const baselineSnapshot = await readFavoritesSnapshot(page);
    expect(baselineSnapshot.title).toBe("Meus Favoritos");
    const original = await readStorage(page);
    const countBefore = baselineSnapshot.count;

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

    // 2. /favoritos: confirma +1 no header e captura snapshot ANTES da remoção
    await gotoAndSettle(page, "/favoritos");
    await expect
      .poll(() => readFavoritesCount(page), { timeout: 10_000 })
      .toBe(countBefore + 1);

    const snapshotWithItem = await readFavoritesSnapshot(page);
    expect(snapshotWithItem.title).toBe(baselineSnapshot.title);
    expect(snapshotWithItem.listSize, "lista deveria conter ao menos 1 card visível").toBeGreaterThan(0);

    // Localiza o card do produto adicionado por data-product-id (presente em ProductCard)
    const targetCard = page.locator(`[data-product-id="${addedId}"]`).first();
    await targetCard.waitFor({ state: "visible", timeout: 10_000 });
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

    // 4. Calcula o snapshot ESPERADO após remoção e valida ANTES do reload
    await expect
      .poll(() => readFavoritesCount(page), {
        message: "contagem deveria voltar a countBefore após remover",
        timeout: 10_000,
      })
      .toBe(countBefore);

    const expectedAfterRemove = await readFavoritesSnapshot(page);
    expect(expectedAfterRemove.count).toBe(countBefore);
    expect(expectedAfterRemove.listSize).toBe(snapshotWithItem.listSize - 1);
    expect(expectedAfterRemove.countText).not.toBe(snapshotWithItem.countText);
    expect(
      expectedAfterRemove.countText.startsWith(`${countBefore} `),
      `favorites-count deveria começar com "${countBefore} " (got "${expectedAfterRemove.countText}")`,
    ).toBe(true);

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

    // 6. Reusa o MESMO snapshot esperado para validar pós-reload
    await expectFavoritesSnapshot(page, expectedAfterRemove, "pós-reload");

    // 7. Card do produto removido NÃO existe mais (SSOT por data-product-id)
    await expect(
      page.locator(`${Sel.favorites.item}[data-product-id="${addedId}"]`),
      `card do produto ${addedId} não deveria existir após reload`,
    ).toHaveCount(0, { timeout: 10_000 });

    // 8. Cleanup defensivo — restaura storage original
    await writeStorage(page, original);
  });
});
