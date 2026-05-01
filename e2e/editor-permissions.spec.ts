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
        
        // Validação do Layout Padronizado 403
        await expect(page.locator("text=Identificador de Segurança")).toBeVisible();
        const pathSuffix = route.split('/').filter(Boolean).pop()?.toUpperCase() || 'ROOT';
        await expect(page.locator(".font-mono")).toContainText(`REQ-${pathSuffix}`); 
        
        // Garante que dados sensíveis (path completo) estão ocultos
        const fullContent = await page.locator('[role="alert"]').innerText();
        expect(fullContent).not.toContain("/admin/telemetria");
        expect(fullContent).not.toContain("/admin/seguranca");
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

    test("fluxo de logout redireciona para login e bloqueia acesso", async ({ page }) => {
      // 1. Garante que está logado e em uma rota permitida
      await gotoAndSettle(page, "/admin/usuarios");
      await expect(page).toHaveURL(/\/admin\/usuarios/);

      // 2. Realiza o logout
      await logout(page);

      // 3. Verifica redirecionamento para login
      await expect(page).toHaveURL(/\/login/);

      // 4. Tenta acessar uma rota restrita diretamente (Deep Linking)
      const targetPath = "/admin/usuarios";
      await page.goto(targetPath);

      // 5. Deve ser redirecionado para login
      await expect(page).toHaveURL(/\/login/);
      
      // 6. Verifica se o parâmetro 'from' está preservado no state do roteador
      // O ProtectedRoute do React Router geralmente armazena isso no history state
      const state = await page.evaluate(() => window.history.state);
      // No React Router v6+, a estrutura costuma ter o objeto 'usr' ou 'from'
      // mas o mais confiável é validar via comportamento de login ou checar se o link de retorno funciona
      
      // Para validar o state 'from' de forma conclusiva, fazemos o login e vemos se volta para targetPath
      await loginAs(page, "editor");
      await expect(page).toHaveURL(new RegExp(targetPath));
    });

    test("tentativa de chamada de API restrita após logout deve retornar 401/403", async ({ page, request }) => {
      // 1. Faz logout para garantir que não há tokens válidos
      await logout(page);

      // 2. Tenta fazer uma chamada direta via request API para um endpoint restrito
      // Usamos endpoints que sabemos que exigem autenticação/permissões específicas
      const restrictedEndpoints = [
        '/functions/v1/log-login-attempt',
        '/functions/v1/bridge-metrics', // Exemplo de endpoint técnico
      ];

      for (const endpoint of restrictedEndpoints) {
        const response = await request.post(endpoint, {
          data: { test: true }
        });
        
        // Deve retornar 401 (Unauthorized) ou 403 (Forbidden)
        // O status depende da implementação do Edge Function e do middleware do Supabase
        expect([401, 403]).toContain(response.status());
      }
    });
  });
});
