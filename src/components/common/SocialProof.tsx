import React from "react";
import { motion } from "framer-motion";
import { 
  Star, 
  TrendingUp, 
  Award, 
  Clock, 
  ShieldCheck, 
  Users, 
  Zap,
  ThumbsUp,
  Flame,
  Crown
} from "lucide-react";
import { cn } from "@/lib/utils";

// Product popularity badge
interface PopularityBadgeProps {
  views?: number;
  sales?: number;
  variant?: "views" | "sales" | "trending" | "bestseller";
  className?: string;
}

export function PopularityBadge({ 
  views, 
  sales, 
  variant = "views",
  className 
}: PopularityBadgeProps) {
  const config = {
    views: {
      icon: Users,
      label: `${views?.toLocaleString("pt-BR")} visualizações`,
      color: "bg-blue-500/10 text-blue-600 dark:text-blue-400"
    },
    sales: {
      icon: TrendingUp,
      label: `${sales?.toLocaleString("pt-BR")} vendidos`,
      color: "bg-green-500/10 text-green-600 dark:text-green-400"
    },
    trending: {
      icon: Flame,
      label: "Em alta",
      color: "bg-orange-500/10 text-orange-600 dark:text-orange-400"
    },
    bestseller: {
      icon: Crown,
      label: "Mais vendido",
      color: "bg-amber-500/10 text-amber-600 dark:text-amber-400"
    }
  };

  const { icon: Icon, label, color } = config[variant];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full",
        "text-xs font-medium",
        color,
        className
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      <span>{label}</span>
    </motion.div>
  );
}

// Trust badges
type TrustBadgeType = "verified" | "fast" | "quality" | "secure" | "popular";

interface TrustBadgeProps {
  type: TrustBadgeType;
  className?: string;
}

const trustBadges = {
  verified: {
    icon: ShieldCheck,
    label: "Fornecedor verificado",
    color: "text-blue-500"
  },
  fast: {
    icon: Zap,
    label: "Entrega rápida",
    color: "text-amber-500"
  },
  quality: {
    icon: Award,
    label: "Alta qualidade",
    color: "text-purple-500"
  },
  secure: {
    icon: ShieldCheck,
    label: "Compra segura",
    color: "text-green-500"
  },
  popular: {
    icon: ThumbsUp,
    label: "Escolha popular",
    color: "text-rose-500"
  }
};

export const TrustBadge = React.forwardRef<HTMLDivElement, TrustBadgeProps>(
  function TrustBadge({ type, className }, ref) {
    const { icon: Icon, label, color } = trustBadges[type];

    return (
      <div ref={ref} className={cn(
        "flex items-center gap-2 text-sm text-muted-foreground",
        className
      )}>
        <Icon className={cn("w-4 h-4", color)} />
        <span>{label}</span>
      </div>
    );
  }
);

// Trust badges row
export const TrustBadgesRow = React.forwardRef<HTMLDivElement, { className?: string }>(
  function TrustBadgesRow({ className }, ref) {
    return (
      <div ref={ref} className={cn("flex flex-wrap gap-4", className)}>
        <TrustBadge type="verified" />
        <TrustBadge type="fast" />
        <TrustBadge type="quality" />
      </div>
    );
  }
);

/**
 * Supplier trust data — will come from real DB in the future.
 * For now, uses deterministic mock based on product ID.
 */
export interface SupplierTrustData {
  isVerified: boolean;
  deliveryDays: number | null; // null = unknown
  avgRating: number | null;    // 0-5, null = no reviews
}

/**
 * Generate mock trust data from a product ID (deterministic).
 */
export function getMockSupplierTrust(productId: string): SupplierTrustData {
  let hash = 0;
  for (let i = 0; i < productId.length; i++) {
    hash = ((hash << 5) - hash + productId.charCodeAt(i)) | 0;
  }
  const abs = Math.abs(hash);

  return {
    isVerified: abs % 10 < 7,          // ~70% verified
    deliveryDays: abs % 5 === 0 ? null : (abs % 12) + 1, // 1-12 days, some null
    avgRating: abs % 7 === 0 ? null : 3.2 + ((abs % 18) / 10), // 3.2-4.9, some null
  };
}

/** Dynamic trust badges that show/hide based on supplier data */
interface DynamicTrustBadgesProps {
  trust: SupplierTrustData;
  className?: string;
}

