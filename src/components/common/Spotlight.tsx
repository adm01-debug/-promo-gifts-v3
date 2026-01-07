import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Package,
  FileText,
  Users,
  Settings,
  BarChart3,
  Palette,
  ShoppingBag,
  Sparkles,
  ArrowRight,
  Command,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SpotlightItem {
  id: string;
  title: string;
  description?: string;
  icon: React.ReactNode;
  action: () => void;
  category: string;
}

export function Spotlight() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const items: SpotlightItem[] = [
    {
      id: "products",
      title: "Produtos",
      description: "Navegar pelo catálogo",
      icon: <Package className="h-4 w-4" />,
      action: () => navigate("/"),
      category: "Navegação",
    },
    {
      id: "quotes",
      title: "Orçamentos",
      description: "Gerenciar orçamentos",
      icon: <FileText className="h-4 w-4" />,
      action: () => navigate("/orcamentos"),
      category: "Navegação",
    },
    {
      id: "clients",
      title: "Clientes",
      description: "Ver clientes Bitrix",
      icon: <Users className="h-4 w-4" />,
      action: () => navigate("/clientes"),
      category: "Navegação",
    },
    {
      id: "orders",
      title: "Pedidos",
      description: "Gerenciar pedidos",
      icon: <ShoppingBag className="h-4 w-4" />,
      action: () => navigate("/pedidos"),
      category: "Navegação",
    },
    {
      id: "analytics",
      title: "Analytics",
      description: "Dashboard de métricas",
      icon: <BarChart3 className="h-4 w-4" />,
      action: () => navigate("/bi"),
      category: "Navegação",
    },
    {
      id: "mockup",
      title: "Gerador de Mockup",
      description: "Criar mockups de produtos",
      icon: <Palette className="h-4 w-4" />,
      action: () => navigate("/mockup-generator"),
      category: "Ferramentas",
    },
    {
      id: "gamification",
      title: "Loja de Recompensas",
      description: "XP, conquistas e recompensas",
      icon: <Sparkles className="h-4 w-4" />,
      action: () => navigate("/loja-recompensas"),
      category: "Ferramentas",
    },
    {
      id: "settings",
      title: "Perfil",
      description: "Meu perfil e configurações",
      icon: <Settings className="h-4 w-4" />,
      action: () => navigate("/perfil"),
      category: "Sistema",
    },
  ];

  const filteredItems = query
    ? items.filter(
        (item) =>
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.description?.toLowerCase().includes(query.toLowerCase())
      )
    : items;

  const groupedItems = filteredItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, SpotlightItem[]>);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    },
    []
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleSelect = (item: SpotlightItem) => {
    item.action();
    setIsOpen(false);
    setQuery("");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Spotlight Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed left-1/2 top-[15%] z-[101] w-full max-w-lg -translate-x-1/2"
          >
            <div className="overflow-hidden rounded-2xl border bg-card shadow-2xl">
              {/* Search Input */}
              <div className="flex items-center border-b px-4">
                <Search className="h-5 w-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar páginas, ações..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="flex-1 bg-transparent px-4 py-4 text-base outline-none placeholder:text-muted-foreground"
                  autoFocus
                />
                <kbd className="hidden rounded bg-muted px-2 py-1 text-xs font-medium text-muted-foreground sm:inline-block">
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <div className="max-h-[400px] overflow-y-auto p-2">
                {Object.entries(groupedItems).map(([category, categoryItems]) => (
                  <div key={category} className="mb-2">
                    <div className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {category}
                    </div>
                    {categoryItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left",
                          "hover:bg-accent transition-colors duration-150",
                          "focus:bg-accent focus:outline-none"
                        )}
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                          {item.icon}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{item.title}</div>
                          {item.description && (
                            <div className="text-sm text-muted-foreground">
                              {item.description}
                            </div>
                          )}
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                ))}

                {filteredItems.length === 0 && (
                  <div className="py-8 text-center text-muted-foreground">
                    <Search className="mx-auto mb-2 h-8 w-8 opacity-50" />
                    <p>Nenhum resultado para "{query}"</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <kbd className="rounded bg-muted px-1.5 py-0.5">↑↓</kbd>
                  <span>Navegar</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="rounded bg-muted px-1.5 py-0.5">↵</kbd>
                  <span>Selecionar</span>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Trigger button component
export function SpotlightTrigger({ className }: { className?: string }) {
  const handleClick = () => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", metaKey: true })
    );
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground",
        "hover:bg-muted hover:text-foreground transition-colors duration-150",
        "focus:outline-none focus:ring-2 focus:ring-ring",
        className
      )}
    >
      <Search className="h-4 w-4" />
      <span className="hidden sm:inline">Buscar...</span>
      <kbd className="hidden rounded bg-background px-1.5 py-0.5 text-xs font-medium sm:inline-flex items-center gap-0.5">
        <Command className="h-3 w-3" />K
      </kbd>
    </button>
  );
}
