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
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <h1 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold whitespace-nowrap">
          Catálogo de Produtos
          <span className="text-muted-foreground font-normal text-sm sm:text-base ml-2">
            · {shouldShowCatalogSkeleton
              ? "Carregando catálogo..."
              : totalEstimate
                ? `${totalEstimate.toLocaleString("pt-BR")} itens`
                : `${filteredCount.toLocaleString("pt-BR")} itens`
            }
          </span>
        </h1>

        {/* Search inline next to product count on desktop */}
        <div className="hidden sm:block w-64 lg:w-80">
          <SmartSearchInput
            placeholder="Buscar produtos..."
            onSelect={onSelect}
            className="w-full"
          />
        </div>

        <div className="hidden sm:block">
          <RecentlyViewedPopover maxVisible={10} />
        </div>
      </div>

      {/* Search full-width on mobile */}
      <div className="flex items-center gap-2 w-full sm:hidden">
        <SmartSearchInput
          placeholder="Buscar produtos..."
          onSelect={onSelect}
          className="flex-1"
        />
      </div>
      
    </div>
  );
}