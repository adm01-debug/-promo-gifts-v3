import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Lightbulb,
  ChevronRight,
  Info,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const HINTS_STORAGE_KEY = "contextual_hints_dismissed";

interface Hint {
  id: string;
  title: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
  type?: "tip" | "feature" | "shortcut";
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface HintsContextType {
  dismissedHints: string[];
  dismissHint: (id: string) => void;
  resetHints: () => void;
  isHintDismissed: (id: string) => boolean;
}

const HintsContext = createContext<HintsContextType | null>(null);

export function useContextualHints() {
  const context = useContext(HintsContext);
  if (!context) {
    throw new Error("useContextualHints must be used within ContextualHintsProvider");
  }
  return context;
}

export function ContextualHintsProvider({ children }: { children: React.ReactNode }) {
  const [dismissedHints, setDismissedHints] = useState<string[]>(() => {
    const saved = localStorage.getItem(HINTS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem(HINTS_STORAGE_KEY, JSON.stringify(dismissedHints));
  }, [dismissedHints]);

  const dismissHint = useCallback((id: string) => {
    setDismissedHints((prev) => [...prev, id]);
  }, []);

  const resetHints = useCallback(() => {
    setDismissedHints([]);
    localStorage.removeItem(HINTS_STORAGE_KEY);
  }, []);

  const isHintDismissed = useCallback(
    (id: string) => dismissedHints.includes(id),
    [dismissedHints]
  );

  return (
    <HintsContext.Provider
      value={{ dismissedHints, dismissHint, resetHints, isHintDismissed }}
    >
      {children}
    </HintsContext.Provider>
  );
}

// Floating Hint Component
interface FloatingHintProps {
  hint: Hint;
  position?: "top" | "bottom" | "left" | "right";
  className?: string;
  delay?: number;
}

export function FloatingHint({
  hint,
  position = "bottom",
  className,
  delay = 1000,
}: FloatingHintProps) {
  const { isHintDismissed, dismissHint } = useContextualHints();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isHintDismissed(hint.id)) return;

    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [hint.id, isHintDismissed, delay]);

  if (isHintDismissed(hint.id) || !isVisible) return null;

  const Icon = hint.icon || Lightbulb;

  const typeStyles = {
    tip: "border-amber-500/30 bg-amber-500/5",
    feature: "border-primary/30 bg-primary/5",
    shortcut: "border-emerald-500/30 bg-emerald-500/5",
  };

  const typeIcons = {
    tip: Lightbulb,
    feature: Sparkles,
    shortcut: Zap,
  };

  const TypeIcon = typeIcons[hint.type || "tip"];

