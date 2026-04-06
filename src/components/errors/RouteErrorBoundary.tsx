import { useRouteError, isRouteErrorResponse, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Home, RefreshCw, ArrowLeft, WifiOff, Lock, FileQuestion, Gift } from "lucide-react";
import { motion } from "framer-motion";

interface ErrorDetails {
  icon: React.ReactNode;
  title: string;
  message: string;
  action: "reload" | "home" | "back";
}

const getErrorDetails = (error: unknown): ErrorDetails => {
  if (isRouteErrorResponse(error)) {
    switch (error.status) {
      case 404:
        return {
          icon: <FileQuestion className="h-16 w-16 text-muted-foreground" />,
          title: "Página não encontrada",
          message: "A página que você está procurando não existe ou foi movida.",
          action: "home",
        };
      case 401:
        return {
          icon: <Lock className="h-16 w-16 text-warning" />,
          title: "Acesso não autorizado",
          message: "Você precisa estar logado para acessar esta página.",
          action: "home",
        };
      case 403:
        return {
          icon: <Lock className="h-16 w-16 text-destructive" />,
          title: "Acesso negado",
          message: "Você não tem permissão para acessar este recurso.",
          action: "back",
        };
      case 503:
        return {
          icon: <WifiOff className="h-16 w-16 text-warning" />,
          title: "Serviço indisponível",
          message: "O servidor está temporariamente indisponível. Tente novamente em alguns minutos.",
          action: "reload",
        };
      default:
        return {
          icon: <AlertTriangle className="h-16 w-16 text-destructive" />,
          title: `Erro ${error.status}`,
          message: error.statusText || "Ocorreu um erro inesperado.",
          action: "reload",
        };
    }
  }

  // Network errors
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return {
      icon: <WifiOff className="h-16 w-16 text-warning" />,
      title: "Erro de conexão",
      message: "Verifique sua conexão com a internet e tente novamente.",
      action: "reload",
    };
  }

  // Dynamic import / chunk loading errors (stale cache)
  if (
    error instanceof Error && 
    (error.message.includes("Failed to fetch dynamically imported module") ||
     error.message.includes("Loading chunk") ||
     error.message.includes("ChunkLoadError"))
  ) {
    return {
      icon: <RefreshCw className="h-16 w-16 text-warning" />,
      title: "Atualização disponível",
      message: "Uma nova versão está disponível. Clique para atualizar.",
      action: "reload",
    };
  }

  // Default error
  return {
    icon: <AlertTriangle className="h-16 w-16 text-destructive" />,
    title: "Algo deu errado",
    message: error instanceof Error ? error.message : "Ocorreu um erro inesperado.",
    action: "reload",
  };
};

export function RouteErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();
  const errorDetails = getErrorDetails(error);

  const handleAction = () => {
    switch (errorDetails.action) {
      case "reload":
        window.location.reload();
        break;
      case "home":
        navigate("/");
        break;
      case "back":
        navigate(-1);
        break;
    }
  };

  const actionConfig = {
    reload: { icon: RefreshCw, label: "Tentar novamente" },
    home: { icon: Home, label: "Ir para o início" },
    back: { icon: ArrowLeft, label: "Voltar" },
  };

  const ActionIcon = actionConfig[errorDetails.action].icon;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <Card className="max-w-md w-full border-border/50">
          <CardContent className="pt-8 pb-6 text-center space-y-6">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
              className="flex justify-center"
            >
              {errorDetails.icon}
            </motion.div>
            
            <div className="space-y-2">
              <h1 className="font-display text-2xl font-bold text-foreground">
                {errorDetails.title}
              </h1>
              <p className="text-muted-foreground">
                {errorDetails.message}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={handleAction}
                className="gap-2"
                size="lg"
              >
                <ActionIcon className="h-4 w-4" />
                {actionConfig[errorDetails.action].label}
              </Button>
              
              {errorDetails.action !== "home" && (
                <Button
                  variant="outline"
                  onClick={() => navigate("/")}
                  className="gap-2"
                  size="lg"
                >
                  <Home className="h-4 w-4" />
                  Ir para o início
                </Button>
              )}
            </div>

            {import.meta.env.DEV && error instanceof Error && (
              <motion.details
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-4 text-left text-xs bg-muted/50 rounded-lg p-4"
              >
                <summary className="cursor-pointer text-muted-foreground font-medium mb-2">
                  Detalhes do erro (dev)
                </summary>
                <pre className="overflow-x-auto text-destructive/80 whitespace-pre-wrap">
                  {error.stack}
                </pre>
              </motion.details>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default RouteErrorBoundary;
