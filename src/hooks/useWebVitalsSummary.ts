/**
 * useWebVitalsSummary — Fetches aggregated Web Vitals metrics from RPC.
 * Admin-only. Returns p50/p75/p95/p99, distribution, slowest pages, daily trend.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface VitalsPercentile {
  metric_name: string;
  samples: number;
  p50: number;
  p75: number;
  p95: number;
  p99: number;
}

export interface VitalsDistribution {
  metric_name: string;
  good_pct: number | null;
  ni_pct: number | null;
  poor_pct: number | null;
}

export interface VitalsSlowestPage {
  page_url: string;
  metric_name: string;
  samples: number;
  p75: number;
}

export interface VitalsDailyTrend {
  day: string;
  metric_name: string;
  p75: number;
  samples: number;
}

export interface VitalsNavBreakdown {
  navigation_type: string;
  metric_name: string;
  p75: number;
  samples: number;
}

export interface WebVitalsSummary {
  days: number;
  cutoff: string;
  total_samples: number;
  percentiles: VitalsPercentile[];
  distribution: VitalsDistribution[];
  slowest_pages: VitalsSlowestPage[];
  daily_trend: VitalsDailyTrend[];
  nav_breakdown: VitalsNavBreakdown[];
}

export function useWebVitalsSummary(days: number = 7, metric: string | null = null) {
  return useQuery<WebVitalsSummary>({
    queryKey: ["web-vitals-summary", days, metric],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_web_vitals_summary" as never, {
        days,
        metric_filter: metric,
      } as never);
      if (error) throw error;
      return data as unknown as WebVitalsSummary;
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
