import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Plus, Pencil, Trash2, Loader2, Box, Shirt, Circle } from "lucide-react";
import { useVariantesGravacao } from "@/hooks/gravacao/useVariantesGravacao";
import type { TecnicaGravacaoVariante, VarianteFormData, FormatoVariante } from "@/types/gravacao-database";

interface VariantesSubPanelProps {
  tecnicaId: string;
  tecnicaNome: string;
}

const FORMATO_OPTIONS: { value: FormatoVariante; label: string; icon: React.ReactNode }[] = [
  { value: 'plana', label: 'Plana', icon: <Box className="h-4 w-4" /> },
  { value: 'cilindrica', label: 'Cilíndrica', icon: <Circle className="h-4 w-4" /> },
  { value: 'textil', label: 'Têxtil', icon: <Shirt className="h-4 w-4" /> },
  { value: 'patch', label: 'Patch', icon: <Box className="h-4 w-4" /> },
];

const getFormatoIcon = (formato: FormatoVariante) => {
  const option = FORMATO_OPTIONS.find(o => o.value === formato);
  return option?.icon || <Box className="h-4 w-4" />;
};

const getFormatoLabel = (formato: FormatoVariante) => {
  const option = FORMATO_OPTIONS.find(o => o.value === formato);
  return option?.label || formato;
};

const initialFormData: Omit<VarianteFormData, 'tecnica_gravacao_id'> = {
  codigo: "",
  codigo_interno: "",
  nome: "",
  descricao: "",
  formato: 'plana',
  permite_cores: true,
  max_cores: 4,
  cobra_por_cor: true,
  produtos_tipicos: [],
  ordem_exibicao: 10,
  ativo: true,
};

