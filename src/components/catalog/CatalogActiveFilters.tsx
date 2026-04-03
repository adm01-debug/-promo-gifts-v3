import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { FilterState } from "@/components/filters/FilterPanel";
import { CATEGORIES } from "@/data/mockData";

const PRICE_RANGES = [
  { label: "Até R$10", min: 0, max: 10 },
  { label: "R$10–30", min: 10, max: 30 },
  { label: "R$30–60", min: 30, max: 60 },
  { label: "R$60–100", min: 60, max: 100 },
  { label: "R$100+", min: 100, max: 9999 },
] as const;

interface CatalogActiveFiltersProps {
  filters: FilterState;
  setFilters: (f: FilterState) => void;
  activeFiltersCount: number;
}

export function CatalogActiveFilters({ filters, setFilters, activeFiltersCount }: CatalogActiveFiltersProps) {
  const isPriceRangeActive = (min: number, max: number) =>
    filters.priceRange[0] === min && filters.priceRange[1] === max;

  const handlePriceChip = (min: number, max: number) => {
    if (isPriceRangeActive(min, max)) {
      // Deselect — reset to default
      setFilters({ ...filters, priceRange: [0, 9999] });
    } else {
      setFilters({ ...filters, priceRange: [min, max] });
    }
  };

  const hasPriceFilter = filters.priceRange[0] > 0 || filters.priceRange[1] < 9999;

  return (
    <div className="space-y-2">
      {/* Price range quick chips — always visible */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] text-muted-foreground/60 uppercase font-semibold tracking-wider mr-1">Faixa:</span>
        {PRICE_RANGES.map((range) => {
          const active = isPriceRangeActive(range.min, range.max);
          return (
            <button
              key={range.label}
              onClick={() => handlePriceChip(range.min, range.max)}
              className={cn(
                "px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-200 border",
                active
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-muted/30 text-muted-foreground border-border/40 hover:bg-muted/60 hover:text-foreground"
              )}
            >
              {range.label}
            </button>
          );
        })}
      </div>

      {/* Active filter badges */}
      {(activeFiltersCount > 0 || hasPriceFilter) && (
        <div className="flex flex-wrap gap-2">
          {hasPriceFilter && !PRICE_RANGES.some(r => isPriceRangeActive(r.min, r.max)) && (
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
      )}
    </div>
  );
}
