import { ReactNode } from 'react';
import { useRBAC } from '@/hooks/useRBAC';

interface PermissionGateProps {
  children: ReactNode;
  permission?: { action: string; resource: string };
  roles?: Array<'admin' | 'manager' | 'seller'>;
  fallback?: ReactNode;
  requireAll?: boolean;
}

export function PermissionGate({
  children,
  permission,
  roles,
  fallback = null,
  requireAll = false,
}: PermissionGateProps) {
  const { hasPermission, hasRole, isLoading } = useRBAC();

  if (isLoading) {
    return null;
  }

  let hasAccess = false;

  if (permission && roles) {
    const permissionCheck = hasPermission(permission.action, permission.resource);
    const roleCheck = hasRole(...roles);
    hasAccess = requireAll ? permissionCheck && roleCheck : permissionCheck || roleCheck;
  } else if (permission) {
    hasAccess = hasPermission(permission.action, permission.resource);
  } else if (roles) {
    hasAccess = hasRole(...roles);
  }

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
