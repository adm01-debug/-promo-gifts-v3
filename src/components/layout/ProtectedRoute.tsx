import { type ReactNode } from "react";
import { Navigate, useLocation, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { EnhancedErrorBoundary } from "@/components/errors/EnhancedErrorBoundary";
import { EmptyState } from "@/components/common/EmptyState";

type RequiredRole = "dev" | "supervisor" | "agente";

interface ProtectedRouteProps {
  children?: ReactNode;
  /** Hierarquia: 'dev' (somente dev), 'supervisor' (dev OU supervisor), 'agente' (qualquer autenticado). */
  requiredRole?: RequiredRole;
  /** @deprecated Use requiredRole="supervisor" — mantido para compatibilidade. */
  requireAdmin?: boolean;
  /** Marca rotas técnicas (telemetria, MCP, hardening, etc.) — equivale a requiredRole="dev". */
  requireDev?: boolean;
}

export function ProtectedRoute({
  children,
  requiredRole,
  requireAdmin = false,
  requireDev = false,
}: ProtectedRouteProps) {
  const { user, isDev, isSupervisorOrAbove, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user && location.pathname !== "/") {
    // Redireciona para página de erro 401 que fornece contexto e link de login
    return <Navigate to="/unauthorized" state={{ from: location }} replace />;
  }

  // Resolução do nível exigido (props mais explícitas têm prioridade)
  const required: RequiredRole | undefined =
    requiredRole ?? (requireDev ? "dev" : requireAdmin ? "supervisor" : undefined);

  if (required === "dev" && !isDev) {
    return (
      <EmptyState 
        variant="security" 
        title="Acesso Negado" 
        description="Esta é uma área restrita para desenvolvedores."
        action={{ label: "Voltar ao início", onClick: () => window.location.href = "/" }}
      />
    );
  }
  
  if (required === "supervisor" && !isSupervisorOrAbove) {
    return (
      <EmptyState 
        variant="security" 
        title="Acesso Restrito" 
        description="Você precisa de nível de supervisor para acessar este conteúdo."
        action={{ label: "Voltar ao início", onClick: () => window.location.href = "/" }}
      />
    );
  }

  return (
    <EnhancedErrorBoundary
      fallback={
        <div className="p-8">
          <EmptyState 
            variant="error" 
            title="Falha no Módulo" 
            description="Ocorreu um erro ao carregar esta seção. Tente recarregar a página."
            action={{ label: "Recarregar", onClick: () => window.location.reload() }}
          />
        </div>
      }
    >
      {children ? <>{children}</> : <Outlet />}
    </EnhancedErrorBoundary>
  );
}
