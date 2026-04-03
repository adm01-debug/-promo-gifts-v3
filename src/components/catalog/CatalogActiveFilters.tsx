import { Badge } from "@/components/ui/badge";
import type { FilterState } from "@/components/filters/FilterPanel";
import { CATEGORIES } from "@/data/mockData";

interface CatalogActiveFiltersProps {
  filters: FilterState;
  setFilters: (f: FilterState) => void;
  activeFiltersCount: number;
}

export function CatalogActiveFilters({ filters, setFilters, activeFiltersCount }: CatalogActiveFiltersProps) {
  const hasPriceFilter = filters.priceRange[0] > 0 || filters.priceRange[1] < 9999;

  if (activeFiltersCount === 0 && !hasPriceFilter) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {hasPriceFilter && (
        <Badge
          variant="secondary"
          className="cursor-pointer hover:bg-destructive/10"
          onClick={() => setFilters({ ...filters, priceRange: [0, 9999] })}
        >
          💰 R${filters.priceRange[0]}–{filters.priceRange[1] >= 9999 ? "∞" : filters.priceRange[1]}
          <span className="ml-1">×</span>
        </Badge>
      )}
      {filters.colors.map((color) => (
        <Badge
          key={color}
          variant="secondary"
          className="cursor-pointer hover:bg-destructive/10"
          onClick={() => setFilters({ ...filters, colors: filters.colors.filter((c) => c !== color) })}
        >
          🎨 {color}
          <span className="ml-1">×</span>
        </Badge>
      ))}
      {filters.categories.map((catId) => {
        const cat = CATEGORIES.find((c) => c.id === catId);
        return cat ? (
          <Badge
            key={catId}
            variant="secondary"
            className="cursor-pointer hover:bg-destructive/10"
            onClick={() => setFilters({ ...filters, categories: filters.categories.filter((c) => c !== catId) })}
          >
            {cat.icon} {cat.name}
            <span className="ml-1">×</span>
          </Badge>
        ) : null;
      })}
      {filters.featured && (
        <Badge
          variant="secondary"
          className="cursor-pointer hover:bg-destructive/10"
          onClick={() => setFilters({ ...filters, featured: false })}
        >
          ⭐ Destaques
          <span className="ml-1">×</span>
        </Badge>
      )}
      {filters.isKit && (
        <Badge
          variant="secondary"
          className="cursor-pointer hover:bg-destructive/10"
          onClick={() => setFilters({ ...filters, isKit: false })}
        >
          📦 KITs
          <span className="ml-1">×</span>
        </Badge>
      )}
    </div>
  );
}
