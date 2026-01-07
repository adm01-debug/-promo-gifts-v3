import { Loader2 } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";

// VERSÃO TEMPORÁRIA SIMPLIFICADA
// Para diagnóstico do problema de loop de refresh
export default function MockupGenerator() {
  return (
    <MainLayout>
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <h1 className="text-2xl font-bold">Mockup Generator</h1>
          <p className="text-muted-foreground text-center max-w-md">
            Esta página está temporariamente simplificada para diagnóstico.
            <br />
            Se você está vendo esta mensagem sem loop de refresh, o problema estava nos useEffects do componente original.
          </p>
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="text-sm">
              <strong>Status:</strong> Página carregada com sucesso ✓
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
