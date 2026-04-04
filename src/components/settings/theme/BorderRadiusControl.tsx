import { Search, Star, Bell, Send, Heart, Settings, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';

interface BorderRadiusControlProps {
  value: number;
  onChange: (value: number) => void;
}

export function BorderRadiusControl({ value, onChange }: BorderRadiusControlProps) {
  const r = `${value}px`;

  return (
    <Card>
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-display font-semibold text-foreground">Raio da Borda</h2>
          <span className="text-sm font-mono font-semibold text-foreground bg-muted px-3 py-1 rounded-md">
            {value}px
          </span>
        </div>

        {/* Slider */}
        <div className="relative">
          <Slider
            value={[value]}
            min={0}
            max={20}
            step={1}
            onValueChange={([v]) => onChange(v)}
            className="my-2"
          />
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-muted-foreground">0</span>
            <span className="text-[10px] text-muted-foreground">20</span>
          </div>
        </div>

        {/* Preview Label */}
        <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground mt-6 mb-4">
          Preview em tempo real
        </p>

        {/* Row 1: Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" style={{ borderRadius: r }}>
            <Send className="h-3.5 w-3.5 mr-1.5" /> Enviar
          </Button>
          <Button size="sm" variant="secondary" style={{ borderRadius: r }}>
            <Heart className="h-3.5 w-3.5 mr-1.5" /> Curtir
          </Button>
          <Button size="sm" variant="outline" style={{ borderRadius: r }}>
            <Settings className="h-3.5 w-3.5 mr-1.5" /> Config
          </Button>
          <Button size="sm" variant="destructive" style={{ borderRadius: r }}>
            <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Excluir
          </Button>
        </div>

        {/* Row 2: Search input + badges */}
        <div className="flex items-center gap-2 mt-4">
          <div
            className="flex-1 h-9 border border-input bg-background flex items-center gap-2 px-3 text-sm text-muted-foreground"
            style={{ borderRadius: r }}
          >
            <Search className="h-3.5 w-3.5 shrink-0" />
            <span>Buscar...</span>
          </div>
          <div
            className="flex items-center gap-1 h-8 px-3 bg-primary/10 text-primary text-xs font-medium"
            style={{ borderRadius: r }}
          >
            <Star className="h-3 w-3" /> Novo
          </div>
          <div
            className="flex items-center gap-1 h-8 px-3 bg-muted text-muted-foreground text-xs font-medium"
            style={{ borderRadius: r }}
          >
            <Bell className="h-3 w-3" /> 3
          </div>
        </div>

        {/* Row 3: Mini card with avatar */}
        <div
          className="flex items-center gap-3 mt-4 p-3 border border-border bg-card"
          style={{ borderRadius: r }}
        >
          <div
            className="h-9 w-9 bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0"
            style={{ borderRadius: r }}
          >
            JD
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">João da Silva</p>
            <p className="text-xs text-muted-foreground truncate">Última mensagem enviada há 5 min</p>
          </div>
          <div className="h-2.5 w-2.5 rounded-full bg-primary shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}
