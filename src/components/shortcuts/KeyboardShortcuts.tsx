/**
 * Keyboard Shortcuts System
 * Global keyboard shortcuts with customization
 */

import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Keyboard, Command, Search, HelpCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface Shortcut {
  id: string;
  keys: string[];
  description: string;
  category: string;
  action: () => void;
  global?: boolean;
  disabled?: boolean;
}

interface ShortcutsContextValue {
  shortcuts: Shortcut[];
  registerShortcut: (shortcut: Shortcut) => void;
  unregisterShortcut: (id: string) => void;
  triggerShortcut: (id: string) => void;
  isModalOpen: boolean;
  setModalOpen: (open: boolean) => void;
}

const ShortcutsContext = createContext<ShortcutsContextValue | null>(null);

export function useKeyboardShortcuts() {
  const context = useContext(ShortcutsContext);
  if (!context) {
    throw new Error("useKeyboardShortcuts must be used within ShortcutsProvider");
  }
  return context;
}

const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

function parseKey(key: string): string {
  const mappings: Record<string, string> = {
    cmd: isMac ? "⌘" : "Ctrl",
    ctrl: isMac ? "⌃" : "Ctrl",
    alt: isMac ? "⌥" : "Alt",
    shift: "⇧",
    enter: "↵",
    escape: "Esc",
    backspace: "⌫",
    delete: "⌦",
    tab: "⇥",
    arrowup: "↑",
    arrowdown: "↓",
    arrowleft: "←",
    arrowright: "→",
  };
  return mappings[key.toLowerCase()] || key.toUpperCase();
}

