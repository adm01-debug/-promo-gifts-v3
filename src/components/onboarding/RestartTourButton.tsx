import { HelpCircle } from "lucide-react";
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
          variant="ghost"
          size="icon"
          onClick={restartTour}
          className="h-8 w-8"
        >
          <HelpCircle className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Reiniciar tour</p>
      </TooltipContent>
    </Tooltip>
  );
}