  const positionStyles = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  const arrowStyles = {
    top: "bottom-[-6px] left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent",
    bottom: "top-[-6px] left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent",
    left: "right-[-6px] top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent",
    right: "left-[-6px] top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent",
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className={cn(
          "absolute z-50 w-64 p-3 rounded-xl border shadow-lg",
          typeStyles[hint.type || "tip"],
          positionStyles[position],
          className
        )}
      >
        {/* Arrow */}
        <div
          className={cn(
            "absolute w-0 h-0 border-[6px]",
            arrowStyles[position]
          )}
          style={{ borderColor: "inherit" }}
        />

        {/* Content */}
        <div className="flex items-start gap-2">
          <div className="p-1 rounded bg-background">
            <TypeIcon className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{hint.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {hint.description}
            </p>
            {hint.action && (
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs mt-1"
                onClick={hint.action.onClick}
              >
                {hint.action.label}
                <ChevronRight className="h-3 w-3 ml-0.5" />
              </Button>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 -mr-1 -mt-1"
            onClick={() => dismissHint(hint.id)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Inline Hint Component
interface InlineHintProps {
  hint: Hint;
  className?: string;
  dismissible?: boolean;
}

export function InlineHint({ hint, className, dismissible = true }: InlineHintProps) {
  const { isHintDismissed, dismissHint } = useContextualHints();

  if (isHintDismissed(hint.id)) return null;

  const Icon = hint.icon || Info;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50",
        className
      )}
    >
      <div className="p-1.5 rounded-lg bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{hint.title}</p>
        <p className="text-xs text-muted-foreground">{hint.description}</p>
      </div>
      {hint.action && (
        <Button variant="outline" size="sm" onClick={hint.action.onClick}>
          {hint.action.label}
        </Button>
      )}
      {dismissible && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => dismissHint(hint.id)}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </motion.div>
  );
}

// Spotlight Hint Component (for first-time feature discovery)
interface SpotlightHintProps {
  hint: Hint;
  targetSelector: string;
  showAfterMs?: number;
}

export function SpotlightHint({
  hint,
  targetSelector,
  showAfterMs = 2000,
}: SpotlightHintProps) {
  const { isHintDismissed, dismissHint } = useContextualHints();
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });

  useEffect(() => {
    if (isHintDismissed(hint.id)) return;

    const timer = setTimeout(() => {
      const target = document.querySelector(targetSelector);
      if (target) {
        const rect = target.getBoundingClientRect();
        setPosition({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        });
        setIsVisible(true);
      }
    }, showAfterMs);

    return () => clearTimeout(timer);
  }, [hint.id, targetSelector, showAfterMs, isHintDismissed]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 pointer-events-none"
      >
        {/* Spotlight overlay */}
        <div
          className="absolute inset-0 bg-black/50"
          style={{
            maskImage: `radial-gradient(ellipse ${position.width + 40}px ${position.height + 40}px at ${position.left + position.width / 2}px ${position.top + position.height / 2}px, transparent 0%, black 100%)`,
            WebkitMaskImage: `radial-gradient(ellipse ${position.width + 40}px ${position.height + 40}px at ${position.left + position.width / 2}px ${position.top + position.height / 2}px, transparent 0%, black 100%)`,
          }}
        />

        {/* Highlight ring */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute border-2 border-primary rounded-lg pointer-events-none"
          style={{
            top: position.top - 4,
            left: position.left - 4,
            width: position.width + 8,
            height: position.height + 8,
            boxShadow: "0 0 0 4px rgba(var(--primary), 0.2)",
          }}
        />

        {/* Hint card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute pointer-events-auto"
          style={{
            top: position.top + position.height + 16,
            left: position.left,
            maxWidth: 280,
          }}
        >
          <div className="p-4 rounded-xl border bg-card shadow-xl">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Target className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-sm">{hint.title}</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {hint.description}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => dismissHint(hint.id)}
              >
                Entendi
              </Button>
              {hint.action && (
                <Button size="sm" onClick={hint.action.onClick}>
                  {hint.action.label}
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Pre-defined hints for the application
export const APP_HINTS = {
  smartSearch: {
    id: "hint_smart_search",
    title: "Busca Inteligente",
    description: "Pressione Cmd+K para buscar rapidamente em qualquer lugar",
    type: "shortcut" as const,
  },
  colorFilter: {
    id: "hint_color_filter",
    title: "Filtro por Cores",
    description: "Selecione um cliente para ver produtos nas cores da marca",
    type: "feature" as const,
  },
  compareProducts: {
    id: "hint_compare_products",
    title: "Compare Produtos",
    description: "Adicione até 4 produtos para comparar lado a lado",
    type: "tip" as const,
  },
  quickQuote: {
    id: "hint_quick_quote",
    title: "Orçamento Rápido",
    description: "Clique no botão flutuante para criar um orçamento instantâneo",
    type: "feature" as const,
  },
  favorites: {
    id: "hint_favorites",
    title: "Favoritos",
    description: "Salve produtos favoritos para acessar rapidamente depois",
    type: "tip" as const,
  },
  keyboardShortcuts: {
    id: "hint_keyboard",
    title: "Atalhos de Teclado",
    description: "Use / para buscar, ? para ver todos os atalhos disponíveis",
    type: "shortcut" as const,
  },
};
