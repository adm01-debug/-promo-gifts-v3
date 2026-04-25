import { type ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Loader2, ShieldAlert } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface DevRouteProps {
  children?: ReactNode;
}

/**
 * Guarda para rotas técnicas restritas ao papel `dev`.
 *
 * Diferente de AdminRoute (que libera supervisor + dev), DevRoute exige
 * estritamente o papel `dev` em user_roles. Cobre páginas com risco
 * elevado: telemetria, conexões externas, secrets, audit técnico, MCP full,
 * external-db, rate-limit, login-attempts.
 *
 * Mantém o requisito de MFA (AAL2) já aplicado em AdminRoute, pois esta
 * rota fica aninhada dentro dela em App.tsx.
 */
export function DevRoute({ children }: DevRouteProps) {
  const { user, isDev, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isDev) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4 px-4 text-center">
        <ShieldAlert className="h-12 w-12 text-destructive" />
        <h1 className="text-xl font-semibold">Área restrita ao papel Desenvolvedor</h1>
        <p className="text-sm text-muted-foreground max-w-md">
          Esta página contém ferramentas técnicas (telemetria, conexões, secrets, auditoria
          de baixo nível) e exige o papel <code className="font-mono">dev</code>.
          Solicite acesso a um desenvolvedor.
        </p>
        <Navigate to="/admin/usuarios" replace />
      </div>
    );
  }

  return children ? <>{children}</> : <Outlet />;
}
