import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  ChevronRight,
  Gift,
  Package,
  Palette,
  Calculator,
  FileText,
  User,
  Star,
  Trophy,
  X,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const ONBOARDING_STORAGE_KEY = "progressive_onboarding_state";

interface OnboardingTask {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  route?: string;
  action?: string;
  completed: boolean;
  reward?: number;
}

interface OnboardingState {
  tasks: OnboardingTask[];
  totalPoints: number;
  level: number;
  dismissed: boolean;
}

const defaultTasks: OnboardingTask[] = [
  {
    id: "browse_catalog",
    title: "Explorar Catálogo",
    description: "Navegue pelos produtos disponíveis",
    icon: Package,
    route: "/",
    completed: false,
    reward: 10,
  },
  {
    id: "view_product",
    title: "Ver Detalhes de Produto",
    description: "Clique em um produto para ver detalhes",
    icon: Star,
    action: "view_product",
    completed: false,
    reward: 15,
  },
  {
    id: "use_filters",
    title: "Usar Filtros",
    description: "Filtre produtos por categoria ou cor",
    icon: Package,
    action: "use_filter",
    completed: false,
    reward: 10,
  },
  {
    id: "add_favorite",
    title: "Adicionar Favorito",
    description: "Marque um produto como favorito",
    icon: Star,
    action: "add_favorite",
    completed: false,
    reward: 15,
  },
  {
    id: "select_client",
    title: "Selecionar Cliente",
    description: "Escolha um cliente para filtrar por cores",
    icon: User,
    action: "select_client",
    completed: false,
    reward: 20,
  },
  {
    id: "visit_mockup",
    title: "Criar Mockup",
    description: "Visite o gerador de mockups",
    icon: Palette,
    route: "/mockup",
    completed: false,
    reward: 25,
  },
  {
    id: "visit_simulator",
    title: "Simular Preços",
    description: "Use o simulador de preços",
    icon: Calculator,
    route: "/simulador-precos",
    completed: false,
    reward: 20,
  },
  {
    id: "visit_quotes",
    title: "Gerenciar Orçamentos",
    description: "Acesse a área de orçamentos",
    icon: FileText,
    route: "/orcamentos",
    completed: false,
    reward: 15,
  },
];

const defaultState: OnboardingState = {
  tasks: defaultTasks,
  totalPoints: 0,
  level: 1,
  dismissed: false,
};

interface OnboardingContextType {
  state: OnboardingState;
  completeTask: (taskId: string) => void;
  dismissOnboarding: () => void;
  resetOnboarding: () => void;
  isMinimized: boolean;
  setIsMinimized: (value: boolean) => void;
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export function useProgressiveOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useProgressiveOnboarding must be used within OnboardingProvider");
  }
  return context;
}

