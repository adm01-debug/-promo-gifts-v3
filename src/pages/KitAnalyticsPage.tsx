/**
 * KitAnalyticsPage — Dashboard "Meus Kits Campeões".
 */
import { Trophy, TrendingUp, BarChart3 } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageSEO } from '@/components/seo/PageSEO';
import { BackButton } from '@/components/common/BackButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useKitAnalytics } from '@/hooks/useKitAnalytics';
import { formatCurrency } from '@/lib/kit-builder';
import { Skeleton } from '@/components/ui/skeleton';

export default function KitAnalyticsPage() {
  const { data: rows = [], isLoading } = useKitAnalytics();

  const totals = rows.reduce(
    (acc, r) => ({
      quotes: acc.quotes + r.quote_count,
      approved: acc.approved + r.approved_count,
      revenue: acc.revenue + r.avg_ticket * r.quote_count,
    }),
    { quotes: 0, approved: 0, revenue: 0 }
  );

  return (
    <MainLayout>
      <PageSEO title="Kits Campeões — Analytics" description="Performance dos seus kits personalizados" path="/montar-kit/analytics" noIndex />
      <div className="container py-8 space-y-6">
        <BackButton fallbackPath="/montar-kit" />
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Trophy className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display">Meus Kits Campeões</h1>
            <p className="text-muted-foreground text-sm">Quais kits convertem mais e geram mais receita</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Orçamentos com kits</p>
              <p className="text-2xl font-bold">{totals.quotes}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Taxa de aprovação geral</p>
              <p className="text-2xl font-bold text-success">
                {totals.quotes ? ((totals.approved / totals.quotes) * 100).toFixed(1) : '0.0'}%
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Receita estimada</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(totals.revenue)}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> Ranking de kits
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum dado ainda — crie e envie kits em orçamentos para ver o ranking.</p>
            ) : (
              <ul className="divide-y">
                {rows.map((r, i) => (
                  <li key={r.kit_id} className="py-3 flex items-center gap-3">
                    <Badge variant={i < 3 ? 'default' : 'outline'} className="w-7 justify-center">{i + 1}</Badge>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{r.kit_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.quote_count} {r.quote_count === 1 ? 'orçamento' : 'orçamentos'} · {r.approved_count} aprovados · ticket {formatCurrency(r.avg_ticket)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-success flex items-center gap-1 justify-end">
                        <TrendingUp className="h-3 w-3" />
                        {r.approval_rate.toFixed(0)}%
                      </p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(r.total_price)}/kit</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
