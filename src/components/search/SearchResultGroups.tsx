/**
 * Search result rendering helpers for SmartSearchInput
 */
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Search, Package, Folder, Building2, Zap, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { HighlightMatch } from "./HighlightMatch";
import { motion } from "framer-motion";
import type { SearchResult } from "@/hooks/useSearch";

const typeIcons: Record<string, React.ReactNode> = {
  product: <Package className="h-4 w-4 text-primary" />,
  category: <Folder className="h-4 w-4 text-warning" />,
  supplier: <Building2 className="h-4 w-4 text-primary" />,
};

const typeLabels: Record<string, string> = {
  product: "Produto",
  category: "Categoria",
  supplier: "Fornecedor",
  history: "Histórico",
};

interface ResultItemProps {
  result: SearchResult;
  index: number;
  selectedIndex: number;
  query: string;
  onSelect: (result: SearchResult) => void;
  onHover: (index: number) => void;
}

export function SearchResultItem({ result, index, selectedIndex, query, onSelect, onHover }: ResultItemProps) {
  return (
    <motion.button
      key={result.id}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.02, duration: 0.15 }}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150",
        selectedIndex === index
          ? "bg-primary/10 text-foreground shadow-sm"
          : "hover:bg-muted/80"
      )}
      onClick={() => onSelect(result)}
      onMouseEnter={() => onHover(index)}
    >
      <div className={cn(
        "flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 transition-colors",
        selectedIndex === index ? "bg-primary/15" : "bg-muted"
      )}>
        {typeIcons[result.type] || result.icon}
      </div>
      <div className="flex-1 min-w-0">
        <HighlightMatch text={result.label} query={query} className="font-medium text-sm block truncate" />
        {result.sublabel && (
          <HighlightMatch
            text={result.sublabel}
            query={query}
            className="text-xs text-muted-foreground block truncate mt-0.5"
            highlightClassName="bg-primary/10 text-primary/80 font-medium rounded-sm px-0.5"
          />
        )}
      </div>
      <Badge
        variant="outline"
        className={cn(
          "text-[10px] shrink-0 transition-colors",
          selectedIndex === index && "border-primary/30 text-primary"
        )}
      >
        {typeLabels[result.type]}
      </Badge>
      <ArrowRight className={cn(
        "h-3.5 w-3.5 text-muted-foreground transition-all",
        selectedIndex === index ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-1"
      )} />
    </motion.button>
  );
}

interface GroupedResultsProps {
  suggestions: SearchResult[];
  selectedIndex: number;
  query: string;
  onSelect: (result: SearchResult) => void;
  onHover: (index: number) => void;
}

export function GroupedSearchResults({ suggestions, selectedIndex, query, onSelect, onHover }: GroupedResultsProps) {
  const products = suggestions.filter(s => s.type === "product");
  const categories = suggestions.filter(s => s.type === "category");
  const suppliers = suggestions.filter(s => s.type === "supplier");
  const resultCount = suggestions.filter(s => s.type !== "history").length;

  return (
    <div className="p-2 space-y-1">
      <div className="flex items-center justify-between px-2 py-1.5">
        <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Zap className="h-3 w-3 text-primary" />
          Resultados
        </span>
        <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
          {resultCount} {resultCount === 1 ? "resultado" : "resultados"}
        </Badge>
      </div>

      {products.length > 0 && (
        <div>
          {products.length > 1 && (
            <div className="flex items-center gap-1.5 px-3 pt-1 pb-0.5">
              <Package className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Produtos ({products.length})</span>
            </div>
          )}
          {products.map((result) => {
            const idx = suggestions.indexOf(result);
            return <SearchResultItem key={result.id} result={result} index={idx} selectedIndex={selectedIndex} query={query} onSelect={onSelect} onHover={onHover} />;
          })}
        </div>
      )}

      {categories.length > 0 && (
        <div>
          {products.length > 0 && <Separator className="my-1.5 opacity-50" />}
          <div className="flex items-center gap-1.5 px-3 pt-1 pb-0.5">
            <Folder className="h-3 w-3 text-warning" />
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Categorias ({categories.length})</span>
          </div>
          {categories.map((result) => {
            const idx = suggestions.indexOf(result);
            return <SearchResultItem key={result.id} result={result} index={idx} selectedIndex={selectedIndex} query={query} onSelect={onSelect} onHover={onHover} />;
          })}
        </div>
      )}

      {suppliers.length > 0 && (
        <div>
          {(products.length > 0 || categories.length > 0) && <Separator className="my-1.5 opacity-50" />}
          <div className="flex items-center gap-1.5 px-3 pt-1 pb-0.5">
            <Building2 className="h-3 w-3 text-primary" />
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Fornecedores ({suppliers.length})</span>
          </div>
          {suppliers.map((result) => {
            const idx = suggestions.indexOf(result);
            return <SearchResultItem key={result.id} result={result} index={idx} selectedIndex={selectedIndex} query={query} onSelect={onSelect} onHover={onHover} />;
          })}
        </div>
      )}
    </div>
  );
}
