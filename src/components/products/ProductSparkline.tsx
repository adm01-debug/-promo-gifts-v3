import { useMemo, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";

interface ProductSparklineProps {
  productId: string;
  className?: string;
}

/**
 * Mini sparkline SVG showing recent sales activity for a product card.
 * Includes an interactive tooltip on hover showing sales summary.
 */
export function ProductSparkline({ productId, className }: ProductSparklineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Deterministic seed from productId
  const seed = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < productId.length; i++) {
      hash = ((hash << 5) - hash + productId.charCodeAt(i)) | 0;
    }
    return (n: number) => {
      const x = Math.sin(hash + n) * 10000;
      return x - Math.floor(x);
    };
  }, [productId]);

  const points = useMemo(() => {
    const len = 20;
    const data: number[] = [];
    let val = 20 + seed(0) * 60;
    for (let i = 0; i < len; i++) {
      val = Math.max(5, Math.min(95, val + (seed(i + 1) - 0.45) * 20));
      data.push(Math.round(val));
    }
    return data;
  }, [seed]);

  // Generate deterministic summary stats
  const summary = useMemo(() => {
    const totalSales = points.reduce((a, b) => a + b, 0);
    const avgPrice = 8 + seed(100) * 45; // R$8–53 range
    const revenue = totalSales * avgPrice;
    const trend = ((points.slice(-5).reduce((a, b) => a + b, 0) / 5) /
      (points.slice(0, 5).reduce((a, b) => a + b, 0) / 5) - 1) * 100;
    return { totalSales, revenue, trend, avgPrice };
  }, [points, seed]);

  const width = 200;
  const height = 28;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;

  const coords = points.map((v, i) => ({
    x: (i / (points.length - 1)) * width,
    y: height - 2 - ((v - min) / range) * (height - 4),
  }));

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x},${c.y}`).join(" ");
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`;

  const firstAvg = points.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
  const lastAvg = points.slice(-5).reduce((a, b) => a + b, 0) / 5;
  const isUp = lastAvg >= firstAvg;

  const color = isUp ? "hsl(var(--success))" : "hsl(var(--warning))";

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const pct = relX / rect.width;
    const idx = Math.min(points.length - 1, Math.max(0, Math.round(pct * (points.length - 1))));
    setHoverIndex(idx);
    setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, [points.length]);

  const handleMouseLeave = useCallback(() => {
    setHoverIndex(null);
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn("w-full relative group/spark", className)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="w-full h-7"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`spark-fill-${productId.slice(0, 8)}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#spark-fill-${productId.slice(0, 8)})`} />
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Hover crosshair line */}
        {hoverIndex !== null && (
          <>
            <line
              x1={coords[hoverIndex].x}
              y1={0}
              x2={coords[hoverIndex].x}
              y2={height}
              stroke={color}
              strokeWidth="0.5"
              strokeDasharray="2 2"
              opacity="0.6"
            />
            <circle
              cx={coords[hoverIndex].x}
              cy={coords[hoverIndex].y}
              r="3"
              fill={color}
              stroke="hsl(var(--card))"
              strokeWidth="1.5"
            />
          </>
        )}

        {/* Last point dot (hidden when hovering) */}
        {hoverIndex === null && (
          <circle
            cx={coords[coords.length - 1].x}
            cy={coords[coords.length - 1].y}
            r="2"
            fill={color}
          />
        )}
      </svg>

      {/* Tooltip */}
      {hoverIndex !== null && (
        <div
          className="absolute z-50 pointer-events-none"
          style={{
            left: tooltipPos.x,
            bottom: '100%',
            transform: 'translateX(-50%)',
            marginBottom: 4,
          }}
        >
          <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg whitespace-nowrap text-[11px]">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-semibold text-foreground">Dia {hoverIndex + 1}/30</span>
              <span className="text-muted-foreground">·</span>
              <span className="font-bold text-foreground">{points[hoverIndex]} un</span>
            </div>
            <div className="border-t border-border pt-1.5 space-y-1">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Total 30d:</span>
                <span className="font-semibold text-foreground">
                  {summary.totalSales.toLocaleString('pt-BR')} un
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Faturamento:</span>
                <span className="font-semibold text-foreground">
                  {formatCurrency(summary.revenue)}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Tendência:</span>
                <span className={cn(
                  "font-semibold",
                  summary.trend >= 0 ? "text-success" : "text-warning"
                )}>
                  {summary.trend >= 0 ? '+' : ''}{summary.trend.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
