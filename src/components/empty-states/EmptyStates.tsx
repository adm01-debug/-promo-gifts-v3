/**
 * Empty States Components
 * Contextual empty states with actions
 */

import { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Search,
  Inbox,
  FolderOpen,
  Users,
  ShoppingCart,
  Calendar,
  Bell,
  Image,
  MessageSquare,
  Package,
  TrendingUp,
  Settings,
  Bookmark,
  History,
  Star,
  Filter,
  Database,
  Wifi,
  WifiOff,
  AlertCircle,
  Lock,
  Plus,
} from "lucide-react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
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
  size?: "sm" | "md" | "lg";
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  size = "md",
}: EmptyStateProps) {
  const sizeClasses = {
    sm: "py-8",
    md: "py-12",
    lg: "py-20",
  };

  const iconSizes = {
    sm: "h-10 w-10",
    md: "h-16 w-16",
    lg: "h-24 w-24",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex flex-col items-center justify-center text-center",
        sizeClasses[size],
        className
      )}
    >
      {icon && (
        <div
          className={cn(
            "rounded-full bg-muted p-4 mb-4",
            iconSizes[size]
          )}
        >
          <div className="h-full w-full text-muted-foreground">
            {icon}
          </div>
        </div>
      )}

      <h3 className={cn(
        "font-semibold text-foreground",
        size === "sm" ? "text-base" : size === "lg" ? "text-xl" : "text-lg"
      )}>
        {title}
      </h3>

      {description && (
        <p className={cn(
          "text-muted-foreground mt-2 max-w-sm",
          size === "sm" ? "text-sm" : "text-base"
        )}>
          {description}
        </p>
      )}

      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
          {action && (
            <Button onClick={action.onClick} className="gap-2">
              {action.icon || <Plus className="h-4 w-4" />}
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </motion.div>
  );
}

// Preset Empty States
export function EmptySearchResults({
  query,
  onClear,
  onAdjustFilters,
}: {
  query?: string;
  onClear?: () => void;
  onAdjustFilters?: () => void;
}) {
  return (
    <EmptyState
      icon={<Search className="h-full w-full" />}
      title={query ? `Nenhum resultado para "${query}"` : "Nenhum resultado encontrado"}
      description="Tente ajustar seus filtros ou buscar por outros termos"
      action={onClear ? { label: "Limpar busca", onClick: onClear } : undefined}
      secondaryAction={onAdjustFilters ? { label: "Ajustar filtros", onClick: onAdjustFilters } : undefined}
    />
  );
}

export function EmptyInbox({ onCreate }: { onCreate?: () => void }) {
  return (
    <EmptyState
      icon={<Inbox className="h-full w-full" />}
      title="Caixa de entrada vazia"
      description="Você não tem novas mensagens ou notificações"
      action={onCreate ? { label: "Explorar", onClick: onCreate } : undefined}
    />
  );
}

export function EmptyFolder({ onCreate }: { onCreate?: () => void }) {
  return (
    <EmptyState
      icon={<FolderOpen className="h-full w-full" />}
      title="Pasta vazia"
      description="Esta pasta não contém nenhum arquivo ou documento"
      action={onCreate ? { label: "Adicionar arquivo", onClick: onCreate } : undefined}
    />
  );
}

export function EmptyUsers({ onInvite }: { onInvite?: () => void }) {
  return (
    <EmptyState
      icon={<Users className="h-full w-full" />}
      title="Nenhum usuário encontrado"
      description="Convide pessoas para colaborar com você"
      action={onInvite ? { label: "Convidar usuário", onClick: onInvite } : undefined}
    />
  );
}

export function EmptyCart({ onBrowse }: { onBrowse?: () => void }) {
  return (
    <EmptyState
      icon={<ShoppingCart className="h-full w-full" />}
      title="Carrinho vazio"
      description="Adicione itens ao seu carrinho para continuar"
      action={onBrowse ? { label: "Ver produtos", onClick: onBrowse } : undefined}
    />
  );
}

export function EmptyCalendar({ onCreate }: { onCreate?: () => void }) {
  return (
    <EmptyState
      icon={<Calendar className="h-full w-full" />}
      title="Nenhum evento"
      description="Você não tem eventos agendados para este período"
      action={onCreate ? { label: "Criar evento", onClick: onCreate } : undefined}
    />
  );
}

export function EmptyNotifications() {
  return (
    <EmptyState
      icon={<Bell className="h-full w-full" />}
      title="Sem notificações"
      description="Você está em dia! Não há novas notificações"
      size="sm"
    />
  );
}

export function EmptyImages({ onUpload }: { onUpload?: () => void }) {
  return (
    <EmptyState
      icon={<Image className="h-full w-full" />}
      title="Nenhuma imagem"
      description="Faça upload de imagens para começar"
      action={onUpload ? { label: "Fazer upload", onClick: onUpload, icon: <Plus className="h-4 w-4" /> } : undefined}
    />
  );
}

