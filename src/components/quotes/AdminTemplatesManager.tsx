import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  FileText, 
  MoreVertical, 
  Star, 
  Copy, 
  Trash2, 
  Edit, 
  Search,
  Package,
  Users,
  UserPlus,
  Filter,
  User,
  LayoutGrid,
  List,
  Download
} from "lucide-react";
import { QuoteTemplate, useQuoteTemplates } from "@/hooks/useQuoteTemplates";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { exportTemplatesToJson, exportSingleTemplate } from "@/utils/templateExport";

interface AdminTemplatesManagerProps {
  onEditTemplate?: (template: QuoteTemplate) => void;
}

export function AdminTemplatesManager({ onEditTemplate }: AdminTemplatesManagerProps) {
  const { 
    allTemplates, 
    sellers, 
    loading, 
    deleteTemplate, 
    cloneTemplateToSeller 
  } = useQuoteTemplates();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSellerId, setSelectedSellerId] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [cloneTemplateId, setCloneTemplateId] = useState<string | null>(null);
  const [targetSellerId, setTargetSellerId] = useState<string>("");

  // Get seller name helper
  const getSellerName = (sellerId: string) => {
    const seller = sellers.find(s => s.id === sellerId);
    return seller?.full_name || seller?.email || 'Vendedor desconhecido';
  };

  // Filter and group templates
  const filteredTemplates = useMemo(() => {
    return allTemplates.filter((template) => {
      const matchesSearch = 
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesSeller = selectedSellerId === "all" || template.seller_id === selectedSellerId;
      
      return matchesSearch && matchesSeller;
    });
  }, [allTemplates, searchTerm, selectedSellerId]);

  // Group by seller
  const templatesBySeller = useMemo(() => {
    const grouped: Record<string, QuoteTemplate[]> = {};
    
    filteredTemplates.forEach(template => {
      if (!grouped[template.seller_id]) {
        grouped[template.seller_id] = [];
      }
      grouped[template.seller_id].push(template);
    });
    
    return grouped;
  }, [filteredTemplates]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const calculateTemplateTotal = (template: QuoteTemplate) => {
    const itemsTotal = template.items_data.reduce((sum, item) => {
      const itemBase = item.quantity * item.unitPrice;
      const personalizationCost = item.personalizations?.reduce((pSum, p) => {
        return pSum + (p.unitCost || 0) * item.quantity + (p.setupCost || 0);
      }, 0) || 0;
      return sum + itemBase + personalizationCost;
    }, 0);

    const discountValue = template.discount_percent > 0 
      ? itemsTotal * (template.discount_percent / 100)
      : template.discount_amount;

    return itemsTotal - discountValue;
  };

  const handleDelete = async () => {
    if (deleteConfirmId) {
      await deleteTemplate(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const handleClone = async () => {
    if (cloneTemplateId && targetSellerId) {
      await cloneTemplateToSeller(cloneTemplateId, targetSellerId);
      setCloneDialogOpen(false);
      setCloneTemplateId(null);
      setTargetSellerId("");
    }
  };

  const openCloneDialog = (templateId: string) => {
    setCloneTemplateId(templateId);
    setCloneDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-48" />
        </div>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={selectedSellerId} onValueChange={setSelectedSellerId}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filtrar por vendedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Todos os vendedores
                </span>
              </SelectItem>
              <Separator className="my-1" />
              {sellers.map((seller) => (
                <SelectItem key={seller.id} value={seller.id}>
                  <span className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {seller.full_name || seller.email}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {filteredTemplates.length > 0 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => exportTemplatesToJson(filteredTemplates, `templates-all-${new Date().toISOString().split('T')[0]}.json`)}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          )}

          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="icon" aria-label="Lista"
              className="h-9 w-9 rounded-r-none"
              onClick={() => setViewMode("table")}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon" aria-label="LayoutGrid"
              className="h-9 w-9 rounded-l-none"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>{filteredTemplates.length} templates encontrados</span>
        <span>•</span>
        <span>{Object.keys(templatesBySeller).length} vendedores</span>
      </div>

      {filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-display font-medium text-lg mb-2">Nenhum template encontrado</h3>
            <p className="text-muted-foreground">
              {searchTerm || selectedSellerId !== "all"
                ? "Tente ajustar os filtros de busca" 
                : "Não há templates cadastrados no sistema"}
            </p>
          </CardContent>
        </Card>
      ) : viewMode === "table" ? (
        <Card>
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead className="text-center">Itens</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Atualizado</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTemplates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{template.name}</div>
                        {template.description && (
                          <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {template.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{getSellerName(template.seller_id)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">
                        {template.items_data.length}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(calculateTemplateTotal(template))}
                    </TableCell>
                    <TableCell className="text-center">
                      {template.is_default && (
                        <Badge variant="outline" className="gap-1">
                          <Star className="h-3 w-3 fill-current" />
                          Padrão
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {format(new Date(template.updated_at), "dd/MM/yy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Mais opções"><MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {onEditTemplate && (
                            <DropdownMenuItem onClick={() => onEditTemplate(template)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => openCloneDialog(template.id)}>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Clonar para Vendedor
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => exportSingleTemplate(template)}>
                            <Download className="h-4 w-4 mr-2" />
                            Exportar JSON
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => setDeleteConfirmId(template.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(templatesBySeller).map(([sellerId, templates]) => (
            <div key={sellerId}>
              <div className="flex items-center gap-2 mb-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-display font-medium">{getSellerName(sellerId)}</h3>
                <Badge variant="secondary" className="ml-auto">
                  {templates.length} templates
                </Badge>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {templates.map((template) => (
                  <Card key={template.id} className="group hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base truncate">{template.name}</CardTitle>
                            {template.is_default && (
                              <Badge variant="secondary" className="shrink-0">
                                <Star className="h-3 w-3 mr-1 fill-current" />
                                Padrão
                              </Badge>
                            )}
                          </div>
                          {template.description && (
                            <CardDescription className="mt-1 line-clamp-2">
                              {template.description}
                            </CardDescription>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 opacity-0 group-hover:opacity-100"
                             aria-label="Mais opções"><MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {onEditTemplate && (
                              <DropdownMenuItem onClick={() => onEditTemplate(template)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => openCloneDialog(template.id)}>
                              <UserPlus className="h-4 w-4 mr-2" />
                              Clonar para Vendedor
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => exportSingleTemplate(template)}>
                              <Download className="h-4 w-4 mr-2" />
                              Exportar JSON
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => setDeleteConfirmId(template.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Package className="h-3.5 w-3.5" />
                            {template.items_data.length} {template.items_data.length === 1 ? "item" : "itens"}
                          </span>
                          <span className="font-medium text-foreground">
                            {formatCurrency(calculateTemplateTotal(template))}
                          </span>
                        </div>

                        <div className="pt-2 border-t text-xs text-muted-foreground">
                          Atualizado em {format(new Date(template.updated_at), "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir template?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O template será permanentemente excluído.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clone Template Dialog */}
      <Dialog open={cloneDialogOpen} onOpenChange={setCloneDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Clonar Template para Vendedor
            </DialogTitle>
            <DialogDescription>
              Selecione o vendedor que receberá uma cópia deste template.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">
              Vendedor Destino
            </label>
            <Select value={targetSellerId} onValueChange={setTargetSellerId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um vendedor..." />
              </SelectTrigger>
              <SelectContent>
                {sellers.map((seller) => (
                  <SelectItem key={seller.id} value={seller.id}>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{seller.full_name || seller.email}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setCloneDialogOpen(false);
                setCloneTemplateId(null);
                setTargetSellerId("");
              }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleClone}
              disabled={!targetSellerId}
            >
              <Copy className="h-4 w-4 mr-2" />
              Clonar Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
