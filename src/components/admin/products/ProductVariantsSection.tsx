/**
 * ProductVariantsSection — CRUD de variações de cor de um produto
 * Visual de swatches circulares com checkmarks (padrão Super Filtro)
 * Enriquecido com: supplier_sku, ean, size_code, capacity_ml, dimensões, peso
 */

import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Palette, Package, AlertCircle, Plus, Pencil, Trash2, Save, X, Loader2, Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { VariantGridMatrix, type VariantGridItem, type BulkAction } from '@/components/products/VariantGridMatrix';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ProductVariant {
  id: string;
  sku: string;
  name: string;
  color_name: string | null;
  color_hex: string | null;
  color_code: string | null;
  stock_quantity: number | null;
  selected_thumbnail: string | null;
  is_active: boolean;
  product_id: string;
  // Campos enriquecidos
  supplier_sku: string | null;
  ean: string | null;
  size_code: string | null;
  capacity_ml: number | null;
  height_mm: number | null;
  width_mm: number | null;
  length_mm: number | null;
  weight_g: number | null;
}

interface VariantFormData {
  name: string;
  sku: string;
  color_name: string;
  color_hex: string;
  stock_quantity: number;
  // Novos campos
  supplier_sku: string;
  ean: string;
  size_code: string;
  capacity_ml: number | null;
  height_mm: number | null;
  width_mm: number | null;
  length_mm: number | null;
  weight_g: number | null;
}

interface ProductVariantsSectionProps {
  productId: string;
  productName?: string;
  productSku?: string;
}

const EMPTY_FORM: VariantFormData = {
  name: '',
  sku: '',
  color_name: '',
  color_hex: '#000000',
  stock_quantity: 0,
  supplier_sku: '',
  ean: '',
  size_code: '',
  capacity_ml: null,
  height_mm: null,
  width_mm: null,
  length_mm: null,
  weight_g: null,
};

// ── API helpers ──

async function fetchProductVariants(productId: string): Promise<ProductVariant[]> {
  const { data, error } = await supabase.functions.invoke('external-db-bridge', {
    body: {
      table: 'product_variants',
      operation: 'select',
      filters: { product_id: productId, is_active: true },
      limit: 200,
      orderBy: { column: 'name', ascending: true },
    },
  });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || 'Erro ao buscar variações');
  return data.data?.records || [];
}

async function createVariant(payload: Record<string, unknown>): Promise<void> {
  const { data, error } = await supabase.functions.invoke('external-db-bridge', {
    body: { table: 'product_variants', operation: 'insert', data: payload },
  });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || 'Erro ao criar variação');
}

async function updateVariant(id: string, payload: Record<string, unknown>): Promise<void> {
  const { data, error } = await supabase.functions.invoke('external-db-bridge', {
    body: { table: 'product_variants', operation: 'update', id, data: payload },
  });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || 'Erro ao atualizar variação');
}

async function deleteVariant(id: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('external-db-bridge', {
    body: { table: 'product_variants', operation: 'update', id, data: { is_active: false } },
  });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || 'Erro ao excluir variação');
}

// ── Sub-components ──

function StockBadge({ stock }: { stock: number | null }) {
  const qty = stock ?? 0;

  if (qty === 0) {
    return (
      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
        Sem estoque
      </Badge>
    );
  }

  if (qty < 100) {
    return (
      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
        {qty} un
      </Badge>
    );
  }

  return (
    <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px] px-1.5 py-0">
      {qty >= 1000 ? `${(qty / 1000).toFixed(1)}k` : qty} un
    </Badge>
  );
}

