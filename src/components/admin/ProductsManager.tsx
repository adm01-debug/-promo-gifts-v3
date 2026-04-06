import { ExternalProduct } from "@/types/external-db";
/**
 * Gerenciador de Produtos - CRUD completo com Auditoria e Paginação
 * Refatorado: usa navegação para formulário full-screen
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { invokeExternalDbSingle, invokeExternalDbDelete, getProductImageUrl, getProductPrice, getProductStock } from "@/lib/external-db";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Search,
  Package,
  ImageIcon,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  X,
  Power,
  PowerOff,
  Boxes,
} from "lucide-react";
import { BulkImportDialog } from "./products/BulkImportDialog";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { ProductFiltersBar, type ProductFilters } from "./products/ProductFiltersBar";
import { useAuditLog } from "@/hooks/useAuditLog";


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
  suggested_price: number | null;
  stock: number | null;
  stock_unit: string | null;
  category_id: string | null;
  supplier_id: string | null;
  supplier_reference: string | null;
  images: string[] | null;
  colors: Array<{ name: string; hex?: string; stock?: number }> | null;
  materials: string[] | null;
  min_quantity: number | null;
  min_order_quantity: number | null;
  is_active: boolean | null;
  is_featured: boolean | null;
  is_bestseller: boolean | null;
  is_new: boolean | null;
  is_on_sale: boolean | null;
  is_kit: boolean | null;
  has_commercial_packaging: boolean | null;
  is_imported: boolean | null;
  is_textil: boolean | null;
  is_thermal: boolean | null;
  allows_personalization: boolean | null;
  has_gift_box: boolean | null;
  has_optional_packaging: boolean | null;
  packing_type: string | null;
  height_cm: number | null;
  width_cm: number | null;
  length_cm: number | null;
  diameter_cm: number | null;
  weight_g: number | null;
  capacity_ml: number | null;
  internal_height_cm: number | null;
  internal_width_cm: number | null;
  internal_length_cm: number | null;
  internal_diameter_cm: number | null;
  box_width_mm: number | null;
  box_height_mm: number | null;
  box_length_mm: number | null;
  box_weight_kg: number | null;
  box_quantity: number | null;
  box_inner_quantity: number | null;
  box_volume_cm3: number | null;
  packaging_material: string | null;
  packaging_color: string | null;
  packaging_finish: string | null;
  ncm_code: string | null;
  ean: string | null;
  gtin: string | null;
  ipi_rate: number | null;
  country_of_origin: string | null;
  cfop: string | null;
  csosn: string | null;
  icms_rate: number | null;
  pis_rate: number | null;
  cofins_rate: number | null;
  tax_regime: string | null;
  cest: string | null;
  freight_class: string | null;
  default_carrier: string | null;
  shipping_weight_kg: number | null;
  shipping_width_cm: number | null;
  shipping_height_cm: number | null;
  shipping_length_cm: number | null;
  cubic_weight: number | null;
  requires_special_shipping: boolean | null;
  shipping_notes: string | null;
  lead_time_days: number | null;
  product_type: string | null;
  supply_mode: string | null;
  warranty_months: number | null;
  gender: string | null;
  meta_title: string | null;
  meta_keywords: string[] | null;
  slug: string | null;
  canonical_url: string | null;
  video_url: string | null;
  key_benefits: string | null;
  use_cases: string | null;
  created_at: string;
  updated_at: string;
}




export function ProductsManager() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [advancedFilters, setAdvancedFilters] = useState<ProductFilters>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  
  // Dialog states (only delete + import remain)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  const { logAction, getChangedFields } = useAuditLog();
  const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : 1;

  const fetchProducts = useCallback(async (page = currentPage, size = pageSize, search?: string, filtersOverride?: ProductFilters) => {
    setIsLoading(true);
    try {
      const { fetchPromobrindProducts, getProductImageUrl, getProductPrice, getProductStock } = await import('@/lib/external-db');
      
      const offset = (page - 1) * size;
      const activeFilters = filtersOverride ?? advancedFilters;

      // Build server-side filters
      const serverFilters: Record<string, unknown> = {};
      if (activeFilters.category_id) serverFilters.category_id = activeFilters.category_id;
      if (activeFilters.supplier_id) serverFilters.supplier_id = activeFilters.supplier_id;
      if (activeFilters.is_active !== undefined && activeFilters.is_active !== 'all') {
        serverFilters.is_active = activeFilters.is_active;
        serverFilters.active = activeFilters.is_active;
      }

      const result = await fetchPromobrindProducts({
        search: search || undefined,
        limit: size,
        offset,
        orderBy: { column: 'created_at', ascending: false },
        returnCount: true,
        filters: serverFilters,
      });

      const { products: productsData, count } = result as { products: PromobrindProduct[]; count: number | null };
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
          is_bestseller: (p as ExternalProduct).is_bestseller ?? false,
          is_new: p.is_new ?? false,
          is_on_sale: p.is_on_sale ?? false,
          is_kit: (p as ExternalProduct).is_kit ?? false,
          has_commercial_packaging: p.has_commercial_packaging ?? false,
          is_imported: p.is_imported ?? false,
          is_textil: p.is_textil ?? false,
          is_thermal: p.is_thermal ?? false,
          allows_personalization: p.allows_personalization ?? true,
          has_gift_box: p.has_gift_box ?? false,
          has_optional_packaging: p.has_optional_packaging ?? false,
          packing_type: p.packing_type ?? null,
          height_cm: p.height_cm ?? null,
          width_cm: p.width_cm ?? null,
          length_cm: p.length_cm ?? null,
          diameter_cm: p.diameter_cm ?? null,
          weight_g: p.weight_g ?? null,
          capacity_ml: p.capacity_ml ?? null,
          internal_height_cm: p.internal_height_cm ?? null,
          internal_width_cm: p.internal_width_cm ?? null,
          internal_length_cm: p.internal_length_cm ?? null,
          internal_diameter_cm: p.internal_diameter_cm ?? null,
          box_width_mm: p.box_width_mm ?? null,
          box_height_mm: p.box_height_mm ?? null,
          box_length_mm: p.box_length_mm ?? null,
          box_weight_kg: p.box_weight_kg ?? null,
          box_quantity: p.box_quantity ?? null,
          box_inner_quantity: p.box_inner_quantity ?? null,
          box_volume_cm3: p.box_volume_cm3 ?? null,
          packaging_material: p.packaging_material ?? null,
          packaging_color: p.packaging_color ?? null,
          packaging_finish: p.packaging_finish ?? null,
          suggested_price: p.suggested_price ?? null,
          stock_unit: p.stock_unit ?? null,
          min_order_quantity: p.min_order_quantity ?? null,
          ncm_code: p.ncm_code ?? null,
          ean: p.ean ?? null,
          gtin: p.gtin ?? null,
          ipi_rate: p.ipi_rate ?? null,
          country_of_origin: p.country_of_origin ?? null,
          cfop: p.cfop ?? null,
          csosn: p.csosn ?? null,
          icms_rate: p.icms_rate ?? null,
          pis_rate: p.pis_rate ?? null,
          cofins_rate: p.cofins_rate ?? null,
          tax_regime: p.tax_regime ?? null,
          cest: p.cest ?? null,
          freight_class: p.freight_class ?? null,
          default_carrier: p.default_carrier ?? null,
          shipping_weight_kg: p.shipping_weight_kg ?? null,
          shipping_width_cm: p.shipping_width_cm ?? null,
          shipping_height_cm: p.shipping_height_cm ?? null,
          shipping_length_cm: p.shipping_length_cm ?? null,
          cubic_weight: p.cubic_weight ?? null,
          requires_special_shipping: p.requires_special_shipping ?? null,
          shipping_notes: p.shipping_notes ?? null,
          lead_time_days: p.lead_time_days ?? null,
          product_type: p.product_type ?? null,
          supply_mode: p.supply_mode ?? null,
          warranty_months: p.warranty_months ?? null,
          gender: p.gender ?? null,
          meta_title: p.meta_title ?? null,
          meta_keywords: Array.isArray(p.meta_keywords) ? p.meta_keywords : null,
          slug: p.slug ?? null,
          canonical_url: p.canonical_url ?? null,
          video_url: (p as ExternalProduct).videos?.[0] ?? null,
          key_benefits: p.key_benefits ?? null,
          use_cases: p.use_cases ?? null,
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
  }, [currentPage, pageSize, advancedFilters]);

  useEffect(() => {
    fetchProducts(1, pageSize, searchTerm);
  }, []);

  // Debounced server-side search
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchProducts(1, pageSize, searchTerm, advancedFilters);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Re-fetch when advanced filters change (server-side: category, supplier, status)
  const handleFiltersChange = useCallback((newFilters: ProductFilters) => {
    setAdvancedFilters(newFilters);
    setCurrentPage(1);
    fetchProducts(1, pageSize, searchTerm, newFilters);
  }, [pageSize, searchTerm]);

  // Client-side price filtering on current page
  const displayedProducts = useMemo(() => {
    let filtered = products;
    const { price_min, price_max, is_kit } = advancedFilters;
    if (price_min !== undefined && price_min > 0) {
      filtered = filtered.filter(p => p.price >= price_min);
    }
    if (price_max !== undefined && price_max > 0) {
      filtered = filtered.filter(p => p.price <= price_max);
    }
    if (is_kit) {
      filtered = filtered.filter(p => p.is_kit);
    }
    return filtered;
  }, [products, advancedFilters.price_min, advancedFilters.price_max, advancedFilters.is_kit]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setSelectedIds(new Set());
    fetchProducts(page, pageSize, searchTerm);
  };

  const handlePageSizeChange = (newSize: string) => {
    const size = parseInt(newSize, 10);
    setPageSize(size);
    setCurrentPage(1);
    fetchProducts(1, size, searchTerm);
  };

  const openCreateForm = () => {
    navigate('/admin/cadastros/produto/novo');
  };

  const openEditForm = (product: Product) => {
    navigate(`/admin/cadastros/produto/${product.id}`);
  };

  const openDeleteDialog = (product: Product) => {
    setSelectedProduct(product);
    setIsDeleteOpen(true);
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
    } catch (error: unknown) {
      console.error("Error deleting product:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao excluir produto");
    }
  };


  // Bulk selection helpers
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds(prev =>
      prev.size === displayedProducts.length
        ? new Set()
        : new Set(displayedProducts.map(p => p.id))
    );
  }, [displayedProducts]);

  const handleBulkToggleActive = useCallback(async (activate: boolean) => {
    if (selectedIds.size === 0) return;
    setIsBulkUpdating(true);
    try {
      const promises = Array.from(selectedIds).map(id =>
        invokeExternalDbSingle({ table: 'products', operation: 'update', id, data: { is_active: activate, active: activate, updated_at: new Date().toISOString() } })
      );
      await Promise.all(promises);
      toast.success(`${selectedIds.size} produto(s) ${activate ? 'ativado(s)' : 'desativado(s)'}`);
      setSelectedIds(new Set());
      fetchProducts(currentPage, pageSize, searchTerm);
    } catch (error: unknown) {
      console.error('Bulk update error:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar produtos em lote');
    } finally {
      setIsBulkUpdating(false);
    }
  }, [selectedIds, currentPage, pageSize, searchTerm]);


  const stats = useMemo(() => {
    const active = products.filter(p => p.is_active).length;
    const inactive = products.filter(p => !p.is_active).length;
    const noStock = products.filter(p => (p.stock ?? 0) <= 0).length;
    const avgPrice = products.length ? products.reduce((sum, p) => sum + p.price, 0) / products.length : 0;
    return { active, inactive, noStock, avgPrice };
  }, [products]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10">
              <Package className="h-5 w-5 text-primary" />
            </div>
            Gerenciador de Produtos
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Cadastre, edite e gerencie os produtos do catálogo
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchProducts(currentPage, pageSize, searchTerm)} className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsImportOpen(true)} className="gap-2">
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Importar</span>
          </Button>
          <Button size="sm" onClick={openCreateForm} className="gap-2 bg-primary hover:bg-primary/90 shadow-sm">
            <Plus className="h-4 w-4" />
            Novo Produto
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: 'Total',
            value: totalCount?.toLocaleString() ?? '—',
            valueClass: '',
            icon: <Package className="h-5 w-5 text-primary" />,
            iconBg: 'bg-primary/10',
          },
          {
            label: 'Ativos',
            value: stats.active,
            valueClass: 'text-primary',
            icon: <div className="h-3 w-3 rounded-full bg-primary" />,
            iconBg: 'bg-primary/10',
          },
          {
            label: 'Sem Estoque',
            value: stats.noStock,
            valueClass: 'text-warning dark:text-warning',
            icon: <div className="h-3 w-3 rounded-full bg-warning" />,
            iconBg: 'bg-warning/10',
          },
          {
            label: 'Preço Médio',
            value: `R$ ${stats.avgPrice.toFixed(0)}`,
            valueClass: '',
            icon: <span className="text-sm font-bold text-primary">$</span>,
            iconBg: 'bg-primary/10',
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.08, ease: 'easeOut' }}
            whileHover={{ y: -2, transition: { duration: 0.2 } }}
          >
            <Card className="border-border/40 bg-card/80 backdrop-blur-sm hover:border-border/70 hover:shadow-md transition-shadow duration-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                    <p className={cn("text-2xl font-bold tabular-nums mt-1", stat.valueClass)}>{stat.value}</p>
                  </div>
                  <div className={cn("h-10 w-10 rounded-full flex items-center justify-center", stat.iconBg)}>
                    {stat.icon}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Search & Filters */}
      <Card className="border-border/40">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, SKU ou categoria..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 bg-background"
              />
              {searchTerm && (
                <button aria-label="Fechar"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          <ProductFiltersBar filters={advancedFilters} onChange={handleFiltersChange} />
        </CardContent>
      </Card>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={selectedIds.size === displayedProducts.length}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm font-medium">
                {selectedIds.size} produto(s) selecionado(s)
              </span>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setSelectedIds(new Set())}>
                Limpar seleção
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-primary border-primary/30 hover:bg-primary/10"
                disabled={isBulkUpdating}
                onClick={() => handleBulkToggleActive(true)}
              >
                {isBulkUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Power className="h-3.5 w-3.5" />}
                Ativar
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                disabled={isBulkUpdating}
                onClick={() => handleBulkToggleActive(false)}
              >
                {isBulkUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PowerOff className="h-3.5 w-3.5" />}
                Desativar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Products Table */}
      <Card className="border-border/40">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Carregando produtos...</p>
              </div>
            </div>
          ) : displayedProducts.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Package className="h-14 w-14 mx-auto mb-4 opacity-30" />
              <p className="font-medium">Nenhum produto encontrado</p>
              <p className="text-sm mt-1">Tente ajustar os filtros ou o termo de busca</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border/50">
                    <TableHead className="w-10 pl-4">
                      <Checkbox
                        checked={selectedIds.size > 0 && selectedIds.size === displayedProducts.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="w-14">Foto</TableHead>
                    <TableHead className="w-28">SKU</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead className="w-28 text-right">Preço</TableHead>
                    <TableHead className="w-24 text-center">Estoque</TableHead>
                    <TableHead className="w-24 text-center">Status</TableHead>
                    <TableHead className="w-20 text-right pr-4">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedProducts.map((product) => {
                    const stockLevel = product.stock ?? 0;
                    const stockColor = stockLevel <= 0
                      ? 'text-destructive'
                      : stockLevel < 10
                        ? 'text-warning dark:text-warning'
                        : 'text-primary';

                    return (
                      <TableRow
                        key={product.id}
                        className={cn(
                          "cursor-pointer group hover:bg-muted/40 transition-colors border-border/30",
                          selectedIds.has(product.id) && "bg-primary/5"
                        )}
                        onClick={() => openEditForm(product)}
                      >
                        <TableCell className="pl-4" onClick={e => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.has(product.id)}
                            onCheckedChange={() => toggleSelect(product.id)}
                          />
                        </TableCell>
                        <TableCell>
                          {product.images && product.images.length > 0 ? (
                            <div className="relative">
                              <img
                                src={product.images[0]}
                                alt={product.name}
                                className="w-12 h-12 object-cover rounded-lg border border-border/50 group-hover:border-primary/30 transition-colors" loading="lazy" />
                              {product.images.length > 1 && (
                                <span className="absolute -bottom-1 -right-1 text-[9px] bg-muted border border-border rounded-full h-4 w-4 flex items-center justify-center font-medium">
                                  +{product.images.length - 1}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="w-12 h-12 bg-muted/50 rounded-lg border border-dashed border-border/60 flex items-center justify-center">
                              <ImageIcon className="h-4 w-4 text-muted-foreground/50" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                            {product.sku}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[280px]">
                            <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                              {product.name}
                            </p>
                            <div className="flex items-center gap-1 mt-0.5">
                              {product.is_featured && (
                                <Badge variant="outline" className="text-[10px] h-4 px-1 border-warning/30 text-warning dark:text-warning">
                                  ⭐ Destaque
                                </Badge>
                              )}
                              {product.is_new && (
                                <Badge variant="outline" className="text-[10px] h-4 px-1 border-primary/30 text-primary">
                                  Novo
                                </Badge>
                              )}
                              {product.is_kit && (
                                <Badge variant="outline" className="text-[10px] h-4 px-1 gap-0.5 border-primary/30 bg-primary/10 text-primary">
                                  <Boxes className="h-2.5 w-2.5" />
                                  Kit
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-semibold tabular-nums text-sm">
                            R$ {product.price.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`font-semibold tabular-nums text-sm ${stockColor}`}>
                            {stockLevel}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {product.is_active ? (
                            <Badge className="text-[10px] bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15">
                              Ativo
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] opacity-60">
                              Inativo
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          <div className="flex justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" aria-label="Editar" className="h-8 w-8 hover:bg-primary/10 hover:text-primary" onClick={() => openEditForm(product)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon" aria-label="Excluir"
                              className="h-8 w-8 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                              onClick={() => openDeleteDialog(product)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {!isLoading && displayedProducts.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-border/40">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>
                  Mostrando <strong className="text-foreground">{displayedProducts.length}</strong> de{' '}
                  <strong className="text-foreground">{totalCount?.toLocaleString()}</strong> produtos
                </span>
                <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
                  <SelectTrigger className="w-[90px] h-8 text-xs">
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
                <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => handlePageChange(currentPage - 1)} className="h-8">
                  <ChevronLeft className="h-4 w-4" />
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
                      className="w-8 h-8 p-0 text-xs"
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </Button>
                  );
                })}
                <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => handlePageChange(currentPage + 1)} className="h-8">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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

      {/* Bulk Import */}
      <BulkImportDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        onComplete={() => fetchProducts(1, pageSize, searchTerm)}
      />
    </div>
  );
}