export function EmptyComments({ onComment }: { onComment?: () => void }) {
  return (
    <EmptyState
      icon={<MessageSquare className="h-full w-full" />}
      title="Sem comentários"
      description="Seja o primeiro a comentar"
      action={onComment ? { label: "Adicionar comentário", onClick: onComment } : undefined}
      size="sm"
    />
  );
}

export function EmptyProducts({ onCreate }: { onCreate?: () => void }) {
  return (
    <EmptyState
      icon={<Package className="h-full w-full" />}
      title="Nenhum produto"
      description="Cadastre produtos para começar a vender"
      action={onCreate ? { label: "Cadastrar produto", onClick: onCreate, icon: <Plus className="h-4 w-4" /> } : undefined}
    />
  );
}

export function EmptyData({ onCreate }: { onCreate?: () => void }) {
  return (
    <EmptyState
      icon={<Database className="h-full w-full" />}
      title="Sem dados"
      description="Nenhum dado disponível para exibir"
      action={onCreate ? { label: "Adicionar dados", onClick: onCreate } : undefined}
    />
  );
}

export function EmptyCharts() {
  return (
    <EmptyState
      icon={<TrendingUp className="h-full w-full" />}
      title="Dados insuficientes"
      description="Não há dados suficientes para gerar o gráfico"
      size="sm"
    />
  );
}

export function EmptyFavorites({ onBrowse }: { onBrowse?: () => void }) {
  return (
    <EmptyState
      icon={<Star className="h-full w-full" />}
      title="Sem favoritos"
      description="Adicione itens aos favoritos para acesso rápido"
      action={onBrowse ? { label: "Explorar", onClick: onBrowse } : undefined}
    />
  );
}

export function EmptyBookmarks({ onBrowse }: { onBrowse?: () => void }) {
  return (
    <EmptyState
      icon={<Bookmark className="h-full w-full" />}
      title="Sem marcadores"
      description="Salve itens para ver mais tarde"
      action={onBrowse ? { label: "Explorar conteúdo", onClick: onBrowse } : undefined}
    />
  );
}

export function EmptyHistory({ onAction }: { onAction?: () => void }) {
  return (
    <EmptyState
      icon={<History className="h-full w-full" />}
      title="Sem histórico"
      description="Suas atividades recentes aparecerão aqui"
      action={onAction ? { label: "Ver atividades", onClick: onAction } : undefined}
      size="sm"
    />
  );
}

export function EmptyFiltered({ onClear }: { onClear?: () => void }) {
  return (
    <EmptyState
      icon={<Filter className="h-full w-full" />}
      title="Nenhum item corresponde aos filtros"
      description="Tente remover alguns filtros para ver mais resultados"
      action={onClear ? { label: "Limpar filtros", onClick: onClear } : undefined}
    />
  );
}

// Error States
export function OfflineState({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      icon={<WifiOff className="h-full w-full" />}
      title="Sem conexão"
      description="Verifique sua conexão com a internet e tente novamente"
      action={onRetry ? { label: "Tentar novamente", onClick: onRetry } : undefined}
    />
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      icon={<AlertCircle className="h-full w-full" />}
      title="Algo deu errado"
      description={message || "Ocorreu um erro ao carregar os dados"}
      action={onRetry ? { label: "Tentar novamente", onClick: onRetry } : undefined}
    />
  );
}

export function NoAccessState({ onRequest }: { onRequest?: () => void }) {
  return (
    <EmptyState
      icon={<Lock className="h-full w-full" />}
      title="Acesso restrito"
      description="Você não tem permissão para visualizar este conteúdo"
      action={onRequest ? { label: "Solicitar acesso", onClick: onRequest } : undefined}
    />
  );
}

// Illustrated Empty State (with custom illustration support)
export function IllustratedEmptyState({
  illustration,
  title,
  description,
  action,
  className,
}: {
  illustration: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "flex flex-col items-center justify-center text-center py-16",
        className
      )}
    >
      <div className="mb-6 w-48 h-48">{illustration}</div>
      <h3 className="text-xl font-semibold">{title}</h3>
      {description && (
        <p className="text-muted-foreground mt-2 max-w-md">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick} className="mt-6">
          {action.label}
        </Button>
      )}
    </motion.div>
  );
}

// Compact Empty State for inline use
export function InlineEmptyState({
  icon,
  message,
  action,
  className,
}: {
  icon?: ReactNode;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-center gap-4 py-6", className)}>
      {icon && <div className="text-muted-foreground">{icon}</div>}
      <span className="text-sm text-muted-foreground">{message}</span>
      {action && (
        <Button variant="link" size="sm" onClick={action.onClick} className="h-auto p-0">
          {action.label}
        </Button>
      )}
    </div>
  );
}
