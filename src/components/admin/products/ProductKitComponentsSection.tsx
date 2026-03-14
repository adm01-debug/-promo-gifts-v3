/**
 * ProductKitComponentsSection — CRUD completo para componentes de kit
 * + Áreas de gravação por componente (kit_component_print_areas)
 * Visual consistente com padrão Super Filtro do admin
 */

import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Package, Plus, Pencil, Trash2, Save, X, Loader2, GripVertical,
  AlertCircle, Boxes, Settings2, Paintbrush, Target, ChevronDown, ChevronRight,
  CheckCircle2, XCircle, Box,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

// ── Types ──

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

interface PrintArea {
  id: string;
  kit_component_id: string;
  location_code: string | null;
  location_name: string | null;
  area_name: string | null;
  max_width_mm: number | null;
  max_height_mm: number | null;
  technique_name: string | null;
  technique_id: string | null;
  tabela_preco_id: string | null;
  display_order: number | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

interface PrintAreaFormData {
  location_code: string;
  location_name: string;
  technique_name: string;
  technique_id: string;
  max_width_mm: number | null;
  max_height_mm: number | null;
  tabela_preco_id: string;
  display_order: number;
  notes: string;
}

interface BoxInternalDimensions {
  height_cm: number | null;
  width_cm: number | null;
  length_cm: number | null;
}

interface ProductKitComponentsSectionProps {
  productId: string;
  boxInternalDimensions?: BoxInternalDimensions;
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

const EMPTY_PRINT_AREA: PrintAreaFormData = {
  location_code: '',
  location_name: '',
  technique_name: '',
  technique_id: '',
  max_width_mm: null,
  max_height_mm: null,
  tabela_preco_id: '',
  display_order: 0,
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

// Print Areas API helpers
async function fetchPrintAreas(componentId: string): Promise<PrintArea[]> {
  const { data, error } = await supabase.functions.invoke('external-db-bridge', {
    body: {
      table: 'kit_component_print_areas',
      operation: 'select',
      filters: { kit_component_id: componentId },
      limit: 50,
      orderBy: { column: 'display_order', ascending: true },
    },
  });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || 'Erro ao buscar áreas');
  return data.data?.records || [];
}

async function createPrintArea(payload: Record<string, unknown>): Promise<void> {
  const { data, error } = await supabase.functions.invoke('external-db-bridge', {
    body: { table: 'kit_component_print_areas', operation: 'insert', data: payload },
  });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || 'Erro ao criar área');
}

async function updatePrintArea(id: string, payload: Record<string, unknown>): Promise<void> {
  const { data, error } = await supabase.functions.invoke('external-db-bridge', {
    body: { table: 'kit_component_print_areas', operation: 'update', id, data: payload },
  });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || 'Erro ao atualizar área');
}

async function deletePrintArea(id: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('external-db-bridge', {
    body: { table: 'kit_component_print_areas', operation: 'delete', id },
  });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || 'Erro ao excluir área');
}

// ── Print Area Form ──

