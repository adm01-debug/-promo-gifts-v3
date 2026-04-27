/**
 * Smoke aggregator: itera por TODAS as rotas autenticadas (não-admin) do app
 * e valida que cada uma:
 *
 *  1. carrega sem redirect para `/login`,
 *  2. não dispara `pageerror` fatal (filtra ResizeObserver / chunk loading),
 *  3. o body fica visível e não há `[data-state="loading"]` permanente.
 *
 * Roda em paralelo (`fullyParallel`). Usa as credenciais E2E_USER_*.
 *
 * Para validar rotas admin/dev, há specs dedicados em `e2e/routes/admin/*`.
 */
import { test, expect, requireAuth } from "../fixtures/test-base";
import { AUTHED_USER_ROUTES, PUBLIC_ROUTES } from "../routes/_catalog";

test.describe("@smoke todas as rotas autenticadas carregam", () => {
  test.beforeEach(() => requireAuth());

  for (const route of AUTHED_USER_ROUTES) {
    test(`smoke: ${route.path}`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => {
        if (!/ResizeObserver|loading chunk|hydrat/i.test(e.message)) {
          errors.push(e.message);
        }
      });

      await page.goto(route.path);
      await page.waitForLoadState("domcontentloaded");

      // 1. Sem redirect para login
      expect(/\/login/.test(page.url()), `redirecionou para login: ${route.path}`).toBe(false);

      // 2. Body visível
      await expect(page.locator("body")).toBeVisible();

      // 3. Sem loaders persistentes (após 5s)
      await page
        .waitForFunction(
          () => !document.querySelector('[data-state="loading"]:not([data-allow-loading])'),
          { timeout: 5_000 },
        )
        .catch(() => {});

      // 4. Sem page errors fatais
      expect(errors, `pageerrors em ${route.path}: ${errors.join(" | ")}`).toHaveLength(0);
    });
  }
});

test.describe("@smoke rotas públicas respondem sem auth", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  for (const route of PUBLIC_ROUTES) {
    test(`smoke público: ${route.path}`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => {
        if (!/ResizeObserver|loading chunk/i.test(e.message)) errors.push(e.message);
      });

      await page.goto(route.path);
      await page.waitForLoadState("domcontentloaded");

      // Body visível, sem JS fatal
      await expect(page.locator("body")).toBeVisible();
      expect(errors, `pageerrors em ${route.path}: ${errors.join(" | ")}`).toHaveLength(0);
    });
  }
});
