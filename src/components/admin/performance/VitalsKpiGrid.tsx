/**
 * VitalsKpiGrid — KPI cards for each Web Vital with color coded by Google rating.
 */
import { Activity, Gauge, MousePointerClick, Move, Timer } from "lucide-react";
import { KpiCard } from "@/components/ui/kpi-card";
import { VITAL_THRESHOLDS, formatVital, rateValue, ratingClasses } from "./vitals-thresholds";
import type { VitalsPercentile } from "@/hooks/useWebVitalsSummary";

const ICONS: Record<string, typeof Gauge> = {
  LCP: Gauge,
  INP: MousePointerClick,
  CLS: Move,
  FCP: Timer,
  TTFB: Activity,
};

interface Props {
  percentiles: VitalsPercentile[];
}

export function VitalsKpiGrid({ percentiles }: Props) {
  const byMetric = new Map(percentiles.map((p) => [p.metric_name, p]));

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
      {Object.keys(VITAL_THRESHOLDS).map((metric) => {
        const p = byMetric.get(metric);
        const value = p?.p75 ?? null;
        const rating = value != null ? rateValue(metric, value) : "good";
        const cls = ratingClasses(rating);
        const Icon = ICONS[metric] ?? Activity;
        const t = VITAL_THRESHOLDS[metric];

        return (
          <KpiCard
            key={metric}
            icon={Icon}
            label={`${metric} p75`}
            value={formatVital(metric, value)}
            sub={p ? `${p.samples} samples` : "sem dados"}
            customValueColor={value != null ? cls.text : undefined}
            ariaLabel={`${t.description}: p75 ${formatVital(metric, value)}, ${rating}`}
          />
        );
      })}
    </div>
  );
}
