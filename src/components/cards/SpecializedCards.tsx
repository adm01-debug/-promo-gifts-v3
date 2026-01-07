import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  MoreVertical,
  ArrowUpRight,
  Clock,
  User,
  Calendar,
  MapPin,
  Package,
  Tag,
  Star,
  ExternalLink,
  Eye,
} from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// Stat Card
interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  loading?: boolean;
  onClick?: () => void;
}

export function StatCard({
  title,
  value,
  change,
  changeLabel,
  icon,
  trend = "neutral",
  loading = false,
  onClick,
}: StatCardProps) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : null;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={onClick ? { scale: 0.98 } : undefined}
    >
      <Card
        className={cn(
          "relative overflow-hidden transition-all",
          onClick && "cursor-pointer hover:border-primary/50"
        )}
        onClick={onClick}
      >
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{title}</p>
              {loading ? (
                <div className="h-8 w-24 bg-muted animate-pulse rounded" />
              ) : (
                <p className="text-2xl font-bold">{value}</p>
              )}
              {change !== undefined && (
                <div className="flex items-center gap-1">
                  {TrendIcon && (
                    <TrendIcon
                      className={cn(
                        "h-4 w-4",
                        trend === "up" && "text-green-500",
                        trend === "down" && "text-red-500"
                      )}
                    />
                  )}
                  <span
                    className={cn(
                      "text-sm font-medium",
                      trend === "up" && "text-green-500",
                      trend === "down" && "text-red-500",
                      trend === "neutral" && "text-muted-foreground"
                    )}
                  >
                    {change > 0 ? "+" : ""}
                    {change}%
                  </span>
                  {changeLabel && (
                    <span className="text-sm text-muted-foreground">
                      {changeLabel}
                    </span>
                  )}
                </div>
              )}
            </div>
            {icon && (
              <div className="p-3 rounded-full bg-primary/10 text-primary">
                {icon}
              </div>
            )}
          </div>
        </CardContent>

        {/* Decorative gradient */}
        <div
          className={cn(
            "absolute bottom-0 left-0 right-0 h-1",
            trend === "up" && "bg-gradient-to-r from-green-500/50 to-green-500",
            trend === "down" && "bg-gradient-to-r from-red-500/50 to-red-500",
            trend === "neutral" && "bg-gradient-to-r from-primary/50 to-primary"
          )}
        />
      </Card>
    </motion.div>
  );
}

// Task Card
interface TaskCardProps {
  title: string;
  description?: string;
  status: "todo" | "in_progress" | "completed";
  priority?: "low" | "medium" | "high";
  dueDate?: string;
  assignee?: {
    name: string;
    avatar?: string;
  };
  tags?: string[];
  progress?: number;
  onStatusChange?: (status: "todo" | "in_progress" | "completed") => void;
  onClick?: () => void;
}