export function VariantesSubPanel({ tecnicaId, tecnicaNome }: VariantesSubPanelProps) {
  const { 
    variantes, 
    isLoading, 
    create, 
    update, 
    delete: deleteVariante, 
    toggleStatus,
    isCreating,
    isUpdating,
    isDeleting,
  } = useVariantesGravacao(tecnicaId);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVariante, setEditingVariante] = useState<TecnicaGravacaoVariante | null>(null);
  const [formData, setFormData] = useState(initialFormData);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [varianteToDelete, setVarianteToDelete] = useState<TecnicaGravacaoVariante | null>(null);
  const [produtoInput, setProdutoInput] = useState("");

  const handleOpenDialog = (variante?: TecnicaGravacaoVariante) => {
    if (variante) {
      setEditingVariante(variante);
      setFormData({
        codigo: variante.codigo,
        codigo_interno: variante.codigo_interno,
        nome: variante.nome,
        descricao: variante.descricao || "",
        formato: variante.formato,
        permite_cores: variante.permite_cores,
        max_cores: variante.max_cores,
        cobra_por_cor: variante.cobra_por_cor,
        produtos_tipicos: variante.produtos_tipicos || [],
        ordem_exibicao: variante.ordem_exibicao,
        ativo: variante.ativo,
      });
    } else {
      setEditingVariante(null);
      setFormData(initialFormData);
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.codigo || !formData.nome) {
      return;
    }

    try {
      if (editingVariante) {
        await update({ id: editingVariante.id, ...formData });
      } else {
        await create({ ...formData, tecnica_gravacao_id: tecnicaId });
      }
      setIsDialogOpen(false);
      setFormData(initialFormData);
      setEditingVariante(null);
    } catch (error) {
      console.error('Erro ao salvar:', error);
    }
  };

  const handleDeleteClick = (variante: TecnicaGravacaoVariante) => {
    setVarianteToDelete(variante);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!varianteToDelete) return;
    
    try {
      await deleteVariante(varianteToDelete.id);
      setDeleteDialogOpen(false);
      setVarianteToDelete(null);
    } catch (error) {
      console.error('Erro ao excluir:', error);
    }
  };

  const handleAddProduto = () => {
    if (produtoInput.trim() && !formData.produtos_tipicos.includes(produtoInput.trim())) {
      setFormData({
        ...formData,
        produtos_tipicos: [...formData.produtos_tipicos, produtoInput.trim()],
      });
      setProdutoInput("");
    }
  };

  const handleRemoveProduto = (produto: string) => {
    setFormData({
      ...formData,
      produtos_tipicos: formData.produtos_tipicos.filter(p => p !== produto),
    });
  };

  const isSaving = isCreating || isUpdating;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium">Variantes de {tecnicaNome}</h4>
          <p className="text-sm text-muted-foreground">{variantes.length} variante(s)</p>
        </div>
        <Button size="sm" onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Variante
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : variantes.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Nenhuma variante cadastrada
        </div>
      ) : (
        <div className="rounded-md border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead className="w-[100px]">Formato</TableHead>
                <TableHead className="text-center w-[80px]">Cores</TableHead>
                <TableHead className="text-center w-[80px]">Status</TableHead>
                <TableHead className="text-right w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {variantes.map((variante) => (
                <TableRow key={variante.id} className={!variante.ativo ? "opacity-60" : ""}>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">
                      {variante.codigo_interno || variante.codigo.slice(0, 8)}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{variante.nome}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {getFormatoIcon(variante.formato)}
                      <span className="text-sm">{getFormatoLabel(variante.formato)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {variante.permite_cores ? variante.max_cores : "-"}
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={variante.ativo}
                      onCheckedChange={() => toggleStatus({ id: variante.id, ativo: !variante.ativo })}
                      aria-label="Ativar/Desativar variante"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleOpenDialog(variante)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteClick(variante)}
                        disabled={isDeleting}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog de criação/edição de variante */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingVariante ? "Editar Variante" : `Nova Variante de ${tecnicaNome}`}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados da variante
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="var_codigo">Código *</Label>
                <Input
                  id="var_codigo"
                  placeholder="Ex: SERIGRAFIA_TEXTIL"
                  value={formData.codigo}
                  onChange={(e) =>
                    setFormData({ ...formData, codigo: e.target.value.toUpperCase().replace(/\s/g, '_') })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="var_codigo_interno">Código Interno</Label>
                <Input
                  id="var_codigo_interno"
                  placeholder="Ex: ST"
                  value={formData.codigo_interno}
                  onChange={(e) =>
                    setFormData({ ...formData, codigo_interno: e.target.value.toUpperCase() })
                  }
                  maxLength={4}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="var_nome">Nome *</Label>
              <Input
                id="var_nome"
                placeholder="Ex: Serigrafia Têxtil"
                value={formData.nome}
                onChange={(e) =>
                  setFormData({ ...formData, nome: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="var_descricao">Descrição</Label>
              <Textarea
                id="var_descricao"
                placeholder="Descreva a variante..."
                value={formData.descricao}
                onChange={(e) =>
                  setFormData({ ...formData, descricao: e.target.value })
                }
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="var_formato">Formato de Aplicação *</Label>
              <Select
                value={formData.formato}
                onValueChange={(value: FormatoVariante) =>
                  setFormData({ ...formData, formato: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o formato" />
                </SelectTrigger>
                <SelectContent>
                  {FORMATO_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        {option.icon}
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="var_permite_cores"
                  checked={formData.permite_cores}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, permite_cores: checked })
                  }
                />
                <Label htmlFor="var_permite_cores" className="text-sm">Permite cores</Label>
              </div>
              {formData.permite_cores && (
                <div className="space-y-1">
                  <Label htmlFor="var_max_cores" className="text-xs">Máx. cores</Label>
                  <Input
                    id="var_max_cores"
                    type="number"
                    min="1"
                    max="12"
                    value={formData.max_cores}
                    onChange={(e) =>
                      setFormData({ ...formData, max_cores: parseInt(e.target.value) || 1 })
                    }
                    className="h-8"
                  />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Produtos Típicos</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: camisetas"
                  value={produtoInput}
                  onChange={(e) => setProdutoInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddProduto())}
                />
                <Button type="button" variant="outline" onClick={handleAddProduto}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {formData.produtos_tipicos.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {formData.produtos_tipicos.map((produto) => (
                    <Badge
                      key={produto}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => handleRemoveProduto(produto)}
                    >
                      {produto} ×
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between pt-2">
              <Label htmlFor="var_ativo">Variante Ativa</Label>
              <Switch
                id="var_ativo"
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
            <Button onClick={handleSave} disabled={isSaving || !formData.codigo || !formData.nome}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingVariante ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir variante?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a variante "{varianteToDelete?.nome}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
