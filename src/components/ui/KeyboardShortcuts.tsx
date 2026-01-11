import { ReactNode, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Keyboard, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ShortcutItem {
  keys: string[];
  description: string;
  category?: string;
}

interface KeyboardShortcutsProps {
  shortcuts: ShortcutItem[];
  trigger?: ReactNode;
  className?: string;
}

// Helper to detect OS
const isMac = typeof navigator !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0;

// Format key for display
function formatKey(key: string): string {
  const keyMap: Record<string, string> = {
    cmd: isMac ? "⌘" : "Ctrl",
    ctrl: isMac ? "⌃" : "Ctrl",
    alt: isMac ? "⌥" : "Alt",
    shift: "⇧",
    enter: "↵",
    escape: "Esc",
    backspace: "⌫",
    delete: "Del",
    tab: "Tab",
    space: "Space",
    arrowup: "↑",
    arrowdown: "↓",
    arrowleft: "←",
    arrowright: "→",
  };
  
  return keyMap[key.toLowerCase()] || key.toUpperCase();
}

// Kbd component for displaying keyboard keys
export function Kbd({ 
  children, 
  className 
}: { 
  children: ReactNode; 
  className?: string;
}) {
  return (
    <kbd
      className={cn(
        "inline-flex items-center justify-center px-1.5 py-0.5 min-w-[1.5rem]",
        "text-xs font-medium font-mono",
        "bg-muted border border-border rounded",
        "shadow-[0_1px_1px_rgba(0,0,0,0.1)]",
        className
      )}
    >
      {children}
    </kbd>
  );
}

// Shortcut display component
export function ShortcutKeys({ keys }: { keys: string[] }) {
  return (
    <div className="flex items-center gap-1">
      {keys.map((key, index) => (
        <span key={index} className="flex items-center gap-1">
          <Kbd>{formatKey(key)}</Kbd>
          {index < keys.length - 1 && (
            <span className="text-muted-foreground text-xs">+</span>
          )}
        </span>
      ))}
    </div>
  );
}

// Main Keyboard Shortcuts Dialog
export function KeyboardShortcutsDialog({
  shortcuts,
  trigger,
  className,
}: KeyboardShortcutsProps) {
  const [open, setOpen] = useState(false);

  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    const category = shortcut.category || "Geral";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(shortcut);
    return acc;
  }, {} as Record<string, ShortcutItem[]>);

  // Listen for ? key to open shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA") {
          e.preventDefault();
          setOpen(true);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className={className}>
            <Keyboard className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Atalhos de Teclado
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 pt-4">
          {Object.entries(groupedShortcuts).map(([category, items]) => (
            <div key={category}>
              <h4 className="text-sm font-semibold text-muted-foreground mb-3">
                {category}
              </h4>
              <div className="space-y-2">
                {items.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <ShortcutKeys keys={shortcut.keys} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground text-center">
            Pressione <Kbd>?</Kbd> a qualquer momento para ver estes atalhos
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Default app shortcuts
export const defaultShortcuts: ShortcutItem[] = [
  { keys: ["cmd", "k"], description: "Abrir busca global", category: "Navegação" },
  { keys: ["cmd", "/"], description: "Focar na busca", category: "Navegação" },
  { keys: ["escape"], description: "Fechar modal/painel", category: "Navegação" },
  { keys: ["g", "h"], description: "Ir para Home", category: "Navegação" },
  { keys: ["g", "c"], description: "Ir para Catálogo", category: "Navegação" },
  { keys: ["g", "o"], description: "Ir para Orçamentos", category: "Navegação" },
  { keys: ["cmd", "s"], description: "Salvar alterações", category: "Ações" },
  { keys: ["cmd", "z"], description: "Desfazer", category: "Ações" },
  { keys: ["cmd", "shift", "z"], description: "Refazer", category: "Ações" },
  { keys: ["cmd", "n"], description: "Novo item", category: "Ações" },
  { keys: ["?"], description: "Mostrar atalhos", category: "Ajuda" },
];

// Floating shortcuts hint
export function ShortcutsHint({ className }: { className?: string }) {
  const [dismissed, setDismissed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show hint after 5 seconds, hide after 10 seconds
    const showTimer = setTimeout(() => setIsVisible(true), 5000);
    const hideTimer = setTimeout(() => setIsVisible(false), 15000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (dismissed || !isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className={cn(
          "fixed bottom-20 right-4 z-40",
          "bg-card border border-border rounded-lg shadow-lg p-3",
          "flex items-center gap-3",
          className
        )}
      >
        <div className="flex items-center gap-2">
          <Keyboard className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            Pressione <Kbd>?</Kbd> para ver atalhos
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setDismissed(true)}
        >
          <X className="h-3 w-3" />
        </Button>
      </motion.div>
    </AnimatePresence>
  );
}

export default KeyboardShortcutsDialog;
