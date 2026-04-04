import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Plus,
  X,
  Wand2,
  Calculator,
  ShoppingCart,
  Package,
  Users,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: typeof FileText;
  href: string;
  color: string;
}

const quickActions: QuickAction[] = [
  {
    id: "new-quote",
    label: "Novo Orçamento",
    description: "Criar orçamento do zero",
    icon: FileText,
    href: "/orcamentos/novo",
    color: "bg-blue-500 text-white",
  },
  {
    id: "mockup",
    label: "Gerar Mockup",
    description: "Visualização com logo",
    icon: Wand2,
    href: "/mockup-generator",
    color: "bg-purple-500 text-white",
  },
  {
    id: "simulator",
    label: "Simulador",
    description: "Calcular personalização",
    icon: Calculator,
    href: "/simulador",
    color: "bg-amber-500 text-white",
  },
  {
    id: "cart",
    label: "Carrinho",
    description: "Orçamento rápido",
    icon: ShoppingCart,
    href: "__open_cart__",
    color: "bg-emerald-400 text-white",
  },
];

interface QuickQuoteFABProps {
  productId?: string;
  productName?: string;
}

export function QuickQuoteFAB({ productId, productName }: QuickQuoteFABProps) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Don't show on certain pages
  const hiddenPaths = ["/orcamentos/novo", "/auth", "/mockup-generator"];
  if (hiddenPaths.some((path) => location.pathname.startsWith(path))) {
    return null;
  }

  const handleAction = (href: string) => {
    setIsOpen(false);

    // Special: open cart popover via custom event
    if (href === "__open_cart__") {
      window.dispatchEvent(new CustomEvent("open-seller-cart"));
      return;
    }
    
    // If we have a product context, pass it along
    if (productId && href === "/orcamentos/novo") {
      navigate(`${href}?productId=${productId}`);
    } else if (productId && href === "/mockup-generator") {
      navigate(`${href}?productId=${productId}`);
    } else {
      navigate(href);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 hidden lg:block" style={{ bottom: 'calc(11rem + env(safe-area-inset-bottom))' }}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="fab-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-background/40"
              onClick={() => setIsOpen(false)}
            />

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-16 right-0 flex flex-col gap-3 items-end"
            >
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                
                return (
                  <motion.div
                    key={action.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-3"
                  >
                    {/* Label */}
                    <div className="bg-card rounded-lg px-3 py-2 shadow-lg border border-border">
                      <div className="text-sm font-medium text-foreground whitespace-nowrap">
                        {action.label}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {action.description}
                      </div>
                    </div>

                    {/* Icon Button */}
                    <button
                      onClick={() => handleAction(action.href)}
                      className={cn(
                        "flex items-center justify-center w-12 h-12 rounded-full shadow-lg",
                        "transition-all duration-200 active:scale-95",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        action.color
                      )}
                      aria-label={action.label}
                    >
                      <Icon className="h-5 w-5" />
                    </button>
                  </motion.div>
                );
              })}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main FAB */}
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              "relative flex items-center justify-center w-14 h-14 rounded-full shadow-xl",
              "transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isOpen
                ? "bg-muted text-muted-foreground"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
            aria-label={isOpen ? "Fechar menu" : "Ações rápidas"}
            aria-expanded={isOpen}
          >
            <motion.div
              animate={{ rotate: isOpen ? 45 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <Plus className="h-6 w-6" />
            </motion.div>
            
            {/* No pulse effect */}
          </motion.button>
        </TooltipTrigger>
        <TooltipContent side="left" className="bg-card border-border">
          Ações Rápidas
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
