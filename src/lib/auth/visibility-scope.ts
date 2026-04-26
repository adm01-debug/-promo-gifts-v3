/**
 * visibility-scope — determina o escopo de visibilidade de dados de vendas
 * para o usuário autenticado, com base nos papéis (user_roles).
 *
 * - "all"    → admin, manager, dev (vê tudo)
 * - "team"   → supervisor (vê dados do time / mesma organização)
 * - "self"   → vendedor (vê apenas os próprios dados)
 *
 * O isolamento real é feito por RLS no banco; este helper serve para a UI
 * decidir se aplica filtros adicionais por seller_id e para exibir o
 * badge "Apenas seus dados".
 */
import { useMemo } from "react";
import { useUserRole } from "@/hooks/useUserRole";

export type SalesScope = "all" | "team" | "self";

export function useSalesScope(): SalesScope {
  const { role, isAdmin } = useUserRole();
  return useMemo<SalesScope>(() => {
    if (isAdmin || role === "manager" || role === "dev") return "all";
    if (role === "supervisor") return "team";
    return "self";
  }, [role, isAdmin]);
}

export function isOnlySelf(scope: SalesScope): boolean {
  return scope === "self";
}
