/**
 * ProductEngravingSection — Aba de Gravação com Wizard guiado
 * Hierarquia: Componente → Local → Técnica
 * Funciona tanto em modo criação quanto edição
 */
import React, { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SectionCard } from '../ProductFormHelpers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Paintbrush, MapPin, Plus, Trash2, Edit2, Save, X, Search,
  ChevronRight, ChevronLeft, Check, Ruler, Palette, DollarSign,
  ArrowLeft, Layers, Zap, Info, GripVertical, ChevronDown, ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { TECHNIQUE_ICONS } from '@/types/gravacao';

// ============================================
// TYPES
// ============================================

interface ExternalTechnique {
  id: string;
  nome: string;
  codigo: string;
  grupo_tecnica?: string;
  nome_grupo?: string;
  permite_cores?: boolean;
  max_cores?: number | string | null;
  cobra_por_cor?: boolean;
  cobra_por_area?: boolean;
  ativo?: boolean;
}

interface PersonalizationArea {
  id?: string;
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
  productId?: string;
  isEdit: boolean;
}

// ============================================
// WIZARD STEPS
// ============================================

type WizardStep = 'list' | 'component' | 'location' | 'technique' | 'details';

const WIZARD_STEPS: { id: WizardStep; label: string; icon: React.ElementType }[] = [
  { id: 'component', label: 'Componente', icon: Layers },
  { id: 'location', label: 'Local', icon: MapPin },
  { id: 'technique', label: 'Técnica', icon: Paintbrush },
  { id: 'details', label: 'Detalhes', icon: Ruler },
];

const COMMON_COMPONENTS = [
  { code: 'CORPO', name: 'Corpo', icon: '📦' },
  { code: 'TAMPA', name: 'Tampa', icon: '🔲' },
  { code: 'MANGA', name: 'Manga', icon: '👕' },
  { code: 'BOLSO', name: 'Bolso', icon: '👜' },
  { code: 'CAIXA', name: 'Caixa/Embalagem', icon: '📦' },
  { code: 'ALCA', name: 'Alça', icon: '🔗' },
  { code: 'BASE', name: 'Base', icon: '⬜' },
  { code: 'CANETA', name: 'Caneta/Clip', icon: '🖊️' },
  { code: 'OUTRO', name: 'Outro', icon: '✏️' },
];

const COMMON_LOCATIONS = [
  { code: 'FRENTE', name: 'Frente' },
  { code: 'VERSO', name: 'Verso / Costas' },
  { code: 'LADO_A', name: 'Lado A (Esquerdo)' },
  { code: 'LADO_B', name: 'Lado B (Direito)' },
  { code: 'CENTRO', name: 'Centro' },
  { code: 'SUPERIOR', name: 'Superior / Topo' },
  { code: 'INFERIOR', name: 'Inferior / Base' },
  { code: '360', name: '360° (Envolvente)' },
  { code: 'INTERNO', name: 'Interno' },
  { code: 'OUTRO', name: 'Outro' },
];

function getTechniqueIcon(code: string): string {
  const upper = code?.toUpperCase() || '';
  return TECHNIQUE_ICONS[upper] || '🔧';
}

