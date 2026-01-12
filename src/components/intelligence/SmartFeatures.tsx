/**
 * Smart Features
 * AI suggestions, auto-complete, recent items, favorites
 */

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  Clock,
  TrendingUp,
  Lightbulb,
  X,
  Plus,
  History,
  Sparkles,
  Search,
  ArrowRight,
  Check,
  Bookmark,
} from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Recent Items Hook
interface RecentItem {
  id: string;
  type: string;
  title: string;
  description?: string;
  href?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export function useRecentItems(key: string, maxItems = 10) {
  const [items, setItems] = useState<RecentItem[]>(() => {
    const stored = localStorage.getItem(`recent-${key}`);
    return stored ? JSON.parse(stored) : [];
  });

  const addItem = useCallback(
    (item: Omit<RecentItem, "timestamp">) => {
      setItems((prev) => {
        const filtered = prev.filter((i) => i.id !== item.id);
        const next = [{ ...item, timestamp: Date.now() }, ...filtered].slice(
          0,
          maxItems
        );
        localStorage.setItem(`recent-${key}`, JSON.stringify(next));
        return next;
      });
    },
    [key, maxItems]
  );

  const removeItem = useCallback(
    (id: string) => {
      setItems((prev) => {
        const next = prev.filter((i) => i.id !== id);
        localStorage.setItem(`recent-${key}`, JSON.stringify(next));
        return next;
      });
    },
    [key]
  );

  const clearItems = useCallback(() => {
    setItems([]);
    localStorage.removeItem(`recent-${key}`);
  }, [key]);

  return { items, addItem, removeItem, clearItems };
}

// Recent Items Component
interface RecentItemsProps {
  items: RecentItem[];
  onSelect: (item: RecentItem) => void;
  onRemove?: (id: string) => void;
  onClear?: () => void;
  title?: string;
  className?: string;
  emptyMessage?: string;
}

export function RecentItems({
  items,
  onSelect,
  onRemove,
  onClear,
  title = "Recentes",
  className,
  emptyMessage = "Nenhum item recente",
}: RecentItemsProps) {
  if (items.length === 0) {
    return (
      <div className={cn("text-center py-6 text-muted-foreground", className)}>
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Clock className="h-4 w-4" />
          {title}
        </h3>
        {onClear && items.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={onClear}
          >
            Limpar
          </Button>
        )}
      </div>
      <div className="space-y-1">
        {items.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="group flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer"
            onClick={() => onSelect(item)}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.title}</p>
              {item.description && (
                <p className="text-xs text-muted-foreground truncate">
                  {item.description}
                </p>
              )}
            </div>
            {onRemove && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(item.id);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// Favorites Hook
interface FavoriteItem {
  id: string;
  type: string;
  title: string;
  description?: string;
  href?: string;
  color?: string;
  icon?: string;
}

export function useFavorites(key: string) {
  const [favorites, setFavorites] = useState<FavoriteItem[]>(() => {
    const stored = localStorage.getItem(`favorites-${key}`);
    return stored ? JSON.parse(stored) : [];
  });

  const addFavorite = useCallback(
    (item: FavoriteItem) => {
      setFavorites((prev) => {
        if (prev.some((f) => f.id === item.id)) return prev;
        const next = [...prev, item];
        localStorage.setItem(`favorites-${key}`, JSON.stringify(next));
        return next;
      });
    },
    [key]
  );

  const removeFavorite = useCallback(
    (id: string) => {
      setFavorites((prev) => {
        const next = prev.filter((f) => f.id !== id);
        localStorage.setItem(`favorites-${key}`, JSON.stringify(next));
        return next;
      });
    },
    [key]
  );

  const isFavorite = useCallback(
    (id: string) => favorites.some((f) => f.id === id),
    [favorites]
  );

  const toggleFavorite = useCallback(
    (item: FavoriteItem) => {
      if (isFavorite(item.id)) {
        removeFavorite(item.id);
      } else {
        addFavorite(item);
      }
    },
    [isFavorite, addFavorite, removeFavorite]
  );

  return { favorites, addFavorite, removeFavorite, isFavorite, toggleFavorite };
}

// Favorite Button
export function FavoriteButton({
  isFavorite,
  onToggle,
  className,
}: {
  isFavorite: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("h-8 w-8", className)}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
    >
      <Star
        className={cn(
          "h-4 w-4 transition-colors",
          isFavorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
        )}
      />
    </Button>
  );
}

// Favorites Grid
interface FavoritesGridProps {
  favorites: FavoriteItem[];
  onSelect: (item: FavoriteItem) => void;
  onRemove?: (id: string) => void;
  columns?: number;
  className?: string;
}

export function FavoritesGrid({
  favorites,
  onSelect,
  onRemove,
  columns = 4,
  className,
}: FavoritesGridProps) {
  if (favorites.length === 0) {
    return (
      <div className={cn("text-center py-8 text-muted-foreground", className)}>
        <Star className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p className="text-sm">Nenhum favorito ainda</p>
        <p className="text-xs mt-1">
          Clique na estrela para adicionar aos favoritos
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn("grid gap-4", className)}
      style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
    >
      {favorites.map((item) => (
        <motion.div
          key={item.id}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="group relative p-4 rounded-lg border bg-card cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onSelect(item)}
        >
          {onRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(item.id);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          <div
            className="h-10 w-10 rounded-lg mb-3 flex items-center justify-center"
            style={{ backgroundColor: item.color || "hsl(var(--muted))" }}
          >
            <Star className="h-5 w-5 text-white" />
          </div>
          <h4 className="font-medium text-sm truncate">{item.title}</h4>
          {item.description && (
            <p className="text-xs text-muted-foreground truncate mt-1">
              {item.description}
            </p>
          )}
        </motion.div>
      ))}
    </div>
  );
}

// Smart Suggestions
interface Suggestion {
  id: string;
  label: string;
  description?: string;
  type: "action" | "navigation" | "data" | "help";
  confidence: number;
  action: () => void;
}

interface SmartSuggestionsProps {
  suggestions: Suggestion[];
  isVisible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

export function SmartSuggestions({
  suggestions,
  isVisible = true,
  onDismiss,
  className,
}: SmartSuggestionsProps) {
  const [dismissed, setDismissed] = useState<string[]>([]);

  const visibleSuggestions = suggestions.filter(
    (s) => !dismissed.includes(s.id)
  );

  if (!isVisible || visibleSuggestions.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        "p-4 rounded-lg border bg-gradient-to-r from-primary/5 to-primary/10",
        className
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Sugestões Inteligentes</span>
        </div>
        {onDismiss && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onDismiss}>
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {visibleSuggestions.slice(0, 3).map((suggestion) => (
          <motion.div
            key={suggestion.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center justify-between p-2 rounded-lg bg-background/50 hover:bg-background transition-colors"
          >
            <div className="flex items-center gap-3">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              <div>
                <p className="text-sm font-medium">{suggestion.label}</p>
                {suggestion.description && (
                  <p className="text-xs text-muted-foreground">
                    {suggestion.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7"
                onClick={() => setDismissed((prev) => [...prev, suggestion.id])}
              >
                Ignorar
              </Button>
              <Button size="sm" className="h-7" onClick={suggestion.action}>
                Aplicar
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// Auto-Complete Input
interface AutoCompleteProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  onSelect: (value: string) => void;
  placeholder?: string;
  className?: string;
  isLoading?: boolean;
}

export function AutoComplete({
  value,
  onChange,
  suggestions,
  onSelect,
  placeholder,
  className,
  isLoading,
}: AutoCompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredSuggestions = suggestions.filter((s) =>
    s.toLowerCase().includes(value.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredSuggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredSuggestions.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (filteredSuggestions[selectedIndex]) {
          onSelect(filteredSuggestions[selectedIndex]);
          setIsOpen(false);
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
    }
  };

  return (
    <Popover open={isOpen && filteredSuggestions.length > 0} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
            setSelectedIndex(0);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={className}
        />
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Command>
          <CommandList>
            {isLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Carregando...
              </div>
            ) : filteredSuggestions.length === 0 ? (
              <CommandEmpty>Nenhuma sugestão</CommandEmpty>
            ) : (
              <CommandGroup>
                {filteredSuggestions.map((suggestion, index) => (
                  <CommandItem
                    key={suggestion}
                    onSelect={() => {
                      onSelect(suggestion);
                      setIsOpen(false);
                    }}
                    className={cn(
                      index === selectedIndex && "bg-accent"
                    )}
                  >
                    {suggestion}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// Trending Items
interface TrendingItem {
  id: string;
  label: string;
  count: number;
  trend: "up" | "down" | "stable";
}

export function TrendingItems({
  items,
  onSelect,
  className,
}: {
  items: TrendingItem[];
  onSelect: (item: TrendingItem) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
        <TrendingUp className="h-4 w-4" />
        Em Alta
      </h3>
      <div className="flex flex-wrap gap-2">
        {items.map((item, index) => (
          <Badge
            key={item.id}
            variant="secondary"
            className="cursor-pointer hover:bg-accent transition-colors"
            onClick={() => onSelect(item)}
          >
            <span className="text-xs text-muted-foreground mr-1">
              #{index + 1}
            </span>
            {item.label}
            {item.trend === "up" && (
              <TrendingUp className="h-3 w-3 ml-1 text-green-500" />
            )}
          </Badge>
        ))}
      </div>
    </div>
  );
}

// Quick Add
interface QuickAddProps {
  placeholder?: string;
  onAdd: (value: string) => void;
  className?: string;
}

export function QuickAdd({ placeholder = "Adicionar...", onAdd, className }: QuickAddProps) {
  const [value, setValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = () => {
    if (value.trim()) {
      onAdd(value.trim());
      setValue("");
      setIsOpen(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen ? (
        <motion.div
          initial={{ opacity: 0, width: 40 }}
          animate={{ opacity: 1, width: "100%" }}
          exit={{ opacity: 0, width: 40 }}
          className={cn("flex items-center gap-2", className)}
        >
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
              if (e.key === "Escape") {
                setValue("");
                setIsOpen(false);
              }
            }}
            placeholder={placeholder}
            autoFocus
            className="flex-1"
          />
          <Button size="icon" onClick={handleSubmit}>
            <Check className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setValue("");
              setIsOpen(false);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <Button
            variant="outline"
            className={cn("gap-2", className)}
            onClick={() => setIsOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Bookmarks
export function useBookmarks(key: string) {
  const [bookmarks, setBookmarks] = useState<Record<string, boolean>>(() => {
    const stored = localStorage.getItem(`bookmarks-${key}`);
    return stored ? JSON.parse(stored) : {};
  });

  const toggle = useCallback(
    (id: string) => {
      setBookmarks((prev) => {
        const next = { ...prev, [id]: !prev[id] };
        if (!next[id]) delete next[id];
        localStorage.setItem(`bookmarks-${key}`, JSON.stringify(next));
        return next;
      });
    },
    [key]
  );

  const isBookmarked = useCallback(
    (id: string) => !!bookmarks[id],
    [bookmarks]
  );

  const getBookmarkedIds = useCallback(
    () => Object.keys(bookmarks).filter((id) => bookmarks[id]),
    [bookmarks]
  );

  return { bookmarks, toggle, isBookmarked, getBookmarkedIds };
}

export function BookmarkButton({
  isBookmarked,
  onToggle,
  className,
}: {
  isBookmarked: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("h-8 w-8", className)}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
    >
      <Bookmark
        className={cn(
          "h-4 w-4 transition-colors",
          isBookmarked ? "fill-primary text-primary" : "text-muted-foreground"
        )}
      />
    </Button>
  );
}
