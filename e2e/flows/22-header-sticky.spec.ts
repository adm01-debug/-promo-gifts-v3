/**
 * Fluxo: Header sticky em todas as rotas autenticadas (SSOT = catálogo).
 *
 * Itera o catálogo central `e2e/routes/_catalog.ts` (AUTHED_USER_ROUTES e
 * ADMIN_ROUTES) e valida em cada rota:
 *  1. header inicia colado no topo (y ≈ 0);
 *  2. injeta spacer (se necessário) e rola para 1500px;
 *  3. header continua em y ≈ 0 após scroll;
 *  4. `getComputedStyle(header).position === "sticky"`.
 *
 * Rotas dinâmicas com placeholders (`SAMPLE_ID`/`SAMPLE_TOKEN`) são filtradas
 * — renderizariam estado vazio/erro e sujariam o sinal.
 *
 * Rotas que redirecionam para /login (por falta de role) são puladas com
 * skip explícito em vez de falhar.
 *
 * Protege contra a regressão histórica em que `overflow-x-hidden` em
 * ancestral do Header em `src/components/layout/MainLayout.tsx` transformava
 * o wrapper em scroll container, fazendo o header rolar junto com o conteúdo.
 */
import { test, expect, requireAuth, requireAdmin } from "../fixtures/test-base";
import { gotoAndSettle } from "../helpers/nav";
import { waitForTestIdVisible } from "../helpers/waits";
import { Sel } from "../fixtures/selectors";
import {
  AUTHED_USER_ROUTES,
  ADMIN_ROUTES,
  SAMPLE_ID,
  SAMPLE_TOKEN,
  type RouteEntry,
} from "../routes/_catalog";

// Tolerância em px para acomodar a transição de altura do header
// (h-14 → h-12 quando isScrolled ativa).
const Y_TOLERANCE_PX = 2;

/** Filtra rotas dinâmicas que dependem de IDs/tokens reais. */
function staticRoutes(routes: readonly RouteEntry[]): RouteEntry[] {
  return routes.filter(
    (r) => !r.path.includes(SAMPLE_ID) && !r.path.includes(SAMPLE_TOKEN),
  );
}

/**
 * Núcleo da asserção: navega, valida sticky, rola, revalida.
 * Retorna `true` se passou, `false` se a rota redirecionou para /login.
 */
async function assertHeaderSticky(
  page: import("@playwright/test").Page,
  routePath: string,
): Promise<"ok" | "redirected-to-login"> {
  await gotoAndSettle(page, routePath);

  if (/\/login(\?|$)/.test(page.url())) {
    return "redirected-to-login";
  }

  await waitForTestIdVisible(page, "app-header");
  const header = page.locator(Sel.app.header);

  const initialBox = await header.boundingBox();
  expect(initialBox, `header sem boundingBox inicial em ${routePath}`).not.toBeNull();
  expect(
    initialBox!.y,
    `Header não inicia no topo em ${routePath} (y=${initialBox!.y})`,
  ).toBeLessThanOrEqual(Y_TOLERANCE_PX);

  await page.evaluate(() => {
    if (document.body.scrollHeight < window.innerHeight + 2000) {
      const spacer = document.createElement("div");
      spacer.style.height = "2400px";
      spacer.setAttribute("data-e2e-spacer", "");
      document.body.appendChild(spacer);
    }
    window.scrollTo(0, 1500);
  });

  await page.waitForFunction(() => window.scrollY > 1000, { timeout: 3000 });

  const scrolledBox = await header.boundingBox();
  expect(scrolledBox, `header sem boundingBox após scroll em ${routePath}`).not.toBeNull();
  expect(
    scrolledBox!.y,
    `Header deveria continuar fixo no topo em ${routePath} (y=${scrolledBox!.y})`,
  ).toBeLessThanOrEqual(Y_TOLERANCE_PX);

  const position = await header.evaluate((el) => getComputedStyle(el).position);
  expect(position, `Header em ${routePath} não está sticky`).toBe("sticky");

  return "ok";
}

test.describe("Header sticky — rotas autenticadas (app + quotes)", () => {
  test.describe.configure({ mode: "parallel" });
  test.beforeEach(() => requireAuth());

  for (const route of staticRoutes(AUTHED_USER_ROUTES)) {
    test(`header permanece fixo ao rolar em ${route.path}`, async ({ page }) => {
      const result = await assertHeaderSticky(page, route.path);
      test.skip(
        result === "redirected-to-login",
        `Rota ${route.path} redirecionou para /login (role insuficiente para o usuário E2E)`,
      );
    });
  }
});

test.describe("Header sticky — rotas admin", () => {
  test.describe.configure({ mode: "parallel" });
  test.beforeEach(() => requireAdmin());

  for (const route of staticRoutes(ADMIN_ROUTES)) {
    test(`header permanece fixo ao rolar em ${route.path}`, async ({ page }) => {
      const result = await assertHeaderSticky(page, route.path);
      test.skip(
        result === "redirected-to-login",
        `Rota ${route.path} redirecionou para /login (admin sem role dev?)`,
      );
    });
  }
});
