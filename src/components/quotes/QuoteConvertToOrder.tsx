import { Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface QuoteConvertToOrderProps {
  quoteId: string;
  status: string;
}

export function QuoteConvertToOrder({ quoteId, status }: QuoteConvertToOrderProps) {
  const navigate = useNavigate();

  if (status !== "approved") return null;

  const handleConvert = () => {
    navigate(`/pedidos/novo?from_quote=${quoteId}`);
    toast.info("Criando pedido a partir do orçamento...");
  };

  return (
    <Button onClick={handleConvert} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
      <Package className="h-4 w-4" />
      Converter em Pedido
    </Button>
  );
}
