import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface NoveltyBadgeProps {
  daysRemaining: number;
  showDays?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Badge de novidade que mostra há quantos dias o produto é novo
 * - Verde brilhante: produto muito novo (20-30 dias restantes)
 * - Amarelo: produto moderado (10-19 dias restantes)  
 * - Laranja: produto quase expirando (1-9 dias restantes)
 */
export function NoveltyBadge({ 
  daysRemaining, 
  showDays = true,
  size = "md",
  className 
}: NoveltyBadgeProps) {
  // Cor verde esmeralda harmonizada com glow effect
  const getVariantClasses = () => {
    return "bg-[#10B981] text-primary-foreground shadow-[0_0_0_1px_rgba(16,185,129,0.3),0_2px_8px_rgba(16,185,129,0.25)] hover:shadow-[0_0_0_1px_rgba(16,185,129,0.4),0_4px_12px_rgba(16,185,129,0.35)] transition-shadow duration-300";
  };

  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return "text-[9px] px-1.5 py-0.5 gap-0.5";
      case "lg":
        return "text-sm px-3 py-1.5 gap-1.5";
      default:
        return "text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 gap-1";
    }
  };

  const getIconSize = () => {
    switch (size) {
      case "sm":
        return "h-2.5 w-2.5";
      case "lg":
        return "h-4 w-4";
      default:
        return "h-2.5 w-2.5 sm:h-3 sm:w-3";
    }
  };

  // Texto amigável para os dias
  const getDaysText = () => {
    if (daysRemaining >= 25) {
      return "Novinho!";
    } else if (daysRemaining >= 20) {
      return `${daysRemaining}d`;
    } else if (daysRemaining >= 10) {
      return `${daysRemaining}d`;
    } else if (daysRemaining === 1) {
      return "Último dia!";
    } else {
      return `${daysRemaining}d restantes`;
    }
  };

  const content = (
    <Badge 
      className={cn(
        "inline-flex items-center font-semibold rounded-full animate-[badge-pop_0.4s_ease-out]",
        getVariantClasses(),
        getSizeClasses(),
        className
      )}
    >
      <span>Novidade</span>
    </Badge>
  );

  // Tooltip com informações detalhadas
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {content}
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="text-sm">
          <p className="font-semibold">🆕 Produto Novidade</p>
          <p className="text-muted-foreground">
            {daysRemaining === 1 
              ? "Último dia como novidade!" 
              : `Expira em ${daysRemaining} dias`
          }</p>
          {daysRemaining < 7 && (
            <p className="text-warning text-xs mt-1">
              ⚠️ Saindo em breve da seção de novidades
            </p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Badge compacto para uso em listas
 */
export function NoveltyBadgeCompact({ 
  daysRemaining,
  className 
}: { 
  daysRemaining: number;
  className?: string;
}) {
  return (
    <NoveltyBadge 
      daysRemaining={daysRemaining} 
      size="sm" 
      showDays={true}
      className={className}
    />
  );
}
