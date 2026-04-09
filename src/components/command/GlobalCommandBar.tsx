import { useCallback, useEffect, useState, useMemo, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Package,
  Users,
  FileText,
  Calculator,
  Settings,
  Home,
  Search,
  Palette,
  Layers,
  Box,
  Calendar,
  Bell,
  Zap,
  BarChart3,
  ClipboardList,
  BookOpen,
  HelpCircle,
  Moon,
  Sun,
  Sparkles,
  Clock,
  Star,
  TrendingUp,
  ShoppingCart,
  Grid,
  Filter,
  UserPlus,
  Mail,
  Phone,
  MapPin,
  PlusCircle,
  RefreshCw,
  Download,
  Upload,
  Printer,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface CommandAction {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
  keywords?: string[];
  category: "navigation" | "action" | "recent" | "quick" | "settings" | "help";
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
}

interface RecentItem {
  id: string;
  type: "product" | "client" | "quote" | "page";
  label: string;
  path: string;
  timestamp: number;
}

const RECENT_ITEMS_KEY = "command-bar-recent";

interface GlobalCommandBarProps {
  children?: ReactNode;
  /** Renderiza o botão "Buscar" na UI (além do atalho Cmd/Ctrl+K) */
  showTrigger?: boolean;
}

export function GlobalCommandBar({ children, showTrigger = false }: GlobalCommandBarProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const navigate = useNavigate();
  const { theme, actualTheme, setTheme } = useTheme();

  // Load recent items
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_ITEMS_KEY);
      if (stored) {
        setRecentItems(JSON.parse(stored).slice(0, 5));
      }
    } catch (e) {
      console.error("Error loading recent items:", e);
    }
  }, [open]);

  // Save recent item
  const addToRecent = useCallback((item: Omit<RecentItem, "timestamp">) => {
    const newItem = { ...item, timestamp: Date.now() };
    setRecentItems((prev) => {
      const filtered = prev.filter((i) => i.id !== item.id);
      const updated = [newItem, ...filtered].slice(0, 5);
      localStorage.setItem(RECENT_ITEMS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Keyboard shortcut to open
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      // Escape to close
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open]);

  const goTo = useCallback(
    (path: string, label: string, type: RecentItem["type"] = "page") => {
      addToRecent({ id: path, type, label, path });
      navigate(path);
      setOpen(false);
      setSearch("");
    },
    [navigate, addToRecent]
  );

  const actions: CommandAction[] = useMemo(
    () => [
      // Quick Actions
      {
        id: "new-quote",
        label: "Novo Orçamento",
        description: "Criar um novo orçamento rápido",
        icon: <PlusCircle className="h-4 w-4" />,
        shortcut: "⌘N",
        action: () => goTo("/orcamentos/novo", "Novo Orçamento"),
        keywords: ["criar", "orçamento", "novo", "quote"],
        category: "quick",
        badge: "Ação",
        badgeVariant: "default",
      },
      {
        id: "simulator",
        label: "Abrir Simulador",
        description: "Simular preços de personalização",
        icon: <Calculator className="h-4 w-4" />,
        shortcut: "⌘S",
        action: () => goTo("/simulador", "Simulador"),
        keywords: ["simulador", "calcular", "preço", "personalização"],
        category: "quick",
        badge: "Popular",
        badgeVariant: "secondary",
      },
      {
        id: "compare",
        label: "Comparar Produtos",
        description: "Comparar produtos lado a lado",
        icon: <Layers className="h-4 w-4" />,
        action: () => goTo("/comparar", "Comparar Produtos"),
        keywords: ["comparar", "produto", "compare"],
        category: "quick",
      },

      // Navigation
      {
        id: "home",
        label: "Dashboard",
        description: "Voltar para o início",
        icon: <Home className="h-4 w-4" />,
        shortcut: "⌘H",
        action: () => goTo("/", "Dashboard"),
        keywords: ["home", "início", "dashboard", "principal"],
        category: "navigation",
      },
      {
        id: "products",
        label: "Catálogo de Produtos",
        description: "Ver todos os produtos",
        icon: <Package className="h-4 w-4" />,
        action: () => goTo("/catalogo", "Catálogo"),
        keywords: ["produtos", "catálogo", "catalog", "items"],
        category: "navigation",
      },
      {
        id: "novelties",
        label: "Novidades",
        description: "Produtos recém-adicionados",
        icon: <Zap className="h-4 w-4" />,
        action: () => goTo("/novidades", "Novidades"),
        keywords: ["novidades", "novo", "lançamento", "new"],
        category: "navigation",
        badge: "Novo",
        badgeVariant: "destructive",
      },
      {
        id: "quotes",
        label: "Orçamentos",
        description: "Ver todos os orçamentos",
        icon: <FileText className="h-4 w-4" />,
        action: () => goTo("/orcamentos", "Orçamentos"),
        keywords: ["orçamentos", "quotes", "propostas"],
        category: "navigation",
      },
      {
        id: "techniques",
        label: "Técnicas de Personalização",
        description: "Gerenciar técnicas",
        icon: <Palette className="h-4 w-4" />,
        action: () => goTo("/tecnicas", "Técnicas"),
        keywords: ["técnicas", "personalização", "gravação", "silk"],
        category: "navigation",
      },
      {
        id: "collections",
        label: "Coleções",
        description: "Ver coleções de produtos",
        icon: <Grid className="h-4 w-4" />,
        action: () => goTo("/colecoes", "Coleções"),
        keywords: ["coleções", "collections", "grupos"],
        category: "navigation",
      },
      {
        id: "filters",
        label: "Filtros Avançados",
        description: "Filtrar produtos com múltiplos critérios",
        icon: <Filter className="h-4 w-4" />,
        action: () => goTo("/filtros", "Filtros"),
        keywords: ["filtros", "busca", "search", "advanced"],
        category: "navigation",
      },
      {
        id: "stock",
        label: "Controle de Estoque",
        description: "Monitorar estoque e alertas",
        icon: <Box className="h-4 w-4" />,
        action: () => goTo("/estoque", "Estoque"),
        keywords: ["estoque", "stock", "inventário", "alertas"],
        category: "navigation",
      },
      {
        id: "dates",
        label: "Datas Comemorativas",
        description: "Calendário de datas especiais",
        icon: <Calendar className="h-4 w-4" />,
        action: () => goTo("/datas-comemorativas", "Datas"),
        keywords: ["datas", "comemorativas", "calendar", "eventos"],
        category: "navigation",
      },
      {
        id: "reports",
        label: "Relatórios",
        description: "Ver relatórios e métricas",
        icon: <BarChart3 className="h-4 w-4" />,
        action: () => goTo("/relatorios", "Relatórios"),
        keywords: ["relatórios", "reports", "métricas", "analytics"],
        category: "navigation",
      },

      // Actions
      {
        id: "export-pdf",
        label: "Exportar como PDF",
        description: "Exportar dados para PDF",
        icon: <Download className="h-4 w-4" />,
        action: () => {
          // Trigger export action
          window.dispatchEvent(new CustomEvent("export-pdf"));
          setOpen(false);
        },
        keywords: ["exportar", "pdf", "download", "export"],
        category: "action",
      },
      {
        id: "print",
        label: "Imprimir",
        description: "Imprimir página atual",
        icon: <Printer className="h-4 w-4" />,
        shortcut: "⌘P",
        action: () => {
          window.print();
          setOpen(false);
        },
        keywords: ["imprimir", "print"],
        category: "action",
      },
      {
        id: "refresh",
        label: "Atualizar Dados",
        description: "Recarregar dados da página",
        icon: <RefreshCw className="h-4 w-4" />,
        shortcut: "⌘R",
        action: () => {
          window.location.reload();
        },
        keywords: ["atualizar", "refresh", "reload"],
        category: "action",
      },

      // Settings
      {
        id: "settings",
        label: "Configurações",
        description: "Acessar configurações do sistema",
        icon: <Settings className="h-4 w-4" />,
        action: () => goTo("/configuracoes", "Configurações"),
        keywords: ["configurações", "settings", "preferências"],
        category: "settings",
      },
      {
        id: "theme-toggle",
        label: actualTheme === "dark" ? "Modo Claro" : "Modo Escuro",
        description: "Alternar tema do sistema",
        icon: actualTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />,
        shortcut: "⌘D",
        action: () => {
          setTheme(actualTheme === "dark" ? "light" : "dark");
        },
        keywords: ["tema", "theme", "dark", "light", "escuro", "claro"],
        category: "settings",
      },

      // Help
      {
        id: "help",
        label: "Central de Ajuda",
        description: "Tutoriais e documentação",
        icon: <HelpCircle className="h-4 w-4" />,
        shortcut: "⌘/",
        action: () => goTo("/ajuda", "Ajuda"),
        keywords: ["ajuda", "help", "suporte", "tutorial"],
        category: "help",
      },
      {
        id: "shortcuts",
        label: "Atalhos de Teclado",
        description: "Ver todos os atalhos disponíveis",
        icon: <BookOpen className="h-4 w-4" />,
        action: () => {
          // Could open a modal with shortcuts
          setOpen(false);
        },
        keywords: ["atalhos", "shortcuts", "keyboard", "teclado"],
        category: "help",
      },
    ],
    [goTo, theme, setTheme]
  );

  // Filter actions based on search
  const filteredActions = useMemo(() => {
    if (!search) return actions;
    const searchLower = search.toLowerCase();
    return actions.filter(
      (action) =>
        action.label.toLowerCase().includes(searchLower) ||
        action.description?.toLowerCase().includes(searchLower) ||
        action.keywords?.some((k) => k.toLowerCase().includes(searchLower))
    );
  }, [actions, search]);

  const groupedActions = useMemo(() => {
    const groups: Record<string, CommandAction[]> = {
      quick: [],
      navigation: [],
      action: [],
      settings: [],
      help: [],
    };

    filteredActions.forEach((action) => {
      groups[action.category]?.push(action);
    });

    return groups;
  }, [filteredActions]);

  const recentActions = useMemo(() => {
    if (search) return [];
    return recentItems.map((item) => ({
      id: `recent-${item.id}`,
      label: item.label,
      description: `Acessado recentemente`,
      icon: <Clock className="h-4 w-4" />,
      action: () => goTo(item.path, item.label, item.type),
      category: "recent" as const,
      keywords: [],
    }));
  }, [recentItems, search, goTo]);

  return (
    <>
      {children}

      {/* Trigger Button (opcional, pode ser ocultado) */}
      {showTrigger && (
        <button
          onClick={() => setOpen(true)}
          className="hidden md:flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground 
                   bg-muted/50 hover:bg-muted rounded-lg border border-border 
                   transition-all duration-200 hover:text-foreground"
        >
          <Search className="h-4 w-4" />
          <span>Buscar...</span>
          <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <span className="text-xs">⌘</span>K
          </kbd>
        </button>
      )}

      <CommandDialog open={open} onOpenChange={setOpen}>
        <Command className="rounded-lg border-0 shadow-2xl">
          <div className="flex items-center border-b px-3 bg-gradient-to-r from-primary/5 to-transparent">
            <Sparkles className="mr-2 h-4 w-4 text-primary animate-pulse" />
            <CommandInput
              placeholder="O que você quer fazer? Digite para buscar..."
              value={search}
              onValueChange={setSearch}
              className="border-0"
            />
          </div>
          <CommandList className="max-h-[400px]">
            <CommandEmpty>
              <div className="flex flex-col items-center py-6 text-muted-foreground">
                <Search className="h-10 w-10 mb-2 opacity-50" />
                <p>Nenhum resultado encontrado.</p>
                <p className="text-xs mt-1">Tente termos diferentes ou navegue pelas categorias.</p>
              </div>
            </CommandEmpty>

            {/* Recent Items */}
            {recentActions.length > 0 && (
              <CommandGroup heading="Recentes">
                {recentActions.map((action) => (
                  <CommandItem
                    key={action.id}
                    onSelect={action.action}
                    className="flex items-center gap-3 p-2 cursor-pointer"
                  >
                    <span className="text-muted-foreground">{action.icon}</span>
                    <div className="flex flex-col">
                      <span>{action.label}</span>
                      {action.description && (
                        <span className="text-xs text-muted-foreground">{action.description}</span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Quick Actions */}
            {groupedActions.quick.length > 0 && (
              <>
                {recentActions.length > 0 && <CommandSeparator />}
                <CommandGroup heading="Ações Rápidas">
                  {groupedActions.quick.map((action) => (
                    <CommandItem
                      key={action.id}
                      onSelect={action.action}
                      className="flex items-center gap-3 p-2 cursor-pointer"
                    >
                      <span className="text-primary">{action.icon}</span>
                      <div className="flex flex-col flex-1">
                        <div className="flex items-center gap-2">
                          <span>{action.label}</span>
                          {action.badge && (
                            <Badge variant={action.badgeVariant || "secondary"} className="text-[10px] px-1.5 py-0">
                              {action.badge}
                            </Badge>
                          )}
                        </div>
                        {action.description && (
                          <span className="text-xs text-muted-foreground">{action.description}</span>
                        )}
                      </div>
                      {action.shortcut && <CommandShortcut>{action.shortcut}</CommandShortcut>}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            {/* Navigation */}
            {groupedActions.navigation.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Navegação">
                  {groupedActions.navigation.map((action) => (
                    <CommandItem
                      key={action.id}
                      onSelect={action.action}
                      className="flex items-center gap-3 p-2 cursor-pointer"
                    >
                      <span className="text-muted-foreground">{action.icon}</span>
                      <div className="flex flex-col flex-1">
                        <div className="flex items-center gap-2">
                          <span>{action.label}</span>
                          {action.badge && (
                            <Badge variant={action.badgeVariant || "secondary"} className="text-[10px] px-1.5 py-0">
                              {action.badge}
                            </Badge>
                          )}
                        </div>
                        {action.description && (
                          <span className="text-xs text-muted-foreground">{action.description}</span>
                        )}
                      </div>
                      {action.shortcut && <CommandShortcut>{action.shortcut}</CommandShortcut>}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            {/* Actions */}
            {groupedActions.action.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Ações">
                  {groupedActions.action.map((action) => (
                    <CommandItem
                      key={action.id}
                      onSelect={action.action}
                      className="flex items-center gap-3 p-2 cursor-pointer"
                    >
                      <span className="text-muted-foreground">{action.icon}</span>
                      <div className="flex flex-col flex-1">
                        <span>{action.label}</span>
                        {action.description && (
                          <span className="text-xs text-muted-foreground">{action.description}</span>
                        )}
                      </div>
                      {action.shortcut && <CommandShortcut>{action.shortcut}</CommandShortcut>}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            {/* Settings */}
            {groupedActions.settings.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Configurações">
                  {groupedActions.settings.map((action) => (
                    <CommandItem
                      key={action.id}
                      onSelect={action.action}
                      className="flex items-center gap-3 p-2 cursor-pointer"
                    >
                      <span className="text-muted-foreground">{action.icon}</span>
                      <div className="flex flex-col flex-1">
                        <span>{action.label}</span>
                        {action.description && (
                          <span className="text-xs text-muted-foreground">{action.description}</span>
                        )}
                      </div>
                      {action.shortcut && <CommandShortcut>{action.shortcut}</CommandShortcut>}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            {/* Help */}
            {groupedActions.help.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Ajuda">
                  {groupedActions.help.map((action) => (
                    <CommandItem
                      key={action.id}
                      onSelect={action.action}
                      className="flex items-center gap-3 p-2 cursor-pointer"
                    >
                      <span className="text-muted-foreground">{action.icon}</span>
                      <div className="flex flex-col flex-1">
                        <span>{action.label}</span>
                        {action.description && (
                          <span className="text-xs text-muted-foreground">{action.description}</span>
                        )}
                      </div>
                      {action.shortcut && <CommandShortcut>{action.shortcut}</CommandShortcut>}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>

          {/* Footer with keyboard hints */}
          <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground bg-muted/30">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px]">↑</kbd>
                <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px]">↓</kbd>
                <span>navegar</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px]">↵</kbd>
                <span>selecionar</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px]">esc</kbd>
                <span>fechar</span>
              </span>
            </div>
            <span className="text-primary">Promo Brindes</span>
          </div>
        </Command>
      </CommandDialog>
    </>
  );
}

// Hook to use the command bar programmatically
export function useCommandBar() {
  const openCommandBar = useCallback(() => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "k",
        metaKey: true,
        bubbles: true,
      })
    );
  }, []);

  return { openCommandBar };
}
