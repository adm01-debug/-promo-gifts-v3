import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, Clock, ChevronRight } from "lucide-react";
import { useExpiringNovelties } from "@/hooks/useNovelties";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

function formatDaysRemaining(days: number): string {
  if (days === 0) return "Expira hoje!";
  if (days === 1) return "Último dia!";
  if (days <= 3) return `${days} dias`;
  return `${days} dias`;
}

function getDaysColor(days: number): string {
  if (days <= 1) return "text-destructive";
  if (days <= 3) return "text-warning";
  return "text-warning";
}

export function ExpiringNoveltiesWidget() {
  const navigate = useNavigate();
  const { data: expiring, isLoading } = useExpiringNovelties(7);

  const handleClick = (productId: string) => {
    navigate(`/produto/${productId}`);
  };

  return (
    <Card className="border-warning/30 bg-gradient-to-br from-warning/5 to-transparent">
      <CardHeader className="pb-2 sm:pb-3">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-warning" />
          <span className="hidden sm:inline">Expirando em Breve</span>
          <span className="sm:hidden">Expirando</span>
          {expiring && expiring.length > 0 && (
            <Badge 
              variant="secondary" 
              className="bg-warning/20 text-warning text-[10px] sm:text-xs"
            >
              {expiring.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : expiring && expiring.length > 0 ? (
          <ScrollArea className="h-auto max-h-[300px] lg:max-h-[400px]">
            <div className="space-y-2">
              {expiring.map((item) => (
                <div
                  key={item.novelty_id}
                  className={cn(
                    "group flex items-center gap-2 sm:gap-3 p-2 rounded-lg cursor-pointer",
                    "bg-background/50 hover:bg-accent/50 transition-colors",
                    "border border-transparent hover:border-warning/30"
                  )}
                  onClick={() => handleClick(item.product_id)}
                >
                  {/* Imagem pequena */}
                  <div className="shrink-0 w-10 h-10 rounded bg-muted overflow-hidden">
                    {item.product_image ? (
                      <img src={item.product_image} 
                        alt={item.product_name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                        <Clock className="h-4 w-4" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium line-clamp-1 group-hover:text-primary transition-colors">
                      {item.product_name}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Clock className={cn("h-3 w-3", getDaysColor(item.days_remaining))} />
                      <span className={cn("text-[11px] font-medium", getDaysColor(item.days_remaining))}>
                        {formatDaysRemaining(item.days_remaining)}
                      </span>
                    </div>
                  </div>

                  {/* Arrow */}
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary shrink-0 transition-colors" />
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-6 sm:py-8">
            <Clock className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-xs sm:text-sm text-muted-foreground">
              Nenhum produto expirando nos próximos 7 dias
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
