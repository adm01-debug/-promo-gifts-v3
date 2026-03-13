/**
 * Gerenciador de Produtos - CRUD completo com Auditoria e Paginação
 * Refatorado: usa ProductForm unificado com validação zod e seletores reais
 */

import { useState, useEffect, useCallback } from "react";
import { invokeExternalDbSingle, invokeExternalDbDelete } from "@/lib/external-db";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useAuditLog } from "@/hooks/useAuditLog";
import { AuditHistory } from "@/components/audit/AuditHistory";
import { ProductForm } from "./products/ProductForm";
import { type ProductFormData, defaultFormValues } from "./products/ProductFormSchema";

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  short_description: string | null;
  meta_description: string | null;
  brand: string | null;
  price: number;
  cost_price: number | null;
  stock: number | null;
  category_id: string | null;
  supplier_id: string | null;
  supplier_reference: string | null;
  images: any;
  colors: any;
  materials: any;
  min_quantity: number | null;
  is_active: boolean | null;
  is_featured: boolean | null;
  is_bestseller: boolean | null;
  is_new: boolean | null;
  is_on_sale: boolean | null;
  is_kit: boolean | null;
  has_commercial_packaging: boolean | null;
  packing_type: string | null;
  height_cm: number | null;
  width_cm: number | null;
  length_cm: number | null;
  diameter_cm: number | null;
  weight_g: number | null;
  capacity_ml: number | null;
  box_width_mm: number | null;
  box_height_mm: number | null;
  box_length_mm: number | null;
  box_weight_kg: number | null;
  box_quantity: number | null;
  created_at: string;
  updated_at: string;
}

function productToFormData(p: Product): Partial<ProductFormData> {
  return {
    sku: p.sku,
    name: p.name,
    description: p.description ?? '',
    short_description: p.short_description ?? '',
    meta_description: p.meta_description ?? '',
    brand: p.brand ?? '',
    category_id: p.category_id ?? '',
    supplier_id: p.supplier_id ?? '',
    supplier_reference: p.supplier_reference ?? '',
    sale_price: p.price ?? 0,
    cost_price: p.cost_price ?? 0,
    stock_quantity: p.stock ?? 0,
    min_quantity: p.min_quantity ?? 1,
    height_cm: p.height_cm,
    width_cm: p.width_cm,
    length_cm: p.length_cm,
    diameter_cm: p.diameter_cm,
    weight_g: p.weight_g,
    capacity_ml: p.capacity_ml,
    packing_type: p.packing_type ?? '',
    box_width_mm: p.box_width_mm,
    box_height_mm: p.box_height_mm,
    box_length_mm: p.box_length_mm,
    box_weight_kg: p.box_weight_kg,
    box_quantity: p.box_quantity,
    is_active: p.is_active ?? true,
    is_featured: p.is_featured ?? false,
    is_bestseller: p.is_bestseller ?? false,
    is_new: p.is_new ?? false,
    is_on_sale: p.is_on_sale ?? false,
    is_kit: p.is_kit ?? false,
    has_commercial_packaging: p.has_commercial_packaging ?? false,
  };
}

