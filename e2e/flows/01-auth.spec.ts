/**
 * Fluxo: Auth — login OK, credenciais inválidas, validação, esqueci-senha.
 * Roda no project chromium-authed mas usa storageState vazio para os casos
 * de tela de login pública (limpa cookies antes).
 *
 * Seletores: SSOT em e2e/fixtures/selectors.ts (Sel.login).
 */
import { test, expect, requireAuth } from "../fixtures/test-base";
import { Sel } from "../fixtures/selectors";

test.describe("Fluxo: Auth", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("renderiza form de login com elementos essenciais", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator(Sel.login.email)).toBeVisible();
    await expect(page.locator(Sel.login.password)).toBeVisible();
    await expect(page.locator(Sel.login.submit).first()).toBeVisible();
  });

  test("rejeita credenciais inválidas e permanece em /login", async ({ page }) => {
    await page.goto("/login");
    await page.fill(Sel.login.email, "naoexiste@example.com");
    await page.fill(Sel.login.password, "SenhaErrada123");
    await page.locator(Sel.login.submit).first().click();
    await page.waitForTimeout(2500);
    await expect(page).toHaveURL(/login/);
  });

  test("valida email malformado", async ({ page }) => {
    await page.goto("/login");
    await page.fill(Sel.login.email, "naoehemail");
    await page.fill(Sel.login.password, "Senha123");
    await page.locator(Sel.login.submit).first().click();
    await expect(page.locator("text=/Email inválido|inválido/i").first()).toBeVisible({
      timeout: 4000,
    });
  });

  test("alterna visibilidade da senha", async ({ page }) => {
    await page.goto("/login");
    const pwd = page.locator(Sel.login.password);
    await expect(pwd).toHaveAttribute("type", "password");
    const toggle = page.locator(Sel.login.toggle).first();
    if (await toggle.count()) {
      await toggle.click();
      await expect(pwd).toHaveAttribute("type", "text");
    }
  });

  test("abre fluxo de esqueci minha senha", async ({ page }) => {
    await page.goto("/login");
    const link = page.locator(Sel.login.forgot).first();
    if (await link.count()) {
      await link.click();
      await expect(page.locator("text=/Recuperar senha/i")).toBeVisible({ timeout: 3000 });
    }
  });

  test("login com credenciais válidas redireciona para app", async ({ page }) => {
    requireAuth();
    await page.goto("/login");
    await page.fill(Sel.login.email, process.env.E2E_USER_EMAIL!);
    await page.fill(Sel.login.password, process.env.E2E_USER_PASSWORD!);
    await page.locator(Sel.login.submit).first().click();
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
  });
});
