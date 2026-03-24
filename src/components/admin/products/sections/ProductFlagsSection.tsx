/**
 * Flags / Status section — boolean toggles
 */
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { SectionCard } from '../ProductFormHelpers';
import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UseFormSetValue } from 'react-hook-form';
import type { ProductFormData } from '../ProductFormSchema';

interface Props {
  setValue: UseFormSetValue<ProductFormData>;
  flags: Record<string, boolean>;
}

const FLAG_CONFIG: { key: keyof ProductFormData; label: string; activeClass?: string }[] = [
  { key: 'is_active', label: 'Produto Ativo', activeClass: 'bg-success/8 border-success/30' },
  { key: 'is_featured', label: 'Destaque' },
  { key: 'is_bestseller', label: 'Mais Vendido' },
  { key: 'is_new', label: 'Lançamento' },
  { key: 'is_on_sale', label: 'Em Promoção' },
  { key: 'is_kit', label: 'É Kit' },
  { key: 'is_imported', label: 'Importado' },
  { key: 'is_textil', label: 'Têxtil' },
  { key: 'is_thermal', label: 'Térmico' },
  { key: 'allows_personalization', label: 'Permite Personalização' },
  { key: 'has_gift_box', label: 'Caixa Presente' },
  { key: 'has_optional_packaging', label: 'Embalagem Opcional' },
  { key: 'has_commercial_packaging', label: 'Embalagem Nativa' },
];

export function ProductFlagsSection({ setValue, flags }: Props) {
  const flagCount = Object.values(flags).filter(Boolean).length;

  return (
    <SectionCard id="flags" title="Status e Destaques" icon={ShieldCheck} subtitle={`${flagCount} ativos`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {FLAG_CONFIG.map(({ key, label, activeClass }) => {
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
            >
              <Label className="cursor-pointer text-xs font-medium">{label}</Label>
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
