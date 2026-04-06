/**
 * AiUsageWidget — Shows current user's AI consumption in a compact card.
 * Displays progress bar, quota usage, and recent calls.
 */
import { Brain, AlertTriangle, Zap, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAiQuotaStatus, useAiUsageLogs } from "@/hooks/useAiUsage";
import { cn } from "@/lib/utils";

export function AiUsageWidget({ className }: { className?: string }) {
  const { data: quota, isLoading: quotaLoading } = useAiQuotaStatus();
  const { data: recentLogs, isLoading: logsLoading } = useAiUsageLogs({ period: "month", limit: 5 });

  const isLoading = quotaLoading || logsLoading;

  if (isLoading) {
    return (
      <Card className={cn("", className)}>
        <CardContent className="p-4 space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!quota) return null;

  const usagePercent = quota.unlimited ? 0 : quota.limit > 0 ? Math.min((quota.used / quota.limit) * 100, 100) : 0;
  const isWarning = !quota.unlimited && usagePercent >= 80;
  const isExceeded = !quota.unlimited && usagePercent >= 100;

  const totalCost = (recentLogs || []).reduce((s, l) => s + Number(l.estimated_cost_usd), 0);

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-2 px-4 pt-4">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          Uso de IA
          {isWarning && !isExceeded && (
            <Badge variant="outline" className="text-amber-500 border-amber-500/30 text-[10px] ml-auto">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {Math.round(usagePercent)}%
            </Badge>
          )}
          {isExceeded && (
            <Badge variant="destructive" className="text-[10px] ml-auto">
              Limite atingido
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {/* Quota bar */}
        <div>
          {quota.unlimited ? (
            <div className="flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-xs text-muted-foreground">
                Uso ilimitado — <strong className="text-foreground">{quota.used}</strong> chamadas este mês
              </span>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">
                  <strong className="text-foreground">{quota.used}</strong> / {quota.limit} chamadas
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {quota.remaining} restantes
                </span>
              </div>
              <Progress
                value={usagePercent}
                className={cn(
                  "h-2",
                  isExceeded && "[&>div]:bg-destructive",
                  isWarning && !isExceeded && "[&>div]:bg-amber-500"
                )}
              />
            </>
          )}
        </div>

        {/* Cost summary */}
        {totalCost > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <TrendingUp className="h-3 w-3" />
            Custo este mês: <strong className="text-foreground">${totalCost.toFixed(4)}</strong>
          </div>
        )}

        {/* Recent calls */}
        {recentLogs && recentLogs.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Recentes</p>
            {recentLogs.slice(0, 3).map((log) => (
              <div key={log.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Badge variant="outline" className="text-[9px] shrink-0">
                    {log.function_name.replace(/^(generate-|ai-)/, "")}
                  </Badge>
                  <span className="text-muted-foreground truncate">
                    {(log.model || "").replace(/^(google|openai)\//, "")}
                  </span>
                </div>
                <span className="text-muted-foreground shrink-0 ml-2">
                  {log.total_tokens > 0 ? `${log.total_tokens.toLocaleString()} tok` : "-"}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
