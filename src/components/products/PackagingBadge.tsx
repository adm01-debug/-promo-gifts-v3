/**
 * PackagingBadge - Badge clicável para produtos com embalagem especial
 * Só exibe quando packing_classification === 'commercial'
 */
import { Gift, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PackagingBadgeProps {
  packingType: string | null;
  packingClassification: string | null;
  onClick: () => void;
  className?: string;
}

export function PackagingBadge({
  packingType,
  packingClassification,
  onClick,
  className,
}: PackagingBadgeProps) {
  // Só exibir para embalagens comerciais
  if (packingClassification !== 'commercial') {
    return null;
  }

  const displayText = packingType || "Embalagem Especial";

  return (
    <Badge
      variant="outline"
      onClick={onClick}
      className={cn(
        "cursor-pointer transition-all duration-200 group/packaging",
        "bg-gradient-to-r from-warning/10 to-warning/5",
        "border-warning/30 hover:border-warning/60",
        "hover:from-warning/20 hover:to-warning/10",
        "hover:scale-[1.02] hover:shadow-md",
        "px-3 py-1.5",
        className
      )}
    >
      <Gift className="h-3.5 w-3.5 mr-1.5 text-warning group-hover/packaging:scale-110 transition-transform" />
      <span className="text-warning-foreground font-medium text-xs">
        {displayText}
      </span>
      <ChevronRight className="h-3 w-3 ml-1 text-warning/60 group-hover/packaging:translate-x-0.5 transition-transform" />
    </Badge>
  );
}
