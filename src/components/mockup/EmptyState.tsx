import { cn } from "@/lib/utils";
import { ImageIcon, Sparkles, ArrowRight, Package, Paintbrush, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  variant: "no-product" | "no-history" | "no-results" | "loading-error";
  onAction?: () => void;
  actionLabel?: string;
  className?: string;
}

const EMPTY_STATES = {
  "no-product": {
    icon: Package,
    title: "Nenhum produto selecionado",
    description: "Comece selecionando um produto para personalizar. Você pode buscar por nome ou SKU.",
    steps: [
      { icon: Package, label: "Escolha um produto" },
      { icon: Paintbrush, label: "Selecione a técnica" },
      { icon: Upload, label: "Faça upload do logo" },
    ],
    gradient: "from-primary/20 to-primary/5",
  },
  "no-history": {
    icon: Sparkles,
    title: "Nenhum mockup gerado ainda",
    description: "Crie seu primeiro mockup! É rápido e fácil - basta selecionar produto, técnica e logo.",
    gradient: "from-primary/20 via-primary/10 to-transparent",
  },
  "no-results": {
    icon: ImageIcon,
    title: "Nenhum resultado encontrado",
    description: "Não encontramos mockups com os filtros selecionados. Tente ajustar sua busca.",
    gradient: "from-muted to-muted/50",
  },
  "loading-error": {
    icon: ImageIcon,
    title: "Erro ao carregar",
    description: "Ocorreu um erro ao carregar os dados. Tente recarregar a página.",
    gradient: "from-destructive/20 to-destructive/5",
  },
};

export function EmptyState({
  variant,
  onAction,
  actionLabel,
  className,
}: EmptyStateProps) {
  const state = EMPTY_STATES[variant];
  const Icon = state.icon;

  return (
    <div
      className={cn(
        "text-center py-12 px-4 animate-fade-in",
        className
      )}
    >
      {/* Icon with gradient background */}
      <div
        className={cn(
          "w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center",
          "bg-gradient-to-br shadow-lg",
          state.gradient
        )}
      >
        <Icon className="h-10 w-10 text-primary/70" />
      </div>

      {/* Title */}
      <h3 className="text-xl font-semibold text-foreground mb-2">
        {state.title}
      </h3>

      {/* Description */}
      <p className="text-muted-foreground max-w-md mx-auto mb-6">
        {state.description}
      </p>

      {/* Steps (for no-product variant) */}
      {"steps" in state && state.steps && (
        <div className="flex items-center justify-center gap-2 mb-6 flex-wrap">
          {state.steps.map((step, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 text-sm">
                <step.icon className="h-3.5 w-3.5 text-primary" />
                <span className="text-muted-foreground">{step.label}</span>
              </div>
              {i < state.steps.length - 1 && (
                <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Action button */}
      {onAction && actionLabel && (
        <Button onClick={onAction} className="gap-2">
          <Sparkles className="h-4 w-4" />
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
