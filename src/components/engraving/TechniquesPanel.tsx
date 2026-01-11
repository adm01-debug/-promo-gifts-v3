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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, Loader2, Search, Settings } from "lucide-react";
import { toast } from "sonner";

// Mock data - será substituído por chamadas à API externa
const mockTechniques = [
  {
    id: "1",
    code: "SERI",
    name: "Serigrafia",
    description: "Impressão com tinta através de tela vazada",
    maxColors: 6,
    minQuantity: 50,
    estimatedDays: 5,
    isActive: true,
  },
  {
    id: "2",
    code: "LASER",
    name: "Gravação a Laser",
    description: "Gravação permanente através de feixe de laser",
    maxColors: 1,
    minQuantity: 10,
    estimatedDays: 3,
    isActive: true,
  },
  {
    id: "3",
    code: "TAMP",
    name: "Tampografia",
    description: "Impressão com carimbo de silicone",
    maxColors: 4,
    minQuantity: 100,
    estimatedDays: 7,
    isActive: true,
  },
  {
    id: "4",
    code: "BORDO",
    name: "Bordado",
    description: "Aplicação de fios sobre o tecido",
    maxColors: 12,
    minQuantity: 20,
    estimatedDays: 10,
    isActive: false,
  },
  {
    id: "5",
    code: "SUBLI",
    name: "Sublimação",
    description: "Transferência de tinta para o material por calor",
    maxColors: null,
    minQuantity: 1,
    estimatedDays: 4,
    isActive: true,
  },
];

interface Technique {
  id: string;
  code: string;
  name: string;
  description: string;
  maxColors: number | null;
  minQuantity: number;
  estimatedDays: number;
  isActive: boolean;
}

interface TechniqueFormData {
  code: string;
  name: string;
  description: string;
  maxColors: string;
  minQuantity: string;
  estimatedDays: string;
  isActive: boolean;
}

const initialFormData: TechniqueFormData = {
  code: "",
  name: "",
  description: "",
  maxColors: "",
  minQuantity: "1",
  estimatedDays: "5",
  isActive: true,
};

export function TechniquesPanel() {
  const [techniques, setTechniques] = useState<Technique[]>(mockTechniques);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingTechnique, setEditingTechnique] = useState<Technique | null>(null);
  const [formData, setFormData] = useState<TechniqueFormData>(initialFormData);

  const filteredTechniques = techniques.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenDialog = (technique?: Technique) => {
    if (technique) {
      setEditingTechnique(technique);
      setFormData({
        code: technique.code,
        name: technique.name,
        description: technique.description,
        maxColors: technique.maxColors?.toString() || "",
        minQuantity: technique.minQuantity.toString(),
        estimatedDays: technique.estimatedDays.toString(),
        isActive: technique.isActive,
      });
    } else {
      setEditingTechnique(null);
      setFormData(initialFormData);
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.code || !formData.name) {
      toast.error("Código e nome são obrigatórios");
      return;
    }

    setIsLoading(true);
    
    // Simular chamada à API
    await new Promise((resolve) => setTimeout(resolve, 800));

    const newTechnique: Technique = {
      id: editingTechnique?.id || Date.now().toString(),
      code: formData.code.toUpperCase(),
      name: formData.name,
      description: formData.description,
      maxColors: formData.maxColors ? parseInt(formData.maxColors) : null,
      minQuantity: parseInt(formData.minQuantity) || 1,
      estimatedDays: parseInt(formData.estimatedDays) || 5,
      isActive: formData.isActive,
    };

    if (editingTechnique) {
      setTechniques((prev) =>
        prev.map((t) => (t.id === editingTechnique.id ? newTechnique : t))
      );
      toast.success("Técnica atualizada com sucesso!");
    } else {
      setTechniques((prev) => [...prev, newTechnique]);
      toast.success("Técnica cadastrada com sucesso!");
    }

    setIsLoading(false);
    setIsDialogOpen(false);
    setFormData(initialFormData);
    setEditingTechnique(null);
  };

  const handleDelete = async (id: string) => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setTechniques((prev) => prev.filter((t) => t.id !== id));
    toast.success("Técnica removida com sucesso!");
    setIsLoading(false);
  };

  const handleToggleActive = async (id: string) => {
    setTechniques((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isActive: !t.isActive } : t))
    );
  };

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
              Cadastre e gerencie as técnicas de personalização disponíveis
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Técnica
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {editingTechnique ? "Editar Técnica" : "Nova Técnica de Gravação"}
                </DialogTitle>
                <DialogDescription>
                  Preencha os dados da técnica de personalização
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Código *</Label>
                    <Input
                      id="code"
                      placeholder="Ex: SERI"
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({ ...formData, code: e.target.value.toUpperCase() })
                      }
                      maxLength={10}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome *</Label>
                    <Input
                      id="name"
                      placeholder="Ex: Serigrafia"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    placeholder="Descreva a técnica..."
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxColors">Máx. Cores</Label>
                    <Input
                      id="maxColors"
                      type="number"
                      placeholder="∞"
                      min="1"
                      value={formData.maxColors}
                      onChange={(e) =>
                        setFormData({ ...formData, maxColors: e.target.value })
                      }
                    />
                  </div>
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
                    <Label htmlFor="estimatedDays">Dias Prod.</Label>
                    <Input
                      id="estimatedDays"
                      type="number"
                      min="1"
                      value={formData.estimatedDays}
                      onChange={(e) =>
                        setFormData({ ...formData, estimatedDays: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="isActive">Técnica Ativa</Label>
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isActive: checked })
                    }
                  />
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
                <TableHead className="w-[100px]">Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden md:table-cell">Descrição</TableHead>
                <TableHead className="text-center">Cores</TableHead>
                <TableHead className="text-center hidden sm:table-cell">Qtd. Mín.</TableHead>
                <TableHead className="text-center hidden sm:table-cell">Dias</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTechniques.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhuma técnica encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filteredTechniques.map((technique) => (
                  <TableRow key={technique.id}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {technique.code}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{technique.name}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground max-w-[200px] truncate">
                      {technique.description}
                    </TableCell>
                    <TableCell className="text-center">
                      {technique.maxColors || "∞"}
                    </TableCell>
                    <TableCell className="text-center hidden sm:table-cell">
                      {technique.minQuantity}
                    </TableCell>
                    <TableCell className="text-center hidden sm:table-cell">
                      {technique.estimatedDays}d
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={technique.isActive}
                        onCheckedChange={() => handleToggleActive(technique.id)}
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
                          onClick={() => handleDelete(technique.id)}
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
