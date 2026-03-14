/**
 * ProductKitComponentsSection — CRUD completo para componentes de kit
 * Visual consistente com padrão Super Filtro do admin
 */

import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Package, Plus, Pencil, Trash2, Save, X, Loader2, GripVertical,
  AlertCircle, Boxes, Settings2, Paintbrush,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
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

interface KitComponent {
  id: string;
  kit_product_id: string;
  component_name: string | null;
  component_description: string | null;
  component_type_code: string | null;
  component_code: string | null;
  component_product_id: string | null;
  component_sku: string | null;
  quantity: number | null;
  display_order: number | null;
  is_optional: boolean | null;
  is_packaging: boolean | null;
  is_replaceable: boolean | null;
  allows_personalization: boolean | null;
  personalization_notes: string | null;
  material: string | null;
  color: string | null;
  primary_image_url: string | null;
  height_mm: number | null;
  width_mm: number | null;
  length_mm: number | null;
  weight_g: number | null;
  supplier_component_code: string | null;
  notes: string | null;
  is_active: boolean;
}

interface ComponentFormData {
  component_name: string;
  component_type_code: string;
  component_code: string;
  component_sku: string;
  supplier_component_code: string;
  component_description: string;
  quantity: number;
  display_order: number;
  material: string;
  color: string;
  height_mm: number | null;
  width_mm: number | null;
  length_mm: number | null;
  weight_g: number | null;
  is_optional: boolean;
  is_packaging: boolean;
  is_replaceable: boolean;
  allows_personalization: boolean;
  personalization_notes: string;
  primary_image_url: string;
  notes: string;
}

interface ProductKitComponentsSectionProps {
  productId: string;
}

const EMPTY_FORM: ComponentFormData = {
  component_name: '',
  component_type_code: '',
  component_code: '',
  component_sku: '',
  supplier_component_code: '',
  component_description: '',
  quantity: 1,
  display_order: 0,
  material: '',
  color: '',
  height_mm: null,
  width_mm: null,
  length_mm: null,
  weight_g: null,
  is_optional: false,
  is_packaging: false,
  is_replaceable: false,
  allows_personalization: true,
  personalization_notes: '',
  primary_image_url: '',
  notes: '',
};

// ── API helpers ──

async function fetchKitComponents(productId: string): Promise<KitComponent[]> {
  const { data, error } = await supabase.functions.invoke('external-db-bridge', {
    body: {
      table: 'product_kit_components',
      operation: 'select',
      filters: { kit_product_id: productId },
      limit: 100,
      orderBy: { column: 'display_order', ascending: true },
    },
  });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || 'Erro ao buscar componentes');
  return data.data?.records || [];
}

async function createComponent(payload: Record<string, unknown>): Promise<void> {
  const { data, error } = await supabase.functions.invoke('external-db-bridge', {
    body: { table: 'product_kit_components', operation: 'insert', data: payload },
  });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || 'Erro ao criar componente');
}

async function updateComponent(id: string, payload: Record<string, unknown>): Promise<void> {
  const { data, error } = await supabase.functions.invoke('external-db-bridge', {
    body: { table: 'product_kit_components', operation: 'update', id, data: payload },
  });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || 'Erro ao atualizar componente');
}

async function deleteComponent(id: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('external-db-bridge', {
    body: { table: 'product_kit_components', operation: 'delete', id },
  });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || 'Erro ao excluir componente');
}

// ── Form sub-component ──

