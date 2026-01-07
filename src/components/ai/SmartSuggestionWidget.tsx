import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  Lightbulb, 
  TrendingUp, 
  Clock, 
  Gift,
  ChevronRight,
  Zap,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Suggestion {
  id: string;
  type: "product" | "technique" | "timing" | "upsell";
  title: string;
  description: string;
  confidence: number;
  action?: () => void;
  actionLabel?: string;
}

interface SmartSuggestionWidgetProps {
  suggestions?: Suggestion[];
  clientName?: string;
  context?: "mockup" | "quote" | "catalog";
  onDismiss?: () => void;
  className?: string;
}

const TYPE_ICONS = {
  product: Gift,
  technique: Sparkles,
  timing: Clock,
  upsell: TrendingUp,
};

const TYPE_COLORS = {
  product: "from-violet-500/20 to-violet-600/10 border-violet-500/30",
  technique: "from-amber-500/20 to-amber-600/10 border-amber-500/30",
  timing: "from-blue-500/20 to-blue-600/10 border-blue-500/30",
  upsell: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30",
};

const DEMO_SUGGESTIONS: Suggestion[] = [
  {
    id: "1",
    type: "product",
    title: "Camiseta Polo Premium",
    description: "Alta conversão para clientes do setor corporativo",
    confidence: 0.92,
    actionLabel: "Ver produto",
  },
  {
    id: "2",
    type: "technique",
    title: "Bordado recomendado",
    description: "Melhor durabilidade para uso diário",
    confidence: 0.88,
    actionLabel: "Aplicar",
  },
  {
    id: "3",
    type: "timing",
    title: "Momento ideal",
    description: "Cliente compra geralmente em janeiro",
    confidence: 0.75,
  },
];

export function SmartSuggestionWidget({
  suggestions = DEMO_SUGGESTIONS,
  clientName = "Cliente",
  context = "mockup",
  onDismiss,
  className,
}: SmartSuggestionWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  // Auto-rotate suggestions
  useEffect(() => {
    if (isExpanded || suggestions.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % suggestions.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isExpanded, suggestions.length]);

  const currentSuggestion = suggestions[currentIndex];
  const Icon = currentSuggestion ? TYPE_ICONS[currentSuggestion.type] : Lightbulb;

  if (!isVisible || suggestions.length === 0) return null;

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        className={cn("relative", className)}
      >
        <div
          className={cn(
            "relative overflow-hidden rounded-xl border bg-gradient-to-br backdrop-blur-sm transition-all duration-300",
            isExpanded ? "p-4" : "p-3",
            currentSuggestion && TYPE_COLORS[currentSuggestion.type]
          )}
        >
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center gap-1.5">
              <motion.div
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <Zap className="h-4 w-4 text-primary" />
              </motion.div>
              <span className="text-xs font-semibold text-primary">
                Sugestão Inteligente
              </span>
            </div>
            <div className="flex-1" />
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {suggestions.length} {suggestions.length === 1 ? "dica" : "dicas"}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 -mr-1"
              onClick={handleDismiss}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>

          {/* Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSuggestion?.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-2"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-background/50 shrink-0">
                  <Icon className="h-4 w-4 text-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {currentSuggestion?.title}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {currentSuggestion?.description}
                  </p>
                </div>
                {currentSuggestion?.confidence && (
                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold text-foreground">
                      {Math.round(currentSuggestion.confidence * 100)}%
                    </div>
                    <div className="text-[10px] text-muted-foreground">match</div>
                  </div>
                )}
              </div>

              {/* Actions */}
              {currentSuggestion?.actionLabel && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full h-8 text-xs gap-1"
                  onClick={currentSuggestion.action}
                >
                  {currentSuggestion.actionLabel}
                  <ChevronRight className="h-3 w-3" />
                </Button>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Pagination dots */}
          {suggestions.length > 1 && (
            <div className="flex items-center justify-center gap-1 mt-3">
              {suggestions.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={cn(
                    "w-1.5 h-1.5 rounded-full transition-all",
                    idx === currentIndex
                      ? "bg-primary w-4"
                      : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  )}
                />
              ))}
            </div>
          )}

          {/* Expand button */}
          {suggestions.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2 h-7 text-xs"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? "Recolher" : `Ver todas (${suggestions.length})`}
            </Button>
          )}

          {/* Expanded list */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-2 pt-3 border-t border-border/50 mt-3">
                  {suggestions.map((suggestion, idx) => {
                    const SugIcon = TYPE_ICONS[suggestion.type];
                    return (
                      <motion.div
                        key={suggestion.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-lg transition-colors cursor-pointer",
                          idx === currentIndex
                            ? "bg-primary/10"
                            : "hover:bg-muted/50"
                        )}
                        onClick={() => setCurrentIndex(idx)}
                      >
                        <SugIcon className="h-4 w-4 shrink-0" />
                        <span className="text-xs font-medium truncate flex-1">
                          {suggestion.title}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {Math.round(suggestion.confidence * 100)}%
                        </Badge>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
