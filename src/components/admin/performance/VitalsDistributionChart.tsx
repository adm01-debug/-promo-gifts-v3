/**
 * VitalsDistributionChart — Stacked bar chart of good/needs-improvement/poor per metric.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { VitalsDistribution } from "@/hooks/useWebVitalsSummary";

interface Props {
  distribution: VitalsDistribution[];
}

export function VitalsDistributionChart({ distribution }: Props) {
  const data = distribution.map((d) => ({
    metric: d.metric_name,
    Good: Math.round((d.good_pct ?? 0) * 100),
    "Needs Improv.": Math.round((d.ni_pct ?? 0) * 100),
    Poor: Math.round((d.poor_pct ?? 0) * 100),
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-display">Distribuição por Rating (%)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="metric" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} unit="%" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Bar dataKey="Good" stackId="a" fill="hsl(var(--success))" />
              <Bar dataKey="Needs Improv." stackId="a" fill="hsl(var(--warning))" />
              <Bar dataKey="Poor" stackId="a" fill="hsl(var(--destructive))" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
