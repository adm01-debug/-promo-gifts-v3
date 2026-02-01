import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useCreateFutureStock } from "@/hooks/useFutureStock";

interface ColorVariation {
  name: string;
  hex: string;
  sku?: string;
  stock?: number;
  image?: string;
}

interface AddFutureStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
  productSku: string;
  colors: ColorVariation[];
}

export function AddFutureStockDialog({
  open,
  onOpenChange,
  productId,
  productName,
  productSku,
  colors,
}: AddFutureStockDialogProps) {
  const { toast } = useToast();
  const createFutureStock = useCreateFutureStock();
  
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [quantity, setQuantity] = useState("");
  const [expectedDate, setExpectedDate] = useState<Date>();
  const [source, setSource] = useState<"purchase_order" | "production" | "transfer" | "manual">("manual");
  const [supplierName, setSupplierName] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"pending" | "confirmed" | "in_transit">("pending");

  const handleSubmit = async () => {
    if (!quantity || !expectedDate) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha a quantidade e a data prevista.",
        variant: "destructive",
      });
      return;
    }

    const quantityNum = parseInt(quantity);
    if (isNaN(quantityNum) || quantityNum <= 0) {
      toast({
        title: "Quantidade inválida",
        description: "Informe uma quantidade válida maior que zero.",
        variant: "destructive",
      });
      return;
    }

    const selectedColorData = colors.find(c => c.name === selectedColor);

    try {
      await createFutureStock.mutateAsync({
        product_id: productId,
        product_name: productName,
        product_sku: productSku,
        color_name: selectedColor || undefined,
        color_hex: selectedColorData?.hex,
        variant_sku: selectedColorData?.sku,
        expected_quantity: quantityNum,
        expected_date: format(expectedDate, "yyyy-MM-dd"),
        source,
        status,
        supplier_name: supplierName || undefined,
        notes: notes || undefined,
      });

      toast({
        title: "Previsão adicionada",
        description: `Previsão de ${quantityNum} unidades para ${format(expectedDate, "dd/MM/yyyy")} criada com sucesso.`,
      });

      // Reset form
      setSelectedColor("");
      setQuantity("");
      setExpectedDate(undefined);
      setSource("manual");
      setSupplierName("");
      setNotes("");
      setStatus("pending");
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Erro ao criar previsão",
        description: "Não foi possível salvar a previsão. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Previsão de Estoque</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Cor/Variação */}
          <div className="space-y-2">
            <Label>Cor/Variação (opcional)</Label>
            <Select value={selectedColor} onValueChange={setSelectedColor}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma cor (ou deixe vazio para geral)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Geral (todas as cores)</SelectItem>
                {colors.map((color) => (
                  <SelectItem key={color.name} value={color.name}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full border border-border"
                        style={{ backgroundColor: color.hex }}
                      />
                      {color.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quantidade */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantidade *</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              placeholder="Ex: 500"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>

          {/* Data prevista */}
          <div className="space-y-2">
            <Label>Data Prevista *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !expectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {expectedDate ? format(expectedDate, "PPP", { locale: ptBR }) : "Selecione uma data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={expectedDate}
                  onSelect={setExpectedDate}
                  initialFocus
                  locale={ptBR}
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Origem */}
          <div className="space-y-2">
            <Label>Origem</Label>
            <Select value={source} onValueChange={(v) => setSource(v as typeof source)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="purchase_order">Pedido de Compra</SelectItem>
                <SelectItem value="production">Produção</SelectItem>
                <SelectItem value="transfer">Transferência</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Aguardando</SelectItem>
                <SelectItem value="confirmed">Confirmado</SelectItem>
                <SelectItem value="in_transit">Em Trânsito</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Fornecedor */}
          <div className="space-y-2">
            <Label htmlFor="supplier">Fornecedor (opcional)</Label>
            <Input
              id="supplier"
              placeholder="Nome do fornecedor"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
            />
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Notas adicionais..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={createFutureStock.isPending}>
            {createFutureStock.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar Previsão
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
