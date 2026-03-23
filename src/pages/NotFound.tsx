import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { PageSEO } from "@/components/seo/PageSEO";
import { Home, ArrowLeft, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <PageSEO title="Página não encontrada" noIndex />
      <div className="text-center max-w-md mx-auto space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-muted p-6">
            <SearchX className="h-12 w-12 text-muted-foreground" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-6xl font-bold font-display text-foreground">404</h1>
          <p className="text-xl text-muted-foreground">
            Página não encontrada
          </p>
          <p className="text-sm text-muted-foreground">
            A página <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{location.pathname}</code> não existe ou foi movida.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="default" size="lg">
            <Link to="/">
              <Home className="mr-2 h-4 w-4" />
              Ir para o início
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" onClick={() => window.history.back()}>
            <span role="button" tabIndex={0} onClick={() => window.history.back()} onKeyDown={(e) => e.key === 'Enter' && window.history.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
