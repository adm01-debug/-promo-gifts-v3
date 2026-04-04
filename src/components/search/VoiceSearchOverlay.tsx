import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, X, Palette, Tag, DollarSign, Package, Sparkles, CheckCircle2, Clock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AppliedFilter {
  type: "category" | "color" | "price" | "material" | "stock" | "featured" | "kit";
  label: string;
}

interface CommandPattern {
  command: string;
  count: number;
  lastUsed: Date;
  type: 'filter' | 'search' | 'navigation' | 'sort' | 'clear' | 'unknown';
}

interface VoiceCommandRecord {
  id: string;
  command: string;
  timestamp: Date;
  type: 'filter' | 'search' | 'navigation' | 'sort' | 'clear' | 'unknown';
}

interface VoiceSearchOverlayProps {
  isOpen: boolean;
  isListening: boolean;
  transcript: string;
  error?: string | null;
  onClose: () => void;
  onToggleListening: () => void;
  commandAction?: string | null;
  appliedFilters?: AppliedFilter[];
  frequentCommands?: CommandPattern[];
  recentCommands?: VoiceCommandRecord[];
  onCommandSelect?: (command: string) => void;
}

const filterIcons: Record<AppliedFilter["type"], React.ReactNode> = {
  category: <Tag className="h-3 w-3" />,
  color: <Palette className="h-3 w-3" />,
  price: <DollarSign className="h-3 w-3" />,
  material: <Package className="h-3 w-3" />,
  stock: <CheckCircle2 className="h-3 w-3" />,
  featured: <Sparkles className="h-3 w-3" />,
  kit: <Package className="h-3 w-3" />,
};

const filterColors: Record<AppliedFilter["type"], string> = {
  category: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  price: "bg-primary/20 text-primary border-primary/30",
  material: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  stock: "bg-primary/20 text-primary border-primary/30",
  featured: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  kit: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
};

