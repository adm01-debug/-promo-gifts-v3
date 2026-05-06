import React, { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  Package,
  FileText,
  Users,
  Search,
  FolderOpen,
  Heart,
  ShoppingCart,
  Bell,
  TrendingUp,
  Inbox,
  Plus,
  ShieldAlert,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type EmptyStateVariant =
  | 'products'
  | 'quotes'
  | 'orders'
  | 'clients'
  | 'search'
  | 'collections'
  | 'favorites'
  | 'cart'
  | 'notifications'
  | 'analytics'
  | 'error'
  | 'security'
  | 'generic';

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  children?: ReactNode;
}

const variants: Record<
  EmptyStateVariant,
  {
    icon: typeof Package;
    title: string;
    description: string;
    color: string;
  }
> = {
  products: {
    icon: Package,
    title: 'Nenhum produto encontrado',
    description: 'Não encontramos produtos com os filtros selecionados. Tente ajustar sua busca.',
    color: 'text-primary',
  },
  quotes: {
    icon: FileText,
    title: 'Nenhum orçamento ainda',
    description: 'Comece criando seu primeiro orçamento para um cliente.',
    color: 'text-primary',
  },
  orders: {
    icon: ShoppingCart,
    title: 'Nenhum pedido encontrado',
    description: 'Os pedidos aparecerão aqui quando os orçamentos forem aprovados.',
    color: 'text-orange',
  },
  clients: {
    icon: Users,
    title: 'Nenhum cliente cadastrado',
    description: 'Adicione clientes para começar a criar orçamentos personalizados.',
    color: 'text-primary',
  },
  search: {
    icon: Search,
    title: 'Sem resultados',
    description: 'Não encontramos nada para sua busca. Tente termos diferentes.',
    color: 'text-muted-foreground',
  },
  collections: {
    icon: FolderOpen,
    title: 'Nenhuma coleção criada',
    description: 'Organize seus produtos favoritos em coleções personalizadas.',
    color: 'text-warning',
  },
  favorites: {
    icon: Heart,
    title: 'Nenhum favorito ainda',
    description: 'Marque produtos como favoritos para acessá-los rapidamente.',
    color: 'text-destructive',
  },
  cart: {
    icon: ShoppingCart,
    title: 'Carrinho vazio',
    description: 'Adicione produtos ao carrinho para criar um orçamento.',
    color: 'text-primary',
  },
  notifications: {
    icon: Bell,
    title: 'Nenhuma notificação',
    description: 'Você está em dia! Novas notificações aparecerão aqui.',
    color: 'text-primary',
  },
  analytics: {
    icon: TrendingUp,
    title: 'Sem dados disponíveis',
    description: 'Os dados analíticos aparecerão quando houver atividade.',
    color: 'text-success',
  },
  error: {
    icon: AlertCircle,
    title: 'Ocorreu um erro',
    description: 'Não foi possível carregar os dados. Tente novamente em instantes.',
    color: 'text-destructive',
  },
  security: {
    icon: ShieldAlert,
    title: 'Acesso restrito',
    description: 'Você não tem permissão para visualizar este conteúdo.',
    color: 'text-warning',
  },
  generic: {
    icon: Inbox,
    title: 'Nada por aqui',
    description: 'Não há itens para exibir no momento.',
    color: 'text-muted-foreground',
  },
};

export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(function EmptyState(
  { variant = 'generic', title, description, action, secondaryAction, className, children },
  ref,
) {
  const config = variants[variant];
  const Icon = config.icon;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}
    >
      {/* Animated Icon Container */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{
          type: 'spring',
          stiffness: 200,
          damping: 15,
          delay: 0.1,
        }}
        className="relative mb-6"
      >
        {/* Background circles */}
        <div className="absolute inset-0 -m-4">
          <div className="absolute inset-0 animate-pulse rounded-full bg-muted/50" />
          <div className="absolute inset-2 rounded-full bg-muted/30" />
        </div>

        {/* Icon */}
        <div
          className={cn(
            'relative z-10 rounded-xl bg-gradient-subtle p-6',
            'border border-border shadow-sm',
          )}
        >
          <Icon className={cn('h-12 w-12', config.color)} strokeWidth={1.5} />
        </div>
      </motion.div>

      {/* Text content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="max-w-md space-y-2"
      >
        <h3 className="font-display text-lg font-semibold text-foreground">
          {title || config.title}
        </h3>
        <p className="text-muted-foreground">{description || config.description}</p>
      </motion.div>

      {/* Actions */}
      {(action || secondaryAction) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 flex flex-wrap gap-3"
        >
          {action && (
            <Button onClick={action.onClick} className="gap-2">
              <Plus className="h-4 w-4" />
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </motion.div>
      )}

      {/* Custom content */}
      {children && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-6"
        >
          {children}
        </motion.div>
      )}
    </motion.div>
  );
});

// Compact version for inline use
export function InlineEmptyState({
  message,
  icon: Icon = Inbox,
  className,
}: {
  message: string;
  icon?: typeof Inbox;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl bg-muted/30 px-4 py-4',
        'text-sm text-muted-foreground',
        className,
      )}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}
