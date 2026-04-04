import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';

interface BorderRadiusControlProps {
  value: number;
  onChange: (value: number) => void;
}

export function BorderRadiusControl({ value, onChange }: BorderRadiusControlProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Raio da Borda</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Ajuste o arredondamento dos elementos</p>
          </div>
          <span className="text-sm font-mono font-semibold text-foreground bg-muted px-3 py-1 rounded-md">
            {value}px
          </span>
        </div>

        <Slider
          value={[value]}
          min={0}
          max={20}
          step={1}
          onValueChange={([v]) => onChange(v)}
          className="my-5"
        />

        {/* Preview */}
        <div className="flex items-center gap-4 mt-6 pt-5 border-t border-border/50">
          <Button size="sm" style={{ borderRadius: `${value}px` }}>
            Botão
          </Button>
          <Button size="sm" variant="secondary" style={{ borderRadius: `${value}px` }}>
            Secondary
          </Button>
          <Button size="sm" variant="outline" style={{ borderRadius: `${value}px` }}>
            Outline
          </Button>
          <div
            className="h-9 w-24 border border-input bg-background flex items-center px-3 text-sm text-muted-foreground"
            style={{ borderRadius: `${value}px` }}
          >
            Input
          </div>
          <div
            className="h-16 w-24 border border-border bg-card flex items-center justify-center text-sm font-medium text-foreground shadow-xs"
            style={{ borderRadius: `${value}px` }}
          >
            Card
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
