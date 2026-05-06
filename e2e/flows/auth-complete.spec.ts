/**
 * E2E: Fluxo de Autenticação Completo
 * 
 * Valida Login, Sessão Persistente e Logout garantindo que o ciclo de vida
 * do usuário na plataforma esteja 10/10.
 */
import { test, expect } from "../fixtures/test-base";
import { 
  loginAs, 
  loginViaUI, 
  logout, 
  expectAuthenticated, 
  expectUnauthenticated 
} from "../helpers/auth";
import { gotoAndSettle } from "../helpers/nav";

test.describe("E2E: Fluxo de Autenticação @smoke", () => {
  // Limpa estado para cada teste para garantir isolamento
  test.use({ storageState: { cookies: [], origins: [] } });

  test("Deve realizar login com sucesso e redirecionar para o dashboard", async ({ page }) => {
    const email = process.env.E2E_USER_EMAIL;
    const password = process.env.E2E_USER_PASSWORD;

    test.skip(!email || !password, "Credenciais de teste não configuradas");

    await loginViaUI(page, { email: email!, password: password! });
    
    // Valida redirecionamento final e estado autenticado
    await expectAuthenticated(page);
    await expect(page).toHaveURL(/\/dashboard|\/$/);
    
    // Valida elementos da UI que só aparecem logados
    await expect(page.locator('[data-testid="sidebar-link-dashboard"]')).toBeVisible();
  });

  test("Deve persistir a sessão após recarregar a página", async ({ page }) => {
    const email = process.env.E2E_USER_EMAIL;
    const password = process.env.E2E_USER_PASSWORD;
    test.skip(!email || !password, "Credenciais de teste não configuradas");

    await loginViaUI(page, { email: email!, password: password! });
    await expectAuthenticated(page);

    // Simula refresh do navegador
    await page.reload();
    await expectAuthenticated(page);
    
    // Valida que não houve redirecionamento para login
    expect(page.url()).not.toContain("/login");
  });

  test("Deve realizar logout com sucesso e limpar sessão", async ({ page }) => {
    const email = process.env.E2E_USER_EMAIL;
    const password = process.env.E2E_USER_PASSWORD;
    test.skip(!email || !password, "Credenciais de teste não configuradas");

    await loginViaUI(page, { email: email!, password: password! });
    await expectAuthenticated(page);

    // Executa logout
    await logout(page);
    
    // Valida estado deslogado
    await expectUnauthenticated(page);
    await expect(page).toHaveURL(/\/login/);
    
    // Tenta acessar rota protegida e deve ser barrado
    await gotoAndSettle(page, "/dashboard");
    await expectUnauthenticated(page);
  });

  test("Deve exibir erro ao tentar login com credenciais inválidas", async ({ page }) => {
    await loginViaUI(page, { 
      email: "invalido@promogifts.com.br", 
      password: "errada", 
      expectFail: true 
    });
    
    await expectUnauthenticated(page);
    // Valida mensagem de erro visual
    await expect(page.locator('[data-testid="login-error-msg"]')).toBeVisible();
  });
});
