/**
 * IndustryTrendingProducts — Zona 3: tendências do setor (cross-vendedor).
 * Dados reais agregados via RPC quando há volume; fallback mock caso contrário.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Sparkles, ArrowUp, ArrowDown, Minus, CheckCircle2, Package } from "lucide-react";
import { useIndustryTrends } from "@/hooks/bi/useIndustryTrends";
import { cn } from "@/lib/utils";

interface Props {
  ramoAtividade: string | null;
  clientId: string;
}

const trendIcon = {
  up: { icon: ArrowUp, className: "text-emerald-600 dark:text-emerald-400" },
  stable: { icon: Minus, className: "text-muted-foreground" },
  down: { icon: ArrowDown, className: "text-red-600 dark:text-red-400" },
};

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export function IndustryTrendingProducts({ ramoAtividade }: Props) {
  const { data, isLoading } = useIndustryTrends(ramoAtividade);

  return (
    <Card className="border-[1.5px]">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="font-display font-semibold">
                Tendência do setor
                {ramoAtividade && <span className="text-muted-foreground font-normal"> · {ramoAtividade}</span>}
              </h2>
              <p className="text-xs text-muted-foreground">
                {data?.isMock
                  ? "Top produtos vendidos por todos os vendedores nos últimos 90 dias"
                  : `Agregado real de ${data?.companiesInRamo} empresas do mesmo ramo · 90 dias`}
              </p>
            </div>
          </div>
          {data &&
            (data.isMock ? (
              <Badge variant="outline" className="gap-1 border-amber-500/50 text-amber-700 dark:text-amber-300 text-[10px]">
                <Sparkles className="h-3 w-3" /> Simulado
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 border-emerald-500/50 text-emerald-700 dark:text-emerald-300 text-[10px]">
                <CheckCircle2 className="h-3 w-3" /> Dados reais
              </Badge>
            ))}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
          </div>
        ) : !data?.trends.length ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Sem dados de tendência para este ramo.</p>
        ) : (
          <div className="space-y-1.5">
            {data.trends.map((t, i) => {
              const Trend = trendIcon[t.trend];
              return (
                <div
                  key={`${t.productName}-${i}`}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/60 transition-colors group"
                >
                  <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center font-display font-bold text-xs text-muted-foreground shrink-0">
                    {i + 1}
                  </div>
                  {t.imageUrl ? (
                    <div className="h-9 w-9 rounded-md overflow-hidden bg-muted/40 border shrink-0">
                      <img
                        src={t.imageUrl}
                        alt={t.productName}
                        loading="lazy"
                        className="h-full w-full object-contain"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                  ) : (
                    <div className="h-9 w-9 rounded-md bg-muted/40 flex items-center justify-center shrink-0">
                      <Package className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{t.productName}</div>
                    <div className="text-xs text-muted-foreground">{t.category}</div>
                  </div>
                  <div className="text-right shrink-0 hidden sm:block">
                    <div className="text-xs text-muted-foreground">unidades</div>
                    <div className="font-semibold text-sm">{t.unitsSold.toLocaleString("pt-BR")}</div>
                  </div>
                  <div className="text-right shrink-0 hidden md:block">
                    <div className="text-xs text-muted-foreground">preço médio</div>
                    <div className="font-semibold text-sm">{fmtBRL(t.avgPrice)}</div>
                  </div>
                  <Trend.icon className={cn("h-4 w-4 shrink-0", Trend.className)} />
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
