import { AppRole } from "@/contexts/AuthContext";

export interface AccessPolicy {
  requiredRole?: AppRole;
  requireMfa?: boolean;
  requireDev?: boolean;
}

/**
 * Hook de hierarquia de papéis: dev > supervisor > agente.
 * Papéis legados mapeados: admin/manager -> supervisor, vendedor -> agente.
 */
const ROLE_HIERARCHY_WEIGHTS: Record<AppRole, number> = {
  dev: 100,
  supervisor: 50,
  admin: 50,    // legado
  manager: 50,  // legado
  agente: 10,
  vendedor: 10  // legado
};

export const checkAccess = (
  userRoles: AppRole[],
  currentAAL: string | null,
  policy: AccessPolicy
): { allowed: boolean; reason?: 'unauthenticated' | 'insufficient_role' | 'mfa_required' } => {
  const { requiredRole, requireMfa, requireDev } = policy;

  if (!userRoles || userRoles.length === 0) {
    return { allowed: false, reason: 'unauthenticated' };
  }

  // 1. Verificação de Dev (Nível Máximo)
  if (requireDev && !userRoles.includes('dev')) {
    return { allowed: false, reason: 'insufficient_role' };
  }

  // 2. Verificação de Hierarquia
  if (requiredRole) {
    const userMaxWeight = Math.max(...userRoles.map(r => ROLE_HIERARCHY_WEIGHTS[r] || 0));
    const requiredWeight = ROLE_HIERARCHY_WEIGHTS[requiredRole] || 0;

    if (userMaxWeight < requiredWeight) {
      return { allowed: false, reason: 'insufficient_role' };
    }
  }

  // 3. Verificação de MFA (Hardening)
  if (requireMfa && currentAAL !== 'aal2') {
    return { allowed: false, reason: 'mfa_required' };
  }

  return { allowed: true };
};
