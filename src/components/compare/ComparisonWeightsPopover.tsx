/**
 * ComparisonWeightsPopover (C6 #1) — Sliders persistentes para calibrar pesos do score.
 */
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Sliders, RotateCcw } from 'lucide-react';
import { useComparisonWeights, type ComparisonWeights } from '@/hooks/useComparisonWeights';
import { toast } from 'sonner';

const FIELDS: Array<{ key: keyof ComparisonWeights; label: string }> = [
  { key: 'price', label: 'Preço' },
  { key: 'stock', label: 'Estoque' },
  { key: 'minQty', label: 'Qtd. mínima' },
  { key: 'colors', label: 'Variedade de cores' },
  { key: 'verified', label: 'Fornecedor verificado' },
  { key: 'leadTime', label: 'Lead time' },
];

export function ComparisonWeightsPopover() {
  const { weights, setWeights, reset, loading } = useComparisonWeights();
  const total = Object.values(weights).reduce((a, b) => a + b, 0);

  const update = (key: keyof ComparisonWeights, value: number) => {
    setWeights({ ...weights, [key]: value });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-label="Ajustar pesos do score"
          className="border-amber-500/20 text-[10px] font-black uppercase tracking-widest text-amber-600 hover:bg-amber-500/5"
        >
          <Sliders className="mr-2 h-4 w-4" />
          Configuração Arena
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="bg-card/98 w-80 border-amber-500/20 shadow-2xl backdrop-blur-xl"
        align="end"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-600">
              Calibragem do Algoritmo
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                reset();
                toast.success('Algoritmo restaurado para o padrão');
              }}
            >
              <RotateCcw className="mr-1 h-3 w-3" /> Reset
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Total:{' '}
            <span
              className={total === 100 ? 'font-medium text-primary' : 'font-medium text-amber-500'}
            >
              {total}
            </span>
            {total !== 100 && ' (normalizado automaticamente)'}
          </p>
          {FIELDS.map((f) => (
            <div key={f.key} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">{f.label}</Label>
                <span className="text-xs font-medium tabular-nums">{weights[f.key]}%</span>
              </div>
              <Slider
                value={[weights[f.key]]}
                onValueChange={([v]) => update(f.key, v)}
                min={0}
                max={50}
                step={1}
                aria-label={`Peso de ${f.label}`}
              />
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
