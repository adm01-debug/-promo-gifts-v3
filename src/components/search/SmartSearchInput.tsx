import { useState, useEffect, useRef, useCallback, forwardRef } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
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
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSearch, type SearchResult } from "@/hooks/useSearch";
import { useDebounce } from "@/hooks/useDebounce";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

interface SmartSearchInputProps {
  placeholder?: string;
  onSelect?: (result: SearchResult) => void;
  /** Called when the user submits a plain text search (Enter key). If provided, prevents default navigation. */
  onSearch?: (query: string) => void;
  className?: string;
  autoFocus?: boolean;
}

const typeIcons: Record<string, React.ReactNode> = {
  product: <Package className="h-4 w-4 text-blue-500" />,
  category: <Folder className="h-4 w-4 text-amber-500" />,
  supplier: <Building2 className="h-4 w-4 text-emerald-500" />,
  history: <Clock className="h-4 w-4 text-muted-foreground" />,
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

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <div className="relative">
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
          <Search className="h-4 w-4 text-primary" />
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
          className={cn(
            "pl-10 pr-20 h-11 bg-background/80 backdrop-blur-sm",
            "border-muted-foreground/20 focus:border-primary",
            "transition-all duration-200",
            isListening && "ring-2 ring-primary ring-offset-2 animate-pulse"
          )}
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isSearching && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          
          {query && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
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
            >
              <Mic className={cn("h-4 w-4", isListening && "animate-pulse")} />
            </Button>
          )}
        </div>
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
          <ScrollArea className="max-h-[400px]">
            {/* Search Results */}
            {query && suggestions.length > 0 && (
              <div className="p-2">
                <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  <Sparkles className="h-3 w-3" />
                  Resultados
                </div>
                {suggestions.map((result, index) => (
                  <button
                    key={result.id}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-colors",
                      selectedIndex === index
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-muted"
                    )}
                    onClick={() => handleSelectResult(result)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    {typeIcons[result.type] || result.icon}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{result.label}</div>
                      {result.sublabel && (
                        <div className="text-xs text-muted-foreground truncate">
                          {result.sublabel}
                        </div>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {result.type === "product" && "Produto"}
                      {result.type === "category" && "Categoria"}
                      {result.type === "supplier" && "Fornecedor"}
                      {result.type === "history" && "Histórico"}
                    </Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}

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
                    {history.slice(0, 5).map((term) => (
                      <div
                        key={term}
                        className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted group cursor-pointer"
                        onClick={() => handleQuickSuggestionClick(term)}
                      >
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="flex-1 truncate">{term}</span>
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
                      </div>
                    ))}
                  </div>
                )}

                <Separator />

                {/* Quick Suggestions */}
                <div className="p-2">
                  <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    <TrendingUp className="h-3 w-3" />
                    Sugestões Populares
                  </div>
                  <div className="flex flex-wrap gap-2 px-2 py-2">
                    {quickSuggestions.map((suggestion) => (
                      <Badge
                        key={suggestion.label}
                        variant="secondary"
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                        onClick={() => handleQuickSuggestionClick(suggestion.label)}
                      >
                        {suggestion.icon} {suggestion.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* No results */}
            {query && suggestions.length === 0 && !isSearching && (
              <div className="p-8 text-center text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nenhum resultado para "{query}"</p>
                <p className="text-xs mt-1">Tente buscar por nome, SKU ou categoria</p>
              </div>
            )}
          </ScrollArea>

          {/* Keyboard hints */}
          <div className="border-t bg-muted/50 px-3 py-2 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">↑↓</kbd> navegar</span>
              <span><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Enter</kbd> selecionar</span>
              <span><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Esc</kbd> fechar</span>
            </div>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">⌘K</kbd> busca global
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
