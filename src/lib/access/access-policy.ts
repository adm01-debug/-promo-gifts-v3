import { AppRole } from '@/contexts/AuthContext';

export interface AccessPolicy {
  requiredRole?: AppRole;
  requireMfa?: boolean;
  requireDev?: boolean;
}

export const checkAccess = (
  userRoles: AppRole[],
  currentAAL: string | null,
  policy: AccessPolicy,
): { allowed: boolean; reason?: 'unauthenticated' | 'insufficient_role' | 'mfa_required' } => {
  const { requiredRole, requireMfa, requireDev } = policy;

  if (requireDev && !userRoles.includes('dev')) {
    return { allowed: false, reason: 'insufficient_role' };
  }

  if (requiredRole) {
    const isSupervisorOrAbove = userRoles.some((r) =>
      ['dev', 'supervisor', 'admin', 'manager'].includes(r),
    );
    if (requiredRole === 'supervisor' && !isSupervisorOrAbove) {
      return { allowed: false, reason: 'insufficient_role' };
    }
    if (requiredRole === 'dev' && !userRoles.includes('dev')) {
      return { allowed: false, reason: 'insufficient_role' };
    }
  }

  if (requireMfa && currentAAL !== 'aal2') {
    return { allowed: false, reason: 'mfa_required' };
  }

  return { allowed: true };
};
