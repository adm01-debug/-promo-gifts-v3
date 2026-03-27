import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface ProductSparklineProps {
  productId: string;
  className?: string;
}

/**
 * Mini sparkline SVG showing recent sales activity for a product card.
 * Uses a deterministic pseudo-random seed from productId to generate demo data.
 */
export function ProductSparkline({ productId, className }: ProductSparklineProps) {
  const points = useMemo(() => {
    // Deterministic seed from productId
    let hash = 0;
    for (let i = 0; i < productId.length; i++) {
      hash = ((hash << 5) - hash + productId.charCodeAt(i)) | 0;
    }
    const seed = (n: number) => {
      const x = Math.sin(hash + n) * 10000;
      return x - Math.floor(x);
    };

    const len = 20;
    const data: number[] = [];
    let val = 20 + seed(0) * 60;
    for (let i = 0; i < len; i++) {
      val = Math.max(5, Math.min(95, val + (seed(i + 1) - 0.45) * 20));
      data.push(val);
    }
    return data;
  }, [productId]);

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

  // Trend: compare last 5 vs first 5
  const firstAvg = points.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
  const lastAvg = points.slice(-5).reduce((a, b) => a + b, 0) / 5;
  const isUp = lastAvg >= firstAvg;

  return (
    <div className={cn("w-full", className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="w-full h-7"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`spark-fill-${productId.slice(0, 8)}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isUp ? "hsl(var(--success))" : "hsl(var(--warning))"} stopOpacity="0.3" />
            <stop offset="100%" stopColor={isUp ? "hsl(var(--success))" : "hsl(var(--warning))"} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#spark-fill-${productId.slice(0, 8)})`} />
        <path
          d={linePath}
          fill="none"
          stroke={isUp ? "hsl(var(--success))" : "hsl(var(--warning))"}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Last point dot */}
        <circle
          cx={coords[coords.length - 1].x}
          cy={coords[coords.length - 1].y}
          r="2"
          fill={isUp ? "hsl(var(--success))" : "hsl(var(--warning))"}
        />
      </svg>
    </div>
  );
}
