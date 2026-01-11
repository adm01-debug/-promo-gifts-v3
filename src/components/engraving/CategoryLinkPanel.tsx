import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
} from "@/components/ui/dialog";
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
import { Link2, Search, Plus, Pencil, Trash2, Loader2, AlertCircle, Check } from "lucide-react";
import { useMapeamentosSpot } from "@/hooks/gravacao/useMapeamentosSpot";
import { useAllVariantes } from "@/hooks/gravacao/useVariantesGravacao";
import type { SpotMapeamentoWithVariante } from "@/types/gravacao-database";

interface MapeamentoFormData {
  spot_customization_type: string;
  spot_table_code: string;
  tecnica_variante_id: string;
  regra_formato: string;
  regra_observacao: string;
  mapeamento_automatico: boolean;
  ativo: boolean;
}

const initialFormData: MapeamentoFormData = {
  spot_customization_type: "",
  spot_table_code: "",
  tecnica_variante_id: "",
  regra_formato: "",
  regra_observacao: "",
  mapeamento_automatico: true,
  ativo: true,
};

export function CategoryLinkPanel() {
  const { 
    mapeamentos, 
    isLoading, 
    isError,
    error,
    create, 
    update, 
    delete: deleteMapeamento,
    isCreating,
    isUpdating,
    isDeleting,
  } = useMapeamentosSpot();

  const { data: variantes = [], isLoading: isLoadingVariantes } = useAllVariantes();

  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMapeamento, setEditingMapeamento] = useState<SpotMapeamentoWithVariante | null>(null);
  const [formData, setFormData] = useState<MapeamentoFormData>(initialFormData);

  const filteredMapeamentos = mapeamentos.filter(
    (m) =>
      m.spot_table_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.spot_customization_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.variante?.nome.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenDialog = (mapeamento?: SpotMapeamentoWithVariante) => {
    if (mapeamento) {
      setEditingMapeamento(mapeamento);
      setFormData({
        spot_customization_type: mapeamento.spot_customization_type,
        spot_table_code: mapeamento.spot_table_code,
        tecnica_variante_id: mapeamento.tecnica_variante_id,
        regra_formato: mapeamento.regra_formato || "",
        regra_observacao: mapeamento.regra_observacao || "",
        mapeamento_automatico: mapeamento.mapeamento_automatico,
        ativo: mapeamento.ativo,
      });
    } else {
      setEditingMapeamento(null);
      setFormData(initialFormData);
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.spot_table_code || !formData.tecnica_variante_id) {
      return;
    }

    try {
      if (editingMapeamento) {
        await update({ id: editingMapeamento.id, ...formData });
      } else {
        await create(formData);
      }
      setIsDialogOpen(false);
      setFormData(initialFormData);
      setEditingMapeamento(null);
    } catch (error) {
      console.error('Erro ao salvar:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMapeamento(id);
    } catch (error) {
      console.error('Erro ao excluir:', error);
    }
  };

  const isSaving = isCreating || isUpdating;

  if (isError) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <p className="text-lg font-medium text-destructive mb-2">Erro ao carregar mapeamentos</p>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            {error?.message || 'Não foi possível conectar ao banco de dados externo.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" />
              Mapeamentos SPOT
            </CardTitle>
            <CardDescription>
              Vincule códigos da API SPOT às variantes internas ({mapeamentos.length} mapeamentos)
            </CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Mapeamento
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar mapeamentos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Cód. SPOT</TableHead>
                <TableHead>Tipo SPOT</TableHead>
                <TableHead>→ Variante Interna</TableHead>
                <TableHead className="text-center w-[80px]">Auto</TableHead>
                <TableHead className="text-center w-[80px]">Status</TableHead>
                <TableHead className="text-right w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      <span className="text-muted-foreground">Carregando mapeamentos...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredMapeamentos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum mapeamento encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredMapeamentos.map((mapeamento) => (
                  <TableRow key={mapeamento.id} className={!mapeamento.ativo ? "opacity-60" : ""}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {mapeamento.spot_table_code}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {mapeamento.spot_customization_type}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">→</span>
                        <span className="font-medium">{mapeamento.variante?.nome || 'N/A'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {mapeamento.mapeamento_automatico ? (
                        <Check className="h-4 w-4 text-green-500 mx-auto" />
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={mapeamento.ativo ? "default" : "secondary"} className="text-xs">
                        {mapeamento.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(mapeamento)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(mapeamento.id)}
                          className="text-destructive hover:text-destructive"
                          disabled={isDeleting}
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

      {/* Dialog de criação/edição */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingMapeamento ? "Editar Mapeamento" : "Novo Mapeamento SPOT"}
            </DialogTitle>
            <DialogDescription>
              Vincule um código da API SPOT a uma variante interna
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="spot_table_code">Código SPOT *</Label>
                <Input
                  id="spot_table_code"
                  placeholder="Ex: TXP1"
                  value={formData.spot_table_code}
                  onChange={(e) =>
                    setFormData({ ...formData, spot_table_code: e.target.value.toUpperCase() })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="spot_customization_type">Tipo SPOT</Label>
                <Input
                  id="spot_customization_type"
                  placeholder="Ex: Silk screen têxtil"
                  value={formData.spot_customization_type}
                  onChange={(e) =>
                    setFormData({ ...formData, spot_customization_type: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tecnica_variante_id">Variante Interna *</Label>
              <Select
                value={formData.tecnica_variante_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, tecnica_variante_id: value })
                }
                disabled={isLoadingVariantes}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma variante" />
                </SelectTrigger>
                <SelectContent>
                  {variantes.map((variante) => (
                    <SelectItem key={variante.id} value={variante.id}>
                      {variante.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="regra_formato">Formato (regra)</Label>
                <Select
                  value={formData.regra_formato}
                  onValueChange={(value) =>
                    setFormData({ ...formData, regra_formato: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    <SelectItem value="plana">Plana</SelectItem>
                    <SelectItem value="cilindrica">Cilíndrica</SelectItem>
                    <SelectItem value="textil">Têxtil</SelectItem>
                    <SelectItem value="patch">Patch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pt-8">
                <Switch
                  id="mapeamento_automatico"
                  checked={formData.mapeamento_automatico}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, mapeamento_automatico: checked })
                  }
                />
                <Label htmlFor="mapeamento_automatico" className="text-sm">Mapeamento automático</Label>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="regra_observacao">Observação</Label>
              <Input
                id="regra_observacao"
                placeholder="Observações do mapeamento..."
                value={formData.regra_observacao}
                onChange={(e) =>
                  setFormData({ ...formData, regra_observacao: e.target.value })
                }
              />
            </div>
            <div className="flex items-center justify-between pt-2">
              <Label htmlFor="map_ativo">Mapeamento Ativo</Label>
              <Switch
                id="map_ativo"
                checked={formData.ativo}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, ativo: checked })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isSaving || !formData.spot_table_code || !formData.tecnica_variante_id}
            >
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingMapeamento ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
