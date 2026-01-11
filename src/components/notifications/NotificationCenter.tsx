import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Eye,
  AlertTriangle,
  FileCheck,
  FileX,
  X,
  Filter,
  Settings,
  ExternalLink,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useNotifications, Notification } from "@/hooks/useNotifications";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

const NOTIFICATION_CONFIG: Record<
  string,
  { icon: React.ElementType; color: string; actionLabel?: string; route?: string }
> = {
  quote_viewed: {
    icon: Eye,
    color: "text-blue-500 bg-blue-500/10",
    actionLabel: "Ver orçamento",
    route: "/quotes",
  },
  low_stock: {
    icon: AlertTriangle,
    color: "text-amber-500 bg-amber-500/10",
    actionLabel: "Ver estoque",
    route: "/inventory",
  },
  quote_approved: {
    icon: FileCheck,
    color: "text-green-500 bg-green-500/10",
    actionLabel: "Ver orçamento",
    route: "/quotes",
  },
  quote_rejected: {
    icon: FileX,
    color: "text-red-500 bg-red-500/10",
    actionLabel: "Ver orçamento",
    route: "/quotes",
  },
  default: {
    icon: Bell,
    color: "text-muted-foreground bg-muted",
  },
};

interface EnhancedNotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  onAction?: (notification: Notification) => void;
}

function EnhancedNotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
  onAction,
}: EnhancedNotificationItemProps) {
  const config = NOTIFICATION_CONFIG[notification.type] || NOTIFICATION_CONFIG.default;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      layout
      className={cn(
        "group relative p-4 hover:bg-muted/50 transition-all rounded-lg mx-2 my-1",
        !notification.is_read && "bg-primary/5 border-l-2 border-primary"
      )}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div className={cn("p-2 rounded-lg shrink-0 h-fit", config.color)}>
          <Icon className="h-4 w-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <p
              className={cn(
                "text-sm leading-tight",
                !notification.is_read && "font-semibold"
              )}
            >
              {notification.title}
            </p>
            {!notification.is_read && (
              <span className="flex h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
            )}
          </div>

          <p className="text-xs text-muted-foreground line-clamp-2">
            {notification.message}
          </p>

          <div className="flex items-center gap-3 pt-1">
            <span className="text-[10px] text-muted-foreground/70 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(notification.created_at), {
                addSuffix: true,
                locale: ptBR,
              })}
            </span>

            {config.actionLabel && (
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs text-primary"
                onClick={() => onAction?.(notification)}
              >
                {config.actionLabel}
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!notification.is_read && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onMarkAsRead(notification.id)}
              title="Marcar como lida"
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(notification.id)}
            title="Excluir"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

export function NotificationCenter() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  } = useNotifications();

  const filteredNotifications =
    activeTab === "unread"
      ? notifications.filter((n) => !n.is_read)
      : notifications;

  const handleAction = (notification: Notification) => {
    const config = NOTIFICATION_CONFIG[notification.type];
    if (config?.route) {
      markAsRead(notification.id);
      setOpen(false);
      navigate(config.route);
    }
  };

  const groupedByDate = filteredNotifications.reduce((acc, notification) => {
    const date = format(new Date(notification.created_at), "yyyy-MM-dd");
    const label =
      date === format(new Date(), "yyyy-MM-dd")
        ? "Hoje"
        : date === format(new Date(Date.now() - 86400000), "yyyy-MM-dd")
        ? "Ontem"
        : format(new Date(notification.created_at), "dd 'de' MMMM", { locale: ptBR });

    if (!acc[label]) acc[label] = [];
    acc[label].push(notification);
    return acc;
  }, {} as Record<string, Notification[]>);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 min-w-5 px-1.5 flex items-center justify-center text-xs"
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </SheetTrigger>

      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notificações
              {unreadCount > 0 && (
                <Badge variant="secondary">{unreadCount} novas</Badge>
              )}
            </SheetTitle>
          </div>
        </SheetHeader>

        {/* Tabs */}
        <div className="border-b px-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="all">Todas</TabsTrigger>
              <TabsTrigger value="unread" className="gap-1">
                Não lidas
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                    {unreadCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Actions bar */}
        {filteredNotifications.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2 bg-muted/30">
            {unreadCount > 0 && activeTab !== "unread" && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={markAllAsRead}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Marcar todas como lidas
              </Button>
            )}
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground"
              onClick={clearAll}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Limpar
            </Button>
          </div>
        )}

        {/* Content */}
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-16 text-center px-4"
            >
              <div className="p-4 rounded-full bg-muted mb-4">
                <Bell className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium">
                {activeTab === "unread"
                  ? "Todas as notificações foram lidas!"
                  : "Nenhuma notificação"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Você será notificado sobre eventos importantes
              </p>
            </motion.div>
          ) : (
            <div className="py-2">
              <AnimatePresence mode="popLayout">
                {Object.entries(groupedByDate).map(([date, items]) => (
                  <div key={date}>
                    <p className="text-xs font-medium text-muted-foreground px-4 py-2 sticky top-0 bg-background/95 backdrop-blur">
                      {date}
                    </p>
                    {items.map((notification) => (
                      <EnhancedNotificationItem
                        key={notification.id}
                        notification={notification}
                        onMarkAsRead={markAsRead}
                        onDelete={deleteNotification}
                        onAction={handleAction}
                      />
                    ))}
                  </div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
