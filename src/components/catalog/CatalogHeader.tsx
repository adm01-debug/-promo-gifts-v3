import { useRef, useEffect, useState } from "react";
import { SmartSearchInput } from "@/components/search";
import { RecentlyViewedPopover } from "@/components/products/RecentlyViewedPopover";
import { SearchHistoryPopover } from "@/components/search/SearchHistoryPopover";
import { Home, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AnimatePresence } from "framer-motion";

interface CatalogHeaderProps {
  shouldShowCatalogSkeleton: boolean;
  totalEstimate: number | null;
  filteredCount: number;
  hasNextPage: boolean | undefined;
  onSelect: (result: { type: string; id: string; label: string }) => void;
  searchQuery?: string;
  onReset?: () => void;
  activeFiltersCount?: number;
  searchHistory?: string[];
  onClearHistory?: () => void;
}

export function CatalogHeader({
  shouldShowCatalogSkeleton,
  totalEstimate,
  filteredCount,
  hasNextPage,
  onSelect,
  searchQuery = "",
  onReset,
  activeFiltersCount = 0,
  searchHistory = [],
  onClearHistory,
}: CatalogHeaderProps) {
  const hasActiveConstraints = searchQuery.trim().length > 0 || activeFiltersCount > 0;
  const searchRef = useRef<HTMLDivElement>(null);
  const [historyOpen, setHistoryOpen] = useState(false);


  // "/" shortcut to focus search (standard pattern: Notion, GitHub, Figma)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;
        e.preventDefault();
        const input = searchRef.current?.querySelector("input");
        input?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Reset / Home button — visible when search or filters are active */}
        {hasActiveConstraints && onReset && (
          <TooltipProvider >
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={onReset}
                  className="shrink-0 h-9 w-9 border-primary/40 text-primary hover:bg-primary/10"
                  aria-label="Voltar ao início"
                >
                  <Home className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-primary text-primary-foreground text-[11px] font-medium px-2 py-1 border-none shadow-xl">Voltar ao catálogo completo</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        <h1 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold whitespace-nowrap">
          Catálogo de Produtos
          <span className="text-muted-foreground font-normal text-sm sm:text-base ml-2">
            · {shouldShowCatalogSkeleton
              ? "Carregando catálogo..."
              : hasActiveConstraints
                ? <>
                    <span className="text-primary font-semibold">{filteredCount.toLocaleString("pt-BR")}</span>
                    {totalEstimate ? ` de ${totalEstimate.toLocaleString("pt-BR")}` : ""} itens
                  </>
                : totalEstimate
                  ? `${totalEstimate.toLocaleString("pt-BR")} itens`
                  : `${filteredCount.toLocaleString("pt-BR")} itens`
            }
          </span>
        </h1>

        {/* Search inline next to product count on desktop */}
        <div className="hidden sm:flex items-center gap-2 w-80 lg:w-[28rem]" ref={searchRef}>
          <SmartSearchInput
            placeholder="Buscar produtos…  /"
            onSelect={onSelect}
            className="flex-1"
          />
          
          <SearchHistoryPopover 
            type="general" 
            onSelect={(term) => onSelect({ type: 'history', id: `hist-${term}`, label: term })} 
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
        <SearchHistoryPopover 
          type="general" 
          onSelect={(term) => onSelect({ type: 'history', id: `hist-mobile-${term}`, label: term })} 
        />
        <RecentlyViewedPopover maxVisible={10} />
      </div>
    </div>
  );
}