import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { DollarSign, Plus, Pencil, Trash2, Loader2, Search, Info } from "lucide-react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Mock data
const mockTechniques = [
  { id: "1", code: "SERI", name: "Serigrafia" },
  { id: "2", code: "LASER", name: "Gravação a Laser" },
  { id: "3", code: "TAMP", name: "Tampografia" },
  { id: "4", code: "BORDO", name: "Bordado" },
  { id: "5", code: "SUBLI", name: "Sublimação" },
];

const mockPricingRules = [
  {
    id: "1",
    techniqueId: "1",
    techniqueName: "Serigrafia",
    techniqueCode: "SERI",
    colorCount: 1,
    minQuantity: 50,
    maxQuantity: 100,
    setupCost: 80.00,
    unitCost: 1.50,
  },
  {
    id: "2",
    techniqueId: "1",
    techniqueName: "Serigrafia",
    techniqueCode: "SERI",
    colorCount: 1,
    minQuantity: 101,
    maxQuantity: 500,
    setupCost: 80.00,
    unitCost: 1.00,
  },
  {
    id: "3",
    techniqueId: "1",
    techniqueName: "Serigrafia",
    techniqueCode: "SERI",
    colorCount: 2,
    minQuantity: 50,
    maxQuantity: 100,
    setupCost: 140.00,
    unitCost: 2.20,
  },
  {
    id: "4",
    techniqueId: "2",
    techniqueName: "Gravação a Laser",
    techniqueCode: "LASER",
    colorCount: 1,
    minQuantity: 10,
    maxQuantity: 50,
    setupCost: 50.00,
    unitCost: 3.00,
  },
  {
    id: "5",
    techniqueId: "2",
    techniqueName: "Gravação a Laser",
    techniqueCode: "LASER",
    colorCount: 1,
    minQuantity: 51,
    maxQuantity: 200,
    setupCost: 50.00,
    unitCost: 2.00,
  },
  {
    id: "6",
    techniqueId: "3",
    techniqueName: "Tampografia",
    techniqueCode: "TAMP",
    colorCount: 1,
    minQuantity: 100,
    maxQuantity: 500,
    setupCost: 60.00,
    unitCost: 0.80,
  },
];

interface PricingRule {
  id: string;
  techniqueId: string;
  techniqueName: string;
  techniqueCode: string;
  colorCount: number;
  minQuantity: number;
  maxQuantity: number;
  setupCost: number;
  unitCost: number;
}

interface PricingFormData {
  techniqueId: string;
  colorCount: string;
  minQuantity: string;
  maxQuantity: string;
  setupCost: string;
  unitCost: string;
}

const initialFormData: PricingFormData = {
  techniqueId: "",
  colorCount: "1",
  minQuantity: "1",
  maxQuantity: "100",
  setupCost: "0",
  unitCost: "0",
};

