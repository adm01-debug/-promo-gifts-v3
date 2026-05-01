/**
 * E2E: Matriz de Permissões Automatizada
 * 
 * Este arquivo utiliza a matriz de permissões definida em permissions-matrix.ts
 * para parametrizar e executar testes de acesso de forma escalável.
 */
import { test, expect } from "./fixtures/test-base";
import { loginAs, logout, Role as AuthRole } from "./helpers/auth";
import { gotoAndSettle } from "./helpers/nav";
import { PERMISSION_MATRIX, Role } from "./fixtures/permissions-matrix";

test.describe("Matriz de Permissões Automatizada", () => {

  // Mapeamento de nomes de role da matriz para o helper loginAs
  const roleMap: Record<Exclude<Role, "publico">, AuthRole> = {
    agente: "user",
    supervisor: "admin",
    dev: "dev"
  };

  // Testa cada papel definido na matriz
  for (const [role, routes] of Object.entries(PERMISSION_MATRIX)) {
    test.describe(`Perfil: ${role}`, () => {
      
      test.beforeEach(async ({ page }) => {
        if (role === "publico") {
          await logout(page);
        } else {
          await loginAs(page, roleMap[role as keyof typeof roleMap]);
        }
      });

      // Testa cada rota para o papel atual
      for (const route of routes) {
        test(`acesso a ${route.path} deve resultar em ${route.expectedBehavior}`, async ({ page }) => {
          await gotoAndSettle(page, route.path);

          switch (route.expectedBehavior) {
            case "allow":
              // Garante que não houve redirect para login ou home
              await expect(page).not.toHaveURL(/\/login/);
              if (route.path !== "/") {
                await expect(page).toHaveURL(new RegExp(route.path));
              }
              // Garante que não há overlay de acesso negado
              await expect(page.locator("text=Acesso restrito")).not.toBeVisible();
              break;

            case "deny_login":
              await expect(page).toHaveURL(/\/login/);
              break;

            case "deny_redirect_home":
              // O ProtectedRoute redireciona para "/" quando o papel é insuficiente
              await expect(page).toHaveURL(/\/($|#)/);
              break;

            case "deny_403":
              // O DevRoute exibe a página de erro 403 (DevAccessDeniedPage)
              await expect(page.locator("text=Acesso restrito")).toBeVisible();
              await expect(page.locator("text=403")).toBeVisible();
              break;
          }
        });
      }
    });
  }
});