function PrintAreaForm({
  initial,
  onSave,
  onCancel,
  isSaving,
}: {
  initial: PrintAreaFormData;
  onSave: (data: PrintAreaFormData) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<PrintAreaFormData>(initial);

  const set = <K extends keyof PrintAreaFormData>(field: K, value: PrintAreaFormData[K]) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = () => {
    if (!form.location_name.trim()) {
      toast.error('Nome do local é obrigatório');
      return;
    }
    onSave(form);
  };

  // Build area_name preview: "{Location} — {Technique}"
  const areaNamePreview = [form.location_name, form.technique_name].filter(Boolean).join(' — ');

  return (
    <div className="rounded-md border border-primary/20 bg-primary/5 p-2.5 space-y-2.5 ml-6">
      <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
        <Target className="h-3 w-3" />
        Área de Gravação
      </div>

      {/* Row 1: Local Code + Local Name + Technique */}
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label className="text-[10px]">Código Local</Label>
          <Input
            value={form.location_code}
            onChange={(e) => set('location_code', e.target.value)}
            placeholder="Ex: CABO"
            className="h-7 text-xs font-mono uppercase"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px]">Nome Local *</Label>
          <Input
            value={form.location_name}
            onChange={(e) => set('location_name', e.target.value)}
            placeholder="Ex: Cabo, Frente, 360°"
            className="h-7 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px]">Técnica</Label>
          <Input
            value={form.technique_name}
            onChange={(e) => set('technique_name', e.target.value)}
            placeholder="Ex: Laser, Serigrafia"
            className="h-7 text-xs"
          />
        </div>
      </div>

      {/* Area Name Preview */}
      {areaNamePreview && (
        <div className="text-[10px] text-muted-foreground">
          area_name: <span className="font-mono text-foreground">{areaNamePreview}</span>
        </div>
      )}

      {/* Row 2: Max Width + Max Height + Technique ID + Tabela Preço ID + Ordem */}
      <div className="grid grid-cols-5 gap-2">
        <div className="space-y-1">
          <Label className="text-[10px]">Larg. Máx (mm)</Label>
          <Input
            type="number"
            value={form.max_width_mm ?? ''}
            onChange={(e) => set('max_width_mm', e.target.value ? parseFloat(e.target.value) : null)}
            className="h-7 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px]">Alt. Máx (mm)</Label>
          <Input
            type="number"
            value={form.max_height_mm ?? ''}
            onChange={(e) => set('max_height_mm', e.target.value ? parseFloat(e.target.value) : null)}
            className="h-7 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px]">ID Técnica</Label>
          <Input
            value={form.technique_id}
            onChange={(e) => set('technique_id', e.target.value)}
            placeholder="UUID"
            className="h-7 text-xs font-mono"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px]">ID Tabela Preço</Label>
          <Input
            value={form.tabela_preco_id}
            onChange={(e) => set('tabela_preco_id', e.target.value)}
            placeholder="UUID"
            className="h-7 text-xs font-mono"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px]">Ordem</Label>
          <Input
            type="number"
            value={form.display_order}
            onChange={(e) => set('display_order', parseInt(e.target.value, 10) || 0)}
            min="0"
            className="h-7 text-xs"
          />
        </div>
      </div>

      {/* Row 3: Notes */}
      <div className="space-y-1">
        <Label className="text-[10px]">Observações</Label>
        <Input
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          placeholder="Observações sobre a área de gravação"
          className="h-7 text-xs"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-1.5">
        <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={onCancel} disabled={isSaving}>
          <X className="h-3 w-3 mr-0.5" /> Cancelar
        </Button>
        <Button type="button" size="sm" className="h-6 text-[10px] px-2" disabled={isSaving} onClick={handleSave}>
          {isSaving ? <Loader2 className="h-3 w-3 mr-0.5 animate-spin" /> : <Save className="h-3 w-3 mr-0.5" />}
          Salvar
        </Button>
      </div>
    </div>
  );
}

// ── Print Areas Manager per Component ──

