import { LucideIcon, ArrowRight, Sparkles, Plus, ExternalLink, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface SmartEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  tips?: string[];
  illustration?: "quotes" | "products" | "clients" | "orders" | "favorites";
  className?: string;
}

// Ilustrações SVG inline para cada tipo
const illustrations = {
  quotes: (
    <svg viewBox="0 0 200 160" className="w-full max-w-[200px] h-auto">
      <defs>
        <linearGradient id="quoteGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <rect x="30" y="20" width="140" height="120" rx="8" fill="url(#quoteGrad)" stroke="hsl(var(--primary))" strokeWidth="2" strokeDasharray="4 4" />
      <rect x="50" y="40" width="80" height="8" rx="4" fill="hsl(var(--muted-foreground))" opacity="0.3" />
      <rect x="50" y="56" width="100" height="6" rx="3" fill="hsl(var(--muted-foreground))" opacity="0.2" />
      <rect x="50" y="70" width="60" height="6" rx="3" fill="hsl(var(--muted-foreground))" opacity="0.2" />
      <rect x="50" y="100" width="40" height="24" rx="4" fill="hsl(var(--primary))" opacity="0.8" />
      <circle cx="160" cy="30" r="20" fill="hsl(var(--primary))" opacity="0.1" />
      <path d="M154 30l4 4 8-8" stroke="hsl(var(--primary))" strokeWidth="2" fill="none" />
    </svg>
  ),
  products: (
    <svg viewBox="0 0 200 160" className="w-full max-w-[200px] h-auto">
      <defs>
        <linearGradient id="prodGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.15" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <rect x="20" y="30" width="70" height="90" rx="8" fill="url(#prodGrad)" stroke="hsl(var(--border))" strokeWidth="1.5" />
      <rect x="65" y="50" width="70" height="90" rx="8" fill="url(#prodGrad)" stroke="hsl(var(--border))" strokeWidth="1.5" />
      <rect x="110" y="30" width="70" height="90" rx="8" fill="url(#prodGrad)" stroke="hsl(var(--primary))" strokeWidth="2" strokeDasharray="4 4" />
      <circle cx="145" cy="75" r="15" fill="hsl(var(--primary))" opacity="0.2" />
      <path d="M140 75h10M145 70v10" stroke="hsl(var(--primary))" strokeWidth="2" />
    </svg>
  ),
  clients: (
    <svg viewBox="0 0 200 160" className="w-full max-w-[200px] h-auto">
      <circle cx="100" cy="60" r="30" fill="hsl(var(--primary))" opacity="0.1" stroke="hsl(var(--primary))" strokeWidth="2" strokeDasharray="4 4" />
      <circle cx="100" cy="55" r="12" fill="hsl(var(--muted-foreground))" opacity="0.3" />
      <ellipse cx="100" cy="80" rx="18" ry="10" fill="hsl(var(--muted-foreground))" opacity="0.3" />
      <circle cx="55" cy="80" r="20" fill="hsl(var(--muted))" />
      <circle cx="145" cy="80" r="20" fill="hsl(var(--muted))" />
      <path d="M70 100 Q100 130 130 100" stroke="hsl(var(--primary))" strokeWidth="2" fill="none" strokeDasharray="4 4" />
    </svg>
  ),
  orders: (
    <svg viewBox="0 0 200 160" className="w-full max-w-[200px] h-auto">
      <rect x="40" y="20" width="120" height="120" rx="8" fill="hsl(var(--muted))" opacity="0.5" />
      <rect x="55" y="40" width="90" height="12" rx="6" fill="hsl(var(--muted-foreground))" opacity="0.2" />
      <rect x="55" y="60" width="70" height="8" rx="4" fill="hsl(var(--muted-foreground))" opacity="0.15" />
      <rect x="55" y="75" width="50" height="8" rx="4" fill="hsl(var(--muted-foreground))" opacity="0.15" />
      <circle cx="75" cy="110" r="12" fill="hsl(var(--primary))" opacity="0.2" />
      <circle cx="105" cy="110" r="12" fill="hsl(var(--primary))" opacity="0.15" />
      <circle cx="135" cy="110" r="12" fill="hsl(var(--primary))" opacity="0.1" />
    </svg>
  ),
  favorites: (
    <svg viewBox="0 0 200 160" className="w-full max-w-[200px] h-auto">
      <path 
        d="M100 130 L60 90 Q30 60 60 35 Q90 10 100 40 Q110 10 140 35 Q170 60 140 90 Z" 
        fill="hsl(var(--primary))" 
        opacity="0.1" 
        stroke="hsl(var(--primary))" 
        strokeWidth="2" 
        strokeDasharray="4 4"
      />
      <circle cx="70" cy="70" r="4" fill="hsl(var(--primary))" opacity="0.5" />
      <circle cx="130" cy="70" r="4" fill="hsl(var(--primary))" opacity="0.5" />
      <circle cx="100" cy="90" r="4" fill="hsl(var(--primary))" opacity="0.5" />
    </svg>
  ),
};

export function SmartEmptyState({
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  tips,
  illustration,
  className,
}: SmartEmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn("w-full", className)}
    >
      <Card className="border-dashed border-2 overflow-hidden">
        <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
          {/* Illustration or Icon */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            className="mb-6"
          >
            {illustration ? (
              <div className="relative">
                {illustrations[illustration]}
                <motion.div
                  className="absolute -top-2 -right-2"
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Sparkles className="h-6 w-6 text-primary" />
                </motion.div>
              </div>
            ) : (
              <div className="relative">
                <div className="rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 p-6">
                  <Icon className="h-12 w-12 text-primary" />
                </div>
                <motion.div
                  className="absolute -bottom-1 -right-1 rounded-full bg-background p-1.5 shadow-sm border"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Sparkles className="h-4 w-4 text-coins" />
                </motion.div>
              </div>
            )}
          </motion.div>

          {/* Title & Description */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h3 className="text-xl font-semibold mb-2">{title}</h3>
            <p className="text-muted-foreground mb-6 max-w-md">{description}</p>
          </motion.div>

          {/* Tips */}
          {tips && tips.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="w-full max-w-sm mb-6"
            >
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3 justify-center">
                <Lightbulb className="h-4 w-4 text-coins" />
                <span>Dica rápida:</span>
              </div>
              <ul className="space-y-2">
                {tips.map((tip, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2"
                  >
                    <ArrowRight className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-3"
          >
            {primaryAction && (
              <Button
                size="lg"
                onClick={primaryAction.onClick}
                className="gap-2 min-w-[200px] button-ripple active:scale-95 transition-transform"
              >
                {primaryAction.icon ? (
                  <primaryAction.icon className="h-5 w-5" />
                ) : (
                  <Plus className="h-5 w-5" />
                )}
                {primaryAction.label}
              </Button>
            )}
            {secondaryAction && (
              <Button
                variant="outline"
                size="lg"
                onClick={secondaryAction.onClick}
                className="gap-2 active:scale-95 transition-transform"
              >
                {secondaryAction.icon ? (
                  <secondaryAction.icon className="h-5 w-5" />
                ) : (
                  <ExternalLink className="h-5 w-5" />
                )}
                {secondaryAction.label}
              </Button>
            )}
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
