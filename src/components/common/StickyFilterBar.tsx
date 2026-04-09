import { useState, useEffect } from "react";
import { SORT_OPTIONS } from "@/constants/filters";
import { Filter, ArrowUpDown, LayoutGrid, List, X, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface StickyFilterBarProps {
  activeFiltersCount: number;
  onOpenFilters: () => void;
  sortBy: string;
  onSortChange: (value: string) => void;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
  totalProducts: number;
  displayedProducts: number;
}

export function StickyFilterBar({
  activeFiltersCount,
  onOpenFilters,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
  totalProducts,
  displayedProducts,
}: StickyFilterBarProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollThreshold = 200;
      
      // Show when scrolled past threshold
      if (currentScrollY > scrollThreshold) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed top-16 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-b border-border shadow-lg"
        >
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              {/* Left side - Filters */}
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onOpenFilters}
                  className="gap-2"
                >
                  <Filter className="h-4 w-4" />
                  Filtros
                  {activeFiltersCount > 0 && (
                    <Badge 
                      variant="secondary" 
                      className="ml-1 h-5 w-5 p-0 flex items-center justify-center rounded-full bg-primary text-primary-foreground"
                    >
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
                
                {/* Sort */}
                <Select value={sortBy} onValueChange={onSortChange}>
                  <SelectTrigger className="w-40 h-9">
                    <ArrowUpDown className="h-3.5 w-3.5 mr-2" />
                    <SelectValue placeholder="Ordenar" />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Center - Product count */}
              <div className="hidden sm:flex items-center text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{displayedProducts}</span>
                <span className="mx-1">de</span>
                <span className="font-medium text-foreground">{totalProducts}</span>
                <span className="ml-1">produtos</span>
              </div>

              {/* Right side - View mode & scroll to top */}
              <div className="flex items-center gap-2">
                {/* View mode toggle */}
                <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary">
                  <Button
                    variant="ghost"
                    size="icon" aria-label="LayoutGrid"
                    className={cn("h-7 w-7", viewMode === "grid" && "bg-card shadow-sm")}
                    onClick={() => onViewModeChange("grid")}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon" aria-label="Lista"
                    className={cn("h-7 w-7", viewMode === "list" && "bg-card shadow-sm")}
                    onClick={() => onViewModeChange("list")}
                  >
                    <List className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Scroll to top */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={scrollToTop}
                 aria-label="Recolher"><ChevronUp className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
