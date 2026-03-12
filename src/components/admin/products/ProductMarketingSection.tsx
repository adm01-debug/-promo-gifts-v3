/**
 * ProductMarketingSection — Seletores de classificação de marketing
 * Público-Alvo, Datas Comemorativas e Endomarketing
 * Persiste no campo `tags` (JSONB) do produto no BD externo
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, X, Users, Calendar, Megaphone, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PUBLICO_ALVO, DATAS_COMEMORATIVAS, ENDOMARKETING } from '@/data/mockData';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface ProductMarketingSectionProps {
  productId: string;
}

interface ProductTags {
  publicoAlvo: string[];
  datasComemorativas: string[];
  endomarketing: string[];
}

function toArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string' && !!v.trim());
  if (typeof value === 'string') return value.split(/[,;|]/).map(v => v.trim()).filter(Boolean);
  return [];
}

async function fetchProductTags(productId: string): Promise<ProductTags> {
  const { data, error } = await supabase.functions.invoke('external-db-bridge', {
    body: { table: 'products', operation: 'select', id: productId },
  });
  if (error) throw new Error(error.message);

  const product = data?.data?.records?.[0] || data?.data;
  const raw = product?.tags;
  const tags = typeof raw === 'string'
    ? (() => { try { return JSON.parse(raw); } catch { return {}; } })()
    : (raw || {});

  return {
    publicoAlvo: toArray(tags.publicoAlvo ?? tags.publico_alvo),
    datasComemorativas: toArray(tags.datasComemorativas ?? tags.datas_comemorativas),
    endomarketing: toArray(tags.endomarketing),
  };
}

async function saveProductTags(productId: string, tags: ProductTags): Promise<void> {
  const payload = {
    publicoAlvo: tags.publicoAlvo,
    datasComemorativas: tags.datasComemorativas,
    endomarketing: tags.endomarketing,
    // Compatibilidade com leituras legadas
    publico_alvo: tags.publicoAlvo,
    datas_comemorativas: tags.datasComemorativas,
  };

  const { error } = await supabase.functions.invoke('external-db-bridge', {
    body: { table: 'products', operation: 'update', id: productId, data: { tags: payload } },
  });
  if (error) throw new Error(error.message);
}

type CategoryKey = keyof ProductTags;

const CATEGORIES: {
  key: CategoryKey;
  label: string;
  icon: React.ElementType;
  options: string[];
}[] = [
  { key: 'publicoAlvo', label: 'Público-Alvo', icon: Users, options: [...PUBLICO_ALVO].sort((a, b) => a.localeCompare(b, 'pt-BR')) },
  { key: 'datasComemorativas', label: 'Datas Comemorativas', icon: Calendar, options: [...DATAS_COMEMORATIVAS].sort((a, b) => a.localeCompare(b, 'pt-BR')) },
  { key: 'endomarketing', label: 'Endomarketing', icon: Megaphone, options: [...ENDOMARKETING].sort((a, b) => a.localeCompare(b, 'pt-BR')) },
];

export function ProductMarketingSection({ productId }: ProductMarketingSectionProps) {
  const [tags, setTags] = useState<ProductTags>({ publicoAlvo: [], datasComemorativas: [], endomarketing: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchProductTags(productId).then(t => {
      setTags(t);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [productId]);

  const toggleItem = useCallback(async (category: CategoryKey, item: string) => {
    const current = tags[category] || [];
    const isSelected = current.includes(item);
    const updated = isSelected ? current.filter(i => i !== item) : [...current, item];

    const newTags = { ...tags, [category]: updated };
    setTags(newTags);

    setSaving(true);
    try {
      await saveProductTags(productId, newTags);
      toast.success(isSelected ? 'Removido' : 'Adicionado');
    } catch (err) {
      // Revert
      setTags(tags);
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }, [productId, tags]);

  const toggleExpanded = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Carregando classificações...
      </div>
    );
  }

  const totalSelected = CATEGORIES.reduce((sum, cat) => sum + (tags[cat.key]?.length || 0), 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="h-4 w-4" />
        <span>{totalSelected} classificação(ões) selecionada(s)</span>
        {saving && <Loader2 className="h-3 w-3 animate-spin" />}
      </div>

      <div className="space-y-1">
        {CATEGORIES.map(({ key, label, icon: Icon, options }) => {
          const selected = tags[key] || [];
          const isExpanded = expanded.has(key);

          return (
            <Collapsible key={key} open={isExpanded} onOpenChange={() => toggleExpanded(key)}>
              <CollapsibleTrigger className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm hover:bg-accent/50 transition-colors">
                <ChevronRight className={cn('h-3.5 w-3.5 transition-transform', isExpanded && 'rotate-90')} />
                <Icon className="h-3.5 w-3.5 text-primary" />
                <span className="font-medium">{label}</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {selected.length > 0 && (
                    <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4 mr-1">
                      {selected.length}
                    </Badge>
                  )}
                  {options.length} opções
                </span>
              </CollapsibleTrigger>
              <CollapsibleContent>
                {/* Badges dos selecionados */}
                {selected.length > 0 && (
                  <div className="flex flex-wrap gap-1 px-2 py-1">
                    {selected.map(item => (
                      <Badge
                        key={item}
                        variant="secondary"
                        className="gap-1 cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors text-[11px]"
                        onClick={() => toggleItem(key, item)}
                      >
                        {item}
                        <X className="h-2.5 w-2.5" />
                      </Badge>
                    ))}
                  </div>
                )}
                <ScrollArea className="max-h-[160px] ml-6 py-1">
                  <div className="space-y-0.5">
                    {options.map(opt => {
                      const isSelected = selected.includes(opt);
                      return (
                        <label
                          key={opt}
                          className={cn(
                            'flex items-center gap-2 px-2 py-1 rounded text-sm cursor-pointer hover:bg-accent/30 transition-colors',
                            isSelected && 'bg-primary/5'
                          )}
                        >
                          <Checkbox checked={isSelected} onCheckedChange={() => toggleItem(key, opt)} />
                          <span>{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}