export function TaskCard({
  title,
  description,
  status,
  priority = "medium",
  dueDate,
  assignee,
  tags,
  progress,
  onStatusChange,
  onClick,
}: TaskCardProps) {
  const statusLabels = {
    todo: "A Fazer",
    in_progress: "Em Progresso",
    completed: "Concluído",
  };

  const statusColors = {
    todo: "bg-muted text-muted-foreground",
    in_progress: "bg-blue-500/10 text-blue-600",
    completed: "bg-green-500/10 text-green-600",
  };

  const priorityColors = {
    low: "border-l-green-500",
    medium: "border-l-yellow-500",
    high: "border-l-red-500",
  };

  return (
    <motion.div
      whileHover={{ y: -2 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card
        className={cn(
          "border-l-4 cursor-pointer hover:shadow-md transition-all",
          priorityColors[priority]
        )}
        onClick={onClick}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium truncate">{title}</h4>
              {description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                  {description}
                </p>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onStatusChange?.("todo")}>
                  Mover para A Fazer
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onStatusChange?.("in_progress")}>
                  Mover para Em Progresso
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onStatusChange?.("completed")}>
                  Marcar como Concluído
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="pb-3 space-y-3">
          {progress !== undefined && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Progresso</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>
          )}

          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>

        <CardFooter className="pt-0 pb-3">
          <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Badge className={statusColors[status]}>{statusLabels[status]}</Badge>
            </div>
            <div className="flex items-center gap-3">
              {dueDate && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {dueDate}
                </span>
              )}
              {assignee && (
                <Avatar className="h-6 w-6">
                  <AvatarImage src={assignee.avatar} />
                  <AvatarFallback className="text-[10px]">
                    {assignee.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
}

// Client Card
interface ClientCardProps {
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
  company?: string;
  location?: string;
  status?: "active" | "inactive" | "pending";
  lastActivity?: string;
  totalOrders?: number;
  totalSpent?: number;
  tags?: string[];
  onClick?: () => void;
  onMessage?: () => void;
  onView?: () => void;
}

export function ClientCard({
  name,
  email,
  phone,
  avatar,
  company,
  location,
  status = "active",
  lastActivity,
  totalOrders,
  totalSpent,
  tags,
  onClick,
  onMessage,
  onView,
}: ClientCardProps) {
  const statusColors = {
    active: "bg-green-500",
    inactive: "bg-gray-400",
    pending: "bg-yellow-500",
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
      <Card
        className="hover:shadow-lg transition-all cursor-pointer"
        onClick={onClick}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="relative">
              <Avatar className="h-14 w-14">
                <AvatarImage src={avatar} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {getInitials(name)}
                </AvatarFallback>
              </Avatar>
              <span
                className={cn(
                  "absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-background",
                  statusColors[status]
                )}
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold truncate">{name}</h4>
                {tags && tags.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {tags[0]}
                  </Badge>
                )}
              </div>
              {company && (
                <p className="text-sm text-muted-foreground truncate">{company}</p>
              )}
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {location}
                  </span>
                )}
                {lastActivity && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {lastActivity}
                  </span>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="text-right shrink-0">
              {totalOrders !== undefined && (
                <p className="text-sm">
                  <span className="font-semibold">{totalOrders}</span>
                  <span className="text-muted-foreground ml-1">pedidos</span>
                </p>
              )}
              {totalSpent !== undefined && (
                <p className="text-lg font-bold text-primary">
                  R$ {totalSpent.toLocaleString("pt-BR")}
                </p>
              )}
            </div>
          </div>
        </CardContent>

        <CardFooter className="px-4 py-3 bg-muted/30 gap-2">
          {onMessage && (
            <Button variant="outline" size="sm" className="flex-1" onClick={(e) => { e.stopPropagation(); onMessage(); }}>
              Mensagem
            </Button>
          )}
          {onView && (
            <Button variant="default" size="sm" className="flex-1" onClick={(e) => { e.stopPropagation(); onView(); }}>
              <Eye className="h-4 w-4 mr-1" />
              Ver Detalhes
            </Button>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  );
}

// Quote Card
interface QuoteCardProps {
  quoteNumber: string;
  clientName: string;
  status: "draft" | "sent" | "approved" | "rejected" | "expired";
  total: number;
  itemsCount: number;
  createdAt: string;
  validUntil?: string;
  onClick?: () => void;
  onApprove?: () => void;
  onSend?: () => void;
}

export function QuoteCard({
  quoteNumber,
  clientName,
  status,
  total,
  itemsCount,
  createdAt,
  validUntil,
  onClick,
  onApprove,
  onSend,
}: QuoteCardProps) {
  const statusConfig = {
    draft: { label: "Rascunho", color: "bg-gray-500/10 text-gray-600" },
    sent: { label: "Enviado", color: "bg-blue-500/10 text-blue-600" },
    approved: { label: "Aprovado", color: "bg-green-500/10 text-green-600" },
    rejected: { label: "Rejeitado", color: "bg-red-500/10 text-red-600" },
    expired: { label: "Expirado", color: "bg-yellow-500/10 text-yellow-600" },
  };

  return (
    <motion.div
      whileHover={{ y: -2 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card
        className="hover:shadow-md transition-all cursor-pointer"
        onClick={onClick}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-semibold">{quoteNumber}</h4>
                <Badge className={statusConfig[status].color}>
                  {statusConfig[status].label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{clientName}</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold">
                R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground">
                {itemsCount} {itemsCount === 1 ? "item" : "itens"}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Criado: {createdAt}
            </span>
            {validUntil && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Válido até: {validUntil}
              </span>
            )}
          </div>
        </CardContent>

        {(status === "draft" || status === "sent") && (onApprove || onSend) && (
          <CardFooter className="px-4 py-3 bg-muted/30 gap-2">
            {status === "draft" && onSend && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={(e) => { e.stopPropagation(); onSend(); }}
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Enviar
              </Button>
            )}
            {status === "sent" && onApprove && (
              <Button
                variant="default"
                size="sm"
                className="flex-1"
                onClick={(e) => { e.stopPropagation(); onApprove(); }}
              >
                Aprovar
              </Button>
            )}
          </CardFooter>
        )}
      </Card>
    </motion.div>
  );
}
