import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useOnboarding } from "@/hooks/useOnboarding";

export function RestartTourButton() {
  const { restartTour, hasCompletedTour, isLoading } = useOnboarding();

  if (isLoading || !hasCompletedTour) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          onClick={restartTour}
          className="h-8 gap-1.5 text-xs border-border hover:bg-primary/10 hover:text-primary"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reiniciar Tour
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Rever o tour guiado do sistema</p>
      </TooltipContent>
    </Tooltip>
  );
}
