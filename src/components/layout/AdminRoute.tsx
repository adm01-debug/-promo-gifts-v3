import { type ReactNode, useState, useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { MfaEnrollmentDialog } from "@/components/security/MfaEnrollmentDialog";
import { MfaChallengeDialog } from "@/components/security/MfaChallengeDialog";

interface AdminRouteProps {
  children?: ReactNode;
}

/**
 * Wrapper para rotas administrativas.
 * Suporta Layout Routes (Outlet) e children diretos.
 * Redireciona para / se o usuário não for admin ou manager.
 *
 * Hardening: exige sessão em AAL2 (MFA verificado).
 *  - Sem MFA cadastrado → abre fluxo de enrollment obrigatório
 *  - Com MFA mas sessão em aal1 → abre challenge para elevar sessão
 */
export function AdminRoute({ children }: AdminRouteProps) {
  const { user, canManage, isLoading, currentAAL, hasMFA, mfaRequired } = useAuth();
  const [enrollOpen, setEnrollOpen] = useState(false);

  useEffect(() => {
    if (canManage && !hasMFA && !isLoading) setEnrollOpen(true);
  }, [canManage, hasMFA, isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!canManage) {
    return <Navigate to="/" replace />;
  }

  // Admin/manager sem MFA → mostra dialog de enrollment obrigatório (não renderiza filhos)
  if (!hasMFA) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <MfaEnrollmentDialog open={enrollOpen} onOpenChange={setEnrollOpen} enforce />
      </>
    );
  }

  // Admin/manager com MFA mas sessão em aal1 → exige challenge antes de renderizar filhos
  if (mfaRequired && currentAAL === "aal1") {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <MfaChallengeDialog open />
      </>
    );
  }

  return children ? <>{children}</> : <Outlet />;
}
