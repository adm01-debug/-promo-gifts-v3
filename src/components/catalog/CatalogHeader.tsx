import { SmartSearchInput } from "@/components/search";
import { RecentlyViewedPopover } from "@/components/products/RecentlyViewedPopover";
import type { FilterState } from "@/components/filters/FilterPanel";
import type { NavigateFunction } from "react-router-dom";

interface CatalogHeaderProps {
  shouldShowCatalogSkeleton: boolean;
  totalEstimate: number | null;
  filteredCount: number;
  hasNextPage: boolean | undefined;
  onSelect: (result: { type: string; id: string; label: string }) => void;
}

export function CatalogHeader({
  shouldShowCatalogSkeleton,
  totalEstimate,
  filteredCount,
  hasNextPage,
  onSelect,
}: CatalogHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-3">
        <h1 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold whitespace-nowrap">
          Catálogo de Produtos
          <span className="text-muted-foreground font-normal text-sm sm:text-base ml-2">
            · {shouldShowCatalogSkeleton
              ? "Carregando catálogo..."
              : totalEstimate && totalEstimate > filteredCount
                ? `${filteredCount.toLocaleString("pt-BR")} de ${totalEstimate.toLocaleString("pt-BR")} itens`
                : `${filteredCount.toLocaleString("pt-BR")} itens`
            }{hasNextPage && !shouldShowCatalogSkeleton ? '+' : ''}
          </span>
        </h1>
      </div>

      {/* Search only visible on mobile where header search is hidden */}
      <div className="flex items-center gap-2 w-full sm:w-auto sm:hidden">
        <SmartSearchInput
          placeholder="Buscar produtos..."
          onSelect={onSelect}
          className="flex-1"
        />
      </div>
      
      <div className="hidden sm:flex items-center gap-2">
        <RecentlyViewedPopover maxVisible={10} />
      </div>
    </div>
  );
}