import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  TrendingUp,
  Clock,
  Gift,
  Target,
  ChevronRight,
  X,
  Zap,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ClientSuggestion {
  id: string;
  type: "product" | "technique" | "timing" | "bundle";
  title: string;
  description: string;
  confidence: number;
  productId?: string;
  techniqueId?: string;
  metadata?: Record<string, any>;
}

interface AIProactiveSuggestionsProps {
  clientId?: string;
  clientName?: string;
  clientIndustry?: string;
  onApplySuggestion?: (suggestion: ClientSuggestion) => void;
  className?: string;
}

const TYPE_CONFIG = {
  product: {
    icon: Gift,
    color: "from-violet-500/20 to-violet-600/10 border-violet-500/30",
    label: "Produto",
  },
  technique: {
    icon: Sparkles,
    color: "from-amber-500/20 to-amber-600/10 border-amber-500/30",
    label: "Técnica",
  },
  timing: {
    icon: Clock,
    color: "from-blue-500/20 to-blue-600/10 border-blue-500/30",
    label: "Timing",
  },
  bundle: {
    icon: Target,
    color: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30",
    label: "Combo",
  },
};

// Simulated AI suggestions based on client context
const generateSuggestions = (
  clientName?: string,
  clientIndustry?: string
): ClientSuggestion[] => {
  const baseSuggestions: ClientSuggestion[] = [
    {
      id: "1",
      type: "product",
      title: "Camiseta Polo Premium",
      description: "Alta taxa de conversão para clientes corporativos",
      confidence: 0.94,
      productId: "polo-premium",
    },
    {
      id: "2",
      type: "technique",
      title: "Bordado recomendado",
      description: "Durabilidade superior para uso diário",
      confidence: 0.89,
      techniqueId: "bordado",
    },
    {
      id: "3",
      type: "timing",
      title: "Melhor momento para contato",
      description: "Cliente mais ativo às terças e quintas",
      confidence: 0.76,
    },
    {
      id: "4",
      type: "bundle",
      title: "Kit Executivo",
      description: "Polo + Caneta + Agenda - combo mais vendido",
      confidence: 0.82,
    },
  ];

  // Customize based on industry
  if (clientIndustry?.toLowerCase().includes("tecnologia")) {
    baseSuggestions[0] = {
      ...baseSuggestions[0],
      title: "Mochila Tech Antifurto",
      description: "Item #1 para empresas de tecnologia",
      confidence: 0.96,
    };
  }

  return baseSuggestions;
};

export function AIProactiveSuggestions({
  clientId,
  clientName,
  clientIndustry,
  onApplySuggestion,
  className,
}: AIProactiveSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<ClientSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (clientId || clientName) {
      loadSuggestions();
    }
  }, [clientId, clientName, clientIndustry]);

  const loadSuggestions = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 800));
    setSuggestions(generateSuggestions(clientName, clientIndustry));
    setIsLoading(false);
  };

  if (!isVisible || (!clientId && !clientName)) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={className}
    >
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}
                className="p-2 rounded-lg bg-primary/10"
              >
                <Zap className="h-4 w-4 text-primary" />
              </motion.div>
              <div>
                <CardTitle className="text-sm font-semibold">
                  Sugestões para {clientName || "Cliente"}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Baseado em histórico e perfil
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={loadSuggestions}
                disabled={isLoading}
              >
                <RefreshCw
                  className={cn("h-3.5 w-3.5", isLoading && "animate-spin")}
                />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setIsVisible(false)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pb-4">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 rounded-lg bg-muted/50 animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {suggestions.map((suggestion, idx) => {
                  const config = TYPE_CONFIG[suggestion.type];
                  const Icon = config.icon;
                  const isExpanded = expandedId === suggestion.id;

                  return (
                    <motion.div
                      key={suggestion.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className={cn(
                        "relative rounded-lg border bg-gradient-to-br p-3 cursor-pointer transition-all",
                        config.color,
                        isExpanded && "ring-2 ring-primary/30"
                      )}
                      onClick={() =>
                        setExpandedId(isExpanded ? null : suggestion.id)
                      }
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-1.5 rounded-md bg-background/50">
                          <Icon className="h-4 w-4" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0"
                            >
                              {config.label}
                            </Badge>
                            <span className="text-xs font-semibold text-primary">
                              {Math.round(suggestion.confidence * 100)}% match
                            </span>
                          </div>
                          <p className="font-medium text-sm mt-1 truncate">
                            {suggestion.title}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {suggestion.description}
                          </p>
                        </div>

                        <ChevronRight
                          className={cn(
                            "h-4 w-4 shrink-0 transition-transform",
                            isExpanded && "rotate-90"
                          )}
                        />
                      </div>

                      {/* Expanded content */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="pt-3 mt-3 border-t border-border/50">
                              <p className="text-xs text-muted-foreground mb-3">
                                {suggestion.description}
                              </p>
                              <Button
                                size="sm"
                                className="w-full h-8 text-xs gap-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onApplySuggestion?.(suggestion);
                                }}
                              >
                                <Sparkles className="h-3 w-3" />
                                Aplicar Sugestão
                              </Button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Confidence bar */}
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-muted/30 rounded-b-lg overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${suggestion.confidence * 100}%` }}
                          transition={{ duration: 0.8, delay: idx * 0.1 + 0.3 }}
                          className="h-full bg-primary/50"
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}

          {/* Trending indicator */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/50">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-xs text-muted-foreground">
              +23% de precisão vs. mês anterior
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
