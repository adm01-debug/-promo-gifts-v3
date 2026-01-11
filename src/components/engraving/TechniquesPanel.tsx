import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogTrigger 
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
import { Plus, Pencil, Trash2, Loader2, Search, Settings, ChevronDown, ChevronRight, AlertCircle } from "lucide-react";
import { useTecnicasGravacao } from "@/hooks/gravacao/useTecnicasGravacao";
import type { TecnicaGravacaoFormData, TecnicaGravacaoWithVariantes, TipoSetup } from "@/types/gravacao-database";
import { VariantesSubPanel } from "./VariantesSubPanel";

const TIPO_SETUP_OPTIONS: { value: TipoSetup; label: string }[] = [
  { value: 'nenhum', label: 'Nenhum' },
  { value: 'fotolito', label: 'Fotolito' },
  { value: 'cliche', label: 'Clichê' },
  { value: 'matriz', label: 'Matriz' },
  { value: 'arte_digital', label: 'Arte Digital' },
];

const initialFormData: TecnicaGravacaoFormData = {
  codigo: "",
  codigo_interno: "",
  nome: "",
  descricao: "",
  permite_cores: true,
  max_cores: 4,
  cobra_por_cor: true,
  cobra_por_area: false,
  cobra_por_pontos: false,
  requer_setup: true,
  tipo_setup: 'fotolito',
  tempo_producao_dias: 5,
  ordem_exibicao: 100,
  ativo: true,
};

