import { useState, useEffect, useRef, useCallback, forwardRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Search, 
  X, 
  Clock, 
  TrendingUp, 
  Package, 
  Folder,
  Building2,
  Loader2,
  Mic,
  ArrowRight,
  Sparkles,
  Hash,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSearch, type SearchResult } from "@/hooks/useSearch";
import { useDebounce } from "@/hooks/useDebounce";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { HighlightMatch } from "./HighlightMatch";
import { motion, AnimatePresence } from "framer-motion";

interface SmartSearchInputProps {
  placeholder?: string;
  onSelect?: (result: SearchResult) => void;
  /** Called when the user submits a plain text search (Enter key). If provided, prevents default navigation. */
  onSearch?: (query: string) => void;
  className?: string;
  autoFocus?: boolean;
}

const typeIcons: Record<string, React.ReactNode> = {
  product: <Package className="h-4 w-4 text-primary" />,
  category: <Folder className="h-4 w-4 text-amber-500" />,
  supplier: <Building2 className="h-4 w-4 text-primary" />,
  history: <Clock className="h-4 w-4 text-muted-foreground" />,
};

const typeLabels: Record<string, string> = {
  product: "Produto",
  category: "Categoria",
  supplier: "Fornecedor",
  history: "Histórico",
};

export const SmartSearchInput = forwardRef<HTMLDivElement, SmartSearchInputProps>(function SmartSearchInput({
  placeholder = "Buscar produtos, categorias, fornecedores...",
  onSelect,
  onSearch,
  className,
  autoFocus = false,
}, _ref) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);

  const {
    query,
    setQuery,
    suggestions,
    quickSuggestions,
    history,
    addToHistory,
    removeFromHistory,
    clearHistory,
  } = useSearch();

  const debouncedQuery = useDebounce(query, 150);

  // Group suggestions by type for better visual hierarchy
  const groupedSuggestions = useMemo(() => {
    if (!query || suggestions.length === 0) return null;
    
    const products = suggestions.filter(s => s.type === "product");
    const categories = suggestions.filter(s => s.type === "category");
    const suppliers = suggestions.filter(s => s.type === "supplier");
    
    return { products, categories, suppliers };
  }, [query, suggestions]);

  // Count by type for header badges
  const resultCount = useMemo(() => suggestions.filter(s => s.type !== "history").length, [suggestions]);

  // Voice search
  const handleVoiceResult = useCallback((transcript: string) => {
    setQuery(transcript);
    inputRef.current?.focus();
  }, [setQuery]);

  const {
    isListening,
    isSupported: voiceSupported,
    startListening,
    stopListening,
  } = useSpeechRecognition({
    onResult: handleVoiceResult,
    language: "pt-BR",
  });

  // Simulate search loading
  useEffect(() => {
    if (debouncedQuery) {
      setIsSearching(true);
      const timer = setTimeout(() => setIsSearching(false), 200);
      return () => clearTimeout(timer);
    }
    setIsSearching(false);
  }, [debouncedQuery]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset selected index when suggestions change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [suggestions]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const maxIndex = suggestions.length - 1;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev < maxIndex ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : maxIndex));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSelectResult(suggestions[selectedIndex]);
        } else if (query.trim()) {
          addToHistory(query);
          if (onSearch) {
            onSearch(query);
          } else {
            navigate(`/?search=${encodeURIComponent(query)}`);
          }
          setIsFocused(false);
        }
        break;
      case "Escape":
        setIsFocused(false);
        inputRef.current?.blur();
        break;
    }
  };

  const handleSelectResult = (result: SearchResult) => {
    addToHistory(result.label);
    setQuery("");
    setIsFocused(false);
    setSelectedIndex(-1);

    if (onSelect) {
      onSelect(result);
      return;
    }

    // Default navigation based on type
    switch (result.type) {
      case "product":
        navigate(`/produto/${result.id}`);
        break;
      case "category":
        navigate(`/?categoria=${result.id}`);
        break;
      case "supplier":
        navigate(`/?fornecedor=${result.id}`);
        break;
      case "history":
        setQuery(result.label);
        navigate(`/?search=${encodeURIComponent(result.label)}`);
        break;
    }
  };

  const handleQuickSuggestionClick = (label: string) => {
    setQuery(label);
    addToHistory(label);
    if (onSearch) {
      onSearch(label);
    } else {
      navigate(`/?search=${encodeURIComponent(label)}`);
    }
    setIsFocused(false);
  };

  const toggleVoice = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const showDropdown = isFocused && (suggestions.length > 0 || quickSuggestions.length > 0 || history.length > 0);

  const renderResultItem = (result: SearchResult, index: number) => (
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
      onClick={() => handleSelectResult(result)}
      onMouseEnter={() => setSelectedIndex(index)}
    >
      <div className={cn(
        "flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 transition-colors",
        selectedIndex === index ? "bg-primary/15" : "bg-muted"
      )}>
        {typeIcons[result.type] || result.icon}
      </div>
      <div className="flex-1 min-w-0">
        <HighlightMatch 
          text={result.label} 
          query={query} 
          className="font-medium text-sm block truncate" 
        />
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

  const renderGroupedResults = () => {
    if (!groupedSuggestions) return null;
    const { products, categories, suppliers } = groupedSuggestions;
    let globalIndex = 0;

    return (
      <div className="p-2 space-y-1">
        {/* Results header with count */}
        <div className="flex items-center justify-between px-2 py-1.5">
          <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Zap className="h-3 w-3 text-primary" />
            Resultados
          </span>
          <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
            {resultCount} {resultCount === 1 ? "resultado" : "resultados"}
          </Badge>
        </div>

        {/* Products */}
        {products.length > 0 && (
          <div>
            {products.length > 1 && (
              <div className="flex items-center gap-1.5 px-3 pt-1 pb-0.5">
                <Package className="h-3 w-3 text-primary" />
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  Produtos ({products.length})
                </span>
              </div>
            )}
            {products.map((result) => {
              const idx = suggestions.indexOf(result);
              return renderResultItem(result, idx);
            })}
          </div>
        )}

        {/* Categories */}
        {categories.length > 0 && (
          <div>
            {(products.length > 0) && <Separator className="my-1.5 opacity-50" />}
            <div className="flex items-center gap-1.5 px-3 pt-1 pb-0.5">
              <Folder className="h-3 w-3 text-amber-400" />
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Categorias ({categories.length})
              </span>
            </div>
            {categories.map((result) => {
              const idx = suggestions.indexOf(result);
              return renderResultItem(result, idx);
            })}
          </div>
        )}

        {/* Suppliers */}
        {suppliers.length > 0 && (
          <div>
            {(products.length > 0 || categories.length > 0) && <Separator className="my-1.5 opacity-50" />}
            <div className="flex items-center gap-1.5 px-3 pt-1 pb-0.5">
              <Building2 className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Fornecedores ({suppliers.length})
              </span>
            </div>
            {suppliers.map((result) => {
              const idx = suggestions.indexOf(result);
              return renderResultItem(result, idx);
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <Tooltip delayDuration={400} open={!isFocused ? undefined : false}>
        <TooltipTrigger asChild>
          <div className="relative group">
            <button
              type="button"
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 p-0 bg-transparent border-none cursor-pointer hover:text-primary transition-colors"
              onClick={() => {
                if (query.trim()) {
                  addToHistory(query);
                  if (onSearch) {
                    onSearch(query);
                  } else {
                    navigate(`/?search=${encodeURIComponent(query)}`);
                  }
                  setIsFocused(false);
                }
              }}
              tabIndex={-1}
              aria-label="Buscar"
            >
              <Search className={cn(
                "h-4 w-4 transition-colors duration-200",
                isFocused ? "text-primary" : "text-muted-foreground group-hover:text-primary"
              )} />
            </button>
            
            <Input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              autoFocus={autoFocus}
              aria-label="Campo de busca"
              aria-expanded={showDropdown}
              aria-haspopup="listbox"
              role="combobox"
              autoComplete="off"
              className={cn(
                "pl-10 pr-20 h-11 bg-background/80 backdrop-blur-sm",
                "border-muted-foreground/20",
                "transition-all duration-300 ease-out",
                isFocused 
                  ? "border-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.1)] ring-0" 
                  : "hover:border-muted-foreground/40",
                isListening && "ring-2 ring-primary ring-offset-2 animate-pulse"
              )}
            />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isSearching && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            </motion.div>
          )}
          
          {query && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive"
              onClick={() => { setQuery(""); onSearch?.(""); }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}

          {voiceSupported && (
            <Button
              variant={isListening ? "default" : "ghost"}
              size="sm"
              className={cn("h-7 w-7 p-0", isListening && "bg-primary text-primary-foreground")}
              onClick={toggleVoice}
              aria-label={isListening ? "Parar gravação de voz" : "Busca por voz"}
            >
              <Mic className={cn("h-4 w-4", isListening && "animate-pulse")} />
            </Button>
          )}
        </div>
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute top-full left-0 right-0 mt-2 z-50 bg-popover border border-border rounded-xl shadow-xl overflow-hidden"
            role="listbox"
          >
            <ScrollArea className="max-h-[420px]">
              {/* Search Results - Grouped */}
              {query && suggestions.length > 0 && renderGroupedResults()}

              {/* No query - show history and quick suggestions */}
              {!query && (
                <>
                  {/* Recent Searches */}
                  {history.length > 0 && (
                    <div className="p-2">
                      <div className="flex items-center justify-between px-2 py-1.5">
                        <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Buscas Recentes
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            clearHistory();
                          }}
                        >
                          Limpar
                        </Button>
                      </div>
                      {history.slice(0, 5).map((term, index) => (
                        <motion.div
                          key={term}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted group cursor-pointer transition-colors"
                          onClick={() => handleQuickSuggestionClick(term)}
                        >
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="flex-1 truncate text-sm">{term}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFromHistory(term);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  <Separator className="opacity-50" />

                  {/* Quick Suggestions */}
                  <div className="p-2">
                    <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground">
                      <TrendingUp className="h-3 w-3" />
                      Sugestões Populares
                    </div>
                    <div className="flex flex-wrap gap-2 px-2 py-2">
                      {quickSuggestions.map((suggestion, index) => (
                        <motion.div
                          key={suggestion.label}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.04 }}
                        >
                          <Badge
                            variant="secondary"
                            className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-all duration-200 hover:scale-105"
                            onClick={() => handleQuickSuggestionClick(suggestion.label)}
                          >
                            {suggestion.icon} {suggestion.label}
                          </Badge>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* No results */}
              {query && suggestions.length === 0 && !isSearching && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-8 text-center text-muted-foreground"
                >
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="font-medium">Nenhum resultado para "<span className="text-foreground">{query}</span>"</p>
                  <p className="text-xs mt-1.5 text-muted-foreground/70">
                    Tente buscar por nome, SKU ou categoria
                  </p>
                  {/* Suggest searching all */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 text-xs"
                    onClick={() => {
                      addToHistory(query);
                      if (onSearch) {
                        onSearch(query);
                      } else {
                        navigate(`/?search=${encodeURIComponent(query)}`);
                      }
                      setIsFocused(false);
                    }}
                  >
                    <Search className="h-3 w-3 mr-1.5" />
                    Buscar "{query}" no catálogo completo
                  </Button>
                </motion.div>
              )}
            </ScrollArea>

            {/* Keyboard hints */}
            <div className="border-t border-border/50 bg-muted/30 px-3 py-1.5 flex items-center justify-between text-[10px] text-muted-foreground/70">
              <div className="flex items-center gap-3">
                <span><kbd className="px-1 py-0.5 bg-muted rounded text-[9px] font-mono">↑↓</kbd> navegar</span>
                <span><kbd className="px-1 py-0.5 bg-muted rounded text-[9px] font-mono">Enter</kbd> selecionar</span>
                <span><kbd className="px-1 py-0.5 bg-muted rounded text-[9px] font-mono">Esc</kbd> fechar</span>
              </div>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-muted rounded text-[9px] font-mono">⌘K</kbd> busca global
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
