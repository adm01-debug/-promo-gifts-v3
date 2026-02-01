import { Ruler, Scale, Box } from "lucide-react";

interface ProductDimensionsProps {
  dimensions?: {
    height_cm?: number | null;
    width_cm?: number | null;
    length_cm?: number | null;
    diameter_cm?: number | null;
    weight_g?: number | null;
    weight_kg?: number | null;
  };
}

export function ProductDimensions({ dimensions }: ProductDimensionsProps) {
  if (!dimensions) return null;

  const { height_cm, width_cm, length_cm, diameter_cm, weight_g, weight_kg } = dimensions;
  
  // Verifica se há pelo menos uma dimensão disponível
  const hasDimensions = height_cm || width_cm || length_cm || diameter_cm;
  const hasWeight = weight_g || weight_kg;
  
  if (!hasDimensions && !hasWeight) return null;

  // Formata peso para exibição
  const formatWeight = () => {
    if (weight_kg) {
      return `${weight_kg.toLocaleString('pt-BR')} kg`;
    }
    if (weight_g) {
      if (weight_g >= 1000) {
        return `${(weight_g / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg`;
      }
      return `${weight_g.toLocaleString('pt-BR')} g`;
    }
    return null;
  };

  // Monta string de dimensões
  const formatDimensions = () => {
    const parts: string[] = [];
    
    if (diameter_cm) {
      parts.push(`Ø ${diameter_cm} cm`);
    } else {
      if (length_cm) parts.push(`${length_cm}`);
      if (width_cm) parts.push(`${width_cm}`);
      if (height_cm) parts.push(`${height_cm}`);
      
      if (parts.length > 0) {
        return `${parts.join(' × ')} cm`;
      }
    }
    
    return parts.join(' ');
  };

  const dimensionsText = formatDimensions();
  const weightText = formatWeight();

  return (
    <div className="space-y-3">
      <h3 className="font-display text-lg font-semibold text-foreground">
        Especificações
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {dimensionsText && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 border border-border">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              {diameter_cm ? (
                <Box className="h-5 w-5 text-primary" />
              ) : (
                <Ruler className="h-5 w-5 text-primary" />
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {diameter_cm ? 'Diâmetro' : 'Dimensões (C×L×A)'}
              </p>
              <p className="text-sm font-medium text-foreground">
                {dimensionsText}
              </p>
            </div>
          </div>
        )}
        
        {weightText && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 border border-border">
            <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center shrink-0">
              <Scale className="h-5 w-5 text-info" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Peso</p>
              <p className="text-sm font-medium text-foreground">
                {weightText}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