export function ProductsManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  
  // Dialog states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"form" | "history">("form");
  
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
          description: p.description ?? p.short_description ?? null,
          short_description: p.short_description ?? null,
          meta_description: p.meta_description ?? null,
          brand: p.brand ?? null,
          price: getProductPrice(p),
          cost_price: p.cost_price ?? null,
          stock: getProductStock(p),
          category_id: p.category_id ?? p.main_category_id ?? null,
          supplier_id: p.supplier_id ?? null,
          supplier_reference: p.supplier_reference ?? null,
          is_active: p.is_active ?? p.active ?? true,
          images: imageUrl ? [imageUrl] : (Array.isArray(p.images) ? p.images : []),
          colors: Array.isArray(p.colors) ? p.colors : [],
          materials: p.materials ? (typeof p.materials === 'string' ? [p.materials] : p.materials) : [],
          min_quantity: p.min_quantity ?? 1,
          is_featured: p.is_featured ?? false,
          is_bestseller: (p as any).is_bestseller ?? false,
          is_new: p.is_new ?? false,
          is_on_sale: p.is_on_sale ?? false,
          is_kit: (p as any).is_kit ?? false,
          has_commercial_packaging: p.has_commercial_packaging ?? false,
          packing_type: p.packing_type ?? null,
          height_cm: p.height_cm ?? null,
          width_cm: p.width_cm ?? null,
          length_cm: p.length_cm ?? null,
          diameter_cm: p.diameter_cm ?? null,
          weight_g: p.weight_g ?? null,
          capacity_ml: p.capacity_ml ?? null,
          box_width_mm: p.box_width_mm ?? null,
          box_height_mm: p.box_height_mm ?? null,
          box_length_mm: p.box_length_mm ?? null,
          box_weight_kg: p.box_weight_kg ?? null,
          box_quantity: p.box_quantity ?? null,
          created_at: p.created_at ?? '',
          updated_at: p.updated_at ?? '',
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
    setActiveTab("form");
    setIsFormOpen(true);
  };

  const openEditForm = (product: Product) => {
    setSelectedProduct(product);
    setActiveTab("form");
    setIsFormOpen(true);
  };

  const openDeleteDialog = (product: Product) => {
    setSelectedProduct(product);
    setIsDeleteOpen(true);
  };

  const handleFormSubmit = async (data: ProductFormData, images: string[]) => {
    setIsSaving(true);
    try {
      // Validate duplicate SKU
      const isNew = !selectedProduct;
      const skuChanged = selectedProduct && data.sku !== selectedProduct.sku;
      
      if (isNew || skuChanged) {
        const { fetchPromobrindProducts } = await import('@/lib/external-db');
        const existing = await fetchPromobrindProducts({ search: data.sku, limit: 5 });
        const duplicate = (existing as any[]).find(
          (p: any) => p.sku?.toLowerCase() === data.sku.toLowerCase()
        );
        if (duplicate) {
          toast.error(`SKU "${data.sku}" já está cadastrado no produto "${duplicate.name}"`);
          setIsSaving(false);
          return;
        }
      }

      // Map to external DB schema — usar ?? para preservar zero
      const productData: Record<string, any> = {
        sku: data.sku,
        name: data.name,
        description: data.description || null,
        short_description: data.short_description || null,
        meta_description: data.meta_description || null,
        brand: data.brand || null,
        category_id: data.category_id || null,
        supplier_id: data.supplier_id || null,
        supplier_reference: data.supplier_reference || null,
        sale_price: data.sale_price ?? 0,
        cost_price: data.cost_price ?? null,
        stock_quantity: data.stock_quantity ?? 0,
        min_quantity: data.min_quantity ?? 1,
        is_active: data.is_active,
        active: data.is_active,
        is_featured: data.is_featured,
        is_bestseller: data.is_bestseller,
        is_new: data.is_new,
        is_on_sale: data.is_on_sale,
        is_kit: data.is_kit,
        has_commercial_packaging: data.has_commercial_packaging,
        packing_type: data.packing_type || null,
        height_cm: data.height_cm ?? null,
        width_cm: data.width_cm ?? null,
        length_cm: data.length_cm ?? null,
        diameter_cm: data.diameter_cm ?? null,
        weight_g: data.weight_g ?? null,
        capacity_ml: data.capacity_ml ?? null,
        box_width_mm: data.box_width_mm ?? null,
        box_height_mm: data.box_height_mm ?? null,
        box_length_mm: data.box_length_mm ?? null,
        box_weight_kg: data.box_weight_kg ?? null,
        box_quantity: data.box_quantity ?? null,
        updated_at: new Date().toISOString(),
      };

      // Persistir imagens no BD externo
      if (images.length > 0) {
        productData.images = images;
        productData.image_url = images[0];
        productData.primary_image_url = images[0];
      }

      if (selectedProduct) {
        await invokeExternalDbSingle<any>({
          table: 'products',
          operation: 'update',
          id: selectedProduct.id,
          data: productData,
        });
        
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
        const newProduct = await invokeExternalDbSingle<any>({
          table: 'products',
          operation: 'insert',
          data: productData,
        });
        
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

          // Auto-abrir em modo edição para permitir multi-seleção imediata
          toast.success("Produto criado! Agora vincule Tags, Ramos, Marketing e Técnicas.");
          setIsSaving(false);
          fetchProducts(1, pageSize, searchTerm);

          // Montar objeto Product para reabrir em modo edição
          const createdProduct: Product = {
            id: newProduct.id,
            sku: data.sku,
            name: data.name,
            description: data.description || null,
            short_description: data.short_description || null,
            brand: data.brand || null,
            price: data.sale_price,
            cost_price: data.cost_price || null,
            stock: data.stock_quantity,
            category_id: data.category_id || null,
            category_name: null,
            supplier_id: data.supplier_id || null,
            supplier_name: null,
            images: images.length > 0 ? images : null,
            colors: [],
            materials: data.materials ? data.materials.split(",").map(m => m.trim()).filter(Boolean) : [],
            min_quantity: data.min_quantity,
            is_active: data.is_active,
            is_featured: data.is_featured,
            is_new: data.is_new,
            is_on_sale: data.is_on_sale,
            is_kit: data.is_kit,
            has_commercial_packaging: data.has_commercial_packaging,
            height_cm: data.height_cm || null,
            width_cm: data.width_cm || null,
            length_cm: data.length_cm || null,
            diameter_cm: data.diameter_cm || null,
            weight_g: data.weight_g || null,
            capacity_ml: data.capacity_ml || null,
            box_width_mm: data.box_width_mm || null,
            box_height_mm: data.box_height_mm || null,
            box_length_mm: data.box_length_mm || null,
            box_weight_kg: data.box_weight_kg || null,
            box_quantity: data.box_quantity || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          setSelectedProduct(createdProduct);
          // Manter formulário aberto em modo edição
          return;
        }
        
        toast.success("Produto criado com sucesso");
      }

      setIsFormOpen(false);
      setCurrentPage(1);
      fetchProducts(1, pageSize, searchTerm);
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
      await invokeExternalDbDelete('products', selectedProduct.id);
      await logAction({
        action: 'DELETE',
        entityType: 'products',
        entityId: selectedProduct.id,
        oldValues: { sku: selectedProduct.sku, name: selectedProduct.name, price: selectedProduct.price },
        newValues: null,
      });
      toast.success("Produto excluído com sucesso");
      setIsDeleteOpen(false);
      fetchProducts(currentPage, pageSize, searchTerm);
    } catch (error: any) {
      console.error("Error deleting product:", error);
      toast.error(error.message || "Erro ao excluir produto");
    }
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
              {totalCount !== null && (
                <Badge variant="secondary" className="ml-2">{totalCount.toLocaleString()} produtos</Badge>
              )}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => fetchProducts(currentPage, pageSize, searchTerm)}>
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
        ) : products.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum produto encontrado</p>
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">Img</TableHead>
                  <TableHead className="w-28">SKU</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead className="w-24">Preço</TableHead>
                  <TableHead className="w-20">Estoque</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-20 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openEditForm(product)}>
                    <TableCell>
                      {product.images && product.images.length > 0 ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-10 h-10 object-cover rounded-md"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-muted rounded-md flex items-center justify-center">
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {product.sku}
                    </TableCell>
                    <TableCell className="font-medium max-w-[250px] truncate">
                      {product.name}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      R$ {product.price.toFixed(2)}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {product.stock ?? 0}
                    </TableCell>
                    <TableCell>
                      {product.is_active ? (
                        <Badge variant="default" className="text-xs">Ativo</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Inativo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditForm(product)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => openDeleteDialog(product)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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
            <span>Página {currentPage} de {totalPages}</span>
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
            <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => handlePageChange(currentPage - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let page: number;
              if (totalPages <= 5) page = i + 1;
              else if (currentPage <= 3) page = i + 1;
              else if (currentPage >= totalPages - 2) page = totalPages - 4 + i;
              else page = currentPage - 2 + i;
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
            <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => handlePageChange(currentPage + 1)}>
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
                ? `Editando: ${selectedProduct.sku} — ${selectedProduct.name}`
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
                <ProductForm
                  initialData={productToFormData(selectedProduct)}
                  productImages={selectedProduct.images || []}
                  productId={selectedProduct.id}
                  onSubmit={handleFormSubmit}
                  onCancel={() => setIsFormOpen(false)}
                  isSaving={isSaving}
                  isEdit
                />
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
            <ProductForm
              onSubmit={handleFormSubmit}
              onCancel={() => setIsFormOpen(false)}
              isSaving={isSaving}
              isEdit={false}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Produto?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o produto "{selectedProduct?.name}" ({selectedProduct?.sku})?
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