function PrintAreasManager({ componentId, componentName }: { componentId: string; componentName: string }) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PrintArea | null>(null);

  const { data: areas = [], isLoading, error } = useQuery({
    queryKey: ['kit-print-areas', componentId],
    queryFn: () => fetchPrintAreas(componentId),
    enabled: !!componentId && isOpen,
    staleTime: 2 * 60 * 1000,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['kit-print-areas', componentId] });
  }, [queryClient, componentId]);

  const handleCreate = async (formData: PrintAreaFormData) => {
    setIsSaving(true);
    try {
      const areaName = [formData.location_name, formData.technique_name].filter(Boolean).join(' — ');
      await createPrintArea({
        kit_component_id: componentId,
        location_code: formData.location_code.trim() || null,
        location_name: formData.location_name.trim() || null,
        area_name: areaName || null,
        technique_name: formData.technique_name.trim() || null,
        technique_id: formData.technique_id.trim() || null,
        max_width_mm: formData.max_width_mm,
        max_height_mm: formData.max_height_mm,
        tabela_preco_id: formData.tabela_preco_id.trim() || null,
        display_order: formData.display_order,
        notes: formData.notes.trim() || null,
        is_active: true,
      });
      toast.success('Área de gravação criada');
      setIsCreating(false);
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar área');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (areaId: string, formData: PrintAreaFormData) => {
    setIsSaving(true);
    try {
      const areaName = [formData.location_name, formData.technique_name].filter(Boolean).join(' — ');
      await updatePrintArea(areaId, {
        location_code: formData.location_code.trim() || null,
        location_name: formData.location_name.trim() || null,
        area_name: areaName || null,
        technique_name: formData.technique_name.trim() || null,
        technique_id: formData.technique_id.trim() || null,
        max_width_mm: formData.max_width_mm,
        max_height_mm: formData.max_height_mm,
        tabela_preco_id: formData.tabela_preco_id.trim() || null,
        display_order: formData.display_order,
        notes: formData.notes.trim() || null,
      });
      toast.success('Área atualizada');
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
      await deletePrintArea(deleteTarget.id);
      toast.success('Área removida');
      setDeleteTarget(null);
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className={cn(
              'flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-md transition-colors',
              'text-muted-foreground hover:text-foreground hover:bg-accent/50',
              isOpen && 'text-primary bg-primary/10',
              areas.length > 0 && !isOpen && 'text-primary'
            )}
          >
            <Target className="h-3 w-3" />
            Áreas de Gravação
            {areas.length > 0 && (
              <Badge variant="secondary" className="h-3.5 min-w-[14px] px-1 text-[8px]">
                {areas.length}
              </Badge>
            )}
            {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="ml-6 mt-1.5 space-y-1.5">
            {isLoading && (
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground py-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Carregando áreas...
              </div>
            )}

            {error && (
              <div className="flex items-center gap-1.5 text-[10px] text-destructive py-1">
                <AlertCircle className="h-3 w-3" />
                {error instanceof Error && error.message.includes('kit_component_print_areas')
                  ? 'Tabela kit_component_print_areas não existe no banco externo. Crie-a primeiro.'
                  : 'Erro ao carregar áreas'}
              </div>
            )}

            {!isLoading && !error && areas.length === 0 && !isCreating && (
              <p className="text-[10px] text-muted-foreground py-1">Nenhuma área cadastrada</p>
            )}

            {/* Existing areas */}
            {areas.map((area) => {
              if (editingId === area.id) {
                return (
                  <PrintAreaForm
                    key={area.id}
                    initial={{
                      location_code: area.location_code || '',
                      location_name: area.location_name || '',
                      technique_name: area.technique_name || '',
                      technique_id: area.technique_id || '',
                      max_width_mm: area.max_width_mm,
                      max_height_mm: area.max_height_mm,
                      tabela_preco_id: area.tabela_preco_id || '',
                      display_order: area.display_order ?? 0,
                      notes: area.notes || '',
                    }}
                    onSave={(data) => handleUpdate(area.id, data)}
                    onCancel={() => setEditingId(null)}
                    isSaving={isSaving}
                  />
                );
              }

              // Extract technique from area_name pattern "{Location} — {Technique}"
              const techniqueBadge = area.area_name?.includes(' — ')
                ? area.area_name.split(' — ')[1]
                : area.technique_name;

              return (
                <div
                  key={area.id}
                  className="flex items-center gap-2 rounded-md border border-border/50 p-1.5 text-[10px] group hover:bg-accent/30 transition-colors"
                >
                  <Target className="h-3 w-3 text-primary/60 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-medium truncate">{area.location_name || area.location_code || 'Sem local'}</span>
                      {techniqueBadge && (
                        <Badge variant="outline" className="text-[8px] px-1 py-0 shrink-0">
                          {techniqueBadge}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      {(area.max_width_mm || area.max_height_mm) && (
                        <span>{area.max_width_mm ?? '?'}×{area.max_height_mm ?? '?'} mm</span>
                      )}
                      {area.location_code && <span className="font-mono">{area.location_code}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => { setEditingId(area.id); setIsCreating(false); }}
                    >
                      <Pencil className="h-2.5 w-2.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(area)}
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </Button>
                  </div>
                </div>
              );
            })}

            {/* Create form */}
            {isCreating && (
              <PrintAreaForm
                initial={{ ...EMPTY_PRINT_AREA, display_order: areas.length }}
                onSave={handleCreate}
                onCancel={() => setIsCreating(false)}
                isSaving={isSaving}
              />
            )}

            {/* Add button */}
            {!isCreating && !error && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-5 text-[10px] px-1.5 gap-0.5"
                onClick={() => { setIsCreating(true); setEditingId(null); }}
              >
                <Plus className="h-2.5 w-2.5" /> Área
              </Button>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Delete confirmation for print area */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir área de gravação?</AlertDialogTitle>
            <AlertDialogDescription>
              A área <strong>{deleteTarget?.area_name || deleteTarget?.location_name}</strong> será removida permanentemente.
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
    </>
  );
}

// ── Component Form ──

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

// ── Volume Validation ──

function VolumeValidation({ components, boxDimensions }: { components: KitComponent[]; boxDimensions?: BoxInternalDimensions }) {
  // Convert box internal dimensions from cm to mm
  const boxH = boxDimensions?.height_cm ? boxDimensions.height_cm * 10 : null;
  const boxW = boxDimensions?.width_cm ? boxDimensions.width_cm * 10 : null;
  const boxL = boxDimensions?.length_cm ? boxDimensions.length_cm * 10 : null;

  const hasBoxDimensions = boxH && boxW && boxL;
  const boxVolumeMm3 = hasBoxDimensions ? boxH * boxW * boxL : null;

  // Calculate total component volume (sum of each item × quantity)
  const componentVolumes = components
    .filter(c => !c.is_packaging && c.is_active)
    .map(c => {
      const h = c.height_mm ?? 0;
      const w = c.width_mm ?? 0;
      const l = c.length_mm ?? 0;
      const vol = h * w * l;
      const qty = c.quantity ?? 1;
      return { ...c, unitVolume: vol, totalVolume: vol * qty, hasDimensions: h > 0 && w > 0 && l > 0 };
    });

  const totalComponentsVolume = componentVolumes.reduce((sum, c) => sum + c.totalVolume, 0);
  const totalWeight = components.filter(c => c.is_active).reduce((sum, c) => sum + ((c.weight_g ?? 0) * (c.quantity ?? 1)), 0);
  const missingDimensions = componentVolumes.filter(c => !c.hasDimensions);

  if (!hasBoxDimensions) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
        <Box className="h-4 w-4 shrink-0" />
        <span>Preencha as <strong>dimensões internas</strong> na aba Detalhes para validar volume dos componentes.</span>
      </div>
    );
  }

  const usagePercent = boxVolumeMm3 ? Math.round((totalComponentsVolume / boxVolumeMm3) * 100) : 0;
  const fits = usagePercent <= 100;

  // Per-component fit check (does each single item fit in any orientation?)
  const checkItemFits = (h: number, w: number, l: number) => {
    if (!boxH || !boxW || !boxL) return true;
    const dims = [h, w, l].sort((a, b) => a - b);
    const boxDims = [boxH, boxW, boxL].sort((a, b) => a - b);
    return dims[0] <= boxDims[0] && dims[1] <= boxDims[1] && dims[2] <= boxDims[2];
  };

  return (
    <div className={cn(
      "rounded-lg border p-3 space-y-2.5 text-xs",
      fits ? "border-success/40 bg-success/5" : "border-destructive/40 bg-destructive/5"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Box className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-foreground">Validação de Volume</span>
        </div>
        <div className="flex items-center gap-1.5">
          {fits ? (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-success/50 text-success bg-success/10 gap-1">
              <CheckCircle2 className="h-3 w-3" /> CABE
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-destructive/50 text-destructive bg-destructive/10 gap-1">
              <XCircle className="h-3 w-3" /> NÃO CABE
            </Badge>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>
            Volume usado: <strong className="text-foreground">{(totalComponentsVolume / 1000).toFixed(0)} cm³</strong>
            {' '}/ {(boxVolumeMm3! / 1000).toFixed(0)} cm³
          </span>
          <span className={cn("font-bold", fits ? "text-success" : "text-destructive")}>{usagePercent}%</span>
        </div>
        <Progress
          value={Math.min(usagePercent, 100)}
          className={cn("h-2", !fits && "[&>div]:bg-destructive")}
        />
      </div>

      {/* Box dimensions reference */}
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
        <span>Caixa interna: {boxW?.toFixed(0)}×{boxL?.toFixed(0)}×{boxH?.toFixed(0)} mm</span>
        {totalWeight > 0 && <span>• Peso total: {(totalWeight / 1000).toFixed(2)} kg</span>}
      </div>

      {/* Per-component fit status */}
      {componentVolumes.length > 0 && (
        <div className="space-y-1 pt-1 border-t border-border/50">
          {componentVolumes.map(c => {
            const itemFits = c.hasDimensions
              ? checkItemFits(c.height_mm ?? 0, c.width_mm ?? 0, c.length_mm ?? 0)
              : null;

            return (
              <div key={c.id} className="flex items-center justify-between text-[10px]">
                <span className="truncate flex-1 text-muted-foreground">
                  {c.component_name || 'Sem nome'} {(c.quantity ?? 1) > 1 ? `×${c.quantity}` : ''}
                </span>
                {c.hasDimensions ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-muted-foreground font-mono">
                      {c.width_mm}×{c.length_mm}×{c.height_mm} mm
                    </span>
                    {itemFits ? (
                      <CheckCircle2 className="h-3 w-3 text-success" />
                    ) : (
                      <XCircle className="h-3 w-3 text-destructive" />
                    )}
                  </div>
                ) : (
                  <span className="text-warning italic">sem dimensões</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {missingDimensions.length > 0 && (
        <div className="flex items-center gap-1.5 text-[10px] text-warning pt-0.5">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {missingDimensions.length} componente(s) sem dimensões — o cálculo pode ser impreciso.
        </div>
      )}
    </div>
  );
}

// ── Main component ──

export function ProductKitComponentsSection({ productId, boxInternalDimensions }: ProductKitComponentsSectionProps) {
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

      {/* Volume Validation */}
      {components.length > 0 && <VolumeValidation components={components} boxDimensions={boxInternalDimensions} />}

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
      <ScrollArea className={components.length > 5 ? 'h-[500px]' : ''}>
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
              <div key={comp.id} className="space-y-0.5">
                <div
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

                {/* Print Areas for this component (only if personalizable) */}
                {comp.allows_personalization && (
                  <PrintAreasManager
                    componentId={comp.id}
                    componentName={comp.component_name || 'Componente'}
                  />
                )}
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
              {deleteTarget?.allows_personalization && (
                <> Todas as áreas de gravação associadas também serão perdidas.</>
              )}
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
