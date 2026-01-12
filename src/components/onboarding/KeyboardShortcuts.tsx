import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Keyboard, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const SHORTCUTS_SEEN_KEY = "keyboard_shortcuts_seen";

interface Shortcut {
  keys: string[];
  description: string;
  category: string;
}

const shortcuts: Shortcut[] = [
  // Navigation
  { keys: ["⌘", "K"], description: "Busca global", category: "Navegação" },
  { keys: ["/"], description: "Focar na busca", category: "Navegação" },
  { keys: ["G", "H"], description: "Ir para Home", category: "Navegação" },
  { keys: ["G", "M"], description: "Ir para Mockups", category: "Navegação" },
  { keys: ["G", "S"], description: "Ir para Simulador", category: "Navegação" },
  { keys: ["G", "O"], description: "Ir para Orçamentos", category: "Navegação" },

  // Products
  { keys: ["F"], description: "Adicionar aos favoritos", category: "Produtos" },
  { keys: ["C"], description: "Adicionar à comparação", category: "Produtos" },
  { keys: ["V"], description: "Alternar visualização", category: "Produtos" },

  // Actions
  { keys: ["N"], description: "Novo orçamento", category: "Ações" },
  { keys: ["Esc"], description: "Fechar modal/cancelar", category: "Ações" },
  { keys: ["?"], description: "Mostrar atalhos", category: "Ações" },
];

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, Shortcut[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Atalhos de Teclado
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {Object.entries(groupedShortcuts).map(([category, items]) => (
            <div key={category}>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">
                {category}
              </h4>
              <div className="space-y-2">
                {items.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <kbd
                          key={keyIndex}
                          className="px-2 py-1 text-xs font-mono bg-background border rounded shadow-sm"
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="text-xs text-center text-muted-foreground">
          Pressione <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">?</kbd> a
          qualquer momento para ver esta lista
        </div>
      </DialogContent>
    </Dialog>
  );
}

// First-time keyboard shortcuts hint
export function KeyboardShortcutsHint() {
  const [isVisible, setIsVisible] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(SHORTCUTS_SEEN_KEY);
    if (!seen) {
      const timer = setTimeout(() => setIsVisible(true), 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(SHORTCUTS_SEEN_KEY, "true");
    setIsVisible(false);
  };

  const handleViewShortcuts = () => {
    localStorage.setItem(SHORTCUTS_SEEN_KEY, "true");
    setIsVisible(false);
    setDialogOpen(true);
  };

  // Global keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA") {
          e.preventDefault();
          setDialogOpen(true);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 left-4 z-50"
          >
            <div className="p-4 rounded-xl border bg-card shadow-xl max-w-xs">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Keyboard className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Atalhos de Teclado</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Use atalhos para navegar mais rápido. Pressione{" "}
                    <kbd className="px-1 py-0.5 bg-muted rounded text-xs font-mono">
                      ?
                    </kbd>{" "}
                    para ver todos.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 -mt-1 -mr-1"
                  onClick={handleDismiss}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <div className="flex gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={handleDismiss}
                >
                  Depois
                </Button>
                <Button size="sm" className="flex-1" onClick={handleViewShortcuts}>
                  Ver Atalhos
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <KeyboardShortcutsDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}

// Compact shortcut display for tooltips
export function ShortcutKeys({ keys }: { keys: string[] }) {
  return (
    <span className="inline-flex items-center gap-0.5 ml-2">
      {keys.map((key, index) => (
        <kbd
          key={index}
          className="px-1.5 py-0.5 text-[10px] font-mono bg-muted/80 border rounded"
        >
          {key}
        </kbd>
      ))}
    </span>
  );
}
