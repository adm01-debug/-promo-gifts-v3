import { Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export function DiscountApprovalHeaderBadge() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const { data: count = 0 } = useQuery({
    queryKey: ["pending-discount-approvals-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("discount_approval_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      return count || 0;
    },
    enabled: isAdmin,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  if (!isAdmin || count === 0) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-full"
          onClick={() => navigate("/admin/aprovacoes-desconto")}
          aria-label={`${count} aprovações de desconto pendentes`}
        >
          <Shield className="h-4 w-4 text-amber-500" />
          <Badge
            className={cn(
              "absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 text-[10px] font-bold",
              "bg-amber-500 text-white border-0 animate-pulse"
            )}
          >
            {count > 9 ? "9+" : count}
          </Badge>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>{count} desconto{count !== 1 ? "s" : ""} aguardando aprovação</p>
      </TooltipContent>
    </Tooltip>
  );
}
