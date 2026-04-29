/**
 * Fluxo: Header sticky em todos os módulos.
 *
 * Protege contra regressão do `position: sticky` do Header global. A causa
 * raiz já corrigida foi `overflow-x-hidden` em ancestral do Header em
 * `src/components/layout/MainLayout.tsx`, que transformava o wrapper em
 * scroll container e fazia o header rolar junto com o conteúdo.
 *
 * Em cada rota:
 *  1. confirma que o header inicia colado no topo (y ≈ 0);
 *  2. injeta um spacer (se necessário) e rola para 1500px;
 *  3. confirma que o header continua em y ≈ 0;
 *  4. confirma que `getComputedStyle(header).position === "sticky"`.
 */
import { test, expect, requireAuth } from "../fixtures/test-base";
import { gotoAndSettle } from "../helpers/nav";
import { waitForTestIdVisible } from "../helpers/waits";
import { Sel } from "../fixtures/selectors";

const ROUTES = [
  "/produtos",
  "/pedidos",
  "/favoritos",
  "/colecoes",
  "/dashboard",
  "/novidades",
];

// Tolerância em px para acomodar a transição de altura do header
// (h-14 → h-12 quando isScrolled ativa).
const Y_TOLERANCE_PX = 2;

test.describe("Header sticky em todos os módulos", () => {
  test.beforeEach(() => requireAuth());

  for (const route of ROUTES) {
    test(`header permanece fixo ao rolar em ${route}`, async ({ page }) => {
      await gotoAndSettle(page, route);
      await waitForTestIdVisible(page, "app-header");

      const header = page.locator(Sel.app.header);

      const initialBox = await header.boundingBox();
      expect(initialBox, "header sem boundingBox inicial").not.toBeNull();
      expect(initialBox!.y).toBeLessThanOrEqual(Y_TOLERANCE_PX);

      // Garante altura suficiente para rolar e força o scroll do viewport.
      await page.evaluate(() => {
        if (document.body.scrollHeight < window.innerHeight + 2000) {
          const spacer = document.createElement("div");
          spacer.style.height = "2400px";
          spacer.setAttribute("data-e2e-spacer", "");
          document.body.appendChild(spacer);
        }
        window.scrollTo(0, 1500);
      });

      await page.waitForFunction(() => window.scrollY > 1000, {
        timeout: 3000,
      });

      const scrolledBox = await header.boundingBox();
      expect(scrolledBox, "header sem boundingBox após scroll").not.toBeNull();
      expect(
        scrolledBox!.y,
        `Header deveria continuar fixo no topo em ${route} (y=${scrolledBox!.y})`,
      ).toBeLessThanOrEqual(Y_TOLERANCE_PX);

      const position = await header.evaluate(
        (el) => getComputedStyle(el).position,
      );
      expect(position, `Header em ${route} não está sticky`).toBe("sticky");
    });
  }
});
