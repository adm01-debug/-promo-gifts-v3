import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Check, Star, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PricingFeature {
  text: string;
  included: boolean;
  highlight?: boolean;
}

interface PricingCardProps {
  name: string;
  description?: string;
  price: number | string;
  period?: string;
  features: PricingFeature[];
  popular?: boolean;
  ctaLabel?: string;
  onSelect?: () => void;
  disabled?: boolean;
  badge?: string;
  className?: string;
}

export function PricingCard({
  name,
  description,
  price,
  period = "/mês",
  features,
  popular = false,
  ctaLabel = "Selecionar",
  onSelect,
  disabled = false,
  badge,
  className,
}: PricingCardProps) {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      className={cn(
        "relative rounded-2xl border p-6 transition-all",
        popular
          ? "border-primary bg-gradient-to-b from-primary/5 to-background shadow-lg shadow-primary/10"
          : "bg-card",
        className
      )}
    >
      {/* Popular badge */}
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-primary text-primary-foreground gap-1 px-3">
            <Star className="w-3 h-3 fill-current" />
            Mais Popular
          </Badge>
        </div>
      )}

      {/* Custom badge */}
      {badge && !popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge variant="secondary" className="px-3">
            {badge}
          </Badge>
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-foreground">{name}</h3>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>

      {/* Price */}
      <div className="text-center mb-6">
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-sm text-muted-foreground">R$</span>
          <span className="text-4xl font-bold text-foreground">
            {typeof price === "number" ? price.toLocaleString("pt-BR") : price}
          </span>
          <span className="text-muted-foreground">{period}</span>
        </div>
      </div>

      {/* Features */}
      <ul className="space-y-3 mb-6">
        {features.map((feature, index) => (
          <li
            key={index}
            className={cn(
              "flex items-start gap-3 text-sm",
              !feature.included && "text-muted-foreground/50"
            )}
          >
            <Check
              className={cn(
                "w-4 h-4 shrink-0 mt-0.5",
                feature.included
                  ? feature.highlight
                    ? "text-primary"
                    : "text-success"
                  : "text-muted-foreground/30"
              )}
            />
            <span className={feature.highlight ? "font-medium text-primary" : ""}>
              {feature.text}
            </span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <Button
        onClick={onSelect}
        disabled={disabled}
        variant={popular ? "default" : "outline"}
        className="w-full"
      >
        {ctaLabel}
      </Button>
    </motion.div>
  );
}

// Pricing Grid
interface PricingGridProps {
  children: React.ReactNode;
  className?: string;
}

export function PricingGrid({ children, className }: PricingGridProps) {
  return (
    <div
      className={cn(
        "grid gap-6 md:grid-cols-2 lg:grid-cols-3 items-start",
        className
      )}
    >
      {children}
    </div>
  );
}

// Simple Price Display
interface PriceDisplayProps {
  price: number;
  originalPrice?: number;
  currency?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function PriceDisplay({
  price,
  originalPrice,
  currency = "R$",
  size = "md",
  className,
}: PriceDisplayProps) {
  const hasDiscount = originalPrice && originalPrice > price;
  const discountPercent = hasDiscount
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;

  const sizeStyles = {
    sm: { price: "text-lg", original: "text-sm", currency: "text-xs" },
    md: { price: "text-2xl", original: "text-base", currency: "text-sm" },
    lg: { price: "text-3xl", original: "text-lg", currency: "text-base" },
  };

  const styles = sizeStyles[size];

  return (
    <div className={cn("flex items-baseline gap-2", className)}>
      {hasDiscount && (
        <span className={cn("line-through text-muted-foreground", styles.original)}>
          {currency} {originalPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </span>
      )}
      <div className="flex items-baseline">
        <span className={cn("text-muted-foreground", styles.currency)}>{currency}</span>
        <span className={cn("font-bold text-foreground ml-1", styles.price)}>
          {price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </span>
      </div>
      {hasDiscount && (
        <Badge variant="secondary" className="bg-success/10 text-success border-0">
          -{discountPercent}%
        </Badge>
      )}
    </div>
  );
}

// Installment Display
interface InstallmentDisplayProps {
  price: number;
  installments?: number;
  interestFree?: boolean;
  className?: string;
}

export function InstallmentDisplay({
  price,
  installments = 12,
  interestFree = true,
  className,
}: InstallmentDisplayProps) {
  const installmentValue = price / installments;

  return (
    <div className={cn("text-sm text-muted-foreground", className)}>
      <span>
        ou{" "}
        <span className="font-medium text-foreground">
          {installments}x de R$ {installmentValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </span>
        {interestFree && <span className="text-success ml-1">sem juros</span>}
      </span>
    </div>
  );
}