export function ShortcutsProvider({ children }: { children: React.ReactNode }) {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [isModalOpen, setModalOpen] = useState(false);

  const registerShortcut = useCallback((shortcut: Shortcut) => {
    setShortcuts((prev) => {
      const exists = prev.find((s) => s.id === shortcut.id);
      if (exists) {
        return prev.map((s) => (s.id === shortcut.id ? shortcut : s));
      }
      return [...prev, shortcut];
    });
  }, []);

  const unregisterShortcut = useCallback((id: string) => {
    setShortcuts((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const triggerShortcut = useCallback((id: string) => {
    const shortcut = shortcuts.find((s) => s.id === id);
    if (shortcut && !shortcut.disabled) {
      shortcut.action();
    }
  }, [shortcuts]);

  // Global keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger in input fields unless it's a global shortcut
      const target = e.target as HTMLElement;
      const isInputField = ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) ||
        target.isContentEditable;

      // Show shortcuts modal with ?
      if (e.key === "?" && e.shiftKey && !isInputField) {
        e.preventDefault();
        setModalOpen(true);
        return;
      }

      for (const shortcut of shortcuts) {
        if (shortcut.disabled) continue;
        if (isInputField && !shortcut.global) continue;

        const keys = shortcut.keys.map((k) => k.toLowerCase());
        const modifiers = {
          cmd: e.metaKey,
          ctrl: e.ctrlKey,
          alt: e.altKey,
          shift: e.shiftKey,
        };

        const requiredModifiers = {
          cmd: keys.includes("cmd"),
          ctrl: keys.includes("ctrl"),
          alt: keys.includes("alt"),
          shift: keys.includes("shift"),
        };

        const mainKey = keys.find(
          (k) => !["cmd", "ctrl", "alt", "shift"].includes(k)
        );

        const modifiersMatch =
          modifiers.cmd === requiredModifiers.cmd &&
          modifiers.ctrl === requiredModifiers.ctrl &&
          modifiers.alt === requiredModifiers.alt &&
          modifiers.shift === requiredModifiers.shift;

        const keyMatches = mainKey && e.key.toLowerCase() === mainKey;

        if (modifiersMatch && keyMatches) {
          e.preventDefault();
          shortcut.action();
          break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);

  return (
    <ShortcutsContext.Provider
      value={{
        shortcuts,
        registerShortcut,
        unregisterShortcut,
        triggerShortcut,
        isModalOpen,
        setModalOpen,
      }}
    >
      {children}
    </ShortcutsContext.Provider>
  );
}

// Hook for registering shortcuts
export function useShortcut(shortcut: Omit<Shortcut, "id"> & { id?: string }) {
  const { registerShortcut, unregisterShortcut } = useKeyboardShortcuts();
  const id = shortcut.id || `shortcut-${shortcut.keys.join("-")}`;

  useEffect(() => {
    registerShortcut({ ...shortcut, id });
    return () => unregisterShortcut(id);
  }, [shortcut.keys.join(","), shortcut.disabled]);
}

// Keyboard Shortcuts Help Modal
export function ShortcutsHelpModal() {
  const { shortcuts, isModalOpen, setModalOpen } = useKeyboardShortcuts();

  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) acc[shortcut.category] = [];
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, Shortcut[]>);

  return (
    <Dialog open={isModalOpen} onOpenChange={setModalOpen}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Atalhos de Teclado
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {Object.entries(groupedShortcuts).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                {category}
              </h3>
              <div className="space-y-2">
                {items.map((shortcut) => (
                  <div
                    key={shortcut.id}
                    className={cn(
                      "flex items-center justify-between py-2 px-3 rounded-lg",
                      shortcut.disabled ? "opacity-50" : "hover:bg-accent"
                    )}
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <ShortcutKeys keys={shortcut.keys} />
                  </div>
                ))}
              </div>
            </div>
          ))}

          {Object.keys(groupedShortcuts).length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Keyboard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum atalho registrado</p>
            </div>
          )}
        </div>

        <div className="pt-4 border-t text-center text-sm text-muted-foreground">
          Pressione <ShortcutKeys keys={["shift", "?"]} className="inline-flex" /> para abrir esta ajuda
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Shortcut Keys Display
export function ShortcutKeys({
  keys,
  className,
}: {
  keys: string[];
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {keys.map((key, i) => (
        <kbd
          key={i}
          className="inline-flex h-6 min-w-6 items-center justify-center rounded border bg-muted px-1.5 font-mono text-xs"
        >
          {parseKey(key)}
        </kbd>
      ))}
    </div>
  );
}

// Shortcut Hint Button
export function ShortcutHint({
  keys,
  children,
  className,
}: {
  keys: string[];
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {children}
      <ShortcutKeys keys={keys} />
    </span>
  );
}

// Quick Actions with Shortcuts
export interface QuickAction {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  shortcut?: string[];
  action: () => void;
}

interface QuickActionsProps {
  actions: QuickAction[];
  isOpen: boolean;
  onClose: () => void;
}

export function QuickActions({ actions, isOpen, onClose }: QuickActionsProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredActions = actions.filter(
    (action) =>
      action.label.toLowerCase().includes(query.toLowerCase()) ||
      action.description?.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredActions.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredActions.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (filteredActions[selectedIndex]) {
          filteredActions[selectedIndex].action();
          onClose();
        }
        break;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="container max-w-lg mx-auto pt-[15vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-popover border rounded-lg shadow-2xl overflow-hidden">
              <div className="flex items-center border-b px-3">
                <Command className="h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Digite um comando..."
                  className="flex-1 h-12 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
                  autoFocus
                />
              </div>

              <div className="max-h-[300px] overflow-y-auto p-2">
                {filteredActions.map((action, index) => (
                  <button
                    key={action.id}
                    onClick={() => {
                      action.action();
                      onClose();
                    }}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors",
                      selectedIndex === index
                        ? "bg-accent"
                        : "hover:bg-accent/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {action.icon}
                      <div>
                        <div className="font-medium">{action.label}</div>
                        {action.description && (
                          <div className="text-xs text-muted-foreground">
                            {action.description}
                          </div>
                        )}
                      </div>
                    </div>
                    {action.shortcut && (
                      <ShortcutKeys keys={action.shortcut} />
                    )}
                  </button>
                ))}

                {filteredActions.length === 0 && (
                  <div className="py-8 text-center text-muted-foreground">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhum comando encontrado</p>
                  </div>
                )}
              </div>

              <div className="border-t p-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  <ShortcutKeys keys={["↑", "↓"]} className="inline-flex mr-2" />
                  para navegar
                </span>
                <span>
                  <ShortcutKeys keys={["enter"]} className="inline-flex mr-2" />
                  para selecionar
                </span>
                <span>
                  <ShortcutKeys keys={["escape"]} className="inline-flex mr-2" />
                  para fechar
                </span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Help Button
export function ShortcutsHelpButton() {
  const { setModalOpen } = useKeyboardShortcuts();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setModalOpen(true)}
      title="Atalhos de teclado"
    >
      <HelpCircle className="h-4 w-4" />
    </Button>
  );
}
