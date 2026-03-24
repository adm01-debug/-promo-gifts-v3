/**
 * Flags / Status section — boolean toggles with descriptions
 */
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { SectionCard } from '../ProductFormHelpers';
import { ShieldCheck } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UseFormSetValue } from 'react-hook-form';
import type { ProductFormData } from '../ProductFormSchema';

interface Props {
  setValue: UseFormSetValue<ProductFormData>;
  flags: Record<string, boolean>;
}

const FLAG_CONFIG: { key: keyof ProductFormData; label: string; hint: string; activeClass?: string }[] = [
  { key: 'is_active', label: 'Produto Ativo', hint: 'Define se o produto aparece no catálogo e pode ser adicionado a orçamentos', activeClass: 'bg-success/8 border-success/30' },
  { key: 'is_featured', label: 'Destaque', hint: 'Exibe o produto em posições de destaque no catálogo' },
  { key: 'is_bestseller', label: 'Mais Vendido', hint: 'Marca o produto como best-seller para filtros e exibição especial' },
  { key: 'is_new', label: 'Lançamento', hint: 'Indica que o produto é um lançamento recente no catálogo' },
  { key: 'is_on_sale', label: 'Em Promoção', hint: 'Sinaliza o produto com badge de promoção' },
  { key: 'is_kit', label: 'É Kit', hint: 'Define como kit composto por múltiplos componentes — habilita seção de componentes na Classificação' },
  { key: 'is_imported', label: 'Importado', hint: 'Produto de origem estrangeira — pode impactar prazos e tributação' },
  { key: 'is_textil', label: 'Têxtil', hint: 'Produto têxtil — habilita variações por tamanho e cor' },
  { key: 'is_thermal', label: 'Térmico', hint: 'Produto com propriedades de isolamento térmico' },
  { key: 'allows_personalization', label: 'Permite Personalização', hint: 'Habilita opções de gravação e personalização no orçamento' },
  { key: 'has_gift_box', label: 'Caixa Presente', hint: 'Possui opção de embalagem para presente' },
  { key: 'has_optional_packaging', label: 'Embalagem Opcional', hint: 'A embalagem pode ser removida ou trocada pelo cliente' },
  { key: 'has_commercial_packaging', label: 'Embalagem Nativa', hint: 'O produto já vem com embalagem comercial do fabricante' },
];

export function ProductFlagsSection({ setValue, flags }: Props) {
  const flagCount = Object.values(flags).filter(Boolean).length;

  return (
    <SectionCard id="flags" title="Status e Destaques" icon={ShieldCheck} subtitle={`${flagCount} ativos`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {FLAG_CONFIG.map(({ key, label, hint, activeClass }) => {
          const value = !!flags[key];
          const toggle = () => setValue(key, !value);
          return (
            <div
              key={key}
              className={cn(
                'flex items-center justify-between rounded-lg border p-3 transition-all duration-200 cursor-pointer hover:bg-accent/30',
                value ? (activeClass || 'bg-primary/5 border-primary/20') : 'border-border/50',
              )}
              onClick={toggle}
              role="switch"
              aria-checked={value}
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } }}
            >
              <div className="flex items-center gap-1.5">
                <Label className="cursor-pointer text-xs font-medium">{label}</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground/40 cursor-help shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent className="text-xs max-w-[220px]">{hint}</TooltipContent>
                </Tooltip>
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                <Switch checked={value} onCheckedChange={toggle} />
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}
