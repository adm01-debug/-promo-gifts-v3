/**
 * Gerenciador de Produtos - CRUD completo com Auditoria e Paginação
 */

import { useState, useEffect, useCallback } from "react";
import { invokeExternalDbSingle, invokeExternalDbDelete } from "@/lib/external-db";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Search,
  Package,
  ImageIcon,
  RefreshCw,
  History,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { ImageUploadButton } from "./ImageUploadButton";
import { useAuditLog } from "@/hooks/useAuditLog";
import { AuditHistory } from "@/components/audit/AuditHistory";

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  price: number;
  stock: number | null;
  stock_status: string | null;
  category_name: string | null;
  subcategory: string | null;
  supplier_name: string | null;
  images: any;
  colors: any;
  materials: any;
  min_quantity: number | null;
  is_active: boolean | null;
  featured: boolean | null;
  new_arrival: boolean | null;
  on_sale: boolean | null;
  video_url: string | null;
  created_at: string;
  updated_at: string;
}

interface ProductFormData {
  sku: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  stock_status: string;
  category_name: string;
  subcategory: string;
  supplier_name: string;
  min_quantity: number;
  is_active: boolean;
  featured: boolean;
  new_arrival: boolean;
  on_sale: boolean;
  video_url: string;
  materials: string;
}

const initialFormData: ProductFormData = {
  sku: "",
  name: "",
  description: "",
  price: 0,
  stock: 0,
  stock_status: "in_stock",
  category_name: "",
  subcategory: "",
  supplier_name: "",
  min_quantity: 1,
  is_active: true,
  featured: false,
  new_arrival: false,
  on_sale: false,
  video_url: "",
  materials: "",
};

