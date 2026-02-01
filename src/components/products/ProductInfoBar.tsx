import { Building2, CalendarClock, GitCompare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ProductInfoBarProps {
  sku: string;
  supplierName: string;
  onOpenFutureStock: () => void;
  onOpenSupplierComparison: () => void;
  hasFutureStock?: boolean;
}

export function ProductInfoBar({
  sku,
  supplierName,
  onOpenFutureStock,
  onOpenSupplierComparison,
  hasFutureStock = true,
}: ProductInfoBarProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* SKU */}
      <Badge 
        variant="secondary" 
        className="font-mono text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-muted"
      >
        SKU: {sku}
      </Badge>

      {/* Fornecedor */}
      <Badge 
        variant="outline" 
        className="text-xs px-3 py-1.5 rounded-full font-medium border-border bg-card"
      >
        <Building2 className="h-3.5 w-3.5 mr-1.5 text-orange-500" />
        {supplierName}
      </Badge>

      {/* Estoque Futuro */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenFutureStock}
            className="rounded-full h-8 px-3 text-xs gap-1.5 hover:border-orange-500/50 hover:bg-orange-500/5"
          >
            <CalendarClock className="h-3.5 w-3.5 text-orange-500" />
            Estoque Futuro
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Ver previsão de reposição de estoque
        </TooltipContent>
      </Tooltip>

      {/* Comparar Fornecedores */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenSupplierComparison}
            className="rounded-full h-8 px-3 text-xs gap-1.5"
          >
            <GitCompare className="h-3.5 w-3.5 text-muted-foreground" />
            Comparar Fornecedores
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Ver mesmo produto em outros fornecedores
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
