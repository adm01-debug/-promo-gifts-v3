/**
 * Filtro puro para itens de navegação marcados com `devOnly` / `adminOnly`.
 *
 * Espelha a lógica usada em `SidebarNavGroup.renderNavLink` e
 * `SidebarReorganized` (filtro de grupos), permitindo testes unitários
 * sem montar o componente React.
 *
 * Regras:
 *  - `devOnly: true`   → visível somente para `isDev`.
 *  - `adminOnly: true` → visível somente para `isAdmin` (ou `isDev`, que é admin).
 *  - Sem flag         → visível para todos os autenticados.
 */

export interface NavFlagItem {
  devOnly?: boolean;
  adminOnly?: boolean;
}

export interface NavRoles {
  isDev: boolean;
  isAdmin: boolean;
}

export function isItemVisibleForRoles<T extends NavFlagItem>(
  item: T,
  roles: NavRoles,
): boolean {
  if (item.devOnly && !roles.isDev) return false;
  if (item.adminOnly && !roles.isAdmin) return false;
  return true;
}

export function filterDevOnlyItems<T extends NavFlagItem>(
  items: readonly T[],
  roles: NavRoles,
): T[] {
  return items.filter((item) => isItemVisibleForRoles(item, roles));
}
