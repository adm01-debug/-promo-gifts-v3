import { type ReactNode, useEffect } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Loader2, ShieldAlert, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface DevRouteProps {
  children?: ReactNode;
}

/**
 * Guarda para rotas técnicas restritas ao papel `dev`.
 *
 * Cobre telemetria, conexões externas, secrets, audit técnico, MCP,
 * rate-limit, login-attempts, external-db, status do sistema.
 *
 * Hierarquia: dev > supervisor > agente. Apenas `dev` passa.
 *
 * Comportamento ao bloquear:
 *  - Não autenticado → redireciona para /login preservando `from`.
 *  - Autenticado sem `dev` → exibe tela de aviso e oferece retorno
 *    para um destino seguro condizente com o papel do usuário
 *    (supervisor → /admin/usuarios, agente → /).
 */
export function DevRoute({ children }: DevRouteProps) {
  const { user, isDev, isSupervisorOrAbove, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const safeFallback = isSupervisorOrAbove ? "/admin/usuarios" : "/";

  // Notifica uma vez ao bloquear (telemetria de UX + clareza)
  useEffect(() => {
    if (!isLoading && user && !isDev) {
      toast.error("Acesso restrito", {
        description:
          "Esta área exige o papel Desenvolvedor. Solicite acesso a um responsável técnico.",
        id: "dev-route-blocked",
      });
    }
  }, [isLoading, user, isDev]);

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
        <ShieldAlert className="h-12 w-12 text-destructive" aria-hidden="true" />
        <h1 className="text-xl font-semibold">Área restrita ao papel Desenvolvedor</h1>
        <p className="text-sm text-muted-foreground max-w-md">
          Esta página contém ferramentas técnicas (telemetria, conexões, secrets, MCP,
          auditoria de baixo nível) e exige o papel{" "}
          <code className="font-mono px-1 py-0.5 rounded bg-muted">dev</code>.
          Solicite acesso a um responsável técnico.
        </p>
        <div className="flex gap-2 mt-2">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <Button onClick={() => navigate(safeFallback, { replace: true })}>
            Ir para {isSupervisorOrAbove ? "Usuários" : "Início"}
          </Button>
        </div>
      </div>
    );
  }

  return children ? <>{children}</> : <Outlet />;
}
