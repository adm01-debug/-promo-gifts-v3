/**
 * QuoteVersionsList — lista todas as versões do orçamento (revisões).
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { GitBranch } from "lucide-react";

interface QuoteVersionsListProps {
  quoteId: string;
  parentQuoteId?: string | null;
}

export function QuoteVersionsList({ quoteId, parentQuoteId }: QuoteVersionsListProps) {
  const rootId = parentQuoteId ?? quoteId;

  const { data, isLoading } = useQuery({
    queryKey: ["quote-versions", rootId],
    queryFn: async () => {
      const { data, error } = await supabase
        // rls-allow: lookup por quote.id; RLS valida ownership
        .from("quotes")
        .select("id, quote_number, version, status, created_at, is_latest_version")
        .or(`id.eq.${rootId},parent_quote_id.eq.${rootId}`)
        .order("version", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) return <Skeleton className="h-24" />;
  if (!data?.length) return null;

  return (
    <ul className="space-y-2">
      {data.map((v) => (
        <li
          key={v.id}
          className="flex items-center justify-between rounded-xl border p-3 text-sm"
        >
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">v{v.version}</span>
            <span className="text-muted-foreground">{v.quote_number}</span>
          </div>
          <div className="flex items-center gap-2">
            {v.is_latest_version && <Badge variant="default">Atual</Badge>}
            <span className="text-[11px] text-muted-foreground">
              {new Date(v.created_at).toLocaleDateString("pt-BR")}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