function ComponentForm({
  initial,
  onSave,
  onCancel,
  isSaving,
}: {
  initial: ComponentFormData;
  onSave: (data: ComponentFormData) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<ComponentFormData>(initial);

  const set = <K extends keyof ComponentFormData>(field: K, value: ComponentFormData[K]) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = () => {
    if (!form.component_name.trim()) {
      toast.error('Nome do componente é obrigatório');
      return;
    }
    onSave(form);
  };

  return (
    <div className="rounded-lg border border-primary/30 bg-accent/30 p-3 space-y-3">
      {/* Row 1: Nome + Tipo + Código */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Nome *</Label>
          <Input
            value={form.component_name}
            onChange={(e) => set('component_name', e.target.value)}
            placeholder="Ex: Tábua de corte"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Tipo</Label>
          <Input
            value={form.component_type_code}
            onChange={(e) => set('component_type_code', e.target.value)}
            placeholder="Ex: TABUA"
            className="h-8 text-sm font-mono uppercase"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Código</Label>
          <Input
            value={form.component_code}
            onChange={(e) => set('component_code', e.target.value)}
            placeholder="Ex: COMP-001"
            className="h-8 text-sm font-mono"
          />
        </div>
      </div>

      {/* Row 2: SKU + SKU Fornecedor + Quantidade + Ordem */}
      <div className="grid grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">SKU</Label>
          <Input
            value={form.component_sku}
            onChange={(e) => set('component_sku', e.target.value)}
            placeholder="SKU componente"
            className="h-8 text-sm font-mono"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">SKU Fornecedor</Label>
          <Input
            value={form.supplier_component_code}
            onChange={(e) => set('supplier_component_code', e.target.value)}
            placeholder="Código fornecedor"
            className="h-8 text-sm font-mono"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Quantidade</Label>
          <Input
            type="number"
            value={form.quantity}
            onChange={(e) => set('quantity', parseInt(e.target.value, 10) || 1)}
            min="1"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Ordem</Label>
          <Input
            type="number"
            value={form.display_order}
            onChange={(e) => set('display_order', parseInt(e.target.value, 10) || 0)}
            min="0"
            className="h-8 text-sm"
          />
        </div>
      </div>

      {/* Row 3: Material + Cor */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Material</Label>
          <Input
            value={form.material}
            onChange={(e) => set('material', e.target.value)}
            placeholder="Ex: Bambu"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Cor</Label>
          <Input
            value={form.color}
            onChange={(e) => set('color', e.target.value)}
            placeholder="Ex: Natural"
            className="h-8 text-sm"
          />
        </div>
      </div>

      {/* Row 4: Dimensões */}
      <div className="grid grid-cols-4 gap-3">
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

      {/* Row 5: Flags */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {([
          ['is_optional', 'Opcional'],
          ['is_packaging', 'Embalagem'],
          ['is_replaceable', 'Substituível'],
          ['allows_personalization', 'Personalizável'],
        ] as const).map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 text-xs cursor-pointer">
            <Switch
              checked={form[key]}
              onCheckedChange={(v) => set(key, v)}
              className="scale-75"
            />
            {label}
          </label>
        ))}
      </div>

      {/* Row 6: Imagem URL */}
      <div className="space-y-1">
        <Label className="text-xs">URL Imagem</Label>
        <Input
          value={form.primary_image_url}
          onChange={(e) => set('primary_image_url', e.target.value)}
          placeholder="https://..."
          className="h-8 text-sm"
        />
      </div>

      {/* Row 7: Descrição + Notas personalização + Observações */}
      <div className="grid grid-cols-1 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Descrição</Label>
          <Input
            value={form.component_description}
            onChange={(e) => set('component_description', e.target.value)}
            placeholder="Descrição / dimensões descritivas"
            className="h-8 text-sm"
          />
        </div>
        {form.allows_personalization && (
          <div className="space-y-1">
            <Label className="text-xs">Notas de Personalização</Label>
            <Textarea
              value={form.personalization_notes}
              onChange={(e) => set('personalization_notes', e.target.value)}
              placeholder="Instruções de personalização..."
              rows={2}
              className="text-sm"
            />
          </div>
        )}
        <div className="space-y-1">
          <Label className="text-xs">Observações</Label>
          <Input
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Observações internas"
            className="h-8 text-sm"
          />
        </div>
      </div>

      {/* Actions */}
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

export function ProductKitComponentsSection({ productId }: ProductKitComponentsSectionProps) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<KitComponent | null>(null);

  const { data: components = [], isLoading, error } = useQuery({
    queryKey: ['kit-components', productId],
    queryFn: () => fetchKitComponents(productId),
    enabled: !!productId,
    staleTime: 2 * 60 * 1000,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['kit-components', productId] });
  }, [queryClient, productId]);

  const handleCreate = async (formData: ComponentFormData) => {
    setIsSaving(true);
    try {
      await createComponent({
        kit_product_id: productId,
        component_name: formData.component_name.trim(),
        component_type_code: formData.component_type_code.trim() || null,
        component_code: formData.component_code.trim() || null,
        component_sku: formData.component_sku.trim() || null,
        supplier_component_code: formData.supplier_component_code.trim() || null,
        component_description: formData.component_description.trim() || null,
        quantity: formData.quantity,
        display_order: formData.display_order,
        material: formData.material.trim() || null,
        color: formData.color.trim() || null,
        height_mm: formData.height_mm,
        width_mm: formData.width_mm,
        length_mm: formData.length_mm,
        weight_g: formData.weight_g,
        is_optional: formData.is_optional,
        is_packaging: formData.is_packaging,
        is_replaceable: formData.is_replaceable,
        allows_personalization: formData.allows_personalization,
        personalization_notes: formData.personalization_notes.trim() || null,
        primary_image_url: formData.primary_image_url.trim() || null,
        notes: formData.notes.trim() || null,
      });
      toast.success('Componente criado com sucesso');
      setIsCreating(false);
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar componente');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (compId: string, formData: ComponentFormData) => {
    setIsSaving(true);
    try {
      await updateComponent(compId, {
        component_name: formData.component_name.trim(),
        component_type_code: formData.component_type_code.trim() || null,
        component_code: formData.component_code.trim() || null,
        component_sku: formData.component_sku.trim() || null,
        supplier_component_code: formData.supplier_component_code.trim() || null,
        component_description: formData.component_description.trim() || null,
        quantity: formData.quantity,
        display_order: formData.display_order,
        material: formData.material.trim() || null,
        color: formData.color.trim() || null,
        height_mm: formData.height_mm,
        width_mm: formData.width_mm,
        length_mm: formData.length_mm,
        weight_g: formData.weight_g,
        is_optional: formData.is_optional,
        is_packaging: formData.is_packaging,
        is_replaceable: formData.is_replaceable,
        allows_personalization: formData.allows_personalization,
        personalization_notes: formData.personalization_notes.trim() || null,
        primary_image_url: formData.primary_image_url.trim() || null,
        notes: formData.notes.trim() || null,
      });
      toast.success('Componente atualizado');
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
      await deleteComponent(deleteTarget.id);
      toast.success('Componente removido');
      setDeleteTarget(null);
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover');
    } finally {
      setIsSaving(false);
    }
  };

  // ── States ──

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive">
        <AlertCircle className="h-4 w-4" />
        Erro ao carregar componentes do kit
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {components.length > 0 ? (
            <>
              <span className="font-medium text-foreground">{components.length} componentes</span>
              <span>•</span>
              <span>
                Total itens:{' '}
                <span className="font-medium text-foreground">
                  {components.reduce((s, c) => s + (c.quantity ?? 1), 0)}
                </span>
              </span>
            </>
          ) : (
            <span className="flex items-center gap-2">
              <Boxes className="h-4 w-4" />
              Nenhum componente cadastrado
            </span>
          )}
        </div>
        {!isCreating && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => { setIsCreating(true); setEditingId(null); }}
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Novo Componente
          </Button>
        )}
      </div>

      {/* Create form */}
      {isCreating && (
        <ComponentForm
          initial={{ ...EMPTY_FORM, display_order: components.length }}
          onSave={handleCreate}
          onCancel={() => setIsCreating(false)}
          isSaving={isSaving}
        />
      )}

      {/* Components list */}
      <ScrollArea className={components.length > 5 ? 'h-80' : ''}>
        <div className="space-y-2">
          {components.map((comp) => {
            if (editingId === comp.id) {
              return (
                <ComponentForm
                  key={comp.id}
                  initial={{
                    component_name: comp.component_name || '',
                    component_type_code: comp.component_type_code || '',
                    component_code: comp.component_code || '',
                    component_sku: comp.component_sku || '',
                    supplier_component_code: comp.supplier_component_code || '',
                    component_description: comp.component_description || '',
                    quantity: comp.quantity ?? 1,
                    display_order: comp.display_order ?? 0,
                    material: comp.material || '',
                    color: comp.color || '',
                    height_mm: comp.height_mm,
                    width_mm: comp.width_mm,
                    length_mm: comp.length_mm,
                    weight_g: comp.weight_g,
                    is_optional: comp.is_optional ?? false,
                    is_packaging: comp.is_packaging ?? false,
                    is_replaceable: comp.is_replaceable ?? false,
                    allows_personalization: comp.allows_personalization ?? true,
                    personalization_notes: comp.personalization_notes || '',
                    primary_image_url: comp.primary_image_url || '',
                    notes: comp.notes || '',
                  }}
                  onSave={(data) => handleUpdate(comp.id, data)}
                  onCancel={() => setEditingId(null)}
                  isSaving={isSaving}
                />
              );
            }

            return (
              <div
                key={comp.id}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg border p-2.5 transition-colors group',
                  'hover:bg-accent/50',
                )}
              >
                {/* Image or icon */}
                {comp.primary_image_url ? (
                  <img
                    src={comp.primary_image_url}
                    alt={comp.component_name || ''}
                    className="w-10 h-10 rounded-md object-contain border shrink-0 bg-muted/30"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-md border shrink-0 bg-muted flex items-center justify-center">
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-medium truncate">{comp.component_name || 'Sem nome'}</p>
                    {comp.component_type_code && (
                      <Badge variant="secondary" className="text-[9px] px-1 py-0 uppercase">
                        {comp.component_type_code}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    {comp.component_sku && <span className="font-mono">{comp.component_sku}</span>}
                    <span>Qtd: {comp.quantity ?? 1}</span>
                    {comp.material && <span>• {comp.material}</span>}
                    {comp.color && <span>• {comp.color}</span>}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {comp.is_optional && <Badge variant="outline" className="text-[9px] px-1 py-0">Opcional</Badge>}
                    {comp.is_packaging && <Badge variant="outline" className="text-[9px] px-1 py-0">Embalagem</Badge>}
                    {comp.allows_personalization && <Badge className="bg-primary/15 text-primary border-primary/30 text-[9px] px-1 py-0">Personalizável</Badge>}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => { setEditingId(comp.id); setIsCreating(false); }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => setDeleteTarget(comp)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir componente?</AlertDialogTitle>
            <AlertDialogDescription>
              O componente <strong>{deleteTarget?.component_name}</strong> será removido permanentemente do kit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSaving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