export const VoiceSearchOverlay = React.forwardRef<HTMLDivElement, VoiceSearchOverlayProps>(
  function VoiceSearchOverlay({
    isOpen,
    isListening,
    transcript,
    error,
    onClose,
    onToggleListening,
    commandAction,
    appliedFilters = [],
    frequentCommands = [],
    recentCommands = [],
    onCommandSelect,
  }, ref) {
  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/95 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Content */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative z-10 flex flex-col items-center gap-6 p-8 max-w-lg w-full mx-4"
          >
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-0 right-0 h-10 w-10 rounded-full"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>

            {/* Status text */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <h2 className="text-2xl font-display font-bold text-foreground mb-2">
                {isListening ? "Ouvindo..." : "Busca por Voz"}
              </h2>
              <p className="text-muted-foreground">
                {isListening
                  ? "Diga um comando ou pesquise por produtos"
                  : "Clique no microfone para começar"}
              </p>
            </motion.div>

            {/* Microphone button with ripple effect */}
            <div className="relative">
              {/* Ripple circles */}
              {isListening && (
                <>
                  <motion.div
                    initial={{ scale: 1, opacity: 0.5 }}
                    animate={{ scale: 2.5, opacity: 0 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                    className="absolute inset-0 rounded-full bg-primary"
                  />
                  <motion.div
                    initial={{ scale: 1, opacity: 0.5 }}
                    animate={{ scale: 2.5, opacity: 0 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
                    className="absolute inset-0 rounded-full bg-primary"
                  />
                  <motion.div
                    initial={{ scale: 1, opacity: 0.5 }}
                    animate={{ scale: 2.5, opacity: 0 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay: 1 }}
                    className="absolute inset-0 rounded-full bg-primary"
                  />
                </>
              )}

              {/* Main button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onToggleListening}
                className={cn(
                  "relative z-10 flex items-center justify-center w-28 h-28 rounded-full transition-all duration-300",
                  isListening
                    ? "bg-primary text-primary-foreground shadow-[0_0_60px_rgba(var(--primary),0.5)]"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                )}
              >
                {isListening ? (
                  <MicOff className="h-10 w-10" />
                ) : (
                  <Mic className="h-10 w-10" />
                )}
              </motion.button>
            </div>

            {/* Sound wave visualization */}
            {isListening && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-1"
              >
                {[...Array(9)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      height: [12, 32, 12],
                    }}
                    transition={{
                      duration: 0.5 + Math.random() * 0.3,
                      repeat: Infinity,
                      delay: i * 0.1,
                      ease: "easeInOut",
                    }}
                    className="w-1.5 bg-primary rounded-full"
                    style={{ height: 12 }}
                  />
                ))}
              </motion.div>
            )}

            {/* Frequent commands - from usage history */}
            {frequentCommands.length > 0 && !isListening && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.15 }}
                className="space-y-3 text-center w-full"
              >
                <div className="flex items-center justify-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                    Seus comandos frequentes
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {frequentCommands.map((cmd, index) => (
                    <motion.button
                      key={`freq-${index}`}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1 * index }}
                      onClick={() => onCommandSelect?.(cmd.command)}
                      className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 rounded-full text-xs text-amber-400 border border-amber-500/30 transition-colors flex items-center gap-1.5"
                    >
                      <span>"{cmd.command}"</span>
                      <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-amber-500/20">
                        {cmd.count}x
                      </Badge>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Recent commands - from usage history */}
            {recentCommands.length > 0 && frequentCommands.length === 0 && !isListening && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.15 }}
                className="space-y-3 text-center w-full"
              >
                <div className="flex items-center justify-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                    Comandos recentes
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {recentCommands.slice(0, 4).map((cmd, index) => (
                    <motion.button
                      key={`recent-${cmd.id}`}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1 * index }}
                      onClick={() => onCommandSelect?.(cmd.command)}
                      className="px-3 py-1.5 bg-muted/50 hover:bg-muted rounded-full text-xs text-muted-foreground border border-border/50 transition-colors"
                    >
                      "{cmd.command}"
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Command suggestions - when no history */}
            {frequentCommands.length === 0 && recentCommands.length === 0 && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="space-y-3 text-center w-full"
              >
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                  Comandos suportados
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {[
                    "Canetas azuis até 30 reais",
                    "Mochilas ecológicas",
                    "Garrafas vermelhas em estoque",
                    "Kits de bambu",
                    "Mostrar canetas",
                    "Filtrar por cor azul",
                    "Ordenar por preço",
                    "Limpar filtros",
                  ].map((cmd) => (
                    <span
                      key={cmd}
                      className="px-3 py-1.5 bg-muted/50 rounded-full text-xs text-muted-foreground border border-border/50"
                    >
                      "{cmd}"
                    </span>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Transcript display */}
            <AnimatePresence mode="wait">
              {transcript && (
                <motion.div
                  initial={{ opacity: 0, y: 10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  className="w-full"
                >
                  <div className="bg-card border border-border rounded-xl p-4 shadow-lg">
                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">
                      Você disse:
                    </p>
                    <p className="text-lg font-medium text-foreground">
                      "{transcript}"
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Applied filters feedback - Enhanced visual */}
            <AnimatePresence mode="wait">
              {appliedFilters.length > 0 && (
                <motion.div
                  key="filters"
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -10 }}
                  className="w-full space-y-3"
                >
                  <div className="bg-primary/5 rounded-xl p-4 border border-primary/20">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                      <p className="text-sm font-medium text-foreground">
                        {appliedFilters.length} {appliedFilters.length === 1 ? "filtro aplicado" : "filtros aplicados"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {appliedFilters.map((filter, index) => (
                        <motion.div
                          key={`${filter.type}-${index}`}
                          initial={{ opacity: 0, scale: 0.8, x: -10 }}
                          animate={{ opacity: 1, scale: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <Badge
                            variant="outline"
                            className={cn(
                              "px-3 py-1.5 text-sm font-medium flex items-center gap-1.5 border",
                              filterColors[filter.type]
                            )}
                          >
                            {filterIcons[filter.type]}
                            {filter.label}
                          </Badge>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Command action feedback (fallback for non-compound) */}
            <AnimatePresence mode="wait">
              {commandAction && appliedFilters.length === 0 && (
                <motion.div
                  key="action"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="w-full bg-primary/10 text-primary rounded-xl p-4 border border-primary/20 text-center"
                >
                  <p className="font-medium">{commandAction}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error display */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full bg-destructive/10 text-destructive rounded-xl p-4 border border-destructive/20 text-center"
                >
                  <p className="text-sm">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Instructions */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-sm text-muted-foreground"
            >
              Pressione <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">ESC</kbd> para fechar
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
  }
);
