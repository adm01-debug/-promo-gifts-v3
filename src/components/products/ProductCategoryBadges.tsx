import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useCategoryIcons, getCategoryIcon } from "@/hooks/useCategoryIcons";
import type { Category } from "@/data/mockData";

interface ProductCategoryBadgesProps {
  category: Category;
  groups?: Category[];
  className?: string;
  showLabels?: boolean;
}

/**
 * Exibe badges com ícones/emojis das categorias/grupos do produto
 * Combina a categoria principal com grupos adicionais
 */
export function ProductCategoryBadges({ 
  category, 
  groups, 
  className,
  showLabels = false 
}: ProductCategoryBadgesProps) {
  const { data: categoryIcons = [] } = useCategoryIcons();
  
  // Combinar categoria principal com grupos adicionais (sem duplicatas)
  const allCategories = [category];
  
  if (groups && groups.length > 0) {
    groups.forEach(group => {
      if (!allCategories.some(c => c.id === group.id)) {
        allCategories.push(group);
      }
    });
  }

  if (allCategories.length === 0) return null;
  
  // Função para obter ícone da categoria do Supabase ou usar o local
  const getIcon = (cat: Category) => {
    // Primeiro tenta buscar do Supabase
    const supabaseIcon = getCategoryIcon(cat.name, categoryIcons);
    if (supabaseIcon !== '📦') return supabaseIcon;
    // Fallback para ícone local
    return cat.icon || '📦';
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {allCategories.map((cat) => (
        <Tooltip key={cat.id}>
          <TooltipTrigger asChild>
            <Badge
              variant="secondary"
              className={cn(
                "px-2.5 py-1 text-sm font-medium cursor-default",
                "bg-secondary/80 hover:bg-secondary border border-border/50",
                "transition-all duration-200 hover:scale-105"
              )}
            >
              <span className="mr-1.5">{getIcon(cat)}</span>
              <span className="text-xs">{cat.name}</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" className="font-medium">
            {cat.name}
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
