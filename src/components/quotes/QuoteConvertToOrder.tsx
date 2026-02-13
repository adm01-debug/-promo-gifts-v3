import { Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface QuoteConvertToOrderProps {
  quoteId: string;
  status: string;
}

export function QuoteConvertToOrder({ quoteId, status }: QuoteConvertToOrderProps) {

  if (status !== "approved") return null;

  const handleConvert = () => {
    toast.info("Funcionalidade de pedidos em desenvolvimento. O orçamento aprovado será processado externamente.");
  };

  return (
    <Button onClick={handleConvert} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
      <Package className="h-4 w-4" />
      Converter em Pedido
    </Button>
  );
}
