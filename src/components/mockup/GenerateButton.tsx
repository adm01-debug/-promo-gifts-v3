import { Button, ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2, Wand2, Sparkles } from "lucide-react";
import { forwardRef } from "react";

interface GenerateButtonProps extends Omit<ButtonProps, 'children'> {
  isLoading?: boolean;
  isReady?: boolean;
  stepsRemaining?: number;
}

export const GenerateButton = forwardRef<HTMLButtonElement, GenerateButtonProps>(
  ({ isLoading, isReady, stepsRemaining = 0, className, disabled, ...props }, ref) => {
    // Dynamic microcopy based on state
    const getButtonText = () => {
      if (isLoading) return "Criando com IA...";
      if (stepsRemaining === 1) return "Falta só 1 passo!";
      if (stepsRemaining === 2) return "Quase lá! 2 passos";
      if (stepsRemaining > 2) return `${stepsRemaining} passos restantes`;
      if (isReady) return "Gerar Mockup";
      return "Gerar Mockup";
    };

    const getButtonIcon = () => {
      if (isLoading) return <Loader2 className="h-4 w-4 animate-spin" />;
      if (isReady) return <Sparkles className="h-4 w-4 animate-pulse" />;
      return <Wand2 className="h-4 w-4" />;
    };

    return (
      <Button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "relative overflow-hidden transition-all duration-300",
          isReady && !isLoading && [
            "bg-gradient-to-r from-primary via-primary to-primary/90",
            "hover:from-primary/90 hover:via-primary hover:to-primary",
            "shadow-lg shadow-primary/25",
            "hover:shadow-xl hover:shadow-primary/30",
            "hover:scale-[1.02]",
          ],
          isLoading && "bg-primary/80",
          !isReady && !isLoading && "opacity-60",
          className
        )}
        {...props}
      >
        {/* Shimmer effect when ready */}
        {isReady && !isLoading && (
          <span className="absolute inset-0 overflow-hidden">
            <span className="absolute -inset-[100%] animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </span>
        )}
        
        <span className="relative flex items-center gap-2">
          {getButtonIcon()}
          <span className="font-medium">{getButtonText()}</span>
        </span>
      </Button>
    );
  }
);

GenerateButton.displayName = "GenerateButton";

// Floating Action Button variant for mobile
export function GenerateFAB({ 
  onClick, 
  isLoading, 
  isReady,
  disabled,
  className 
}: {
  onClick: () => void;
  isLoading?: boolean;
  isReady?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading || !isReady}
      className={cn(
        "fixed bottom-6 right-6 z-50",
        "flex items-center justify-center",
        "w-14 h-14 rounded-full",
        "bg-gradient-to-br from-primary to-primary/80",
        "text-primary-foreground",
        "shadow-lg shadow-primary/30",
        "transition-all duration-300",
        "md:hidden", // Only show on mobile
        isReady && !isLoading && [
          "animate-pulse",
          "hover:scale-110",
          "hover:shadow-xl hover:shadow-primary/40",
        ],
        (disabled || !isReady) && "opacity-50 cursor-not-allowed",
        isLoading && "cursor-wait",
        className
      )}
      aria-label="Gerar Mockup"
    >
      {isLoading ? (
        <Loader2 className="h-6 w-6 animate-spin" />
      ) : (
        <Sparkles className="h-6 w-6" />
      )}
      
      {/* Ripple effect */}
      {isReady && !isLoading && (
        <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
      )}
    </button>
  );
}
