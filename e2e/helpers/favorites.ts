/**
 * Helpers para favoritos em testes E2E.
 *
 * `installFavoritesCleanup(test)` registra um `beforeEach` que captura o
 * snapshot inicial do `localStorage["product-favorites"]` e um `afterEach`
 * que restaura esse snapshot — mesmo se o teste falhar no meio do fluxo.
 *
 * Equivalente a um `try/finally` por teste, sem precisar envolver cada
 * assertion em try/catch.
 */
import type { Page, TestType } from "@playwright/test";
import { expect } from "@playwright/test";
import { Sel } from "../fixtures/selectors";

const STORAGE_KEY = "product-favorites";

export interface FavoriteItem {
  productId: string;
  addedAt: string;
}

export async function readFavoritesStorage(page: Page): Promise<FavoriteItem[]> {
  return page.evaluate((key) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as FavoriteItem[]) : [];
    } catch {
      return [];
    }
  }, STORAGE_KEY);
}

export async function writeFavoritesStorage(
  page: Page,
  items: FavoriteItem[],
): Promise<void> {
  await page.evaluate(
    ({ key, value }) => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        /* noop */
      }
    },
    { key: STORAGE_KEY, value: items },
  );
}

/**
 * Registra cleanup automático do storage de favoritos por teste.
 *
 * Uso:
 *   import { test } from "../fixtures/test-base";
 *   import { installFavoritesCleanup } from "../helpers/favorites";
 *
 *   test.describe("...", () => {
 *     installFavoritesCleanup(test);
 *     test("...", async ({ page }) => { ... });
 *   });
 *
 * Estratégia:
 *   - beforeEach: navega para a origin do app (necessário para acessar
 *     localStorage) e tira snapshot do estado atual.
 *   - afterEach: restaura o snapshot, garantindo que mesmo falhas em
 *     asserções deixem o storage idêntico ao estado inicial. Falhas no
 *     próprio cleanup são engolidas (best-effort) para não mascarar a
 *     causa real do erro do teste.
 */
export function installFavoritesCleanup(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  testInstance: TestType<any, any>,
  opts: { warmupPath?: string } = {},
): void {
  const warmupPath = opts.warmupPath ?? "/produtos";
  const snapshots = new WeakMap<Page, FavoriteItem[]>();

  testInstance.beforeEach(async ({ page }) => {
    try {
      // Precisa estar na origin para localStorage estar acessível
      if (!/^https?:/.test(page.url())) {
        await page.goto(warmupPath, { waitUntil: "domcontentloaded" }).catch(() => {});
      }
      const snap = await readFavoritesStorage(page).catch(() => [] as FavoriteItem[]);
      snapshots.set(page, snap);
    } catch {
      snapshots.set(page, []);
    }
  });

  testInstance.afterEach(async ({ page }) => {
    const snap = snapshots.get(page);
    if (!snap) return;
    try {
      // Garante que estamos na origin para conseguir escrever no storage
      if (!/^https?:/.test(page.url())) {
        await page.goto(warmupPath, { waitUntil: "domcontentloaded" }).catch(() => {});
      }
      await writeFavoritesStorage(page, snap).catch(() => {});
    } catch {
      /* failsafe: nunca lança no cleanup para não mascarar a falha do teste */
    }
  });
}
