/**
 * Matriz de Permissões SSOT (Single Source of Truth) para testes E2E.
 * Mapeia papéis (roles) para rotas e comportamentos esperados.
 */

export type Role = "agente" | "supervisor" | "dev" | "publico";

export interface PermissionRoute {
  path: string;
  /** Permite testar rotas com parâmetros. Pode ser um objeto simples ou um array de objetos para múltiplos cenários. */
  params?: Record<string, string> | Record<string, string>[];
  expectedBehavior: "allow" | "deny_redirect_home" | "deny_403" | "deny_login" | "deny_404";
}

/** Helper para resolver os paths reais substituindo parâmetros. Retorna um array para suportar múltiplos valores. */
export function resolvePaths(route: PermissionRoute): string[] {
  const paramsArray = Array.isArray(route.params) 
    ? route.params 
    : [route.params || {}];

  return paramsArray.map(params => {
    let finalPath = route.path;
    for (const [key, value] of Object.entries(params)) {
      // Replaces all occurrences of :parameterName
      finalPath = finalPath.split(`:${key}`).join(value);
    }
    return finalPath;
  });
}

export const PERMISSION_MATRIX: Record<Role, PermissionRoute[]> = {
  publico: [
    { path: "/login", expectedBehavior: "allow" },
    { path: "/produtos", expectedBehavior: "deny_login" },
    { path: "/orcamentos/:id", params: [{ id: "std-quote-789" }, { id: "another-quote-456" }], expectedBehavior: "deny_login" },
    { path: "/admin/usuarios", expectedBehavior: "deny_login" },
    { 
      path: "/admin/cadastros/produto/:id/variante/:variantId", 
      params: { id: "std-prod-123", variantId: "std-var-001" }, 
      expectedBehavior: "deny_login" 
    },
    { 
      path: "/orcamentos/:id/itens/:itemId", 
      params: { id: "non-existent-777", itemId: "invalid-item-999" }, 
      expectedBehavior: "deny_login" 
    },
  ],
  agente: [
    { path: "/produtos", expectedBehavior: "allow" },
    { path: "/orcamentos", expectedBehavior: "allow" },
    { path: "/orcamentos/:id", params: { id: "test-quote-123" }, expectedBehavior: "allow" },
    { path: "/orcamentos/:id/editar", params: { id: "test-quote-123" }, expectedBehavior: "allow" },
    { 
      path: "/orcamentos/:id/itens/:itemId", 
      params: { id: "test-quote-123", itemId: "item-789" }, 
      expectedBehavior: "allow" 
    },
    { path: "/admin/usuarios", expectedBehavior: "deny_redirect_home" },
    { 
      path: "/admin/cadastros/produto/:id/variante/:variantId", 
      params: { id: "p-123", variantId: "v-456" }, 
      expectedBehavior: "deny_redirect_home" 
    },
    { 
      path: "/orcamentos/:id/itens/:itemId", 
      params: { id: "valid-quote", itemId: "invalid-item" }, 
      expectedBehavior: "deny_404" 
    },
    { 
      path: "/orcamentos/:id/itens/:itemId", 
      params: { id: "non-existent", itemId: "non-existent-item" }, 
      expectedBehavior: "deny_404" 
    },
    { path: "/rota-fantasma", expectedBehavior: "deny_404" },
    { path: "/orcamentos/:id", params: { id: "inexistente-123" }, expectedBehavior: "deny_404" },
  ],
  supervisor: [
    { path: "/produtos", expectedBehavior: "allow" },
    { path: "/admin/usuarios", expectedBehavior: "allow" },
    { path: "/admin/cadastros", expectedBehavior: "allow" },
    { path: "/admin/non-existent-area", expectedBehavior: "deny_404" },
    { path: "/admin/cadastros/produto/:id", params: { id: "test-prod-123" }, expectedBehavior: "allow" },
    { 
      path: "/admin/cadastros/produto/:id/variante/:variantId", 
      params: { id: "test-prod-123", variantId: "v-blue" }, 
      expectedBehavior: "allow" 
    },
    { path: "/admin/telemetria", expectedBehavior: "deny_403" },
    { path: "/admin/telemetria/:id", params: { id: "invalid-id-123" }, expectedBehavior: "deny_403" },
    { 
      path: "/admin/workflows/:workflowId/runs/:runId", 
      params: { workflowId: "wf-1", runId: "run-99" }, 
      expectedBehavior: "deny_403" 
    },
  ],
  dev: [
    { path: "/admin/telemetria", expectedBehavior: "allow" },
    { path: "/admin/cadastros/produto/:id", params: { id: "test-prod-123" }, expectedBehavior: "allow" },
  ],
};