export function DynamicTrustBadges({ trust, className }: DynamicTrustBadgesProps) {
  const badges: React.ReactNode[] = [];

  if (trust.isVerified) {
    badges.push(<TrustBadge key="verified" type="verified" />);
  }

  if (trust.deliveryDays != null && trust.deliveryDays <= 5) {
    badges.push(<TrustBadge key="fast" type="fast" />);
  }

  if (trust.avgRating != null && trust.avgRating >= 4.0) {
    badges.push(<TrustBadge key="quality" type="quality" />);
  }

  if (badges.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-0.5", className)}>
      {badges}
    </div>
  );
}

// Star rating display
interface StarRatingProps {
  rating: number; // 0-5
  totalReviews?: number;
  size?: "sm" | "md" | "lg";
  showCount?: boolean;
  className?: string;
}

const starSizes = {
  sm: "w-3 h-3",
  md: "w-4 h-4",
  lg: "w-5 h-5"
};

export function StarRating({ 
  rating, 
  totalReviews, 
  size = "md",
  showCount = true,
  className 
}: StarRatingProps) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <div className="flex">
        {/* Full stars */}
        {Array.from({ length: fullStars }).map((_, i) => (
          <Star key={`full-${i}`} className={cn(starSizes[size], "fill-amber-400 text-amber-400")} />
        ))}
        
        {/* Half star */}
        {hasHalfStar && (
          <div className="relative">
            <Star className={cn(starSizes[size], "text-muted-foreground/30")} />
            <div className="absolute inset-0 overflow-hidden w-1/2">
              <Star className={cn(starSizes[size], "fill-amber-400 text-amber-400")} />
            </div>
          </div>
        )}
        
        {/* Empty stars */}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <Star key={`empty-${i}`} className={cn(starSizes[size], "text-muted-foreground/30")} />
        ))}
      </div>
      
      {showCount && totalReviews !== undefined && (
        <span className="text-sm text-muted-foreground">
          ({totalReviews.toLocaleString("pt-BR")})
        </span>
      )}
    </div>
  );
}

// Recent activity indicator
interface RecentActivityProps {
  count: number;
  timeframe?: string;
  className?: string;
}

export function RecentActivity({ 
  count, 
  timeframe = "últimas 24h",
  className 
}: RecentActivityProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        "flex items-center gap-2 text-sm",
        className
      )}
    >
      <div className="relative">
        <Users className="w-4 h-4 text-muted-foreground" />
        <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
      </div>
      <span className="text-muted-foreground">
        <strong className="text-foreground">{count}</strong> pessoas viram nas {timeframe}
      </span>
    </motion.div>
  );
}

// Low stock urgency
interface LowStockAlertProps {
  quantity: number;
  threshold?: number;
  className?: string;
}

export function LowStockAlert({ 
  quantity, 
  threshold = 10,
  className 
}: LowStockAlertProps) {
  if (quantity > threshold) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-lg",
        "bg-amber-500/10 text-amber-600 dark:text-amber-400",
        "text-sm font-medium",
        className
      )}
    >
      <Clock className="w-4 h-4" />
      <span>
        {quantity === 0 
          ? "Esgotado" 
          : `Restam apenas ${quantity} unidades`
        }
      </span>
    </motion.div>
  );
}

// Client testimonial card
interface TestimonialProps {
  quote: string;
  author: string;
  company?: string;
  rating?: number;
  className?: string;
}

export function Testimonial({ 
  quote, 
  author, 
  company, 
  rating = 5,
  className 
}: TestimonialProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={cn(
        "p-4 rounded-xl bg-muted/50 border border-border",
        className
      )}
    >
      <StarRating rating={rating} showCount={false} size="sm" className="mb-3" />
      <blockquote className="text-sm text-foreground italic mb-3">
        "{quote}"
      </blockquote>
      <div className="text-sm">
        <span className="font-medium text-foreground">{author}</span>
        {company && (
          <span className="text-muted-foreground"> • {company}</span>
        )}
      </div>
    </motion.div>
  );
}

// Conversion stats
interface ConversionStatsProps {
  ordersToday?: number;
  activeUsers?: number;
  satisfactionRate?: number;
  className?: string;
}

export function ConversionStats({
  ordersToday = 0,
  activeUsers = 0,
  satisfactionRate = 0,
  className
}: ConversionStatsProps) {
  return (
    <div className={cn(
      "flex flex-wrap gap-6 py-4 px-6 rounded-xl bg-muted/30",
      className
    )}>
      <div className="text-center">
        <div className="text-2xl font-bold text-foreground">{ordersToday}</div>
        <div className="text-xs text-muted-foreground">Pedidos hoje</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-foreground">{activeUsers}</div>
        <div className="text-xs text-muted-foreground">Usuários ativos</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-green-500">{satisfactionRate}%</div>
        <div className="text-xs text-muted-foreground">Satisfação</div>
      </div>
    </div>
  );
}
