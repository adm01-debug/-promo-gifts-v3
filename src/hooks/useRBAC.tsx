import { useAuth } from '@/contexts/AuthContext';

export type RoleName = 'admin' | 'manager' | 'seller';

export interface Role {
  id: string;
  name: RoleName;
  description: string | null;
}

export interface Permission {
  action: string;
  resource: string;
}

// Define permissions for each role
const rolePermissions: Record<RoleName, Permission[]> = {
  admin: [
    { action: '*', resource: '*' }, // Full access
  ],
  manager: [
    { action: 'read', resource: '*' },
    { action: 'create', resource: 'quotes' },
    { action: 'update', resource: 'quotes' },
    { action: 'delete', resource: 'quotes' },
    { action: 'approve', resource: 'quotes' },
    { action: 'create', resource: 'orders' },
    { action: 'update', resource: 'orders' },
    { action: 'read', resource: 'reports' },
    { action: 'manage', resource: 'team' },
    // Permissões de cadastro de produtos
    { action: 'create', resource: 'products' },
    { action: 'update', resource: 'products' },
    { action: 'delete', resource: 'products' },
    { action: 'import', resource: 'products' },
    { action: 'manage', resource: 'suppliers' },
    { action: 'manage', resource: 'categories' },
  ],
  seller: [
    { action: 'read', resource: 'products' },
    { action: 'read', resource: 'clients' },
    { action: 'create', resource: 'quotes' },
    { action: 'update', resource: 'quotes' },
    { action: 'read', resource: 'quotes' },
    { action: 'create', resource: 'orders' },
    { action: 'read', resource: 'orders' },
    { action: 'read', resource: 'mockups' },
    { action: 'create', resource: 'mockups' },
  ],
  viewer: [
    { action: 'read', resource: 'products' },
    { action: 'read', resource: 'quotes' },
    { action: 'read', resource: 'orders' },
  ],
};

/**
 * Hook de RBAC que usa role do AuthContext (fonte: tabela user_roles)
 * SEGURO: não usa profile.role (coluna editável pelo usuário)
 */
export function useRBAC() {
  const { role: authRole, isLoading: authLoading, profile } = useAuth();
  
  // Mapear role do user_roles (via AuthContext) para RoleName
  const getRoleName = (): RoleName => {
    const roleStr = authRole || 'seller';
    // Suporte para "vendedor" (valor do enum no banco) → "seller" (valor interno do RBAC)
    if (roleStr === 'vendedor') return 'seller';
    if (['admin', 'manager', 'seller', 'viewer'].includes(roleStr)) {
      return roleStr as RoleName;
    }
    return 'seller'; // Default
  };

  const roleName = getRoleName();
  
  const role: Role = {
    id: profile?.id || '',
    name: roleName,
    description: getDescriptionForRole(roleName),
  };

  /**
   * Check if user has permission to perform an action on a resource
   */
  const hasPermission = (action: string, resource: string): boolean => {
    const permissions = rolePermissions[roleName] || [];
    
    return permissions.some(p => 
      (p.action === '*' || p.action === action) &&
      (p.resource === '*' || p.resource === resource)
    );
  };

  /**
   * Check if user has any of the specified roles
   */
  const hasRole = (...roles: RoleName[]): boolean => {
    return roles.includes(roleName);
  };

  /**
   * Check if user is admin
   */
  const isAdmin = roleName === 'admin';

  /**
   * Check if user is manager or above
   */
  const isManagerOrAbove = roleName === 'admin' || roleName === 'manager';

  /**
   * Get all permissions for current role
   */
  const getPermissions = (): Permission[] => {
    return rolePermissions[roleName] || [];
  };

  return {
    role,
    isLoading: authLoading,
    hasPermission,
    hasRole,
    isAdmin,
    isManagerOrAbove,
    getPermissions,
  };
}

function getDescriptionForRole(role: RoleName): string {
  const descriptions: Record<RoleName, string> = {
    admin: 'Administrador',
    manager: 'Gerente',
    seller: 'Vendedor',
    viewer: 'Visualizador',
  };
  return descriptions[role] || 'Vendedor';
}

export default useRBAC;
