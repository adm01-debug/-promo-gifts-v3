import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
  Gift,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

const QUICK_START_STORAGE_KEY = "quick_start_dismissed";

interface QuickAction {
  id: string;
  title: string;
  description: string;
  route: string;
  completed: boolean;
}

const defaultActions: QuickAction[] = [
  {
    id: "explore",
    title: "Explorar Catálogo",
    description: "Navegue por mais de 5000 produtos",
    route: "/",
    completed: false,
  },
  {
    id: "mockup",
    title: "Criar Mockup",
    description: "Gere visualizações personalizadas",
    route: "/mockup",
    completed: false,
  },
  {
    id: "simulate",
    title: "Simular Preços",
    description: "Calcule custos de personalização",
    route: "/simulador-precos",
    completed: false,
  },
  {
    id: "quote",
    title: "Criar Orçamento",
    description: "Monte propostas profissionais",
    route: "/orcamentos",
    completed: false,
  },
];

export function QuickStartBanner() {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);
  const [actions, setActions] = useState<QuickAction[]>(() => {
    const saved = localStorage.getItem(QUICK_START_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.dismissed) {
          setIsDismissed(true);
          return parsed.actions || defaultActions;
        }
        return parsed.actions || defaultActions;
      } catch {
        return defaultActions;
      }
    }
    return defaultActions;
  });

  useEffect(() => {
    localStorage.setItem(
      QUICK_START_STORAGE_KEY,
      JSON.stringify({ actions, dismissed: isDismissed })
    );
  }, [actions, isDismissed]);

  const completedCount = actions.filter((a) => a.completed).length;
  const progress = (completedCount / actions.length) * 100;
  const allCompleted = completedCount === actions.length;

  const handleActionClick = (action: QuickAction) => {
    setActions((prev) =>
      prev.map((a) => (a.id === action.id ? { ...a, completed: true } : a))
    );
    navigate(action.route);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  const handleReset = () => {
    setActions(defaultActions);
    setIsDismissed(false);
  };

  if (isDismissed) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="mb-6"
    >
      <div className="rounded-xl border bg-gradient-to-r from-primary/5 via-background to-primary/5 overflow-hidden">
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                Início Rápido
                {allCompleted && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
                    Completo!
                  </span>
                )}
              </h3>
              <p className="text-sm text-muted-foreground">
                {allCompleted
                  ? "Parabéns! Você explorou todas as funcionalidades"
                  : `${completedCount}/${actions.length} ações concluídas`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Progress value={progress} className="w-24 h-2 hidden sm:block" />
            <Button variant="ghost" size="icon" className="h-8 w-8">
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="px-4 pb-4">
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {actions.map((action, index) => (
                    <motion.button
                      key={action.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleActionClick(action)}
                      disabled={action.completed}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border text-left transition-all group",
                        action.completed
                          ? "bg-primary/5 border-primary/20"
                          : "bg-card hover:bg-muted hover:border-primary/50"
                      )}
                    >
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                          action.completed
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted group-hover:bg-primary/10"
                        )}
                      >
                        {action.completed ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <Circle className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            "font-medium text-sm",
                            action.completed && "line-through text-muted-foreground"
                          )}
                        >
                          {action.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {action.description}
                        </p>
                      </div>
                      {!action.completed && (
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      )}
                    </motion.button>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-border/50">
                  {allCompleted && (
                    <Button variant="outline" size="sm" onClick={handleReset}>
                      <Gift className="h-4 w-4 mr-1" />
                      Recomeçar
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDismiss}
                    className="text-muted-foreground"
                  >
                    Dispensar
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// Compact version for sidebar or other places
export function QuickStartCompact() {
  const navigate = useNavigate();
  const [actions] = useState<QuickAction[]>(defaultActions);

  const completedCount = actions.filter((a) => a.completed).length;
  const progress = (completedCount / actions.length) * 100;

  return (
    <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Início Rápido</span>
      </div>
      <Progress value={progress} className="h-1.5 mb-2" />
      <p className="text-xs text-muted-foreground">
        {completedCount}/{actions.length} concluídas
      </p>
    </div>
  );
}
