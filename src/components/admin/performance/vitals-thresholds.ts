/**
 * Google Core Web Vitals thresholds (official, as of 2024).
 * https://web.dev/articles/vitals
 */
export type VitalRating = "good" | "needs-improvement" | "poor";

export interface VitalThreshold {
  good: number;
  poor: number;
  unit: "ms" | "score";
  label: string;
  description: string;
}

export const VITAL_THRESHOLDS: Record<string, VitalThreshold> = {
  LCP: { good: 2500, poor: 4000, unit: "ms", label: "LCP", description: "Largest Contentful Paint" },
  INP: { good: 200, poor: 500, unit: "ms", label: "INP", description: "Interaction to Next Paint" },
  CLS: { good: 0.1, poor: 0.25, unit: "score", label: "CLS", description: "Cumulative Layout Shift" },
  FCP: { good: 1800, poor: 3000, unit: "ms", label: "FCP", description: "First Contentful Paint" },
  TTFB: { good: 800, poor: 1800, unit: "ms", label: "TTFB", description: "Time to First Byte" },
};

export function rateValue(metric: string, value: number): VitalRating {
  const t = VITAL_THRESHOLDS[metric];
  if (!t) return "good";
  if (value <= t.good) return "good";
  if (value <= t.poor) return "needs-improvement";
  return "poor";
}

export function formatVital(metric: string, value: number | null | undefined): string {
  if (value == null) return "—";
  const t = VITAL_THRESHOLDS[metric];
  if (!t) return value.toFixed(2);
  return t.unit === "ms" ? `${Math.round(value)}ms` : value.toFixed(3);
}

export function ratingClasses(rating: VitalRating) {
  switch (rating) {
    case "good":
      return { text: "text-success", bg: "bg-success/10", border: "border-success/20" };
    case "needs-improvement":
      return { text: "text-warning", bg: "bg-warning/10", border: "border-warning/20" };
    case "poor":
      return { text: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/20" };
  }
}