function getTechniqueColor(code: string): string {
  const upper = code?.toUpperCase() || '';
  const colorMap: Record<string, string> = {
    SERIGRAFIA: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
    SER: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
    LASER: 'from-red-500/20 to-red-600/10 border-red-500/30',
    UV_DIGITAL: 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
    UV: 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
    TAMPOGRAFIA: 'from-green-500/20 to-green-600/10 border-green-500/30',
    TAMP: 'from-green-500/20 to-green-600/10 border-green-500/30',
    BORDADO: 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/30',
    BORD: 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/30',
    SUBLIMACAO: 'from-pink-500/20 to-pink-600/10 border-pink-500/30',
    SUB: 'from-pink-500/20 to-pink-600/10 border-pink-500/30',
    HOT_STAMPING: 'from-orange-500/20 to-orange-600/10 border-orange-500/30',
    TRANSFER: 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/30',
    ADESIVO: 'from-indigo-500/20 to-indigo-600/10 border-indigo-500/30',
  };
  for (const [key, val] of Object.entries(colorMap)) {
    if (upper.includes(key)) return val;
  }
  return 'from-muted/40 to-muted/20 border-border/50';
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function ProductEngravingSection({ productId, isEdit }: Props) {
  const queryClient = useQueryClient();
  const [wizardStep, setWizardStep] = useState<WizardStep>('list');
  const [editingArea, setEditingArea] = useState<PersonalizationArea | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Wizard state
  const [selectedComponent, setSelectedComponent] = useState<{ code: string; name: string } | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{ code: string; name: string } | null>(null);
  const [selectedTechnique, setSelectedTechnique] = useState<ExternalTechnique | null>(null);
  const [customComponent, setCustomComponent] = useState('');
  const [customLocation, setCustomLocation] = useState('');
  const [techSearch, setTechSearch] = useState('');

  // Detail fields
  const [detailForm, setDetailForm] = useState({
    max_width_cm: null as number | null,
    max_height_cm: null as number | null,
    max_colors: null as number | null,
    setup_cost: 0,
    unit_cost: 0,
    notes: '',
    is_active: true,
  });

  // Local state for unsaved areas (pre-save mode)
  const [localAreas, setLocalAreas] = useState<PersonalizationArea[]>([]);

  // ============================================
  // QUERIES
  // ============================================

  // Fetch techniques from external DB (Promobrind)
  const { data: techniques = [], isLoading: loadingTechs } = useQuery({
    queryKey: ['external-techniques-engraving'],
    queryFn: async (): Promise<ExternalTechnique[]> => {
      const { data, error } = await supabase.functions.invoke('external-db-bridge', {
        body: {
          table: 'tecnica_gravacao',
          operation: 'select',
          orderBy: { column: 'ordem_exibicao', ascending: true },
          limit: 200,
        },
      });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'Erro ao buscar técnicas');
      return data.data?.records || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  // Fetch saved areas (only in edit mode with productId)
  const { data: savedAreas = [], isLoading: loadingAreas } = useQuery({
    queryKey: ['product-personalization-areas', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_personalization_areas')
        .select('*')
        .eq('product_id', productId!)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as PersonalizationArea[];
    },
    enabled: !!productId && isEdit,
  });

  // Areas to display: saved (edit mode) or local (create mode)
  const displayAreas = isEdit && productId ? savedAreas : localAreas;

  // ============================================
  // MUTATIONS (edit mode only)
  // ============================================

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['product-personalization-areas', productId] });

  const createMutation = useMutation({
    mutationFn: async (area: Omit<PersonalizationArea, 'id'>) => {
      const { error } = await supabase
        .from('product_personalization_areas')
        .insert(area);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Área de personalização adicionada'); },
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
    onSuccess: () => { invalidate(); toast.success('Área atualizada'); },
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

  // ============================================
  // WIZARD ACTIONS
  // ============================================

  const resetWizard = useCallback(() => {
    setWizardStep('list');
    setSelectedComponent(null);
    setSelectedLocation(null);
    setSelectedTechnique(null);
    setCustomComponent('');
    setCustomLocation('');
    setTechSearch('');
    setDetailForm({ max_width_cm: null, max_height_cm: null, max_colors: null, setup_cost: 0, unit_cost: 0, notes: '', is_active: true });
    setEditingArea(null);
  }, []);

  const startWizard = useCallback(() => {
    resetWizard();
    setWizardStep('component');
  }, [resetWizard]);

  const handleSelectComponent = useCallback((comp: { code: string; name: string }) => {
    setSelectedComponent(comp);
    setWizardStep('location');
  }, []);

  const handleSelectLocation = useCallback((loc: { code: string; name: string }) => {
    setSelectedLocation(loc);
    setWizardStep('technique');
  }, []);

  const handleSelectTechnique = useCallback((tech: ExternalTechnique) => {
    setSelectedTechnique(tech);
    const maxCores = typeof tech.max_cores === 'string' ? parseInt(tech.max_cores, 10) : (tech.max_cores ?? null);
    setDetailForm(prev => ({ ...prev, max_colors: maxCores }));
    setWizardStep('details');
  }, []);

  const handleSaveArea = useCallback(() => {
    if (!selectedComponent || !selectedLocation || !selectedTechnique) return;

    const areaName = `${selectedLocation.name} — ${selectedTechnique.nome}`;
    const newArea: PersonalizationArea = {
      product_id: productId || 'pending',
      component_id: null,
      area_name: areaName,
      technique_name: selectedTechnique.nome,
      technique_code: selectedTechnique.codigo,
      location_name: `${selectedComponent.name} > ${selectedLocation.name}`,
      max_width_cm: detailForm.max_width_cm,
      max_height_cm: detailForm.max_height_cm,
      max_colors: detailForm.max_colors,
      setup_cost: detailForm.setup_cost,
      unit_cost: detailForm.unit_cost,
      notes: detailForm.notes || null,
      is_active: detailForm.is_active,
      sort_order: displayAreas.length,
    };

    if (isEdit && productId) {
      createMutation.mutate(newArea as Omit<PersonalizationArea, 'id'>);
    } else {
      setLocalAreas(prev => [...prev, { ...newArea, id: `local-${Date.now()}` }]);
      toast.success('Área adicionada (será salva junto ao produto)');
    }
    resetWizard();
  }, [selectedComponent, selectedLocation, selectedTechnique, detailForm, productId, isEdit, displayAreas.length, createMutation, resetWizard]);

  const handleDeleteArea = useCallback((area: PersonalizationArea) => {
    if (!confirm('Remover esta área de personalização?')) return;
    if (isEdit && area.id && !area.id.startsWith('local-')) {
      deleteMutation.mutate(area.id);
    } else {
      setLocalAreas(prev => prev.filter(a => a.id !== area.id));
      toast.success('Área removida');
    }
  }, [isEdit, deleteMutation]);

  const handleToggleActive = useCallback((area: PersonalizationArea) => {
    if (isEdit && area.id && !area.id.startsWith('local-')) {
      updateMutation.mutate({ id: area.id, is_active: !area.is_active });
    } else {
      setLocalAreas(prev => prev.map(a => a.id === area.id ? { ...a, is_active: !a.is_active } : a));
    }
  }, [isEdit, updateMutation]);

  // ============================================
  // FILTERED TECHNIQUES
  // ============================================

  const filteredTechniques = useMemo(() => {
    if (!techSearch) return techniques.filter(t => t.ativo !== false);
    const s = techSearch.toLowerCase();
    return techniques.filter(t =>
      t.ativo !== false &&
      (t.nome.toLowerCase().includes(s) || t.codigo.toLowerCase().includes(s) || t.nome_grupo?.toLowerCase().includes(s))
    );
  }, [techniques, techSearch]);

  // Group techniques by category
  const groupedTechniques = useMemo(() => {
    const groups: Record<string, ExternalTechnique[]> = {};
    for (const t of filteredTechniques) {
      const group = t.nome_grupo || t.grupo_tecnica || 'Outras';
      if (!groups[group]) groups[group] = [];
      groups[group].push(t);
    }
    return groups;
  }, [filteredTechniques]);

  const wizardStepIndex = WIZARD_STEPS.findIndex(s => s.id === wizardStep);
  const isBusy = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  // ============================================
  // RENDER: WIZARD MINI-STEPPER
  // ============================================

  const renderWizardStepper = () => {
    if (wizardStep === 'list') return null;
    return (
      <div className="flex items-center gap-1 mb-4">
        {WIZARD_STEPS.map((step, i) => {
          const Icon = step.icon;
          const isActive = step.id === wizardStep;
          const isDone = wizardStepIndex > i;
          return (
            <React.Fragment key={step.id}>
              {i > 0 && (
                <div className={cn('flex-1 h-px max-w-8', isDone ? 'bg-primary' : 'bg-border/50')} />
              )}
              <div
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer',
                  isActive && 'bg-primary text-primary-foreground shadow-sm',
                  isDone && !isActive && 'bg-primary/15 text-primary',
                  !isActive && !isDone && 'text-muted-foreground',
                )}
                onClick={() => {
                  if (isDone) setWizardStep(step.id);
                }}
              >
                {isDone ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                <span className="hidden sm:inline">{step.label}</span>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  // ============================================
  // RENDER: STEP COMPONENT
  // ============================================

  const renderComponentStep = () => (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Layers className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold">Qual componente do produto?</h4>
      </div>
      <p className="text-xs text-muted-foreground">Selecione a parte do produto onde será aplicada a personalização.</p>
      <div className="grid grid-cols-3 gap-2">
        {COMMON_COMPONENTS.map(comp => (
          <button
            key={comp.code}
            type="button"
            onClick={() => handleSelectComponent(comp)}
            className={cn(
              'flex items-center gap-2.5 p-3 rounded-lg border transition-all duration-200 text-left',
              'hover:border-primary/50 hover:bg-primary/5 hover:shadow-sm',
              'border-border/40 bg-card/60',
            )}
          >
            <span className="text-lg">{comp.icon}</span>
            <span className="text-xs font-medium">{comp.name}</span>
          </button>
        ))}
      </div>
      {/* Custom component */}
      <div className="flex items-center gap-2 pt-1">
        <Input
          placeholder="Ou digite um componente personalizado..."
          value={customComponent}
          onChange={e => setCustomComponent(e.target.value)}
          className="h-8 text-sm flex-1"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!customComponent.trim()}
          onClick={() => handleSelectComponent({ code: 'CUSTOM', name: customComponent.trim() })}
          className="h-8 text-xs"
        >
          Usar <ChevronRight className="h-3 w-3 ml-1" />
        </Button>
      </div>
    </div>
  );

  // ============================================
  // RENDER: STEP LOCATION
  // ============================================

  const renderLocationStep = () => (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <MapPin className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold">Qual local no {selectedComponent?.name}?</h4>
      </div>
      <p className="text-xs text-muted-foreground">Defina a posição/região onde a técnica será aplicada.</p>
      <div className="grid grid-cols-2 gap-2">
        {COMMON_LOCATIONS.map(loc => (
          <button
            key={loc.code}
            type="button"
            onClick={() => handleSelectLocation(loc)}
            className={cn(
              'flex items-center gap-2.5 p-3 rounded-lg border transition-all duration-200 text-left',
              'hover:border-primary/50 hover:bg-primary/5 hover:shadow-sm',
              'border-border/40 bg-card/60',
            )}
          >
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium">{loc.name}</span>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 pt-1">
        <Input
          placeholder="Ou digite um local personalizado..."
          value={customLocation}
          onChange={e => setCustomLocation(e.target.value)}
          className="h-8 text-sm flex-1"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!customLocation.trim()}
          onClick={() => handleSelectLocation({ code: 'CUSTOM', name: customLocation.trim() })}
          className="h-8 text-xs"
        >
          Usar <ChevronRight className="h-3 w-3 ml-1" />
        </Button>
      </div>
      <Button type="button" variant="ghost" size="sm" onClick={() => setWizardStep('component')} className="gap-1 text-xs">
        <ChevronLeft className="h-3 w-3" /> Voltar
      </Button>
    </div>
  );

  // ============================================
  // RENDER: STEP TECHNIQUE
  // ============================================

  const renderTechniqueStep = () => (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Paintbrush className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold">Qual técnica de gravação?</h4>
      </div>
      <p className="text-xs text-muted-foreground">
        Aplicação em: <span className="font-medium text-foreground">{selectedComponent?.name}</span> → <span className="font-medium text-foreground">{selectedLocation?.name}</span>
      </p>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Buscar técnica..."
          value={techSearch}
          onChange={e => setTechSearch(e.target.value)}
          className="h-8 text-sm pl-8"
        />
      </div>

      {loadingTechs ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      ) : (
        <ScrollArea className="h-60">
          <div className="space-y-3 pr-2">
            {Object.entries(groupedTechniques).map(([group, techs]) => (
              <div key={group}>
                <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider mb-1.5 px-1">{group}</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {techs.map(tech => (
                    <button
                      key={tech.id}
                      type="button"
                      onClick={() => handleSelectTechnique(tech)}
                      className={cn(
                        'flex items-center gap-2 p-2.5 rounded-lg border transition-all duration-200 text-left',
                        'hover:shadow-md hover:scale-[1.01]',
                        `bg-gradient-to-br ${getTechniqueColor(tech.codigo)}`,
                      )}
                    >
                      <span className="text-base">{getTechniqueIcon(tech.codigo)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{tech.nome}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{tech.codigo}</p>
                      </div>
                      {tech.permite_cores && (
                        <Palette className="h-3 w-3 text-muted-foreground shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {filteredTechniques.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <Search className="h-6 w-6 mx-auto mb-2 opacity-40" />
                <p className="text-xs">Nenhuma técnica encontrada</p>
              </div>
            )}
          </div>
        </ScrollArea>
      )}

      <Button type="button" variant="ghost" size="sm" onClick={() => setWizardStep('location')} className="gap-1 text-xs">
        <ChevronLeft className="h-3 w-3" /> Voltar
      </Button>
    </div>
  );

  // ============================================
  // RENDER: STEP DETAILS
  // ============================================

  const renderDetailsStep = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Ruler className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold">Detalhes da personalização</h4>
      </div>

      {/* Summary breadcrumb */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs p-2.5 rounded-lg bg-muted/30 border border-border/30">
        <Badge variant="outline" className="text-[10px] gap-1">
          <Layers className="h-2.5 w-2.5" />{selectedComponent?.name}
        </Badge>
        <ChevronRight className="h-3 w-3 text-muted-foreground" />
        <Badge variant="outline" className="text-[10px] gap-1">
          <MapPin className="h-2.5 w-2.5" />{selectedLocation?.name}
        </Badge>
        <ChevronRight className="h-3 w-3 text-muted-foreground" />
        <Badge className="text-[10px] gap-1 bg-primary/15 text-primary border-primary/30">
          {getTechniqueIcon(selectedTechnique?.codigo || '')} {selectedTechnique?.nome}
        </Badge>
      </div>

      {/* Dimension fields */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Largura máx. (cm)</label>
          <Input
            type="number" step="0.1" placeholder="Ex: 10"
            value={detailForm.max_width_cm ?? ''}
            onChange={e => setDetailForm(f => ({ ...f, max_width_cm: e.target.value ? Number(e.target.value) : null }))}
            className="h-8 text-sm"
          />
        </div>
        <div>
          <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Altura máx. (cm)</label>
          <Input
            type="number" step="0.1" placeholder="Ex: 5"
            value={detailForm.max_height_cm ?? ''}
            onChange={e => setDetailForm(f => ({ ...f, max_height_cm: e.target.value ? Number(e.target.value) : null }))}
            className="h-8 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Cores máx.</label>
          <Input
            type="number" placeholder="Ex: 4"
            value={detailForm.max_colors ?? ''}
            onChange={e => setDetailForm(f => ({ ...f, max_colors: e.target.value ? Number(e.target.value) : null }))}
            className="h-8 text-sm"
          />
        </div>
        <div>
          <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Custo Setup (R$)</label>
          <Input
            type="number" step="0.01" placeholder="0"
            value={detailForm.setup_cost || ''}
            onChange={e => setDetailForm(f => ({ ...f, setup_cost: Number(e.target.value) || 0 }))}
            className="h-8 text-sm"
          />
        </div>
        <div>
          <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Custo Unit. (R$)</label>
          <Input
            type="number" step="0.01" placeholder="0"
            value={detailForm.unit_cost || ''}
            onChange={e => setDetailForm(f => ({ ...f, unit_cost: Number(e.target.value) || 0 }))}
            className="h-8 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Observações</label>
        <Input
          placeholder="Notas sobre essa personalização..."
          value={detailForm.notes}
          onChange={e => setDetailForm(f => ({ ...f, notes: e.target.value }))}
          className="h-8 text-sm"
        />
      </div>

      <div className="flex items-center gap-2">
        <Switch checked={detailForm.is_active} onCheckedChange={v => setDetailForm(f => ({ ...f, is_active: v }))} />
        <span className="text-xs text-muted-foreground">Área ativa</span>
      </div>

      <div className="flex items-center justify-between pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => setWizardStep('technique')} className="gap-1 text-xs">
          <ChevronLeft className="h-3 w-3" /> Voltar
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleSaveArea}
          disabled={isBusy}
          className="gap-1.5"
        >
          <Save className="h-3.5 w-3.5" />
          {editingArea ? 'Atualizar' : 'Adicionar Área'}
        </Button>
      </div>
    </div>
  );

  // ============================================
  // RENDER: AREAS LIST
  // ============================================

  const renderAreaCard = (area: PersonalizationArea) => {
    const isExpanded = expandedId === area.id;
    return (
      <div
        key={area.id}
        className={cn(
          'group rounded-lg border transition-all duration-200',
          area.is_active ? 'border-border/50 bg-card/60 hover:border-border hover:shadow-sm' : 'border-border/20 bg-muted/20 opacity-60',
        )}
      >
        <div className="flex items-center gap-2.5 px-3 py-2.5">
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base">{getTechniqueIcon(area.technique_code || '')}</span>
              <span className="text-sm font-medium">{area.area_name}</span>
              <Badge variant="outline" className={cn(
                'text-[10px] h-4 gap-0.5',
                `bg-gradient-to-r ${getTechniqueColor(area.technique_code || '')}`,
              )}>
                {area.technique_code || area.technique_name}
              </Badge>
            </div>
            <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
              {area.location_name && (
                <span className="flex items-center gap-0.5">
                  <MapPin className="h-2.5 w-2.5" />{area.location_name}
                </span>
              )}
              {area.max_width_cm && area.max_height_cm && (
                <span className="flex items-center gap-0.5">
                  <Ruler className="h-2.5 w-2.5" />{area.max_width_cm}×{area.max_height_cm}cm
                </span>
              )}
              {area.max_colors && (
                <span className="flex items-center gap-0.5">
                  <Palette className="h-2.5 w-2.5" />{area.max_colors} cores
                </span>
              )}
              {(area.setup_cost || area.unit_cost) && (
                <span className="flex items-center gap-0.5">
                  <DollarSign className="h-2.5 w-2.5" />
                  {area.setup_cost ? `R$${area.setup_cost}` : ''}{area.setup_cost && area.unit_cost ? ' + ' : ''}{area.unit_cost ? `R$${area.unit_cost}/un` : ''}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button type="button" onClick={() => setExpandedId(isExpanded ? null : area.id!)} className="p-1 rounded hover:bg-muted transition-colors">
              {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            <button type="button" onClick={() => handleToggleActive(area)} className="p-1 rounded hover:bg-muted transition-colors">
              <Switch checked={area.is_active} className="scale-75" />
            </button>
            <button
              type="button"
              onClick={() => handleDeleteArea(area)}
              className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        {isExpanded && (
          <div className="px-3 pb-3 pt-0 border-t border-border/30 mt-1">
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
  };

  // ============================================
  // RENDER: MAIN
  // ============================================

  const isLoading = loadingTechs || (isEdit && loadingAreas);

  return (
    <SectionCard id="engraving" title="Gravação e Personalização" icon={Paintbrush} subtitle="Configure componentes, locais e técnicas de personalização">
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full rounded-lg" />
          <Skeleton className="h-14 w-full rounded-lg" />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {wizardStep === 'list' ? (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              {/* Header with add button */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {displayAreas.length} {displayAreas.length === 1 ? 'área' : 'áreas'} configurada{displayAreas.length !== 1 ? 's' : ''}
                  </span>
                  {displayAreas.filter(a => a.is_active).length < displayAreas.length && (
                    <Badge variant="outline" className="text-[10px] h-4">
                      {displayAreas.filter(a => a.is_active).length} ativas
                    </Badge>
                  )}
                  {!isEdit && localAreas.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] h-4 gap-0.5">
                      <Info className="h-2.5 w-2.5" /> Serão salvas ao criar o produto
                    </Badge>
                  )}
                </div>
                <Button type="button" size="sm" onClick={startWizard} className="gap-1.5 h-7 text-xs">
                  <Plus className="h-3 w-3" /> Nova Personalização
                </Button>
              </div>

              {/* Empty state */}
              {displayAreas.length === 0 && (
                <div className="text-center py-10 border border-dashed border-border/50 rounded-xl">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <Paintbrush className="h-7 w-7 text-primary" />
                  </div>
                  <p className="text-sm font-medium mb-1">Nenhuma personalização configurada</p>
                  <p className="text-xs text-muted-foreground mb-4 max-w-[300px] mx-auto">
                    Use o assistente para definir componentes, locais e técnicas de gravação do produto.
                  </p>
                  <Button type="button" size="sm" onClick={startWizard} className="gap-1.5">
                    <Zap className="h-3.5 w-3.5" /> Iniciar Configuração
                  </Button>
                </div>
              )}

              {/* Areas list */}
              {displayAreas.length > 0 && (
                <div className="space-y-1.5">
                  {displayAreas.map(renderAreaCard)}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key={wizardStep}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
            >
              {/* Back to list */}
              <button
                type="button"
                onClick={resetWizard}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
              >
                <ArrowLeft className="h-3 w-3" /> Voltar à lista
              </button>

              {renderWizardStepper()}

              {wizardStep === 'component' && renderComponentStep()}
              {wizardStep === 'location' && renderLocationStep()}
              {wizardStep === 'technique' && renderTechniqueStep()}
              {wizardStep === 'details' && renderDetailsStep()}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </SectionCard>
  );
}
