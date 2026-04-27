/**
 * E2E: validação básica do formulário de login (sem credenciais reais).
 *
 * Usa exclusivamente helpers SSOT: `gotoAndSettle`, `loginViaUI`,
 * `expectVisibleByTestId` — proibido `page.goto`/`waitForTimeout` direto.
 */
import { test, expect } from "./fixtures/test-base";
import { gotoAndSettle } from "./helpers/nav";
import { loginViaUI, expectUnauthenticated } from "./helpers/auth";
import { expectVisibleByTestId } from "./helpers/waits";

test.describe("Login Page", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("exibe formulário de login", async ({ page }) => {
    await gotoAndSettle(page, "/login");
    await expectVisibleByTestId(page, "login-email-input");
    await expectVisibleByTestId(page, "login-password-input");
    await expectVisibleByTestId(page, "login-submit");
  });

  test("submit vazio mantém usuário em /login", async ({ page }) => {
    await gotoAndSettle(page, "/login");
    await page.locator('[data-testid="login-submit"]').click();
    await expectUnauthenticated(page);
  });

  test("credenciais inválidas mantêm usuário em /login", async ({ page }) => {
    await loginViaUI(page, {
      email: "invalid@test.com",
      password: "wrongpassword123",
      expectFail: true,
    });
    await expectUnauthenticated(page);
    expect(page.url()).toMatch(/\/login/);
  });
});
