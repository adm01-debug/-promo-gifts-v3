import { forwardRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const routeLabels: Record<string, string> = {
  "/": "Início",
  "/produtos": "Produtos",
  "/filtros": "Super Filtro",
  "/novidades": "Novidades",
  "/colecoes": "Coleções",
  "/orcamentos": "Orçamentos",
  "/pedidos": "Pedidos",
  "/simulador": "Simulador",
  "/simulador-precos": "Preços por Tiragem",
  "/mockup-generator": "Gerador de Mockups",
  "/magic-up": "Magic Up",
  "/favoritos": "Favoritos",
  "/comparar": "Comparar",
  "/perfil": "Meu Perfil",
  "/configuracoes": "Configurações",
  "/admin": "Administração",
  "/seguranca": "Segurança",
  "/estoque": "Dashboard de Estoque",
};

interface BackButtonProps {
  className?: string;
  fallbackPath?: string;
}

export const BackButton = forwardRef<HTMLButtonElement, BackButtonProps>(function BackButton({ className, fallbackPath }: BackButtonProps, ref) {
  const navigate = useNavigate();
  const location = useLocation();

  if (location.pathname === "/") return null;

  const pathParts = location.pathname.split("/").filter(Boolean);

  let parentPath = "/";
  if (pathParts.length > 1) {
    const lastPart = pathParts[pathParts.length - 1];
    const isId =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lastPart) ||
      /^\d+$/.test(lastPart);

    if (isId && pathParts.length > 2) {
      parentPath = "/" + pathParts.slice(0, -2).join("/");
    } else {
      parentPath = "/" + pathParts.slice(0, -1).join("/");
    }
  }

  const targetPath = fallbackPath || parentPath;
  const parentLabel = routeLabels[targetPath] || targetPath.split("/").pop() || "Início";

  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate(targetPath);
    }
  };

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="sm"
      onClick={handleBack}
      className={cn(
        "gap-1.5 text-muted-foreground hover:text-foreground -ml-2 h-8 px-2",
        className
      )}
    >
      <ArrowLeft className="h-4 w-4" />
      <span className="text-sm">Voltar para {parentLabel}</span>
    </Button>
  );
});
