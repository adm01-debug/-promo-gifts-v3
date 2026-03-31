import { useNavigate } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Package, Palette, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCategoryIcons, getCategoryIcon } from "@/hooks/useCategoryIcons";
import type { Category } from "@/data/mockData";

interface ProductCategoryBadgesProps {
  category: Category;
  groups?: Category[];
  className?: string;
  showLabels?: boolean;
  // Props para o link de personalização
  productId?: string;
  productName?: string;
  productSku?: string;
  productPrice?: number;
  productImageUrl?: string | null;
  productMinQuantity?: number;
  showPersonalizationLink?: boolean;
}

/**
 * Exibe badges com ícones/emojis das categorias/grupos do produto
 * Combina a categoria principal com grupos adicionais
 * Inclui link opcional para o simulador de personalização
 */
export function ProductCategoryBadges({ 
  category, 
  groups, 
  className,
  showLabels = false,
  productId,
  productName,
  productSku,
  productPrice,
  productImageUrl,
  productMinQuantity,
  showPersonalizationLink = true,
}: ProductCategoryBadgesProps) {
  const navigate = useNavigate();
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

  // Navegar para o simulador com o produto pré-selecionado
  const handlePersonalizationClick = () => {
    if (!productId) return;
    
    // Criar objeto com dados do produto para passar via state
    const productData = {
      id: productId,
      name: productName || '',
      sku: productSku || '',
      price: productPrice || 0,
      imageUrl: productImageUrl,
      categoryName: category?.name,
    };
    
    // Navegar passando o produto via state
    navigate('/simulador', { 
      state: { 
        preSelectedProduct: productData 
      } 
    });
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {allCategories.map((cat) => (
        <Tooltip key={cat.id}>
          <TooltipTrigger asChild>
            <Badge
              variant="secondary"
              onClick={() => navigate(`/filtros?categories=${cat.id}`)}
              className={cn(
                "px-2.5 py-1 text-sm font-medium cursor-pointer",
                "bg-secondary/80 hover:bg-secondary border border-border/50",
                "transition-all duration-200 hover:scale-105"
              )}
            >
              <span className="mr-1.5">{getIcon(cat)}</span>
              <span className="text-xs">{cat.name}</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" className="font-medium">
            Ver todos os produtos de {cat.name}
          </TooltipContent>
        </Tooltip>
      ))}

      {/* Link para Simulador de Personalização */}
      {showPersonalizationLink && productId && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              onClick={handlePersonalizationClick}
              className={cn(
                "px-2.5 py-1 text-sm font-medium cursor-pointer",
                "border-primary/50 bg-primary/10 hover:bg-primary/20",
                "text-primary hover:text-primary",
                "transition-all duration-200 hover:scale-105 hover:border-primary"
              )}
            >
              <Palette className="h-3.5 w-3.5 mr-1.5" />
              <span className="text-xs">Personalização</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" className="font-medium">
            Simular preço de personalização
          </TooltipContent>
        </Tooltip>
      )}


      {/* Visualizar com Logo */}
      {productId && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              onClick={() => navigate('/mockup-generator', {
                state: {
                  preSelectedProduct: { id: productId, name: productName, sku: productSku, imageUrl: productImageUrl }
                }
              })}
              className={cn(
                "px-2.5 py-1 text-sm font-medium cursor-pointer",
                "border-purple-500/50 bg-purple-500/15 hover:bg-purple-500/25",
                "text-purple-400 hover:text-purple-300",
                "transition-all duration-200 hover:scale-105 hover:border-purple-500"
              )}
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              <span className="text-xs">Visualizar com Logo</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" className="font-medium">
            Gerar mockup com sua logo
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
