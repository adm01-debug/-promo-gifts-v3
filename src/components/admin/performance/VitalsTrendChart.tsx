/**
 * VitalsTrendChart — Line chart of p75 over time, one line per metric.
 */
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { VitalsDailyTrend } from "@/hooks/useWebVitalsSummary";

interface Props {
  trend: VitalsDailyTrend[];
}

const COLORS: Record<string, string> = {
  LCP: "hsl(var(--primary))",
  INP: "hsl(var(--destructive))",
  CLS: "hsl(var(--warning))",
  FCP: "hsl(var(--success))",
  TTFB: "hsl(var(--muted-foreground))",
};

export function VitalsTrendChart({ trend }: Props) {
  const { data, metrics } = useMemo(() => {
    const byDay = new Map<string, Record<string, number | string>>();
    const metricSet = new Set<string>();
    for (const t of trend) {
      const day = new Date(t.day).toISOString().slice(5, 10);
      metricSet.add(t.metric_name);
      const row = byDay.get(day) ?? { day };
      row[t.metric_name] = Math.round(t.p75);
      byDay.set(day, row);
    }
    return {
      data: Array.from(byDay.values()).sort((a, b) => String(a.day).localeCompare(String(b.day))),
      metrics: Array.from(metricSet),
    };
  }, [trend]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-display">Tendência p75 (diária)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              {metrics.map((m) => (
                <Line
                  key={m}
                  type="monotone"
                  dataKey={m}
                  stroke={COLORS[m] ?? "hsl(var(--primary))"}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
