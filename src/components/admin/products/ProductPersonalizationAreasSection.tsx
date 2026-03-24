/**
 * ProductPersonalizationAreasSection — CRUD local para locais e técnicas de personalização
 */

import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus, Trash2, Edit2, Save, X, MapPin, Ruler,
  Palette, DollarSign, GripVertical, ChevronDown, ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PersonalizationArea {
  id: string;
  product_id: string;
  component_id: string | null;
  area_name: string;
  technique_name: string;
  technique_code: string | null;
  location_name: string | null;
  max_width_cm: number | null;
  max_height_cm: number | null;
  max_colors: number | null;
  setup_cost: number | null;
  unit_cost: number | null;
  notes: string | null;
  is_active: boolean;
  sort_order: number;
}

interface Props {
  productId: string;
}

const EMPTY_FORM = {
  component_id: null as string | null,
  area_name: '',
  technique_name: '',
  technique_code: null as string | null,
  location_name: null as string | null,
  max_width_cm: null as number | null,
  max_height_cm: null as number | null,
  max_colors: null as number | null,
  setup_cost: 0,
  unit_cost: 0,
  notes: null as string | null,
  is_active: true,
  sort_order: 0,
};

export function ProductPersonalizationAreasSection({ productId }: Props) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: areas = [], isLoading } = useQuery({
    queryKey: ['product-personalization-areas', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_personalization_areas')
        .select('*')
        .eq('product_id', productId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as PersonalizationArea[];
    },
    enabled: !!productId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['product-personalization-areas', productId] });

  const createMutation = useMutation({
    mutationFn: async (newArea: typeof EMPTY_FORM) => {
      const { error } = await supabase
        .from('product_personalization_areas')
        .insert({ ...newArea, product_id: productId, sort_order: areas.length });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); resetForm(); toast.success('Área adicionada'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Record<string, unknown>) => {
      const { error } = await supabase
        .from('product_personalization_areas')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); setEditingId(null); toast.success('Área atualizada'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('product_personalization_areas')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Área removida'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setShowForm(false);
    setEditingId(null);
  };

  const startEdit = (area: PersonalizationArea) => {
    setEditingId(area.id);
    setForm({
      component_id: area.component_id,
      area_name: area.area_name,
      technique_name: area.technique_name,
      technique_code: area.technique_code,
      location_name: area.location_name,
      max_width_cm: area.max_width_cm,
      max_height_cm: area.max_height_cm,
      max_colors: area.max_colors,
      setup_cost: area.setup_cost ?? 0,
      unit_cost: area.unit_cost ?? 0,
      notes: area.notes,
      is_active: area.is_active,
      sort_order: area.sort_order,
    });
    setShowForm(false);
  };

  const handleSave = () => {
    if (!form.area_name.trim() || !form.technique_name.trim()) {
      toast.error('Preencha o local e a técnica');
      return;
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...form });
    } else {
      createMutation.mutate(form);
    }
  };

  const toggleActive = (area: PersonalizationArea) => {
    updateMutation.mutate({ id: area.id, is_active: !area.is_active });
  };

  const isBusy = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-14 w-full rounded-lg" />
        <Skeleton className="h-14 w-full rounded-lg" />
      </div>
    );
  }

  const renderForm = () => (
    <div className="space-y-3 p-3 rounded-lg border border-primary/20 bg-primary/5">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Local / Área *</label>
          <Input placeholder="Ex: Frente, Verso, Lado A" value={form.area_name} onChange={e => setForm(f => ({ ...f, area_name: e.target.value }))} className="h-8 text-sm" />
        </div>
        <div>
          <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Técnica *</label>
          <Input placeholder="Ex: Serigrafia, Laser, Bordado" value={form.technique_name} onChange={e => setForm(f => ({ ...f, technique_name: e.target.value }))} className="h-8 text-sm" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3">
        <div>
          <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Código</label>
          <Input placeholder="Ex: SER" value={form.technique_code || ''} onChange={e => setForm(f => ({ ...f, technique_code: e.target.value || null }))} className="h-8 text-sm" />
        </div>
        <div>
          <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Larg. máx (cm)</label>
          <Input type="number" step="0.1" placeholder="0" value={form.max_width_cm ?? ''} onChange={e => setForm(f => ({ ...f, max_width_cm: e.target.value ? Number(e.target.value) : null }))} className="h-8 text-sm" />
        </div>
        <div>
          <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Alt. máx (cm)</label>
          <Input type="number" step="0.1" placeholder="0" value={form.max_height_cm ?? ''} onChange={e => setForm(f => ({ ...f, max_height_cm: e.target.value ? Number(e.target.value) : null }))} className="h-8 text-sm" />
        </div>
        <div>
          <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Cores máx</label>
          <Input type="number" placeholder="0" value={form.max_colors ?? ''} onChange={e => setForm(f => ({ ...f, max_colors: e.target.value ? Number(e.target.value) : null }))} className="h-8 text-sm" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Custo Setup (R$)</label>
          <Input type="number" step="0.01" value={form.setup_cost ?? 0} onChange={e => setForm(f => ({ ...f, setup_cost: Number(e.target.value) }))} className="h-8 text-sm" />
        </div>
        <div>
          <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Custo Unit. (R$)</label>
          <Input type="number" step="0.01" value={form.unit_cost ?? 0} onChange={e => setForm(f => ({ ...f, unit_cost: Number(e.target.value) }))} className="h-8 text-sm" />
        </div>
        <div>
          <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Localização</label>
          <Input placeholder="Ex: Centro, Superior" value={form.location_name || ''} onChange={e => setForm(f => ({ ...f, location_name: e.target.value || null }))} className="h-8 text-sm" />
        </div>
      </div>
      <div>
        <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Observações</label>
        <Input placeholder="Notas adicionais..." value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value || null }))} className="h-8 text-sm" />
      </div>
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
          <span className="text-xs text-muted-foreground">Ativa</span>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={resetForm} disabled={isBusy}>
            <X className="h-3.5 w-3.5 mr-1" /> Cancelar
          </Button>
          <Button type="button" size="sm" onClick={handleSave} disabled={isBusy} className="gap-1.5">
            <Save className="h-3.5 w-3.5" />
            {editingId ? 'Salvar' : 'Adicionar'}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {areas.length} {areas.length === 1 ? 'área' : 'áreas'} cadastrada{areas.length !== 1 ? 's' : ''}
          </span>
          {areas.filter(a => a.is_active).length < areas.length && (
            <Badge variant="outline" className="text-[10px] h-4">
              {areas.filter(a => a.is_active).length} ativas
            </Badge>
          )}
        </div>
        {!showForm && !editingId && (
          <Button type="button" size="sm" variant="outline" onClick={() => { setShowForm(true); setForm(EMPTY_FORM); }} className="gap-1.5 h-7 text-xs">
            <Plus className="h-3 w-3" /> Nova Área
          </Button>
        )}
      </div>

      {showForm && renderForm()}

      {areas.length === 0 && !showForm && (
        <div className="text-center py-6 text-muted-foreground">
          <MapPin className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhuma área de personalização cadastrada</p>
          <p className="text-xs mt-1">Clique em "Nova Área" para adicionar locais e técnicas</p>
        </div>
      )}

      <div className="space-y-1.5">
        {areas.map(area => {
          const isEditing = editingId === area.id;
          const isExpanded = expandedId === area.id;

          if (isEditing) return <div key={area.id}>{renderForm()}</div>;

          return (
            <div
              key={area.id}
              className={cn(
                'group rounded-lg border transition-all duration-200',
                area.is_active ? 'border-border/50 bg-card/50 hover:border-border' : 'border-border/20 bg-muted/20 opacity-60',
              )}
            >
              <div className="flex items-center gap-2.5 px-3 py-2">
                <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{area.area_name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{area.technique_name}</span>
                    {area.technique_code && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-mono">{area.technique_code}</span>
                    )}
                  </div>
                  {(area.max_width_cm || area.max_height_cm || area.max_colors) && (
                    <div className="flex items-center gap-3 mt-0.5 text-[10px] text-muted-foreground">
                      {area.max_width_cm && area.max_height_cm && (
                        <span className="flex items-center gap-0.5"><Ruler className="h-2.5 w-2.5" />{area.max_width_cm}×{area.max_height_cm}cm</span>
                      )}
                      {area.max_colors && (
                        <span className="flex items-center gap-0.5"><Palette className="h-2.5 w-2.5" />{area.max_colors} cores</span>
                      )}
                      {(area.setup_cost || area.unit_cost) && (
                        <span className="flex items-center gap-0.5">
                          <DollarSign className="h-2.5 w-2.5" />
                          {area.setup_cost ? `Setup R$${area.setup_cost}` : ''}{area.setup_cost && area.unit_cost ? ' + ' : ''}{area.unit_cost ? `R$${area.unit_cost}/un` : ''}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button type="button" onClick={() => setExpandedId(isExpanded ? null : area.id)} className="p-1 rounded hover:bg-muted transition-colors">
                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                  <button type="button" onClick={() => startEdit(area)} className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => toggleActive(area)} className="p-1 rounded hover:bg-muted transition-colors">
                    <Switch checked={area.is_active} className="scale-75" />
                  </button>
                  <button type="button" onClick={() => { if (confirm('Remover esta área de personalização?')) deleteMutation.mutate(area.id); }} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {isExpanded && (
                <div className="px-3 pb-2.5 pt-0 border-t border-border/30 mt-1">
                  <div className="grid grid-cols-4 gap-3 pt-2 text-xs">
                    <div><span className="text-muted-foreground">Localização</span><p className="font-medium mt-0.5">{area.location_name || '—'}</p></div>
                    <div><span className="text-muted-foreground">Dimensões máx.</span><p className="font-medium mt-0.5">{area.max_width_cm && area.max_height_cm ? `${area.max_width_cm} × ${area.max_height_cm} cm` : '—'}</p></div>
                    <div><span className="text-muted-foreground">Custo Setup</span><p className="font-medium mt-0.5">{area.setup_cost ? `R$ ${area.setup_cost}` : '—'}</p></div>
                    <div><span className="text-muted-foreground">Custo Unit.</span><p className="font-medium mt-0.5">{area.unit_cost ? `R$ ${area.unit_cost}` : '—'}</p></div>
                  </div>
                  {area.notes && <p className="text-xs text-muted-foreground mt-2 italic">{area.notes}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}