export function ProductsManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  
  // Dialog states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [productImages, setProductImages] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"form" | "history">("form");
  
  // Audit hook
  const { logAction, getChangedFields } = useAuditLog();

  const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : 1;

  const fetchProducts = useCallback(async (page = currentPage, size = pageSize, search?: string) => {
    setIsLoading(true);
    try {
      const { fetchPromobrindProducts, getProductImageUrl, getProductPrice, getProductStock } = await import('@/lib/external-db');
      
      const offset = (page - 1) * size;
      const result = await fetchPromobrindProducts({
        search: search || undefined,
        limit: size,
        offset,
        orderBy: { column: 'created_at', ascending: false },
        returnCount: true,
      });

      const { products: productsData, count } = result as { products: any[]; count: number | null };
      setTotalCount(count);

      const formattedProducts: Product[] = productsData.map((p) => {
        const imageUrl = getProductImageUrl(p);
        return {
          id: p.id,
          sku: p.sku,
          name: p.name,
          description: p.description || p.short_description || null,
          price: getProductPrice(p),
          stock: getProductStock(p),
          stock_status: getProductStock(p) > 0 ? 'in_stock' : 'out_of_stock',
          category_name: null,
          subcategory: null,
          supplier_name: null,
          is_active: p.is_active || p.active,
          images: imageUrl ? [imageUrl] : (Array.isArray(p.images) ? p.images : []),
          colors: Array.isArray(p.colors) ? p.colors : [],
          materials: p.materials ? (typeof p.materials === 'string' ? [p.materials] : p.materials) : [],
          min_quantity: p.min_quantity || 1,
          featured: false,
          new_arrival: false,
          on_sale: false,
          video_url: null,
          created_at: p.created_at || '',
          updated_at: p.updated_at || '',
        };
      });

      setProducts(formattedProducts);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Erro ao carregar produtos");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize]);

  useEffect(() => {
    fetchProducts(1, pageSize, searchTerm);
  }, []);

  // Debounced server-side search
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchProducts(1, pageSize, searchTerm);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const filteredProducts = products;

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchProducts(page, pageSize, searchTerm);
  };

  const handlePageSizeChange = (newSize: string) => {
    const size = parseInt(newSize, 10);
    setPageSize(size);
    setCurrentPage(1);
    fetchProducts(1, size, searchTerm);
  };

  const openCreateForm = () => {
    setSelectedProduct(null);
    setFormData(initialFormData);
    setProductImages([]);
    setIsFormOpen(true);
  };

  const openEditForm = (product: Product) => {
    setSelectedProduct(product);
    setFormData({
      sku: product.sku,
      name: product.name,
      description: product.description || "",
      price: product.price,
      stock: product.stock || 0,
      stock_status: product.stock_status || "in_stock",
      category_name: product.category_name || "",
      subcategory: product.subcategory || "",
      supplier_name: product.supplier_name || "",
      min_quantity: product.min_quantity || 1,
      is_active: product.is_active ?? true,
      featured: product.featured ?? false,
      new_arrival: product.new_arrival ?? false,
      on_sale: product.on_sale ?? false,
      video_url: product.video_url || "",
      materials: product.materials?.join(", ") || "",
    });
    setProductImages(product.images || []);
    setActiveTab("form");
    setIsFormOpen(true);
  };

  const openDeleteDialog = (product: Product) => {
    setSelectedProduct(product);
    setIsDeleteOpen(true);
  };

  const handleSave = async () => {
    if (!formData.sku || !formData.name) {
      toast.error("SKU e Nome são obrigatórios");
      return;
    }

    setIsSaving(true);
    try {
      // Validar SKU duplicado (apenas ao criar ou ao alterar o SKU)
      const isNewProduct = !selectedProduct;
      const skuChanged = selectedProduct && formData.sku !== selectedProduct.sku;
      
      if (isNewProduct || skuChanged) {
        const { fetchPromobrindProducts } = await import('@/lib/external-db');
        const existing = await fetchPromobrindProducts({
          search: formData.sku,
          limit: 5,
        });
        const duplicate = (existing as any[]).find(
          (p: any) => p.sku?.toLowerCase() === formData.sku.toLowerCase()
        );
        if (duplicate) {
          toast.error(`SKU "${formData.sku}" já está cadastrado no produto "${duplicate.name}"`);
          setIsSaving(false);
          return;
        }
      }
      // Mapear para campos reais do schema externo (products table)
      const productData: Record<string, any> = {
        sku: formData.sku,
        name: formData.name,
        description: formData.description || null,
        short_description: formData.description ? formData.description.substring(0, 200) : null,
        sale_price: formData.price,
        stock_quantity: formData.stock,
        min_quantity: formData.min_quantity,
        is_active: formData.is_active,
        active: formData.is_active,
        updated_at: new Date().toISOString(),
      };

      // Campos opcionais - só enviar se preenchidos
      if (formData.materials) {
        productData.materials = formData.materials.split(",").map((m) => m.trim());
      }

      if (selectedProduct) {
        // Update via external-db-bridge
        const updated = await invokeExternalDbSingle<any>({
          table: 'products',
          operation: 'update',
          id: selectedProduct.id,
          data: productData,
        });
        
        // Registrar auditoria de UPDATE
        const { oldFields, newFields } = getChangedFields(
          {
            sku: selectedProduct.sku,
            name: selectedProduct.name,
            description: selectedProduct.description,
            sale_price: selectedProduct.price,
            stock_quantity: selectedProduct.stock,
            is_active: selectedProduct.is_active,
          },
          productData
        );
        
        if (Object.keys(newFields).length > 0) {
          await logAction({
            action: 'UPDATE',
            entityType: 'products',
            entityId: selectedProduct.id,
            oldValues: oldFields,
            newValues: newFields,
          });
        }
        
        toast.success("Produto atualizado com sucesso");
      } else {
        // Create via external-db-bridge
        const newProduct = await invokeExternalDbSingle<any>({
          table: 'products',
          operation: 'insert',
          data: productData,
        });
        
        // Registrar auditoria de INSERT
        if (newProduct) {
          await logAction({
            action: 'INSERT',
            entityType: 'products',
            entityId: newProduct.id,
            oldValues: null,
            newValues: {
              sku: productData.sku,
              name: productData.name,
              sale_price: productData.sale_price,
              is_active: productData.is_active,
            },
          });
        }
        
        toast.success("Produto criado com sucesso");
      }

      setIsFormOpen(false);
      setCurrentPage(1);
      fetchProducts(1, pageSize);
    } catch (error: any) {
      console.error("Error saving product:", error);
      toast.error(error.message || "Erro ao salvar produto");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProduct) return;

    try {
      // Delete via external-db-bridge
      await invokeExternalDbDelete('products', selectedProduct.id);
      
      // Registrar auditoria de DELETE
      await logAction({
        action: 'DELETE',
        entityType: 'products',
        entityId: selectedProduct.id,
        oldValues: {
          sku: selectedProduct.sku,
          name: selectedProduct.name,
          price: selectedProduct.price,
          category_name: selectedProduct.category_name,
        },
        newValues: null,
      });

      toast.success("Produto excluído com sucesso");
      setIsDeleteOpen(false);
      fetchProducts(currentPage, pageSize);
    } catch (error: any) {
      console.error("Error deleting product:", error);
      toast.error(error.message || "Erro ao excluir produto");
    }
  };

  const handleImageUpload = (url: string) => {
    setProductImages((prev) => [...prev, url]);
  };

  const handleImageRemove = (index: number) => {
    setProductImages((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Gerenciador de Produtos
            </CardTitle>
            <CardDescription>
              Cadastre, edite e gerencie os produtos do catálogo
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => fetchProducts(currentPage, pageSize)}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button size="sm" onClick={openCreateForm}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Produto
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, SKU ou categoria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Products Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum produto encontrado</p>
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Imagem</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Estoque</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      {product.images && product.images.length > 0 ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-12 h-12 object-cover rounded-md"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center">
                          <ImageIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {product.sku}
                    </TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {product.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {product.category_name || "-"}
                    </TableCell>
                    <TableCell>
                      R$ {product.price.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {product.stock ?? 0}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {product.is_active ? (
                          <Badge variant="default" className="text-xs">Ativo</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Inativo</Badge>
                        )}
                        {product.featured && (
                          <Badge variant="outline" className="text-xs">Destaque</Badge>
                        )}
                        {product.new_arrival && (
                          <Badge variant="outline" className="text-xs text-green-600">Novo</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditForm(product)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => openDeleteDialog(product)}
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

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>
              Página {currentPage} de {totalPages}
              {totalCount !== null && ` · ${totalCount.toLocaleString()} produtos`}
            </span>
            <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
              <SelectTrigger className="w-[100px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size} / pág
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>
            {/* Page number buttons */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let page: number;
              if (totalPages <= 5) {
                page = i + 1;
              } else if (currentPage <= 3) {
                page = i + 1;
              } else if (currentPage >= totalPages - 2) {
                page = totalPages - 4 + i;
              } else {
                page = currentPage - 2 + i;
              }
              return (
                <Button
                  key={page}
                  variant={page === currentPage ? "default" : "outline"}
                  size="sm"
                  className="w-8 h-8 p-0"
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
            >
              Próximo
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </CardContent>

      {/* Create/Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {selectedProduct ? "Editar Produto" : "Novo Produto"}
            </DialogTitle>
            <DialogDescription>
              {selectedProduct
                ? "Atualize as informações do produto ou visualize o histórico de alterações"
                : "Preencha os dados para cadastrar um novo produto"}
            </DialogDescription>
          </DialogHeader>

          {selectedProduct ? (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "form" | "history")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="form" className="flex items-center gap-2">
                  <Pencil className="h-4 w-4" />
                  Editar
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Histórico
                </TabsTrigger>
              </TabsList>

              <TabsContent value="form" className="mt-4">
                <ScrollArea className="max-h-[55vh] pr-4">
            <div className="grid gap-4 py-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU *</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="Ex: PROD-001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nome do produto"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição detalhada do produto"
                  rows={3}
                />
              </div>

              {/* Pricing & Stock */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Preço (R$)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stock">Estoque</Label>
                  <Input
                    id="stock"
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="min_quantity">Qtd. Mínima</Label>
                  <Input
                    id="min_quantity"
                    type="number"
                    value={formData.min_quantity}
                    onChange={(e) => setFormData({ ...formData, min_quantity: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>

              {/* Category & Supplier */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category_name">Categoria</Label>
                  <Input
                    id="category_name"
                    value={formData.category_name}
                    onChange={(e) => setFormData({ ...formData, category_name: e.target.value })}
                    placeholder="Ex: Canecas"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subcategory">Subcategoria</Label>
                  <Input
                    id="subcategory"
                    value={formData.subcategory}
                    onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                    placeholder="Ex: Térmicas"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier_name">Fornecedor</Label>
                  <Input
                    id="supplier_name"
                    value={formData.supplier_name}
                    onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                    placeholder="Nome do fornecedor"
                  />
                </div>
              </div>

              {/* Materials & Video */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="materials">Materiais (separados por vírgula)</Label>
                  <Input
                    id="materials"
                    value={formData.materials}
                    onChange={(e) => setFormData({ ...formData, materials: e.target.value })}
                    placeholder="Ex: Plástico, Metal, Silicone"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="video_url">URL do Vídeo</Label>
                  <Input
                    id="video_url"
                    value={formData.video_url}
                    onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>

              {/* Flags */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <Label htmlFor="is_active" className="cursor-pointer">Produto Ativo</Label>
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <Label htmlFor="featured" className="cursor-pointer">Destaque</Label>
                  <Switch
                    id="featured"
                    checked={formData.featured}
                    onCheckedChange={(checked) => setFormData({ ...formData, featured: checked })}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <Label htmlFor="new_arrival" className="cursor-pointer">Lançamento</Label>
                  <Switch
                    id="new_arrival"
                    checked={formData.new_arrival}
                    onCheckedChange={(checked) => setFormData({ ...formData, new_arrival: checked })}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <Label htmlFor="on_sale" className="cursor-pointer">Em Promoção</Label>
                  <Switch
                    id="on_sale"
                    checked={formData.on_sale}
                    onCheckedChange={(checked) => setFormData({ ...formData, on_sale: checked })}
                  />
                </div>
              </div>

              {/* Images */}
              <div className="space-y-2">
                <Label>Imagens do Produto</Label>
                <div className="flex flex-wrap gap-2">
                  {productImages.map((img, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={img}
                        alt={`Imagem ${index + 1}`}
                        className="w-20 h-20 object-cover rounded-md"
                      />
                      <button
                        type="button"
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-5 h-5 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleImageRemove(index)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <ImageUploadButton
                    currentImageUrl={null}
                    onUpload={handleImageUpload}
                    onRemove={() => {}}
                    folder="products"
                  />
                </div>
              </div>
            </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="history" className="mt-4">
                <AuditHistory
                  entityType="products"
                  entityId={selectedProduct.id}
                  title="Histórico de Alterações"
                  maxHeight="55vh"
                />
              </TabsContent>
            </Tabs>
          ) : (
            <ScrollArea className="max-h-[60vh] pr-4">
              {/* Form content for new product - same as edit form */}
              <div className="grid gap-4 py-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sku-new">SKU *</Label>
                    <Input
                      id="sku-new"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      placeholder="Ex: PROD-001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name-new">Nome *</Label>
                    <Input
                      id="name-new"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Nome do produto"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description-new">Descrição</Label>
                  <Textarea
                    id="description-new"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descrição detalhada do produto"
                    rows={3}
                  />
                </div>

                {/* Pricing & Stock */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price-new">Preço (R$)</Label>
                    <Input
                      id="price-new"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stock-new">Estoque</Label>
                    <Input
                      id="stock-new"
                      type="number"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="min_quantity-new">Qtd. Mínima</Label>
                    <Input
                      id="min_quantity-new"
                      type="number"
                      value={formData.min_quantity}
                      onChange={(e) => setFormData({ ...formData, min_quantity: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                </div>

                {/* Category & Supplier */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category-new">Categoria</Label>
                    <Input
                      id="category-new"
                      value={formData.category_name}
                      onChange={(e) => setFormData({ ...formData, category_name: e.target.value })}
                      placeholder="Nome da categoria"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supplier-new">Fornecedor</Label>
                    <Input
                      id="supplier-new"
                      value={formData.supplier_name}
                      onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                      placeholder="Nome do fornecedor"
                    />
                  </div>
                </div>

                {/* Flags */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="is_active-new"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label htmlFor="is_active-new">Ativo</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="featured-new"
                      checked={formData.featured}
                      onCheckedChange={(checked) => setFormData({ ...formData, featured: checked })}
                    />
                    <Label htmlFor="featured-new">Destaque</Label>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {selectedProduct ? "Salvar Alterações" : "Criar Produto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Produto?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o produto "{selectedProduct?.name}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
