import { useState, useEffect } from "react";
import { X, Lightbulb, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface OnboardingTip {
  id: string;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: typeof Lightbulb;
  variant?: "info" | "success" | "warning" | "feature";
}

interface ContextualOnboardingProps {
  tipId: string;
  tip: OnboardingTip;
  position?: "top" | "bottom" | "inline";
  delay?: number;
  className?: string;
}

const DISMISSED_TIPS_KEY = "dismissed-onboarding-tips";

export function ContextualOnboarding({
  tipId,
  tip,
  position = "inline",
  delay = 500,
  className,
}: ContextualOnboardingProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if tip was already dismissed
    const dismissed = localStorage.getItem(DISMISSED_TIPS_KEY);
    const dismissedTips = dismissed ? JSON.parse(dismissed) : [];
    
    if (dismissedTips.includes(tipId)) {
      setIsDismissed(true);
      return;
    }

    // Show tip after delay
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [tipId, delay]);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    
    // Save to localStorage
    const dismissed = localStorage.getItem(DISMISSED_TIPS_KEY);
    const dismissedTips = dismissed ? JSON.parse(dismissed) : [];
    dismissedTips.push(tipId);
    localStorage.setItem(DISMISSED_TIPS_KEY, JSON.stringify(dismissedTips));
  };

  if (isDismissed) return null;

  const Icon = tip.icon || Lightbulb;
  
  const variantStyles = {
    info: "bg-info/10 border-info/30 text-info",
    success: "bg-success/10 border-success/30 text-success",
    warning: "bg-warning/10 border-warning/30 text-warning",
    feature: "bg-primary/10 border-primary/30 text-primary",
  };

  const iconBgStyles = {
    info: "bg-info/20",
    success: "bg-success/20",
    warning: "bg-warning/20",
    feature: "bg-primary/20",
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: position === "top" ? -20 : 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: position === "top" ? -20 : 20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className={cn(
            position === "top" && "fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4",
            position === "bottom" && "fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4",
            position === "inline" && "w-full",
            className
          )}
        >
          <Card className={cn(
            "relative overflow-hidden border shadow-lg",
            variantStyles[tip.variant || "info"]
          )}>
            {/* Decorative gradient */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-current/5 to-transparent rounded-bl-full" />
            
            <CardContent className="p-4 relative">
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className={cn(
                  "shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
                  iconBgStyles[tip.variant || "info"]
                )}>
                  <Icon className="h-5 w-5" />
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-foreground text-sm">{tip.title}</h4>
                  <p className="text-muted-foreground text-sm mt-0.5">{tip.description}</p>
                  
                  {tip.action && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 h-8 px-3 gap-1.5 text-current hover:bg-current/10"
                      onClick={() => {
                        tip.action?.onClick();
                        handleDismiss();
                      }}
                    >
                      {tip.action.label}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                
                {/* Dismiss button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={handleDismiss}
                 aria-label="Fechar"><X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Convenience component for feature announcements
export function FeatureAnnouncement({
  title,
  description,
  onTry,
}: {
  title: string;
  description: string;
  onTry?: () => void;
}) {
  return (
    <ContextualOnboarding
      tipId={`feature-${title.toLowerCase().replace(/\s+/g, "-")}`}
      tip={{
        id: `feature-${title}`,
        title,
        description,
        icon: Sparkles,
        variant: "feature",
        action: onTry ? { label: "Experimentar", onClick: onTry } : undefined,
      }}
      position="bottom"
      delay={2000}
    />
  );
}
