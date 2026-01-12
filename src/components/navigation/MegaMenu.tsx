import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  Palette,
  Calculator,
  FileText,
  ShoppingCart,
  Users,
  Building2,
  Star,
  Layers,
  Settings,
  BarChart3,
  ChevronRight,
  Search,
  Sparkles,
  Clock,
  TrendingUp,
  Zap,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface MegaMenuCategory {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  items: {
    label: string;
    href: string;
    badge?: string;
    isNew?: boolean;
  }[];
}

const megaMenuCategories: MegaMenuCategory[] = [
  {
    id: "catalog",
    title: "Catálogo",
    description: "Explore nossos produtos",
    icon: Package,
    color: "from-blue-500 to-cyan-500",
    items: [
      { label: "Todos os Produtos", href: "/" },
      { label: "Novidades", href: "/?filter=new", badge: "Novo", isNew: true },
      { label: "Mais Vendidos", href: "/?filter=popular" },
      { label: "Promoções", href: "/?filter=sale", badge: "-20%" },
      { label: "Kits Prontos", href: "/?filter=kits" },
      { label: "Por Categoria", href: "/categorias" },
    ],
  },
  {
    id: "personalization",
    title: "Personalização",
    description: "Ferramentas de criação",
    icon: Palette,
    color: "from-purple-500 to-pink-500",
    items: [
      { label: "Gerador de Mockups", href: "/mockup", isNew: true },
      { label: "Simulador de Preços", href: "/simulador-precos" },
      { label: "Técnicas Disponíveis", href: "/tecnicas" },
      { label: "Cores e Acabamentos", href: "/cores" },
    ],
  },
  {
    id: "commercial",
    title: "Comercial",
    description: "Vendas e orçamentos",
    icon: FileText,
    color: "from-emerald-500 to-teal-500",
    items: [
      { label: "Orçamentos", href: "/orcamentos" },
      { label: "Novo Orçamento", href: "/orcamentos/novo" },
      { label: "Pedidos", href: "/pedidos" },
      { label: "Histórico", href: "/historico" },
    ],
  },
  {
    id: "clients",
    title: "Clientes",
    description: "Gestão de relacionamento",
    icon: Users,
    color: "from-amber-500 to-orange-500",
    items: [
      { label: "Empresas", href: "/empresas" },
      { label: "Contatos", href: "/contatos" },
      { label: "Favoritos", href: "/favoritos" },
      { label: "Coleções", href: "/colecoes" },
    ],
  },
];

const quickActions = [
  { label: "Novo Orçamento", href: "/orcamentos/novo", icon: FileText },
  { label: "Criar Mockup", href: "/mockup", icon: Palette },
  { label: "Simular Preço", href: "/simulador-precos", icon: Calculator },
];

const recentItems = [
  { label: "Caneta Premium", type: "product", href: "/produto/1" },
  { label: "Kit Executivo", type: "product", href: "/produto/2" },
  { label: "Orçamento #1234", type: "quote", href: "/orcamentos/1234" },
];

interface MegaMenuProps {
  isOpen: boolean;
  onClose: () => void;
  trigger?: React.ReactNode;
}

export function MegaMenu({ isOpen, onClose }: MegaMenuProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const handleNavigate = (href: string) => {
    navigate(href);
    onClose();
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
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Menu */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-16 left-0 right-0 z-50 mx-auto max-w-7xl px-4"
          >
            <div className="bg-card border rounded-2xl shadow-2xl overflow-hidden">
              <div className="grid lg:grid-cols-[280px_1fr_280px]">
                {/* Left Column - Categories */}
                <div className="border-r bg-muted/30 p-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Navegação
                  </h3>
                  <nav className="space-y-1">
                    {megaMenuCategories.map((category) => (
                      <button
                        key={category.id}
                        onMouseEnter={() => setActiveCategory(category.id)}
                        onClick={() => setActiveCategory(category.id)}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all",
                          activeCategory === category.id
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-muted"
                        )}
                      >
                        <div
                          className={cn(
                            "w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center",
                            category.color
                          )}
                        >
                          <category.icon className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{category.title}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {category.description}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                    ))}
                  </nav>
                </div>

                {/* Center Column - Category Items */}
                <div className="p-6">
                  <AnimatePresence mode="wait">
                    {activeCategory ? (
                      <motion.div
                        key={activeCategory}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                      >
                        {(() => {
                          const category = megaMenuCategories.find(
                            (c) => c.id === activeCategory
                          );
                          if (!category) return null;

                          return (
                            <>
                              <div className="flex items-center gap-3 mb-4">
                                <div
                                  className={cn(
                                    "w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center",
                                    category.color
                                  )}
                                >
                                  <category.icon className="h-4 w-4 text-white" />
                                </div>
                                <h3 className="text-lg font-semibold">
                                  {category.title}
                                </h3>
                              </div>

                              <div className="grid sm:grid-cols-2 gap-2">
                                {category.items.map((item, index) => (
                                  <button
                                    key={index}
                                    onClick={() => handleNavigate(item.href)}
                                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors text-left group"
                                  >
                                    <span className="text-sm group-hover:text-primary transition-colors">
                                      {item.label}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      {item.badge && (
                                        <Badge
                                          variant={item.isNew ? "default" : "secondary"}
                                          className="text-[10px]"
                                        >
                                          {item.badge}
                                        </Badge>
                                      )}
                                      <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </>
                          );
                        })()}
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="h-full flex items-center justify-center text-center"
                      >
                        <div>
                          <Layers className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                          <p className="text-muted-foreground">
                            Passe o mouse sobre uma categoria
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Right Column - Quick Access */}
                <div className="border-l bg-muted/20 p-4">
                  {/* Search */}
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 bg-background"
                    />
                  </div>

                  {/* Quick Actions */}
                  <div className="mb-6">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      Ações Rápidas
                    </h4>
                    <div className="space-y-1">
                      {quickActions.map((action, index) => (
                        <button
                          key={index}
                          onClick={() => handleNavigate(action.href)}
                          className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors text-left text-sm"
                        >
                          <action.icon className="h-4 w-4 text-primary" />
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Recent */}
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Recentes
                    </h4>
                    <div className="space-y-1">
                      {recentItems.map((item, index) => (
                        <button
                          key={index}
                          onClick={() => handleNavigate(item.href)}
                          className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors text-left text-sm"
                        >
                          {item.type === "product" ? (
                            <Package className="h-3 w-3 text-muted-foreground" />
                          ) : (
                            <FileText className="h-3 w-3 text-muted-foreground" />
                          )}
                          <span className="truncate">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t bg-muted/30 px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Sparkles className="h-3 w-3" />
                  <span>Pressione / para buscar rapidamente</span>
                </div>
                <Button variant="ghost" size="sm" onClick={onClose}>
                  Fechar
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Hook to control mega menu
export function useMegaMenu() {
  const [isOpen, setIsOpen] = useState(false);

  const openMenu = () => setIsOpen(true);
  const closeMenu = () => setIsOpen(false);
  const toggleMenu = () => setIsOpen(!isOpen);

  return { isOpen, openMenu, closeMenu, toggleMenu };
}