export function ProgressiveOnboardingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<OnboardingState>(() => {
    const saved = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return defaultState;
      }
    }
    return defaultState;
  });

  const [isMinimized, setIsMinimized] = useState(false);
  const { toast } = useToast();

  // Save state to localStorage
  useEffect(() => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const completeTask = useCallback((taskId: string) => {
    setState((prev) => {
      const task = prev.tasks.find((t) => t.id === taskId);
      if (!task || task.completed) return prev;

      const newTasks = prev.tasks.map((t) =>
        t.id === taskId ? { ...t, completed: true } : t
      );

      const newPoints = prev.totalPoints + (task.reward || 0);
      const newLevel = Math.floor(newPoints / 50) + 1;
      const leveledUp = newLevel > prev.level;

      // Show toast
      setTimeout(() => {
        toast({
          title: leveledUp ? "🎉 Nível Aumentado!" : "✨ Tarefa Concluída!",
          description: leveledUp
            ? `Você alcançou o nível ${newLevel}! +${task.reward} pontos`
            : `${task.title} - +${task.reward} pontos`,
        });
      }, 100);

      return {
        ...prev,
        tasks: newTasks,
        totalPoints: newPoints,
        level: newLevel,
      };
    });
  }, [toast]);

  const dismissOnboarding = useCallback(() => {
    setState((prev) => ({ ...prev, dismissed: true }));
  }, []);

  const resetOnboarding = useCallback(() => {
    setState(defaultState);
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
  }, []);

  return (
    <OnboardingContext.Provider
      value={{
        state,
        completeTask,
        dismissOnboarding,
        resetOnboarding,
        isMinimized,
        setIsMinimized,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

// Floating Progress Widget
export function OnboardingProgressWidget() {
  const { state, dismissOnboarding, isMinimized, setIsMinimized } = useProgressiveOnboarding();

  const completedCount = state.tasks.filter((t) => t.completed).length;
  const progress = (completedCount / state.tasks.length) * 100;
  const allCompleted = completedCount === state.tasks.length;

  // Don't show if dismissed or all completed
  if (state.dismissed || allCompleted) return null;

  if (isMinimized) {
    return (
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-32 right-4 z-50 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
      >
        <div className="relative">
          <Trophy className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full text-[10px] font-bold flex items-center justify-center">
            {state.tasks.length - completedCount}
          </span>
        </div>
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-32 right-4 z-50 w-72"
    >
      <Card className="shadow-xl border-primary/20">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Trophy className="h-4 w-4 text-primary" />
              </div>
              <CardTitle className="text-sm">Primeiros Passos</CardTitle>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsMinimized(true)}
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={dismissOnboarding}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          {/* Level & Points */}
          <div className="flex items-center justify-between mb-3">
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              Nível {state.level}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {state.totalPoints} pontos
            </span>
          </div>

          {/* Progress */}
          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-medium">
                {completedCount}/{state.tasks.length}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Next Tasks */}
          <div className="space-y-2">
            {state.tasks
              .filter((t) => !t.completed)
              .slice(0, 3)
              .map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="p-1 rounded bg-background">
                    <task.icon className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{task.title}</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px] px-1.5">
                    +{task.reward}
                  </Badge>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Full Checklist Component
export function OnboardingChecklist() {
  const { state, resetOnboarding } = useProgressiveOnboarding();

  const completedCount = state.tasks.filter((t) => t.completed).length;
  const progress = (completedCount / state.tasks.length) * 100;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Primeiros Passos</CardTitle>
              <p className="text-sm text-muted-foreground">
                Complete as tarefas para ganhar pontos
              </p>
            </div>
          </div>
          <div className="text-right">
            <Badge className="gap-1">
              <Sparkles className="h-3 w-3" />
              Nível {state.level}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">
              {state.totalPoints} pontos totais
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Progresso Geral</span>
            <span className="font-medium">
              {completedCount} de {state.tasks.length} tarefas
            </span>
          </div>
          <Progress value={progress} className="h-3" />
        </div>

        {/* Tasks Grid */}
        <div className="grid sm:grid-cols-2 gap-3">
          {state.tasks.map((task) => (
            <div
              key={task.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border transition-all",
                task.completed
                  ? "bg-primary/5 border-primary/20"
                  : "bg-muted/30 border-border hover:border-primary/50"
              )}
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  task.completed
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                {task.completed ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <task.icon className="h-5 w-5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "font-medium text-sm",
                    task.completed && "line-through text-muted-foreground"
                  )}
                >
                  {task.title}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {task.description}
                </p>
              </div>
              <Badge
                variant={task.completed ? "default" : "secondary"}
                className="text-xs"
              >
                +{task.reward}
              </Badge>
            </div>
          ))}
        </div>

        {/* Reset Button */}
        {completedCount === state.tasks.length && (
          <Button
            variant="outline"
            className="w-full mt-4"
            onClick={resetOnboarding}
          >
            <Gift className="h-4 w-4 mr-2" />
            Reiniciar Jornada
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