export function TechniquesPanel() {
  const { 
    tecnicas, 
    isLoading, 
    isError,
    error,
    create, 
    update, 
    delete: deleteTecnica, 
    toggleStatus,
    isCreating,
    isUpdating,
    isDeleting,
  } = useTecnicasGravacao();

  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTechnique, setEditingTechnique] = useState<TecnicaGravacaoWithVariantes | null>(null);
  const [formData, setFormData] = useState<TecnicaGravacaoFormData>(initialFormData);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [techniqueToDelete, setTechniqueToDelete] = useState<TecnicaGravacaoWithVariantes | null>(null);
  const [expandedTechniqueId, setExpandedTechniqueId] = useState<string | null>(null);

  const filteredTechniques = tecnicas.filter(
    (t) =>
      t.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.codigo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenDialog = (technique?: TecnicaGravacaoWithVariantes) => {
    if (technique) {
      setEditingTechnique(technique);
      setFormData({
        codigo: technique.codigo,
        codigo_interno: technique.codigo_interno,
        nome: technique.nome,
        descricao: technique.descricao || "",
        permite_cores: technique.permite_cores,
        max_cores: technique.max_cores,
        cobra_por_cor: technique.cobra_por_cor,
        cobra_por_area: technique.cobra_por_area,
        cobra_por_pontos: technique.cobra_por_pontos,
        requer_setup: technique.requer_setup,
        tipo_setup: technique.tipo_setup,
        tempo_producao_dias: technique.tempo_producao_dias,
        ordem_exibicao: technique.ordem_exibicao,
        ativo: technique.ativo,
      });
    } else {
      setEditingTechnique(null);
      setFormData(initialFormData);
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.codigo || !formData.nome) {
      return;
    }

    try {
      if (editingTechnique) {
        await update({ id: editingTechnique.id, ...formData });
      } else {
        await create(formData);
      }
      setIsDialogOpen(false);
      setFormData(initialFormData);
      setEditingTechnique(null);
    } catch (error) {
      console.error('Erro ao salvar:', error);
    }
  };

  const handleDeleteClick = (technique: TecnicaGravacaoWithVariantes) => {
    setTechniqueToDelete(technique);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!techniqueToDelete) return;
    
    try {
      await deleteTecnica(techniqueToDelete.id);
      setDeleteDialogOpen(false);
      setTechniqueToDelete(null);
    } catch (error) {
      console.error('Erro ao excluir:', error);
    }
  };

  const handleToggleActive = (id: string, currentStatus: boolean) => {
    toggleStatus({ id, ativo: !currentStatus });
  };

  const toggleExpand = (id: string) => {
    setExpandedTechniqueId(expandedTechniqueId === id ? null : id);
  };

  const isSaving = isCreating || isUpdating;

  if (isError) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <p className="text-lg font-medium text-destructive mb-2">Erro ao carregar técnicas</p>
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
              <Settings className="h-5 w-5 text-primary" />
              Técnicas de Gravação
            </CardTitle>
            <CardDescription>
              Gerencie as técnicas de personalização do banco externo ({tecnicas.length} técnicas)
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Técnica
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingTechnique ? "Editar Técnica" : "Nova Técnica de Gravação"}
                </DialogTitle>
                <DialogDescription>
                  Preencha os dados da técnica de personalização
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {/* Seção: Informações Básicas */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-muted-foreground">Informações Básicas</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="codigo">Código *</Label>
                      <Input
                        id="codigo"
                        placeholder="Ex: SERIGRAFIA"
                        value={formData.codigo}
                        onChange={(e) =>
                          setFormData({ ...formData, codigo: e.target.value.toUpperCase().replace(/\s/g, '_') })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="codigo_interno">Código Interno</Label>
                      <Input
                        id="codigo_interno"
                        placeholder="Ex: SERI"
                        value={formData.codigo_interno}
                        onChange={(e) =>
                          setFormData({ ...formData, codigo_interno: e.target.value.toUpperCase() })
                        }
                        maxLength={4}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome *</Label>
                    <Input
                      id="nome"
                      placeholder="Ex: Serigrafia"
                      value={formData.nome}
                      onChange={(e) =>
                        setFormData({ ...formData, nome: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="descricao">Descrição</Label>
                    <Textarea
                      id="descricao"
                      placeholder="Descreva a técnica..."
                      value={formData.descricao}
                      onChange={(e) =>
                        setFormData({ ...formData, descricao: e.target.value })
                      }
                      rows={3}
                    />
                  </div>
                </div>

                {/* Seção: Configurações de Cobrança */}
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="text-sm font-medium text-muted-foreground">Configurações de Cobrança</h4>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="permite_cores">Permite múltiplas cores</Label>
                    <Switch
                      id="permite_cores"
                      checked={formData.permite_cores}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, permite_cores: checked })
                      }
                    />
                  </div>
                  {formData.permite_cores && (
                    <div className="space-y-2">
                      <Label htmlFor="max_cores">Máximo de cores</Label>
                      <Input
                        id="max_cores"
                        type="number"
                        min="1"
                        max="12"
                        value={formData.max_cores}
                        onChange={(e) =>
                          setFormData({ ...formData, max_cores: parseInt(e.target.value) || 1 })
                        }
                      />
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="cobra_por_cor"
                        checked={formData.cobra_por_cor}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, cobra_por_cor: checked, cobra_por_area: checked ? false : formData.cobra_por_area, cobra_por_pontos: checked ? false : formData.cobra_por_pontos })
                        }
                      />
                      <Label htmlFor="cobra_por_cor" className="text-sm">Por cor</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="cobra_por_area"
                        checked={formData.cobra_por_area}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, cobra_por_area: checked, cobra_por_cor: checked ? false : formData.cobra_por_cor, cobra_por_pontos: checked ? false : formData.cobra_por_pontos })
                        }
                      />
                      <Label htmlFor="cobra_por_area" className="text-sm">Por área</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="cobra_por_pontos"
                        checked={formData.cobra_por_pontos}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, cobra_por_pontos: checked, cobra_por_cor: checked ? false : formData.cobra_por_cor, cobra_por_area: checked ? false : formData.cobra_por_area })
                        }
                      />
                      <Label htmlFor="cobra_por_pontos" className="text-sm">Por pontos</Label>
                    </div>
                  </div>
                </div>

                {/* Seção: Configurações de Produção */}
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="text-sm font-medium text-muted-foreground">Configurações de Produção</h4>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="requer_setup">Requer setup/preparação</Label>
                    <Switch
                      id="requer_setup"
                      checked={formData.requer_setup}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, requer_setup: checked })
                      }
                    />
                  </div>
                  {formData.requer_setup && (
                    <div className="space-y-2">
                      <Label htmlFor="tipo_setup">Tipo de Setup</Label>
                      <Select
                        value={formData.tipo_setup}
                        onValueChange={(value: TipoSetup) =>
                          setFormData({ ...formData, tipo_setup: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          {TIPO_SETUP_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tempo_producao_dias">Tempo de produção (dias)</Label>
                      <Input
                        id="tempo_producao_dias"
                        type="number"
                        min="1"
                        max="60"
                        value={formData.tempo_producao_dias}
                        onChange={(e) =>
                          setFormData({ ...formData, tempo_producao_dias: parseInt(e.target.value) || 1 })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ordem_exibicao">Ordem de exibição</Label>
                      <Input
                        id="ordem_exibicao"
                        type="number"
                        min="1"
                        value={formData.ordem_exibicao}
                        onChange={(e) =>
                          setFormData({ ...formData, ordem_exibicao: parseInt(e.target.value) || 1 })
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Seção: Status */}
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="ativo">Técnica Ativa</Label>
                      <p className="text-xs text-muted-foreground">Técnicas inativas não aparecem no catálogo</p>
                    </div>
                    <Switch
                      id="ativo"
                      checked={formData.ativo}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, ativo: checked })
                      }
                    />
                  </div>
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
                  {editingTechnique ? "Salvar Alterações" : "Cadastrar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar técnicas..."
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
                <TableHead className="w-[40px]"></TableHead>
                <TableHead className="w-[120px]">Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead className="text-center w-[80px]">Cores</TableHead>
                <TableHead className="text-center hidden sm:table-cell w-[80px]">Variantes</TableHead>
                <TableHead className="text-center hidden sm:table-cell w-[60px]">Dias</TableHead>
                <TableHead className="text-center w-[80px]">Status</TableHead>
                <TableHead className="text-right w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      <span className="text-muted-foreground">Carregando técnicas...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredTechniques.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhuma técnica encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filteredTechniques.map((technique) => (
                  <>
                    <TableRow 
                      key={technique.id} 
                      className={!technique.ativo ? "opacity-60" : ""}
                    >
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => toggleExpand(technique.id)}
                        >
                          {expandedTechniqueId === technique.id ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {technique.codigo_interno || technique.codigo}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{technique.nome}</TableCell>
                      <TableCell className="text-center">
                        {technique.permite_cores ? technique.max_cores : "-"}
                      </TableCell>
                      <TableCell className="text-center hidden sm:table-cell">
                        <Badge variant="secondary" className="text-xs">
                          {technique.variantes_count || 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center hidden sm:table-cell">
                        {technique.tempo_producao_dias}d
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={technique.ativo}
                          onCheckedChange={() => handleToggleActive(technique.id, technique.ativo)}
                          aria-label="Ativar/Desativar técnica"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(technique)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(technique)}
                            className="text-destructive hover:text-destructive"
                            disabled={isDeleting}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {expandedTechniqueId === technique.id && (
                      <TableRow>
                        <TableCell colSpan={9} className="bg-muted/30 p-0">
                          <VariantesSubPanel tecnicaId={technique.id} tecnicaNome={technique.nome} />
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir técnica?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a técnica "{techniqueToDelete?.nome}"? 
              Esta ação não pode ser desfeita.
              {techniqueToDelete?.variantes_count ? (
                <span className="block mt-2 text-destructive">
                  Atenção: Esta técnica possui {techniqueToDelete.variantes_count} variante(s) vinculada(s).
                </span>
              ) : null}
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
    </Card>
  );
}
