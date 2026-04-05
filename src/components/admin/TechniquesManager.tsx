import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  Loader2,
  Palette,
  Database,
  Droplets,
  Ruler,
  Hash,
  Clock,
  Package,
} from "lucide-react";
import { InlineEditField } from "./InlineEditField";
import { useTecnicasUnificadas, useCategoriasTecnicas } from "@/hooks/useTecnicasUnificadas";

export function TechniquesManager() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTechnique, setNewTechnique] = useState({
    code: "",
    name: "",
    description: "",
    category: "",
    setupPrice: "",
    handlingPrice: "",
    minColors: "",
    maxColors: "",
    minQuantity: "",
    estimatedDays: "",
    priceByColor: false,
    priceByArea: false,
    priceByStitches: false,
    displayOrder: "",
  });

  const { 
    tecnicas, 
    isLoading, 
    toggleStatus,
    create,
    isCreating,
    update,
    remove,
    isRemoving,
  } = useTecnicasUnificadas();

  const categorias = useCategoriasTecnicas();

  const handleAdd = () => {
    if (!newTechnique.name || !newTechnique.code) return;
    
    create({
      code: newTechnique.code.toUpperCase(),
      name: newTechnique.name,
      description: newTechnique.description || undefined,
      category: newTechnique.category || 'Outros',
      setup_price: newTechnique.setupPrice ? parseFloat(newTechnique.setupPrice) : undefined,
      handling_price: newTechnique.handlingPrice ? parseFloat(newTechnique.handlingPrice) : undefined,
      min_colors: newTechnique.minColors ? parseInt(newTechnique.minColors) : 1,
      max_colors: newTechnique.maxColors ? parseInt(newTechnique.maxColors) : undefined,
      min_quantity: newTechnique.minQuantity ? parseInt(newTechnique.minQuantity) : undefined,
      estimated_days: newTechnique.estimatedDays ? parseInt(newTechnique.estimatedDays) : undefined,
      price_by_color: newTechnique.priceByColor,
      price_by_area: newTechnique.priceByArea,
      price_by_stitches: newTechnique.priceByStitches,
      display_order: newTechnique.displayOrder ? parseInt(newTechnique.displayOrder) : 0,
      is_active: true,
      requires_color_count: newTechnique.priceByColor || !!newTechnique.maxColors,
    });
    
    setIsAddOpen(false);
    setNewTechnique({
      code: "",
      name: "",
      description: "",
      category: "",
      setupPrice: "",
      handlingPrice: "",
      minColors: "",
      maxColors: "",
      minQuantity: "",
      estimatedDays: "",
      priceByColor: false,
      priceByArea: false,
      priceByStitches: false,
      displayOrder: "",
    });
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return "—";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const getPricingBadges = (tecnica: typeof tecnicas[0]) => {
    const badges = [];
    if (tecnica.precoPorCor) badges.push({ label: 'Cor', icon: Droplets, color: 'bg-info/10 text-info' });
    if (tecnica.precoPorArea) badges.push({ label: 'Área', icon: Ruler, color: 'bg-success/10 text-success' });
    if (tecnica.precoPorPontos) badges.push({ label: 'Pontos', icon: Hash, color: 'bg-primary/10 text-primary' });
    return badges;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Técnicas de Personalização
              <Badge variant="outline" className="ml-2 gap-1">
                <Database className="h-3 w-3" />
                BD Externo
              </Badge>
            </CardTitle>
            <CardDescription>
              Gerencie as técnicas disponíveis no catálogo Promobrind
            </CardDescription>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Técnica
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Nova Técnica de Personalização</DialogTitle>
                <DialogDescription>
                  Adicione uma nova técnica ao catálogo (BD Externo)
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Código *</Label>
                    <Input
                      placeholder="Ex: SERI, LASER"
                      value={newTechnique.code}
                      onChange={(e) => setNewTechnique({ ...newTechnique, code: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Nome *</Label>
                    <Input
                      placeholder="Ex: Serigrafia"
                      value={newTechnique.name}
                      onChange={(e) => setNewTechnique({ ...newTechnique, name: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Categoria</Label>
                    <Select 
                      value={newTechnique.category} 
                      onValueChange={(v) => setNewTechnique({ ...newTechnique, category: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {categorias.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                        <SelectItem value="Outros">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Ordem de Exibição</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={newTechnique.displayOrder}
                      onChange={(e) => setNewTechnique({ ...newTechnique, displayOrder: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label>Descrição</Label>
                  <Textarea
                    placeholder="Descrição da técnica..."
                    value={newTechnique.description}
                    onChange={(e) => setNewTechnique({ ...newTechnique, description: e.target.value })}
                  />
                </div>

                {/* Pricing */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Custo de Setup (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={newTechnique.setupPrice}
                      onChange={(e) => setNewTechnique({ ...newTechnique, setupPrice: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Custo de Manuseio (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={newTechnique.handlingPrice}
                      onChange={(e) => setNewTechnique({ ...newTechnique, handlingPrice: e.target.value })}
                    />
                  </div>
                </div>

                {/* Colors */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Mín. Cores</Label>
                    <Input
                      type="number"
                      placeholder="1"
                      value={newTechnique.minColors}
                      onChange={(e) => setNewTechnique({ ...newTechnique, minColors: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Máx. Cores</Label>
                    <Input
                      type="number"
                      placeholder="Ilimitado"
                      value={newTechnique.maxColors}
                      onChange={(e) => setNewTechnique({ ...newTechnique, maxColors: e.target.value })}
                    />
                  </div>
                </div>

                {/* Production */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      Qtd. Mínima
                    </Label>
                    <Input
                      type="number"
                      placeholder="Ex: 50"
                      value={newTechnique.minQuantity}
                      onChange={(e) => setNewTechnique({ ...newTechnique, minQuantity: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Prazo (dias úteis)
                    </Label>
                    <Input
                      type="number"
                      placeholder="Ex: 7"
                      value={newTechnique.estimatedDays}
                      onChange={(e) => setNewTechnique({ ...newTechnique, estimatedDays: e.target.value })}
                    />
                  </div>
                </div>

                {/* Pricing Options */}
                <div className="space-y-3 pt-2 border-t">
                  <Label className="text-base">Tipo de Precificação</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-2">
                        <Droplets className="h-4 w-4 text-info" />
                        <span className="text-sm">Por Cor</span>
                      </div>
                      <Switch
                        checked={newTechnique.priceByColor}
                        onCheckedChange={(checked) => setNewTechnique({ ...newTechnique, priceByColor: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-2">
                        <Ruler className="h-4 w-4 text-success" />
                        <span className="text-sm">Por Área</span>
                      </div>
                      <Switch
                        checked={newTechnique.priceByArea}
                        onCheckedChange={(checked) => setNewTechnique({ ...newTechnique, priceByArea: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4 text-purple-500" />
                        <span className="text-sm">Por Pontos</span>
                      </div>
                      <Switch
                        checked={newTechnique.priceByStitches}
                        onCheckedChange={(checked) => setNewTechnique({ ...newTechnique, priceByStitches: checked })}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAdd} disabled={isCreating || !newTechnique.code || !newTechnique.name}>
                  {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Criar Técnica
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !tecnicas?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            <Palette className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma técnica cadastrada no BD externo</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Tipo Preço</TableHead>
                <TableHead>Setup</TableHead>
                <TableHead>Manuseio</TableHead>
                <TableHead>Cores</TableHead>
                <TableHead>Qtd. Mín.</TableHead>
                <TableHead>Prazo</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tecnicas.map((tecnica) => (
                <TableRow key={tecnica.id}>
                  <TableCell>
                    <InlineEditField
                      value={tecnica.codigo || ""}
                      onSave={(value) => update({ id: tecnica.id, code: value.toUpperCase() })}
                      placeholder="—"
                      className="font-mono text-xs"
                    />
                  </TableCell>
                  <TableCell>
                    <InlineEditField
                      value={tecnica.nome}
                      onSave={(value) => update({ id: tecnica.id, name: value })}
                    />
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{tecnica.categoria || '—'}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {getPricingBadges(tecnica).map(badge => (
                        <Badge key={badge.label} className={badge.color}>
                          <badge.icon className="h-3 w-3 mr-1" />
                          {badge.label}
                        </Badge>
                      ))}
                      {getPricingBadges(tecnica).length === 0 && (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <InlineEditField
                      value={tecnica.custoSetup?.toString() || ""}
                      onSave={(value) => update({ id: tecnica.id, setup_price: value ? parseFloat(value) : null })}
                      type="number"
                      placeholder="—"
                    />
                  </TableCell>
                  <TableCell>
                    <InlineEditField
                      value={tecnica.custoManuseio?.toString() || ""}
                      onSave={(value) => update({ id: tecnica.id, handling_price: value ? parseFloat(value) : null })}
                      type="number"
                      placeholder="—"
                    />
                  </TableCell>
                  <TableCell>
                    {tecnica.maxCores ? (
                      <span className="text-sm">
                        {tecnica.minCores || 1} - {tecnica.maxCores}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <InlineEditField
                      value={tecnica.quantidadeMinima?.toString() || ""}
                      onSave={(value) => update({ id: tecnica.id, min_quantity: value ? parseInt(value) : null })}
                      type="number"
                      placeholder="—"
                    />
                  </TableCell>
                  <TableCell>
                    <InlineEditField
                      value={tecnica.prazoEstimado?.toString() || ""}
                      onSave={(value) => update({ id: tecnica.id, estimated_days: value ? parseInt(value) : null })}
                      type="number"
                      placeholder="—"
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={tecnica.ativo}
                      onCheckedChange={(checked) => toggleStatus({ id: tecnica.id, ativo: checked })}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => remove(tecnica.id)}
                      disabled={isRemoving}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        
        <div className="mt-4 pt-4 border-t text-xs text-muted-foreground flex items-center gap-2">
          <Database className="h-3 w-3" />
          Dados do BD Externo (Promobrind) • {tecnicas.length} técnicas
        </div>
      </CardContent>
    </Card>
  );
}
