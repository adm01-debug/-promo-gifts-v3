/**
 * ComparisonRadarChart — Radar visual de até 5 dimensões para múltiplos produtos.
 * Eixos: Preço (invertido), Estoque, Variedade de cores, Qtd mínima (invertido), Lead time (invertido).
 */
import { useMemo, useState } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

interface ComparisonRadarChartProps {
  products: any[];
  className?: string;
}

const COLORS = [
  "hsl(var(--primary))",
  "#22c55e", // green-500
  "#eab308", // yellow-500
  "#ef4444", // red-500
  "#8b5cf6", // violet-500
  "#06b6d4", // cyan-500
  "#f97316", // orange-500
  "#ec4899", // pink-500
  "#6366f1", // indigo-500
  "#14b8a6", // teal-500
  "#f43f5e", // rose-500
  "#a855f7", // purple-500
];

function leadTimeScore(status: string | undefined): number {
  // Higher is better in radar (already inverted)
  switch (status) {
    case "in-stock": return 100;
    case "low-stock": return 60;
    case "out-of-stock": return 20;
    default: return 50;
  }
}

export function ComparisonRadarChart({ products, className }: ComparisonRadarChartProps) {
  const data = useMemo(() => {
    if (!products || products.length === 0) return [];

    const prices = products.map(p => Number(p.price ?? 0));
    const stocks = products.map(p => Number(p.stock ?? 0));
    const mins = products.map(p => Number(p.minQuantity ?? 1));
    const colorCounts = products.map(p => p.colors?.length ?? 0);

    const maxPrice = Math.max(...prices, 1);
    const maxStock = Math.max(...stocks, 1);
    const maxMin = Math.max(...mins, 1);
    const maxColors = Math.max(...colorCounts, 1);

    const axes = [
      { key: "Economia", values: prices.map(v => Math.round((1 - v / maxPrice) * 100)) },
      { key: "Pronta Entrega", values: stocks.map(v => Math.round((v / maxStock) * 100)) },
      { key: "Variedade", values: colorCounts.map(v => Math.round((v / maxColors) * 100)) },
      { key: "Acessibilidade", values: mins.map(v => Math.round((1 - (v - 1) / Math.max(1, maxMin - 1)) * 100)) },
      { key: "Rapidez", values: products.map(p => leadTimeScore(p.stockStatus)) },
    ];

    return axes.map(axis => {
      const row: any = { axis: axis.key };
      products.forEach((p, i) => {
        // Normalizamos para 0-100; se todos forem iguais, fica no topo (100)
        row[String(p.id)] = Math.max(0, Math.min(100, axis.values[i]));
      });
      return row;
    });
  }, [products]);

  const chartId = useMemo(() => `radar-${Math.random().toString(36).substr(2, 9)}`, []);

  const [opacity, setOpacity] = useState<Record<string, number>>({});

  const handleMouseEnter = (o: any) => {
    const { dataKey } = o;
    setOpacity({ [dataKey]: 0.8 });
  };

  const handleMouseLeave = () => {
    setOpacity({});
  };

  if (products.length < 2) return null;

  return (
    <div className={className}>
      <div className="rounded-xl border-[2px] border-amber-400/20 bg-gradient-to-br from-amber-400/5 to-transparent p-4 shadow-sm">
        <h3 className="text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2 text-amber-600">
          <span className="inline-block w-1.5 h-4 bg-amber-500 rounded-full animate-pulse" />
          Radar de Performance (0–100)
        </h3>
        <ResponsiveContainer width="100%" height={320}>
          <RadarChart data={data} outerRadius="75%">
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis dataKey="axis" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value: any, name: string) => {
                const p = products.find(x => String(x.id) === name);
                return [value, p?.name ?? name];
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12 }}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              formatter={(value) => {
                const p = products.find(x => String(x.id) === value);
                return p?.name?.slice(0, 28) ?? value;
              }}
            />
            {products.map((p, i) => (
              <Radar
                key={String(p.id)}
                id={`${chartId}-${String(p.id)}`}
                name={String(p.id)}
                dataKey={String(p.id)}
                stroke={COLORS[i % COLORS.length]}
                fill={COLORS[i % COLORS.length]}
                fillOpacity={opacity[String(p.id)] ?? (Object.keys(opacity).length > 0 ? 0.05 : 0.18)}
                strokeOpacity={opacity[String(p.id)] ? 1 : (Object.keys(opacity).length > 0 ? 0.2 : 0.8)}
                strokeWidth={2}
                animationBegin={i * 100}
                animationDuration={800}
              />
            ))}
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
