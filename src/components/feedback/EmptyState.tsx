import { ReactNode } from "react";
import { motion } from "framer-motion";
import { 
  Package, 
  Users, 
  FileText, 
  ShoppingCart, 
  Search, 
  Bell, 
  Calendar,
  BarChart3,
  FolderOpen,
  Inbox,
  Image,
  LucideIcon,
  Plus,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  type: EmptyStateType;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

type EmptyStateType =
  | "products"
  | "clients"
  | "quotes"
  | "orders"
  | "search"
  | "notifications"
  | "calendar"
  | "reports"
  | "folders"
  | "inbox"
  | "images"
  | "generic";

interface EmptyStateConfig {
  icon: LucideIcon;
  defaultTitle: string;
  defaultDescription: string;
  illustration: ReactNode;
}

const emptyStateConfigs: Record<EmptyStateType, EmptyStateConfig> = {
  products: {
    icon: Package,
    defaultTitle: "Nenhum produto encontrado",
    defaultDescription: "Parece que não há produtos correspondentes aos seus filtros.",
    illustration: <ProductsIllustration />,
  },
  clients: {
    icon: Users,
    defaultTitle: "Nenhum cliente cadastrado",
    defaultDescription: "Comece adicionando seu primeiro cliente para gerenciar relacionamentos.",
    illustration: <ClientsIllustration />,
  },
  quotes: {
    icon: FileText,
    defaultTitle: "Nenhum orçamento encontrado",
    defaultDescription: "Crie seu primeiro orçamento para começar a vender.",
    illustration: <QuotesIllustration />,
  },
  orders: {
    icon: ShoppingCart,
    defaultTitle: "Nenhum pedido ainda",
    defaultDescription: "Quando você converter orçamentos em vendas, eles aparecerão aqui.",
    illustration: <OrdersIllustration />,
  },
  search: {
    icon: Search,
    defaultTitle: "Nenhum resultado",
    defaultDescription: "Tente buscar com termos diferentes ou remova alguns filtros.",
    illustration: <SearchIllustration />,
  },
  notifications: {
    icon: Bell,
    defaultTitle: "Nenhuma notificação",
    defaultDescription: "Você está em dia! Novas notificações aparecerão aqui.",
    illustration: <NotificationsIllustration />,
  },
  calendar: {
    icon: Calendar,
    defaultTitle: "Nenhum evento",
    defaultDescription: "Seu calendário está vazio. Adicione eventos para se organizar.",
    illustration: <CalendarIllustration />,
  },
  reports: {
    icon: BarChart3,
    defaultTitle: "Sem dados para exibir",
    defaultDescription: "Ainda não há dados suficientes para gerar relatórios.",
    illustration: <ReportsIllustration />,
  },
  folders: {
    icon: FolderOpen,
    defaultTitle: "Pasta vazia",
    defaultDescription: "Esta pasta ainda não contém arquivos.",
    illustration: <FoldersIllustration />,
  },
  inbox: {
    icon: Inbox,
    defaultTitle: "Caixa de entrada vazia",
    defaultDescription: "Nenhuma mensagem nova no momento.",
    illustration: <InboxIllustration />,
  },
  images: {
    icon: Image,
    defaultTitle: "Nenhuma imagem",
    defaultDescription: "Faça upload de imagens para visualizá-las aqui.",
    illustration: <ImagesIllustration />,
  },
  generic: {
    icon: FolderOpen,
    defaultTitle: "Nada por aqui",
    defaultDescription: "Não há conteúdo para exibir no momento.",
    illustration: <GenericIllustration />,
  },
};

export function EmptyState({
  type,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  const config = emptyStateConfigs[type];
  const displayTitle = title || config.defaultTitle;
  const displayDescription = description || config.defaultDescription;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className
      )}
    >
      {/* Illustration */}
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mb-6"
      >
        {config.illustration}
      </motion.div>

      {/* Title */}
      <motion.h3
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-lg font-semibold text-foreground mb-2"
      >
        {displayTitle}
      </motion.h3>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-sm text-muted-foreground max-w-sm mb-6"
      >
        {displayDescription}
      </motion.p>

      {/* Actions */}
      {(action || secondaryAction) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-3"
        >
          {action && (
            <Button onClick={action.onClick} className="gap-2">
              {action.icon || <Plus className="h-4 w-4" />}
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick} className="gap-2">
              {secondaryAction.label}
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

// Illustrations

function ProductsIllustration() {
  return (
    <div className="relative w-32 h-32">
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <Package className="w-16 h-16 text-primary/60" />
      </div>
      <motion.div
        className="absolute -top-2 -right-2 w-8 h-8 bg-muted rounded-lg flex items-center justify-center"
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
      >
        <Search className="w-4 h-4 text-muted-foreground" />
      </motion.div>
    </div>
  );
}

function ClientsIllustration() {
  return (
    <div className="relative w-32 h-32">
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-success/20 to-success/5 rounded-full"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <Users className="w-16 h-16 text-success/60" />
      </div>
      <motion.div
        className="absolute -bottom-2 -right-2 w-10 h-10 bg-success/20 rounded-full flex items-center justify-center"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <Plus className="w-5 h-5 text-success" />
      </motion.div>
    </div>
  );
}

function QuotesIllustration() {
  return (
    <div className="relative w-32 h-32">
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-warning/20 to-warning/5 rounded-full"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <FileText className="w-16 h-16 text-warning/60" />
      </div>
    </div>
  );
}

function OrdersIllustration() {
  return (
    <div className="relative w-32 h-32">
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-orange/20 to-orange/5 rounded-full"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <ShoppingCart className="w-16 h-16 text-orange/60" />
      </div>
    </div>
  );
}

function SearchIllustration() {
  return (
    <div className="relative w-32 h-32">
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-muted to-muted/50 rounded-full"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <Search className="w-16 h-16 text-muted-foreground/60" />
      </div>
      <motion.div
        className="absolute top-0 right-0 w-6 h-6 bg-background rounded-full border-2 border-muted-foreground/20 flex items-center justify-center"
        animate={{ rotate: [0, 15, -15, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <span className="text-xs">?</span>
      </motion.div>
    </div>
  );
}

function NotificationsIllustration() {
  return (
    <div className="relative w-32 h-32">
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <Bell className="w-16 h-16 text-primary/60" />
      </div>
      <motion.div
        className="absolute -top-1 -right-1"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        <div className="w-6 h-6 bg-success rounded-full flex items-center justify-center">
          <span className="text-xs text-success-foreground font-bold">✓</span>
        </div>
      </motion.div>
    </div>
  );
}

function CalendarIllustration() {
  return (
    <div className="relative w-32 h-32">
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-secondary/30 to-secondary/10 rounded-full"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <Calendar className="w-16 h-16 text-secondary-foreground/60" />
      </div>
    </div>
  );
}

function ReportsIllustration() {
  return (
    <div className="relative w-32 h-32">
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <BarChart3 className="w-16 h-16 text-primary/60" />
      </div>
    </div>
  );
}

function FoldersIllustration() {
  return (
    <div className="relative w-32 h-32">
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-warning/20 to-warning/5 rounded-full"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <FolderOpen className="w-16 h-16 text-warning/60" />
      </div>
    </div>
  );
}

function InboxIllustration() {
  return (
    <div className="relative w-32 h-32">
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-muted to-muted/50 rounded-full"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <Inbox className="w-16 h-16 text-muted-foreground/60" />
      </div>
    </div>
  );
}

function ImagesIllustration() {
  return (
    <div className="relative w-32 h-32">
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <Image className="w-16 h-16 text-primary/60" />
      </div>
    </div>
  );
}

function GenericIllustration() {
  return (
    <div className="relative w-32 h-32">
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-muted to-muted/50 rounded-full"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <FolderOpen className="w-16 h-16 text-muted-foreground/60" />
      </div>
    </div>
  );
}

/**
 * Quick empty state for loading errors
 */
interface ErrorEmptyStateProps {
  onRetry?: () => void;
  className?: string;
}

export function ErrorEmptyState({ onRetry, className }: ErrorEmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className
      )}
    >
      <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
        <span className="text-2xl">⚠️</span>
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        Algo deu errado
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        Não foi possível carregar os dados. Por favor, tente novamente.
      </p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Tentar novamente
        </Button>
      )}
    </motion.div>
  );
}

/**
 * Minimal empty state for inline use
 */
interface InlineEmptyStateProps {
  message: string;
  className?: string;
}

export function InlineEmptyState({ message, className }: InlineEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center py-8 text-sm text-muted-foreground",
        className
      )}
    >
      <Inbox className="w-4 h-4 mr-2 opacity-50" />
      {message}
    </div>
  );
}
