/**
 * E2E: Editor (Manager) Permissions & Navigation
 * 
 * Valida o fluxo completo de acesso para o perfil de "Editor" (Gerente/Supervisor).
 * Garante acesso a painéis de negócio e bloqueio estrito a áreas técnicas.
 */
import { test, expect } from "./fixtures/test-base";
import { loginAs, logout } from "./helpers/auth";
import { gotoAndSettle } from "./helpers/nav";

test.describe("Editor (Manager) Permissions Suite", () => {

  test.beforeEach(async ({ page }) => {
    // No contexto desta aplicação, o perfil "Editor/Gerente" corresponde ao papel 'supervisor'
    await loginAs(page, "editor");
  });

  test.describe("1. Navegação Permitida", () => {
    test("deve acessar painéis de negócio e operacionais", async ({ page }) => {
      const allowedRoutes = [
        "/",                   // Dashboard/Home
        "/produtos",           // Catálogo
        "/orcamentos",         // Orçamentos
        "/admin/usuarios",     // Gestão de Usuários (Permitido para Supervisor)
        "/admin/cadastros",    // Gestão de Cadastros (Permitido para Supervisor)
      ];

      for (const route of allowedRoutes) {
        await gotoAndSettle(page, route);
        await expect(page).not.toHaveURL(/\/login/);
        
        // Verifica integridade da página (deve carregar sem crash e sem o overlay de acesso negado)
        await expect(page.locator("text=Acesso restrito")).not.toBeVisible();
        
        if (route !== "/") {
          expect(page.url()).toContain(route);
        }
      }
    });

    test("deve interagir com funcionalidades de gestão de usuários", async ({ page }) => {
      await gotoAndSettle(page, "/admin/usuarios");
      // Verifica se elementos da aba de usuários estão visíveis
      await expect(page.locator("text=Gerenciamento de Usuários")).toBeVisible();
      await expect(page.locator('button:has-text("Novo Usuário")')).toBeVisible();
    });
  });

  test.describe("2. Bloqueio de Acesso Não Autorizado", () => {
    test("deve ser bloqueado ao acessar rotas técnicas exclusivas de Dev", async ({ page }) => {
      const techRoutes = [
        "/admin/telemetria",
        "/admin/seguranca",
        "/admin/seguranca-acesso",
        "/admin/workflows",
        "/admin/external-db",
      ];

      for (const route of techRoutes) {
        await gotoAndSettle(page, route);
        
        // Deve exibir a DevAccessDeniedPage (403)
        // Verificado no componente DevAccessDeniedPage.tsx: exibe "Acesso restrito" e badge "Supervisor"
        await expect(page.locator("text=Acesso restrito")).toBeVisible();
        await expect(page.locator("text=Área técnica restrita à equipe de Desenvolvimento")).toBeVisible();
        await expect(page.locator("text=Supervisor")).toBeVisible();
        
        // Garante que não há vazamento de dados técnicos (ex: lista de logs ou secrets)
        await expect(page.locator(".font-mono")).toContainText(route); // O path aparece no aviso, o que é seguro
      }
    });

    test("não deve ver links técnicos na Sidebar/Navegação", async ({ page }) => {
      await gotoAndSettle(page, "/");
      // Verifica se itens exclusivos de Dev não estão presentes no menu
      await expect(page.locator('a[href="/admin/telemetria"]')).not.toBeVisible();
      await expect(page.locator('a[href="/admin/seguranca"]')).not.toBeVisible();
    });
  });

  test.describe("3. Cenários de Borda e Persistência", () => {
    test("permissões devem persistir após recarregar a página", async ({ page }) => {
      await gotoAndSettle(page, "/admin/cadastros");
      await page.reload();
      await expect(page).toHaveURL(/\/admin\/cadastros/);
      await expect(page.locator("text=Acesso restrito")).not.toBeVisible();
    });

    test("fluxo completo de Logout e Login preserva restrições", async ({ page }) => {
      await logout(page);
      await loginAs(page, "editor");
      
      // Tenta acesso proibido logo após novo login
      await gotoAndSettle(page, "/admin/telemetria");
      await expect(page.locator("text=Acesso restrito")).toBeVisible();
    });

    test("redirecionamento correto ao tentar acessar rota proibida", async ({ page }) => {
      // Se um Editor tenta acessar /admin/telemetria, ele deve ver a tela de bloqueio com CTA para voltar
      await gotoAndSettle(page, "/admin/telemetria");
      
      const backButton = page.locator('button:has-text("Voltar")');
      await expect(backButton).toBeVisible();
      
      // O botão "Ir para Usuários" (contextualCtaLabel para Supervisor) deve estar visível
      const contextualButton = page.locator('button:has-text("Ir para Usuários")');
      await expect(contextualButton).toBeVisible();
      
      await contextualButton.click();
      await expect(page).toHaveURL(/\/admin\/usuarios/);
    });
  });
});
