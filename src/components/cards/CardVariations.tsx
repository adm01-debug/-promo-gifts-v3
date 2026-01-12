/**
 * Card Variations
 * Multiple card styles for different contexts
 */

import { ReactNode, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MoreVertical,
  ChevronRight,
  ExternalLink,
  Heart,
  Bookmark,
  Share2,
  Star,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Check,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Base Card
interface BaseCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
  selected?: boolean;
}

export function BaseCard({
  children,
  className,
  onClick,
  hoverable = false,
  selected = false,
}: BaseCardProps) {
  return (
    <motion.div
      whileHover={hoverable ? { y: -2, scale: 1.01 } : undefined}
      whileTap={onClick ? { scale: 0.99 } : undefined}
      className={cn(
        "rounded-lg border bg-card text-card-foreground",
        hoverable && "transition-shadow hover:shadow-md cursor-pointer",
        selected && "ring-2 ring-primary",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}

// Stats Card
interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: ReactNode;
  trend?: "up" | "down" | "neutral";
  variant?: "default" | "gradient" | "outlined";
  className?: string;
}

export function StatsCard({
  title,
  value,
  change,
  changeLabel,
  icon,
  trend,
  variant = "default",
  className,
}: StatsCardProps) {
  const variantClasses = {
    default: "bg-card",
    gradient: "bg-gradient-to-br from-primary/10 to-primary/5",
    outlined: "bg-transparent border-2",
  };

  return (
    <BaseCard className={cn(variantClasses[variant], className)} hoverable>
      <div className="p-6">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
          {icon && <div className="text-muted-foreground">{icon}</div>}
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-bold">{value}</span>
          {change !== undefined && (
            <span
              className={cn(
                "flex items-center text-sm font-medium",
                trend === "up" && "text-green-500",
                trend === "down" && "text-red-500"
              )}
            >
              {trend === "up" && <TrendingUp className="h-4 w-4 mr-0.5" />}
              {trend === "down" && <TrendingDown className="h-4 w-4 mr-0.5" />}
              {change > 0 ? "+" : ""}
              {change}%
            </span>
          )}
        </div>
        {changeLabel && (
          <p className="mt-1 text-xs text-muted-foreground">{changeLabel}</p>
        )}
      </div>
    </BaseCard>
  );
}

// Feature Card
interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  variant?: "default" | "centered" | "horizontal";
  className?: string;
}

export function FeatureCard({
  icon,
  title,
  description,
  action,
  variant = "default",
  className,
}: FeatureCardProps) {
  if (variant === "horizontal") {
    return (
      <BaseCard className={className} hoverable>
        <div className="flex items-center gap-4 p-4">
          <div className="flex-shrink-0 h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{title}</h3>
            <p className="text-sm text-muted-foreground truncate">{description}</p>
          </div>
          {action && (
            <Button variant="ghost" size="icon" onClick={action.onClick}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          )}
        </div>
      </BaseCard>
    );
  }

  return (
    <BaseCard className={className} hoverable>
      <div
        className={cn(
          "p-6",
          variant === "centered" && "text-center"
        )}
      >
        <div
          className={cn(
            "h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4",
            variant === "centered" && "mx-auto"
          )}
        >
          {icon}
        </div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        {action && (
          <Button variant="link" className="mt-4 p-0 h-auto" onClick={action.onClick}>
            {action.label}
            <ArrowUpRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </BaseCard>
  );
}

// Product Card
interface ProductCardProps {
  image: string;
  title: string;
  description?: string;
  price: number;
  originalPrice?: number;
  rating?: number;
  badge?: string;
  onAddToCart?: () => void;
  onFavorite?: () => void;
  isFavorite?: boolean;
  className?: string;
}

export function ProductCard({
  image,
  title,
  description,
  price,
  originalPrice,
  rating,
  badge,
  onAddToCart,
  onFavorite,
  isFavorite = false,
  className,
}: ProductCardProps) {
  return (
    <BaseCard className={cn("overflow-hidden", className)} hoverable>
      <div className="relative aspect-square">
        <img src={image} alt={title} className="w-full h-full object-cover" />
        {badge && (
          <Badge className="absolute top-2 left-2" variant="secondary">
            {badge}
          </Badge>
        )}
        {onFavorite && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFavorite();
            }}
            className="absolute top-2 right-2 p-2 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors"
          >
            <Heart
              className={cn(
                "h-4 w-4",
                isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground"
              )}
            />
          </button>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold truncate">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground truncate mt-1">{description}</p>
        )}
        {rating && (
          <div className="flex items-center gap-1 mt-2">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-medium">{rating}</span>
          </div>
        )}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold">
              R$ {price.toFixed(2)}
            </span>
            {originalPrice && (
              <span className="text-sm text-muted-foreground line-through">
                R$ {originalPrice.toFixed(2)}
              </span>
            )}
          </div>
          {onAddToCart && (
            <Button size="sm" onClick={onAddToCart}>
              Adicionar
            </Button>
          )}
        </div>
      </div>
    </BaseCard>
  );
}

