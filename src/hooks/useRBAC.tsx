import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

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

/**
 * Mapeia permission_code do banco para o formato action/resource
 * Ex: "create_quotes" → { action: "create", resource: "quotes" }
 */
function parsePermissionCode(code: string): Permission {
  const idx = code.indexOf('_');
  if (idx === -1) return { action: code, resource: '*' };
  return {
    action: code.substring(0, idx),
    resource: code.substring(idx + 1),
  };
}

/**
 * Hook de RBAC dinâmico — busca permissões da tabela role_permissions no banco.
 * Fallback hardcoded para admin (wildcard) garante acesso mesmo se a query falhar.
 */
export function useRBAC() {
  const { role: authRole, isLoading: authLoading, profile, user } = useAuth();

  const getRoleName = (): RoleName => {
    const roleStr = authRole || 'seller';
    if (roleStr === 'vendedor') return 'seller';
    if (['admin', 'manager', 'seller'].includes(roleStr)) return roleStr as RoleName;
    return 'seller';
  };

  const roleName = getRoleName();

  // Map RoleName back to the DB enum for querying
  const dbRole = roleName === 'seller' ? 'vendedor' : roleName;

  const { data: dbPermissions, isLoading: permissionsLoading } = useQuery({
    queryKey: ['role-permissions', dbRole],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('permission_code')
        .eq('role', dbRole);

      if (error) {
        console.warn('Failed to fetch role permissions, using fallback:', error.message);
        return null;
      }
      return data.map((row: { permission_code: string }) => row.permission_code);
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 min cache
    gcTime: 10 * 60 * 1000,
  });

  const permissions = useMemo<Permission[]>(() => {
    // Admin always has wildcard access
    if (roleName === 'admin') {
      return [{ action: '*', resource: '*' }];
    }

    if (!dbPermissions) return [];

    return dbPermissions.map(parsePermissionCode);
  }, [roleName, dbPermissions]);

  const role: Role = {
    id: profile?.id || '',
    name: roleName,
    description: getDescriptionForRole(roleName),
  };

  const hasPermission = (action: string, resource: string): boolean => {
    return permissions.some(
      (p) =>
        (p.action === '*' || p.action === action) &&
        (p.resource === '*' || p.resource === resource)
    );
  };

  const hasPermissionByCode = (code: string): boolean => {
    if (roleName === 'admin') return true;
    return dbPermissions?.includes(code) ?? false;
  };

  const hasRole = (...roles: RoleName[]): boolean => roles.includes(roleName);

  const isAdmin = roleName === 'admin';
  const isManagerOrAbove = roleName === 'admin' || roleName === 'manager';

  const getPermissions = (): Permission[] => permissions;

  return {
    role,
    isLoading: authLoading || permissionsLoading,
    hasPermission,
    hasPermissionByCode,
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
  };
  return descriptions[role] || 'Vendedor';
}

export default useRBAC;
