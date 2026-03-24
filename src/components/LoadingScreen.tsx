import { Loader2 } from 'lucide-react';

export default function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 text-orange animate-[spin_0.7s_linear_infinite]" />
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    </div>
  );
}