// User Card
interface UserCardProps {
  avatar: string;
  name: string;
  role?: string;
  email?: string;
  status?: "online" | "offline" | "busy";
  actions?: { label: string; onClick: () => void }[];
  className?: string;
}

export function UserCard({
  avatar,
  name,
  role,
  email,
  status,
  actions,
  className,
}: UserCardProps) {
  const statusColors = {
    online: "bg-green-500",
    offline: "bg-gray-400",
    busy: "bg-red-500",
  };

  return (
    <BaseCard className={className} hoverable>
      <div className="p-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img
              src={avatar}
              alt={name}
              className="h-12 w-12 rounded-full object-cover"
            />
            {status && (
              <span
                className={cn(
                  "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background",
                  statusColors[status]
                )}
              />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{name}</h3>
            {role && <p className="text-sm text-muted-foreground">{role}</p>}
            {email && (
              <p className="text-xs text-muted-foreground truncate">{email}</p>
            )}
          </div>
          {actions && actions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {actions.map((action, i) => (
                  <DropdownMenuItem key={i} onClick={action.onClick}>
                    {action.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </BaseCard>
  );
}

// Action Card (with hover reveal)
interface ActionCardProps {
  title: string;
  description?: string;
  image?: string;
  actions: { icon: ReactNode; label: string; onClick: () => void }[];
  className?: string;
}

export function ActionCard({
  title,
  description,
  image,
  actions,
  className,
}: ActionCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <BaseCard
      className={cn("relative overflow-hidden", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {image && (
        <div className="aspect-video">
          <img src={image} alt={title} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-4">
        <h3 className="font-semibold">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>

      {/* Hover Overlay */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/95 flex items-center justify-center gap-4"
          >
            {actions.map((action, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.05 }}
              >
                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 rounded-full"
                  onClick={action.onClick}
                >
                  {action.icon}
                </Button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </BaseCard>
  );
}

// Pricing Card
interface PricingCardProps {
  name: string;
  price: number;
  period?: string;
  description?: string;
  features: { text: string; included: boolean }[];
  popular?: boolean;
  onSelect: () => void;
  buttonLabel?: string;
  className?: string;
}

export function PricingCard({
  name,
  price,
  period = "/mês",
  description,
  features,
  popular = false,
  onSelect,
  buttonLabel = "Começar agora",
  className,
}: PricingCardProps) {
  return (
    <BaseCard
      className={cn(
        "relative",
        popular && "border-primary shadow-lg",
        className
      )}
    >
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge>Mais popular</Badge>
        </div>
      )}
      <div className="p-6">
        <h3 className="text-lg font-semibold">{name}</h3>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
        <div className="mt-4">
          <span className="text-4xl font-bold">R$ {price}</span>
          <span className="text-muted-foreground">{period}</span>
        </div>
        <ul className="mt-6 space-y-3">
          {features.map((feature, i) => (
            <li key={i} className="flex items-center gap-2">
              {feature.included ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <X className="h-4 w-4 text-muted-foreground" />
              )}
              <span
                className={cn(
                  "text-sm",
                  !feature.included && "text-muted-foreground"
                )}
              >
                {feature.text}
              </span>
            </li>
          ))}
        </ul>
        <Button
          className="w-full mt-6"
          variant={popular ? "default" : "outline"}
          onClick={onSelect}
        >
          {buttonLabel}
        </Button>
      </div>
    </BaseCard>
  );
}

// Notification Card
interface NotificationCardProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  time?: string;
  isRead?: boolean;
  onRead?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function NotificationCard({
  icon,
  title,
  description,
  time,
  isRead = false,
  onRead,
  onDismiss,
  className,
}: NotificationCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={cn(
        "flex items-start gap-3 p-4 rounded-lg border transition-colors",
        !isRead && "bg-primary/5 border-primary/20",
        className
      )}
    >
      {icon && (
        <div className="flex-shrink-0 mt-0.5 text-muted-foreground">{icon}</div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn("text-sm", !isRead && "font-medium")}>{title}</p>
          {!isRead && (
            <span className="flex-shrink-0 h-2 w-2 rounded-full bg-primary" />
          )}
        </div>
        {description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {description}
          </p>
        )}
        {time && (
          <p className="text-xs text-muted-foreground mt-2">{time}</p>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {!isRead && onRead && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRead}>
            <Check className="h-4 w-4" />
          </Button>
        )}
        {onDismiss && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDismiss}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </motion.div>
  );
}

// Selectable Card
interface SelectableCardProps {
  children: ReactNode;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  className?: string;
}

export function SelectableCard({
  children,
  selected,
  onSelect,
  disabled = false,
  className,
}: SelectableCardProps) {
  return (
    <motion.div
      whileTap={!disabled ? { scale: 0.98 } : undefined}
      onClick={!disabled ? onSelect : undefined}
      className={cn(
        "relative rounded-lg border p-4 cursor-pointer transition-all",
        selected
          ? "border-primary bg-primary/5 ring-2 ring-primary"
          : "hover:border-primary/50",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center"
        >
          <Check className="h-3 w-3 text-primary-foreground" />
        </motion.div>
      )}
      {children}
    </motion.div>
  );
}
