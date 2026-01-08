import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  X, 
  Clock, 
  TrendingUp, 
  Package, 
  Users, 
  FileText,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface SearchSuggestion {
  type: "recent" | "trending" | "product" | "client" | "quote" | "ai";
  text: string;
  subtext?: string;
  href?: string;
  icon?: React.ReactNode;
}

interface SmartSearchProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
}

const STORAGE_KEY = "smart_search_history";
const MAX_HISTORY = 5;

export function SmartSearch({ 
  onSearch, 
  placeholder = "Buscar produtos, clientes, orçamentos...",
  className 
}: SmartSearchProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Load search history
  const getHistory = (): string[] => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  };

  // Save to history
  const saveToHistory = (term: string) => {
    if (!term.trim()) return;
    const history = getHistory().filter(h => h !== term);
    history.unshift(term);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
  };

  // Clear history
  const clearHistory = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSuggestions(buildSuggestions(""));
  };

  // Build suggestions based on query
  const buildSuggestions = useCallback((q: string): SearchSuggestion[] => {
    const items: SearchSuggestion[] = [];

    if (!q) {
      // Show recent searches
      const history = getHistory();
      history.forEach(term => {
        items.push({
          type: "recent",
          text: term,
          icon: <Clock className="w-4 h-4 text-muted-foreground" />
        });
      });

      // Show trending
      items.push(
        { type: "trending", text: "Canetas personalizadas", icon: <TrendingUp className="w-4 h-4 text-amber-500" /> },
        { type: "trending", text: "Kits corporativos", icon: <TrendingUp className="w-4 h-4 text-amber-500" /> },
        { type: "trending", text: "Brindes sustentáveis", icon: <TrendingUp className="w-4 h-4 text-amber-500" /> }
      );

      return items;
    }

    // AI suggestion
    items.push({
      type: "ai",
      text: `Buscar "${q}" com IA`,
      subtext: "Encontre os melhores resultados",
      icon: <Sparkles className="w-4 h-4 text-purple-500" />
    });

    // Quick actions based on query patterns
    if (q.match(/^#?\d+/)) {
      items.push({
        type: "quote",
        text: `Orçamento ${q}`,
        subtext: "Ver orçamento",
        href: `/orcamentos?search=${q}`,
        icon: <FileText className="w-4 h-4 text-blue-500" />
      });
    }

    // Product suggestions
    items.push({
      type: "product",
      text: `Produtos: ${q}`,
      href: `/catalogo?search=${q}`,
      icon: <Package className="w-4 h-4 text-green-500" />
    });

    // Client suggestions
    items.push({
      type: "client",
      text: `Clientes: ${q}`,
      href: `/empresas?search=${q}`,
      icon: <Users className="w-4 h-4 text-purple-500" />
    });

    return items;
  }, []);

  // Update suggestions when query changes
  useEffect(() => {
    setSuggestions(buildSuggestions(query));
    setSelectedIndex(-1);
  }, [query, buildSuggestions]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSelect(suggestions[selectedIndex]);
        } else if (query) {
          handleSearch();
        }
        break;
      case "Escape":
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  // Handle search
  const handleSearch = () => {
    if (!query.trim()) return;
    saveToHistory(query);
    onSearch(query);
    setIsOpen(false);
  };

  // Handle suggestion selection
  const handleSelect = (suggestion: SearchSuggestion) => {
    if (suggestion.href) {
      navigate(suggestion.href);
    } else {
      setQuery(suggestion.text);
      saveToHistory(suggestion.text);
      onSearch(suggestion.text);
    }
    setIsOpen(false);
  };

  return (
    <div className={cn("relative", className)}>
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            "w-full pl-10 pr-10 py-2.5 rounded-xl",
            "bg-muted/50 border border-border",
            "text-foreground placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-2 focus:ring-primary/50",
            "transition-all"
          )}
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Suggestions dropdown */}
      <AnimatePresence>
        {isOpen && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 z-50 bg-background border border-border rounded-xl shadow-lg overflow-hidden"
          >
            {/* Recent header */}
            {!query && getHistory().length > 0 && (
              <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                <span className="text-xs font-medium text-muted-foreground">
                  Buscas recentes
                </span>
                <button
                  onClick={clearHistory}
                  className="text-xs text-primary hover:underline"
                >
                  Limpar
                </button>
              </div>
            )}

            {/* Suggestions list */}
            <div className="py-1 max-h-80 overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <button
                  key={`${suggestion.type}-${index}`}
                  onClick={() => handleSelect(suggestion)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5",
                    "hover:bg-muted/50 transition-colors text-left",
                    selectedIndex === index && "bg-muted"
                  )}
                >
                  {suggestion.icon}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">
                      {suggestion.text}
                    </p>
                    {suggestion.subtext && (
                      <p className="text-xs text-muted-foreground truncate">
                        {suggestion.subtext}
                      </p>
                    )}
                  </div>
                  {suggestion.href && (
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
              ))}
            </div>

            {/* Footer */}
            <div className="px-3 py-2 border-t border-border bg-muted/30">
              <p className="text-xs text-muted-foreground">
                Pressione <kbd className="px-1 py-0.5 rounded bg-muted border border-border text-xs">Enter</kbd> para buscar
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click outside to close */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

// Search history hook
export function useSearchHistory(key: string = STORAGE_KEY) {
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch {}
  }, [key]);

  const add = (term: string) => {
    const updated = [term, ...history.filter(h => h !== term)].slice(0, MAX_HISTORY);
    setHistory(updated);
    localStorage.setItem(key, JSON.stringify(updated));
  };

  const remove = (term: string) => {
    const updated = history.filter(h => h !== term);
    setHistory(updated);
    localStorage.setItem(key, JSON.stringify(updated));
  };

  const clear = () => {
    setHistory([]);
    localStorage.removeItem(key);
  };

  return { history, add, remove, clear };
}
