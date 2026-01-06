import { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LucideIcon, Package, Search, FileText, Users, ShoppingBag, PackageOpen } from "lucide-react";

type EmptyStateSize = 'sm' | 'md' | 'lg';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  icon?: ReactNode;
  IconComponent?: LucideIcon;
  size?: EmptyStateSize;
  image?: string;
  illustration?: "products" | "search" | "documents" | "users" | "orders" | "custom";
  animated?: boolean;
  onAction?: () => void;
  actionLabel?: string;
  onSecondaryAction?: () => void;
  secondaryActionLabel?: string;
  className?: string;
}

const sizeConfig = {
  sm: {
    container: 'py-8 px-4',
    iconContainer: 'p-4 w-20 h-20',
    iconSize: 'h-10 w-10',
    title: 'text-base',
    description: 'text-sm',
  },
  md: {
    container: 'py-12 px-6',
    iconContainer: 'p-6 w-28 h-28',
    iconSize: 'h-14 w-14',
    title: 'text-lg',
    description: 'text-sm',
  },
  lg: {
    container: 'py-16 px-8',
    iconContainer: 'p-8 w-36 h-36',
    iconSize: 'h-20 w-20',
    title: 'text-xl',
    description: 'text-base',
  },
} as const;

const illustrations: Record<string, LucideIcon> = {
  products: Package,
  search: Search,
  documents: FileText,
  users: Users,
  orders: ShoppingBag,
};

export function EmptyState({ 
  title, 
  description,
  action,
  secondaryAction,
  icon,
  IconComponent,
  size = 'md',
  image,
  illustration = "products",
  animated = true,
  onAction,
  actionLabel,
  onSecondaryAction,
  secondaryActionLabel,
  className,
}: EmptyStateProps) {
  const config = sizeConfig[size];
  const IllustrationIcon = illustrations[illustration] || Package;
  const Icon = IconComponent || IllustrationIcon;

  const content = (
    <>
      {image ? (
        <img 
          src={image} 
          alt={title}
          className="mb-4 max-w-xs opacity-50"
        />
      ) : (
        <div className={cn(
          "relative flex items-center justify-center rounded-full",
          "bg-gradient-to-br from-muted/80 to-muted",
          "shadow-inner mb-6",
          config.iconContainer
        )}>
          {/* Pulsing ring effect */}
          {animated && (
            <motion.div
              className="absolute inset-0 rounded-full bg-primary/10"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0, 0.3],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          )}
          {icon || <Icon className={cn("text-muted-foreground/60", config.iconSize)} strokeWidth={1.5} />}
        </div>
      )}
      
      <h3 className={cn("font-semibold text-foreground mb-2", config.title)}>{title}</h3>
      
      {description && (
        <p className={cn("text-muted-foreground max-w-sm", config.description)}>
          {description}
        </p>
      )}
      
      {/* Actions */}
      {(action || secondaryAction || onAction || onSecondaryAction) && (
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          {action && <div>{action}</div>}
          {onAction && actionLabel && (
            <Button onClick={onAction} className="min-w-[140px]">
              {actionLabel}
            </Button>
          )}
          {secondaryAction && <div>{secondaryAction}</div>}
          {onSecondaryAction && secondaryActionLabel && (
            <Button onClick={onSecondaryAction} variant="ghost" className="min-w-[140px]">
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </>
  );

  if (animated) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className={cn(
          "flex flex-col items-center justify-center text-center",
          config.container,
          className
        )}
      >
        {content}
      </motion.div>
    );
  }

  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center",
      config.container,
      className
    )}>
      {content}
    </div>
  );
}

// Preset variants for common use cases
export function ProductsEmptyState({ onAddProduct }: { onAddProduct?: () => void }) {
  return (
    <EmptyState
      illustration="products"
      title="Nenhum produto encontrado"
      description="Tente ajustar os filtros ou adicione novos produtos ao catálogo."
      onAction={onAddProduct}
      actionLabel={onAddProduct ? "Adicionar Produto" : undefined}
    />
  );
}

export function SearchEmptyState({ query, onClear }: { query?: string; onClear?: () => void }) {
  return (
    <EmptyState
      illustration="search"
      title={query ? `Nenhum resultado para "${query}"` : "Nenhum resultado encontrado"}
      description="Tente usar termos diferentes ou verifique a ortografia."
      onAction={onClear}
      actionLabel={onClear ? "Limpar Busca" : undefined}
    />
  );
}

export function QuotesEmptyState({ onCreateQuote }: { onCreateQuote?: () => void }) {
  return (
    <EmptyState
      illustration="documents"
      title="Nenhum orçamento encontrado"
      description="Crie seu primeiro orçamento para começar a vender!"
      onAction={onCreateQuote}
      actionLabel={onCreateQuote ? "Criar Orçamento" : undefined}
    />
  );
}

export function OrdersEmptyState() {
  return (
    <EmptyState
      illustration="orders"
      title="Nenhum pedido encontrado"
      description="Quando você fizer vendas, os pedidos aparecerão aqui."
    />
  );
}

export function ClientsEmptyState({ onAddClient }: { onAddClient?: () => void }) {
  return (
    <EmptyState
      illustration="users"
      title="Nenhum cliente encontrado"
      description="Adicione clientes para gerenciar seus relacionamentos comerciais."
      onAction={onAddClient}
      actionLabel={onAddClient ? "Adicionar Cliente" : undefined}
    />
  );
}
