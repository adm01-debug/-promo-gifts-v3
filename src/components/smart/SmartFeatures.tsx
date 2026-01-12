/**
 * Smart Features Components
 * Intelligent UI components with predictive and adaptive behavior
 */

import React, { 
  useState, 
  useEffect, 
  useCallback, 
  useMemo,
  useRef 
} from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Clock, 
  Star, 
  TrendingUp, 
  Sparkles,
  History,
  Zap,
  Target,
  Lightbulb
} from "lucide-react";

// ============================================
// SMART SUGGESTIONS
// ============================================

interface Suggestion {
  id: string;
  label: string;
  value: unknown;
  score: number;
  type: "recent" | "popular" | "predicted" | "personalized";
  metadata?: Record<string, unknown>;
}

interface SmartSuggestionsProps {
  suggestions: Suggestion[];
  onSelect: (suggestion: Suggestion) => void;
  title?: string;
  maxItems?: number;
  showScores?: boolean;
  className?: string;
}

export function SmartSuggestions({
  suggestions,
  onSelect,
  title = "Sugestões",
  maxItems = 5,
  showScores = false,
  className,
}: SmartSuggestionsProps) {
  const sortedSuggestions = useMemo(
    () => [...suggestions].sort((a, b) => b.score - a.score).slice(0, maxItems),
    [suggestions, maxItems]
  );

  const getIcon = (type: Suggestion["type"]) => {
    switch (type) {
      case "recent":
        return <History className="h-3 w-3" />;
      case "popular":
        return <TrendingUp className="h-3 w-3" />;
      case "predicted":
        return <Sparkles className="h-3 w-3" />;
      case "personalized":
        return <Target className="h-3 w-3" />;
    }
  };

  const getTypeLabel = (type: Suggestion["type"]) => {
    switch (type) {
      case "recent":
        return "Recente";
      case "popular":
        return "Popular";
      case "predicted":
        return "Sugerido";
      case "personalized":
        return "Para você";
    }
  };

  if (sortedSuggestions.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      {title && (
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Lightbulb className="h-4 w-4" />
          {title}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {sortedSuggestions.map((suggestion) => (
          <Button
            key={suggestion.id}
            variant="outline"
            size="sm"
            onClick={() => onSelect(suggestion)}
            className="h-auto py-1.5 px-3 gap-1.5"
          >
            {getIcon(suggestion.type)}
            <span>{suggestion.label}</span>
            {showScores && (
              <Badge variant="secondary" className="ml-1 text-[10px] px-1">
                {Math.round(suggestion.score * 100)}%
              </Badge>
            )}
          </Button>
        ))}
      </div>
    </div>
  );
}

// ============================================
// RECENTLY USED ITEMS
// ============================================

interface RecentItem {
  id: string;
  label: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

interface RecentlyUsedProps<T extends RecentItem> {
  items: T[];
  onSelect: (item: T) => void;
  renderItem?: (item: T) => React.ReactNode;
  maxItems?: number;
  title?: string;
  emptyMessage?: string;
  className?: string;
}

export function RecentlyUsed<T extends RecentItem>({
  items,
  onSelect,
  renderItem,
  maxItems = 5,
  title = "Usados recentemente",
  emptyMessage = "Nenhum item recente",
  className,
}: RecentlyUsedProps<T>) {
  const recentItems = useMemo(
    () => [...items].sort((a, b) => b.timestamp - a.timestamp).slice(0, maxItems),
    [items, maxItems]
  );

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Agora";
    if (minutes < 60) return `${minutes}min`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Clock className="h-4 w-4" />
        {title}
      </div>
      
      {recentItems.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <ScrollArea className="max-h-48">
          <div className="space-y-1">
            {recentItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onSelect(item)}
                className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-accent transition-colors text-left"
              >
                {renderItem ? (
                  renderItem(item)
                ) : (
                  <span className="text-sm">{item.label}</span>
                )}
                <span className="text-xs text-muted-foreground">
                  {formatTime(item.timestamp)}
                </span>
              </button>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

// ============================================
// QUICK ACTIONS
// ============================================

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
  shortcut?: string;
  badge?: string | number;
  disabled?: boolean;
}

interface QuickActionsProps {
  actions: QuickAction[];
  variant?: "grid" | "list" | "inline";
  columns?: number;
  className?: string;
}

export function QuickActions({
  actions,
  variant = "grid",
  columns = 4,
  className,
}: QuickActionsProps) {
  // Register keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        const action = actions.find(
          (a) => a.shortcut?.toLowerCase() === e.key.toLowerCase()
        );
        if (action && !action.disabled) {
          e.preventDefault();
          action.action();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [actions]);

  if (variant === "inline") {
    return (
      <div className={cn("flex flex-wrap gap-2", className)}>
        {actions.map((action) => (
          <Button
            key={action.id}
            variant="outline"
            size="sm"
            onClick={action.action}
            disabled={action.disabled}
            className="gap-1.5"
          >
            {action.icon}
            {action.label}
            {action.badge !== undefined && (
              <Badge variant="secondary" className="ml-1">
                {action.badge}
              </Badge>
            )}
          </Button>
        ))}
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div className={cn("space-y-1", className)}>
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={action.action}
            disabled={action.disabled}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-lg transition-colors",
              "hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            <div className="text-primary">{action.icon}</div>
            <div className="flex-1 text-left">
              <div className="font-medium">{action.label}</div>
              {action.shortcut && (
                <div className="text-xs text-muted-foreground">
                  ⌘{action.shortcut.toUpperCase()}
                </div>
              )}
            </div>
            {action.badge !== undefined && (
              <Badge variant="secondary">{action.badge}</Badge>
            )}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn("grid gap-2", className)}
      style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
    >
      {actions.map((action) => (
        <Card
          key={action.id}
          className={cn(
            "cursor-pointer transition-all hover:shadow-md hover:border-primary/50",
            action.disabled && "opacity-50 cursor-not-allowed"
          )}
          onClick={() => !action.disabled && action.action()}
        >
          <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
            <div className="text-primary">{action.icon}</div>
            <span className="text-sm font-medium">{action.label}</span>
            {action.shortcut && (
              <kbd className="text-[10px] bg-muted px-1.5 py-0.5 rounded">
                ⌘{action.shortcut.toUpperCase()}
              </kbd>
            )}
            {action.badge !== undefined && (
              <Badge variant="secondary" className="absolute top-2 right-2">
                {action.badge}
              </Badge>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============================================
// FAVORITES MANAGER
// ============================================

interface FavoriteItem {
  id: string;
  type: string;
}

export function useFavoritesManager(storageKey: string = "favorites") {
  const [favorites, setFavorites] = useState<FavoriteItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(favorites));
  }, [favorites, storageKey]);

  const addFavorite = useCallback((item: FavoriteItem) => {
    setFavorites((prev) => {
      if (prev.some((f) => f.id === item.id && f.type === item.type)) {
        return prev;
      }
      return [...prev, item];
    });
  }, []);

  const removeFavorite = useCallback((id: string, type: string) => {
    setFavorites((prev) => 
      prev.filter((f) => !(f.id === id && f.type === type))
    );
  }, []);

  const toggleFavorite = useCallback((item: FavoriteItem) => {
    setFavorites((prev) => {
      const exists = prev.some((f) => f.id === item.id && f.type === item.type);
      if (exists) {
        return prev.filter((f) => !(f.id === item.id && f.type === item.type));
      }
      return [...prev, item];
    });
  }, []);

  const isFavorite = useCallback(
    (id: string, type: string) => 
      favorites.some((f) => f.id === id && f.type === type),
    [favorites]
  );

  return {
    favorites,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
  };
}

// ============================================
// FAVORITE BUTTON
// ============================================

interface FavoriteButtonProps {
  id: string;
  type: string;
  isFavorite: boolean;
  onToggle: () => void;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export function FavoriteButton({
  id,
  type,
  isFavorite,
  onToggle,
  size = "md",
  showLabel = false,
  className,
}: FavoriteButtonProps) {
  const [animating, setAnimating] = useState(false);

  const handleClick = () => {
    setAnimating(true);
    onToggle();
    setTimeout(() => setAnimating(false), 300);
  };

  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  };

  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      className={cn(
        sizeClasses[size],
        "transition-transform",
        animating && "scale-125",
        className
      )}
    >
      <Star
        className={cn(
          iconSizes[size],
          "transition-all",
          isFavorite 
            ? "fill-yellow-400 text-yellow-400" 
            : "text-muted-foreground"
        )}
      />
      {showLabel && (
        <span className="sr-only">
          {isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
        </span>
      )}
    </Button>
  );
}

// ============================================
// TRENDING INDICATOR
// ============================================

interface TrendingIndicatorProps {
  trend: "up" | "down" | "stable";
  value?: number;
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function TrendingIndicator({
  trend,
  value,
  label,
  size = "md",
  className,
}: TrendingIndicatorProps) {
  const colors = {
    up: "text-green-500 bg-green-500/10",
    down: "text-red-500 bg-red-500/10",
    stable: "text-muted-foreground bg-muted",
  };

  const icons = {
    up: <TrendingUp className="h-3 w-3" />,
    down: <TrendingUp className="h-3 w-3 rotate-180" />,
    stable: <span className="h-0.5 w-3 bg-current rounded" />,
  };

  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5",
    md: "text-sm px-2 py-1",
    lg: "text-base px-3 py-1.5",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium",
        colors[trend],
        sizeClasses[size],
        className
      )}
    >
      {icons[trend]}
      {value !== undefined && (
        <span>{trend === "up" ? "+" : trend === "down" ? "-" : ""}{Math.abs(value)}%</span>
      )}
      {label && <span className="text-muted-foreground ml-1">{label}</span>}
    </div>
  );
}

// ============================================
// SMART SHORTCUT HINT
// ============================================

interface ShortcutHintProps {
  keys: string[];
  label?: string;
  className?: string;
}

export function ShortcutHint({ keys, label, className }: ShortcutHintProps) {
  return (
    <div className={cn("inline-flex items-center gap-1", className)}>
      {label && <span className="text-muted-foreground text-sm mr-1">{label}</span>}
      {keys.map((key, index) => (
        <React.Fragment key={key}>
          <kbd className="px-1.5 py-0.5 text-xs font-medium bg-muted rounded border border-border">
            {key}
          </kbd>
          {index < keys.length - 1 && (
            <span className="text-muted-foreground text-xs">+</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ============================================
// CONTEXT-AWARE HELP
// ============================================

interface HelpTip {
  id: string;
  title: string;
  content: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ContextAwareHelpProps {
  tips: HelpTip[];
  currentContext?: string;
  onDismiss?: (tipId: string) => void;
  className?: string;
}

export function ContextAwareHelp({
  tips,
  currentContext,
  onDismiss,
  className,
}: ContextAwareHelpProps) {
  const [dismissedTips, setDismissedTips] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem("dismissed_tips") || "[]"));
    } catch {
      return new Set();
    }
  });

  const visibleTips = tips.filter((tip) => !dismissedTips.has(tip.id));

  const handleDismiss = (tipId: string) => {
    const newDismissed = new Set(dismissedTips).add(tipId);
    setDismissedTips(newDismissed);
    localStorage.setItem("dismissed_tips", JSON.stringify([...newDismissed]));
    onDismiss?.(tipId);
  };

  if (visibleTips.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      {visibleTips.map((tip) => (
        <Card key={tip.id} className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Zap className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-sm">{tip.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">{tip.content}</p>
                <div className="flex items-center gap-2 mt-3">
                  {tip.action && (
                    <Button size="sm" variant="outline" onClick={tip.action.onClick}>
                      {tip.action.label}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDismiss(tip.id)}
                  >
                    Entendi
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
