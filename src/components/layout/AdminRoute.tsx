import { ReactNode } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface AdminRouteProps {
  children?: ReactNode;
}

/**
 * Wrapper para rotas administrativas.
 * Suporta Layout Routes (Outlet) e children diretos.
 * Redireciona para / se o usuário não for admin ou manager.
 */
export function AdminRoute({ children }: AdminRouteProps) {
  const { user, canManage, isLoading } = useAuth();

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

  return children ? <>{children}</> : <Outlet />;
}
