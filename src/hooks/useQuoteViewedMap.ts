/**
 * useQuoteViewedMap — busca o mapa quoteId → viewed_at mais recente
 * a partir de quote_approval_tokens. Usado para exibir o badge
 * "Visualizado pelo cliente" na lista de orçamentos.
 */
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ViewedInfo {
  viewedAt: string;
  respondedAt: string | null;
  response: string | null;
}

export function useQuoteViewedMap(quoteIds: string[]) {
  const [map, setMap] = useState<Record<string, ViewedInfo>>({});
  const stableIds = useMemo(() => [...quoteIds].sort().join(","), [quoteIds]);

  useEffect(() => {
    if (!quoteIds.length) {
      setMap({});
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("quote_approval_tokens")
        .select("quote_id, viewed_at, responded_at, response")
        .in("quote_id", quoteIds)
        .not("viewed_at", "is", null)
        .order("viewed_at", { ascending: false });

      if (cancelled || error || !data) return;

      const next: Record<string, ViewedInfo> = {};
      for (const row of data) {
        const id = String(row.quote_id);
        if (!next[id] && row.viewed_at) {
          next[id] = {
            viewedAt: row.viewed_at,
            respondedAt: row.responded_at,
            response: row.response,
          };
        }
      }
      setMap(next);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stableIds]);

  return map;
}
