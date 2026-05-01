import { type ReactNode } from "react";
import { Navigate, useLocation, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

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

  if (!user) {
    // Redireciona para página de erro 401 que fornece contexto e link de login
    return <Navigate to="/unauthorized" state={{ from: location }} replace />;
  }

  // Resolução do nível exigido (props mais explícitas têm prioridade)
  const required: RequiredRole | undefined =
    requiredRole ?? (requireDev ? "dev" : requireAdmin ? "supervisor" : undefined);

  if (required === "dev" && !isDev) {
    return <Navigate to="/" replace />;
  }
  if (required === "supervisor" && !isSupervisorOrAbove) {
    return <Navigate to="/" replace />;
  }
  // 'agente' = qualquer usuário autenticado, sem checagem extra.

  // Retorno único: Outlet (Layout Route) ou children. Sem forwardRef:
  // Router não passa refs para `element={<ProtectedRoute />}`.
  return children ? <>{children}</> : <Outlet />;
}
