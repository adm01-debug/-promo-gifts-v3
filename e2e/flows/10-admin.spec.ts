/**
 * Fluxo: Admin — guards de role.
 * Para usuário comum: deve negar acesso. Para admin: deve carregar.
 */
import { test, expect, requireAuth, requireAdmin } from "../fixtures/test-base";
import { gotoAndSettle } from "../helpers/nav";

test.describe("Fluxo: Admin guards", () => {
  test("usuário sem role admin não acessa /admin/usuarios", async ({ page }) => {
    requireAuth();
    test.skip(
      !!process.env.E2E_USER_IS_ADMIN,
      "Usuário de teste é admin — verificação de bloqueio não aplicável",
    );
    await page.goto("/admin/usuarios");
    // Pode redirecionar para / ou exibir 403 — aceitamos qualquer não-acesso
    await page.waitForTimeout(1500);
    const ok =
      !/\/admin\/usuarios/.test(page.url()) ||
      (await page.locator("text=/acesso negado|403|sem permiss/i").count()) > 0;
    expect(ok).toBeTruthy();
  });

  test("admin acessa /admin/usuarios", async ({ page }) => {
    requireAdmin();
    // Re-login como admin
    await page.goto("/login");
    await page.fill("#login-email", process.env.E2E_ADMIN_EMAIL!);
    await page.fill("#login-password", process.env.E2E_ADMIN_PASSWORD!);
    await page.click('button[type="submit"]');
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
    await gotoAndSettle(page, "/admin/usuarios");
    await expect(page).toHaveURL(/admin\/usuarios/);
  });
});