export function PricingPanel() {
  const [pricingRules, setPricingRules] = useState<PricingRule[]>(mockPricingRules);
  const [techniques] = useState(mockTechniques);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTechnique, setFilterTechnique] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingRule, setEditingRule] = useState<PricingRule | null>(null);
  const [formData, setFormData] = useState<PricingFormData>(initialFormData);

  const filteredRules = pricingRules.filter((rule) => {
    const matchesSearch =
      rule.techniqueName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.techniqueCode.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTechnique =
      filterTechnique === "all" || rule.techniqueId === filterTechnique;
    return matchesSearch && matchesTechnique;
  });

  const handleOpenDialog = (rule?: PricingRule) => {
    if (rule) {
      setEditingRule(rule);
      setFormData({
        techniqueId: rule.techniqueId,
        colorCount: rule.colorCount.toString(),
        minQuantity: rule.minQuantity.toString(),
        maxQuantity: rule.maxQuantity.toString(),
        setupCost: rule.setupCost.toString(),
        unitCost: rule.unitCost.toString(),
      });
    } else {
      setEditingRule(null);
      setFormData(initialFormData);
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.techniqueId) {
      toast.error("Selecione uma técnica");
      return;
    }

    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 800));

    const technique = techniques.find((t) => t.id === formData.techniqueId);
    
    const newRule: PricingRule = {
      id: editingRule?.id || Date.now().toString(),
      techniqueId: formData.techniqueId,
      techniqueName: technique?.name || "",
      techniqueCode: technique?.code || "",
      colorCount: parseInt(formData.colorCount) || 1,
      minQuantity: parseInt(formData.minQuantity) || 1,
      maxQuantity: parseInt(formData.maxQuantity) || 100,
      setupCost: parseFloat(formData.setupCost) || 0,
      unitCost: parseFloat(formData.unitCost) || 0,
    };

    if (editingRule) {
      setPricingRules((prev) =>
        prev.map((r) => (r.id === editingRule.id ? newRule : r))
      );
      toast.success("Regra de preço atualizada!");
    } else {
      setPricingRules((prev) => [...prev, newRule]);
      toast.success("Regra de preço cadastrada!");
    }

    setIsLoading(false);
    setIsDialogOpen(false);
    setFormData(initialFormData);
    setEditingRule(null);
  };

  const handleDelete = async (id: string) => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setPricingRules((prev) => prev.filter((r) => r.id !== id));
    toast.success("Regra de preço removida!");
    setIsLoading(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Tabela de Preços
            </CardTitle>
            <CardDescription>
              Configure os valores de gravação por técnica, cores e quantidade
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Regra
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {editingRule ? "Editar Regra de Preço" : "Nova Regra de Preço"}
                </DialogTitle>
                <DialogDescription>
                  Defina os valores para uma faixa de quantidade
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Técnica *</Label>
                  <Select
                    value={formData.techniqueId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, techniqueId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a técnica" />
                    </SelectTrigger>
                    <SelectContent>
                      {techniques.map((technique) => (
                        <SelectItem key={technique.id} value={technique.id}>
                          {technique.name} ({technique.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="colorCount">Número de Cores</Label>
                  <Input
                    id="colorCount"
                    type="number"
                    min="1"
                    value={formData.colorCount}
                    onChange={(e) =>
                      setFormData({ ...formData, colorCount: e.target.value })
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="minQuantity">Qtd. Mínima</Label>
                    <Input
                      id="minQuantity"
                      type="number"
                      min="1"
                      value={formData.minQuantity}
                      onChange={(e) =>
                        setFormData({ ...formData, minQuantity: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxQuantity">Qtd. Máxima</Label>
                    <Input
                      id="maxQuantity"
                      type="number"
                      min="1"
                      value={formData.maxQuantity}
                      onChange={(e) =>
                        setFormData({ ...formData, maxQuantity: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="setupCost">Custo de Setup</Label>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          Valor cobrado uma vez por pedido para preparação
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="setupCost"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="R$ 0,00"
                      value={formData.setupCost}
                      onChange={(e) =>
                        setFormData({ ...formData, setupCost: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="unitCost">Custo Unitário</Label>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          Valor cobrado por unidade gravada
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="unitCost"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="R$ 0,00"
                      value={formData.unitCost}
                      onChange={(e) =>
                        setFormData({ ...formData, unitCost: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={isLoading}>
                  {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingRule ? "Salvar Alterações" : "Cadastrar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterTechnique} onValueChange={setFilterTechnique}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filtrar por técnica" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as técnicas</SelectItem>
              {techniques.map((technique) => (
                <SelectItem key={technique.id} value={technique.id}>
                  {technique.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Técnica</TableHead>
                <TableHead className="text-center">Cores</TableHead>
                <TableHead className="text-center">Faixa Qtd.</TableHead>
                <TableHead className="text-right">Setup</TableHead>
                <TableHead className="text-right">Unitário</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhuma regra de preço encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filteredRules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono">
                          {rule.techniqueCode}
                        </Badge>
                        <span className="font-medium">{rule.techniqueName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{rule.colorCount}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {rule.minQuantity} - {rule.maxQuantity}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(rule.setupCost)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(rule.unitCost)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(rule)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(rule.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
