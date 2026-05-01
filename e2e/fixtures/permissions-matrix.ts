/**
 * Matriz de Permissões SSOT (Single Source of Truth) para testes E2E.
 * Mapeia papéis (roles) para rotas e comportamentos esperados.
 */

export type Role = "agente" | "supervisor" | "dev" | "publico";

export interface PermissionRoute {
  path: string;
  expectedBehavior: "allow" | "deny_redirect_home" | "deny_403" | "deny_login";
}

export const PERMISSION_MATRIX: Record<Role, PermissionRoute[]> = {
  publico: [
    { path: "/login", expectedBehavior: "allow" },
    { path: "/produtos", expectedBehavior: "deny_login" },
    { path: "/admin/usuarios", expectedBehavior: "deny_login" },
  ],
  agente: [
    { path: "/produtos", expectedBehavior: "allow" },
    { path: "/orcamentos", expectedBehavior: "allow" },
    { path: "/admin/usuarios", expectedBehavior: "deny_redirect_home" },
    { path: "/admin/telemetria", expectedBehavior: "deny_redirect_home" },
  ],
  supervisor: [
    { path: "/produtos", expectedBehavior: "allow" },
    { path: "/admin/usuarios", expectedBehavior: "allow" },
    { path: "/admin/cadastros", expectedBehavior: "allow" },
    { path: "/admin/telemetria", expectedBehavior: "deny_403" },
    { path: "/admin/seguranca", expectedBehavior: "deny_403" },
  ],
  dev: [
    { path: "/produtos", expectedBehavior: "allow" },
    { path: "/admin/usuarios", expectedBehavior: "allow" },
    { path: "/admin/telemetria", expectedBehavior: "allow" },
    { path: "/admin/seguranca", expectedBehavior: "allow" },
    { path: "/admin/workflows", expectedBehavior: "allow" },
  ],
};