function VariantForm({
  initial,
  onSave,
  onCancel,
  isSaving,
}: {
  initial: VariantFormData;
  onSave: (data: VariantFormData) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<VariantFormData>(initial);
  const [showExtra, setShowExtra] = useState(false);

  const set = <K extends keyof VariantFormData>(field: K, value: VariantFormData[K]) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = () => {
    if (!form.name.trim() || !form.sku.trim()) {
      toast.error('Nome e SKU são obrigatórios');
      return;
    }
    onSave(form);
  };

  // Check if any extra field has data
  const hasExtraData = !!(form.supplier_sku || form.ean || form.size_code || form.capacity_ml || form.height_mm || form.width_mm || form.length_mm || form.weight_g);

  return (
    <div className="rounded-lg border border-primary/30 bg-accent/30 p-3 space-y-3">
      {/* Row 1: Core fields */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Nome *</Label>
          <Input
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Ex: Squeeze Azul"
            className="h-8 text-sm"
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSave())}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">SKU *</Label>
          <Input
            value={form.sku}
            onChange={(e) => set('sku', e.target.value)}
            placeholder="Ex: SQ-001-AZ"
            className="h-8 text-sm font-mono"
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSave())}
          />
        </div>
      </div>

      {/* Row 2: Color + Stock */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Cor</Label>
          <Input
            value={form.color_name}
            onChange={(e) => set('color_name', e.target.value)}
            placeholder="Ex: Azul Royal"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Cor (hex)</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={form.color_hex || '#000000'}
              onChange={(e) => set('color_hex', e.target.value)}
              className="w-8 h-8 rounded border border-input bg-background cursor-pointer"
            />
            <Input
              value={form.color_hex}
              onChange={(e) => set('color_hex', e.target.value)}
              placeholder="#0000FF"
              className="h-8 text-sm font-mono flex-1"
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Estoque</Label>
          <Input
            type="number"
            value={form.stock_quantity}
            onChange={(e) => set('stock_quantity', parseInt(e.target.value, 10) || 0)}
            min="0"
            className="h-8 text-sm"
          />
        </div>
      </div>

      {/* Collapsible extra fields */}
      <Collapsible open={showExtra || hasExtraData} onOpenChange={setShowExtra}>
        <CollapsibleTrigger className="text-xs text-primary hover:underline flex items-center gap-1">
          {showExtra || hasExtraData ? '▾ Ocultar detalhes' : '▸ Mais detalhes (SKU fornecedor, EAN, dimensões...)'}
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-2">
          {/* SKUs extras + EAN */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">SKU Fornecedor</Label>
              <Input
                value={form.supplier_sku}
                onChange={(e) => set('supplier_sku', e.target.value)}
                placeholder="SKU do fornecedor"
                className="h-8 text-sm font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">EAN</Label>
              <Input
                value={form.ean}
                onChange={(e) => set('ean', e.target.value)}
                placeholder="Código de barras"
                className="h-8 text-sm font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tamanho</Label>
              <Input
                value={form.size_code}
                onChange={(e) => set('size_code', e.target.value)}
                placeholder="Ex: P, M, G, GG"
                className="h-8 text-sm"
              />
            </div>
          </div>

          {/* Capacity + Dimensions */}
          <div className="grid grid-cols-5 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Capacidade (ml)</Label>
              <Input
                type="number"
                value={form.capacity_ml ?? ''}
                onChange={(e) => set('capacity_ml', e.target.value ? parseFloat(e.target.value) : null)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Altura (mm)</Label>
              <Input
                type="number"
                value={form.height_mm ?? ''}
                onChange={(e) => set('height_mm', e.target.value ? parseFloat(e.target.value) : null)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Largura (mm)</Label>
              <Input
                type="number"
                value={form.width_mm ?? ''}
                onChange={(e) => set('width_mm', e.target.value ? parseFloat(e.target.value) : null)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Comp. (mm)</Label>
              <Input
                type="number"
                value={form.length_mm ?? ''}
                onChange={(e) => set('length_mm', e.target.value ? parseFloat(e.target.value) : null)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Peso (g)</Label>
              <Input
                type="number"
                value={form.weight_g ?? ''}
                onChange={(e) => set('weight_g', e.target.value ? parseFloat(e.target.value) : null)}
                className="h-8 text-sm"
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isSaving}>
          <X className="h-3.5 w-3.5 mr-1" /> Cancelar
        </Button>
        <Button type="button" size="sm" disabled={isSaving} onClick={handleSave}>
          {isSaving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
          Salvar
        </Button>
      </div>
    </div>
  );
}

// ── Main component ──

export function ProductVariantsSection({ productId, productName, productSku }: ProductVariantsSectionProps) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProductVariant | null>(null);

  const { data: variants = [], isLoading, error } = useQuery({
    queryKey: ['product-variants', productId],
    queryFn: () => fetchProductVariants(productId),
    enabled: !!productId,
    staleTime: 2 * 60 * 1000,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['product-variants', productId] });
  }, [queryClient, productId]);

  const handleCreate = async (formData: VariantFormData) => {
    setIsSaving(true);
    try {
      await createVariant({
        product_id: productId,
        name: formData.name.trim(),
        sku: formData.sku.trim(),
        color_name: formData.color_name.trim() || null,
        color_hex: formData.color_hex || null,
        stock_quantity: formData.stock_quantity,
        supplier_sku: formData.supplier_sku.trim() || null,
        ean: formData.ean.trim() || null,
        size_code: formData.size_code.trim() || null,
        capacity_ml: formData.capacity_ml,
        height_mm: formData.height_mm,
        width_mm: formData.width_mm,
        length_mm: formData.length_mm,
        weight_g: formData.weight_g,
        is_active: true,
      });
      toast.success('Variação criada com sucesso');
      setIsCreating(false);
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar variação');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (variantId: string, formData: VariantFormData) => {
    setIsSaving(true);
    try {
      await updateVariant(variantId, {
        name: formData.name.trim(),
        sku: formData.sku.trim(),
        color_name: formData.color_name.trim() || null,
        color_hex: formData.color_hex || null,
        stock_quantity: formData.stock_quantity,
        supplier_sku: formData.supplier_sku.trim() || null,
        ean: formData.ean.trim() || null,
        size_code: formData.size_code.trim() || null,
        capacity_ml: formData.capacity_ml,
        height_mm: formData.height_mm,
        width_mm: formData.width_mm,
        length_mm: formData.length_mm,
        weight_g: formData.weight_g,
      });
      toast.success('Variação atualizada');
      setEditingId(null);
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsSaving(true);
    try {
      await deleteVariant(deleteTarget.id);
      toast.success('Variação removida');
      setDeleteTarget(null);
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover');
    } finally {
      setIsSaving(false);
    }
  };

  const [isBulkLoading, setIsBulkLoading] = useState(false);

  const handleBulkAction = useCallback(async (action: BulkAction) => {
    setIsBulkLoading(true);
    try {
      const promises = action.variantIds.map(id => {
        if (action.type === 'toggle_active') {
          return updateVariant(id, { is_active: action.value as boolean });
        } else if (action.type === 'update_stock') {
          return updateVariant(id, { stock_quantity: action.value as number });
        }
        return Promise.resolve();
      });
      await Promise.all(promises);
      const label = action.type === 'toggle_active'
        ? (action.value ? 'ativadas' : 'desativadas')
        : 'atualizadas';
      toast.success(`${action.variantIds.length} variações ${label}`);
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro na operação em lote');
    } finally {
      setIsBulkLoading(false);
    }
  }, [invalidate]);

  // ── Loading / Error / Empty states ──

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive">
        <AlertCircle className="h-4 w-4" />
        Erro ao carregar variações
      </div>
    );
  }

  const totalStock = variants.reduce((sum, v) => sum + (v.stock_quantity ?? 0), 0);

  const isLightColor = (hex: string | null) => {
    if (!hex) return true;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 186;
  };

  return (
    <div className="space-y-3">
      {/* Header with summary + add button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {variants.length > 0 ? (
            <>
              <span className="font-medium text-foreground">{variants.length} variações</span>
              <span>•</span>
              <span>
                Estoque total:{' '}
                <span className="font-medium text-foreground">
                  {totalStock >= 1000 ? `${(totalStock / 1000).toFixed(1)}k` : totalStock.toLocaleString('pt-BR')} un
                </span>
              </span>
            </>
          ) : (
            <span className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Nenhuma variação cadastrada
            </span>
          )}
        </div>
        {!isCreating && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setIsCreating(true);
              setEditingId(null);
            }}
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Nova Variação
          </Button>
        )}
      </div>

      {/* Swatches circulares — padrão Super Filtro */}
      {variants.length > 0 && (
        <TooltipProvider delayDuration={200}>
          <div className="flex flex-wrap gap-2.5">
            {variants.map(v => {
              const hex = v.color_hex;
              const isTransparent = !hex || hex.toLowerCase() === '#ffffff';
              const light = isLightColor(hex);
              const stock = v.stock_quantity ?? 0;
              const stockLabel = stock >= 1000 ? `${(stock / 1000).toFixed(1)}k` : stock.toString();

              return (
                <Tooltip key={v.id}>
                  <TooltipTrigger asChild>
                    <div className="flex flex-col items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => { setEditingId(v.id); setIsCreating(false); }}
                        className={cn(
                          'w-9 h-9 rounded-full border-2 transition-all duration-200 flex items-center justify-center',
                          'hover:scale-110 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2',
                          editingId === v.id
                            ? 'ring-2 ring-offset-1'
                            : 'border-border hover:border-muted-foreground/50',
                          isTransparent && 'bg-gradient-to-br from-muted to-muted/60',
                          !stock && 'opacity-40'
                        )}
                        style={{
                          backgroundColor: isTransparent ? undefined : (hex || 'hsl(var(--muted))'),
                          ...(editingId === v.id ? {
                            borderColor: hex || 'hsl(var(--muted))',
                            ['--tw-ring-color' as string]: hex || 'hsl(var(--primary))',
                          } : {}),
                        }}
                      >
                        {editingId === v.id && (
                          <Check className={cn('w-4 h-4', light ? 'text-foreground' : 'text-white')} />
                        )}
                      </button>
                      {v.size_code && (
                        <span className="text-[9px] font-medium text-muted-foreground leading-none">
                          {v.size_code}
                        </span>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">{v.color_name || v.name}</span>
                      <span className="text-muted-foreground font-mono">{v.sku}</span>
                      {v.size_code && <span className="text-muted-foreground">Tam: <strong>{v.size_code}</strong></span>}
                      {v.capacity_ml && <span className="text-muted-foreground">{v.capacity_ml}ml</span>}
                      {v.supplier_sku && <span className="text-muted-foreground font-mono text-[10px]">Forn: {v.supplier_sku}</span>}
                      {v.ean && <span className="text-muted-foreground font-mono text-[10px]">EAN: {v.ean}</span>}
                      <span>{stockLabel} un</span>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>
      )}

      {/* Grade Cor × Tamanho (se houver size_code) */}
      {variants.some(v => v.size_code) && (
        <VariantGridMatrix
          variants={variants.map(v => ({
            id: v.id,
            color_name: v.color_name || v.name,
            color_hex: v.color_hex || '#888',
            size_code: v.size_code,
            stock: v.stock_quantity ?? 0,
            sku: v.sku,
            image: v.selected_thumbnail,
          }))}
          selectedId={editingId}
          onSelect={(item) => { setEditingId(item.id); setIsCreating(false); }}
          mode="admin"
          compact
          onBulkAction={handleBulkAction}
          isBulkLoading={isBulkLoading}
        />
      )}

      {/* Create form */}
      {isCreating && (
        <VariantForm
          initial={{
            ...EMPTY_FORM,
            name: productName ? `${productName} - ` : '',
            sku: productSku ? `${productSku}-` : '',
          }}
          onSave={handleCreate}
          onCancel={() => setIsCreating(false)}
          isSaving={isSaving}
        />
      )}

      {/* Variants list */}
      <div className="space-y-2">
        {variants.map((variant) => {
          const isEditing = editingId === variant.id;

          if (isEditing) {
            return (
              <VariantForm
                key={variant.id}
                initial={{
                  name: variant.name || '',
                  sku: variant.sku || '',
                  color_name: variant.color_name || '',
                  color_hex: variant.color_hex || '#000000',
                  stock_quantity: variant.stock_quantity ?? 0,
                  supplier_sku: variant.supplier_sku || '',
                  ean: variant.ean || '',
                  size_code: variant.size_code || '',
                  capacity_ml: variant.capacity_ml,
                  height_mm: variant.height_mm,
                  width_mm: variant.width_mm,
                  length_mm: variant.length_mm,
                  weight_g: variant.weight_g,
                }}
                onSave={(data) => handleUpdate(variant.id, data)}
                onCancel={() => setEditingId(null)}
                isSaving={isSaving}
              />
            );
          }

          return (
            <div
              key={variant.id}
              className={cn(
                'flex items-center gap-2.5 rounded-lg border p-2 transition-colors group',
                'hover:bg-accent/50',
                !variant.stock_quantity && 'opacity-60'
              )}
            >
              {/* Color swatch or thumbnail */}
              {variant.selected_thumbnail ? (
                <img
                  src={variant.selected_thumbnail}
                  alt={variant.color_name || variant.name}
                  className="w-10 h-10 rounded-md object-cover border shrink-0" loading="lazy" />
              ) : variant.color_hex ? (
                <div
                  className="w-10 h-10 rounded-md border shrink-0"
                  style={{ backgroundColor: variant.color_hex }}
                  title={variant.color_name || ''}
                />
              ) : (
                <div className="w-10 h-10 rounded-md border shrink-0 bg-muted flex items-center justify-center">
                  <Palette className="h-4 w-4 text-muted-foreground" />
                </div>
              )}

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate" title={variant.color_name || variant.name}>
                  {variant.color_name || variant.name}
                </p>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span className="font-mono">{variant.sku}</span>
                  {variant.supplier_sku && <span className="font-mono">• {variant.supplier_sku}</span>}
                  {variant.ean && <span className="font-mono">• EAN:{variant.ean}</span>}
                  {variant.size_code && <span>• {variant.size_code}</span>}
                  {variant.capacity_ml && <span>• {variant.capacity_ml}ml</span>}
                </div>
                <StockBadge stock={variant.stock_quantity} />
              </div>

              {/* Action buttons (visible on hover) */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon" aria-label="Editar"
                  className="h-7 w-7"
                  title="Editar variação"
                  onClick={() => {
                    setEditingId(variant.id);
                    setIsCreating(false);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon" aria-label="Excluir"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  title="Excluir variação"
                  onClick={() => setDeleteTarget(variant)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir variação?</AlertDialogTitle>
            <AlertDialogDescription>
              A variação <strong>{deleteTarget?.color_name || deleteTarget?.name}</strong>{' '}
              (SKU: {deleteTarget?.sku}) será desativada. Esta ação pode ser revertida no banco de dados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSaving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
