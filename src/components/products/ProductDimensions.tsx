import { Ruler, Scale, Box, ArrowUpDown, ArrowLeftRight, MoveHorizontal, Droplets } from "lucide-react";

interface ProductDimensionsProps {
  dimensions?: {
    height_cm?: number | null;
    width_cm?: number | null;
    length_cm?: number | null;
    diameter_cm?: number | null;
    weight_g?: number | null;
    capacity_ml?: number | null;
  };
  compact?: boolean;
}

interface SpecItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  iconBgClass?: string;
  iconColorClass?: string;
  compact?: boolean;
}

function SpecItem({ icon, label, value, iconBgClass = "bg-primary/10", iconColorClass = "text-primary", compact }: SpecItemProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50 border border-border">
        <div className={`w-7 h-7 rounded-md ${iconBgClass} flex items-center justify-center shrink-0 [&_svg]:h-3.5 [&_svg]:w-3.5`}>
          <span className={iconColorClass}>{icon}</span>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
          <p className="text-xs font-medium text-foreground leading-tight">{value}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 p-3.5 rounded-xl bg-secondary/50 border border-border min-w-0">
      <div className={`w-10 h-10 rounded-lg ${iconBgClass} flex items-center justify-center shrink-0`}>
        <span className={iconColorClass}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className="text-sm font-bold text-foreground leading-snug">{value}</p>
      </div>
    </div>
  );
}

export function ProductDimensions({ dimensions, compact }: ProductDimensionsProps) {
  if (!dimensions) return null;

  const { height_cm, width_cm, length_cm, diameter_cm, weight_g, capacity_ml } = dimensions;
  
  const hasAnySpec = height_cm || width_cm || length_cm || diameter_cm || weight_g || capacity_ml;
  
  if (!hasAnySpec) return null;

  const formatWeight = (g: number) => {
    if (g >= 1000) {
      return `${(g / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg`;
    }
    return `${g.toLocaleString('pt-BR')} g`;
  };

  const specs: SpecItemProps[] = [];

  if (diameter_cm) {
    specs.push({ icon: <Box className="h-5 w-5" />, label: "Diâmetro", value: `${diameter_cm} cm` });
  }
  if (height_cm) {
    specs.push({ icon: <ArrowUpDown className="h-5 w-5" />, label: "Altura", value: `${height_cm} cm` });
  }
  if (width_cm) {
    specs.push({ icon: <ArrowLeftRight className="h-5 w-5" />, label: "Largura", value: `${width_cm} cm` });
  }
  if (length_cm) {
    specs.push({ icon: <MoveHorizontal className="h-5 w-5" />, label: "Profundidade", value: `${length_cm} cm` });
  }
  if (capacity_ml) {
    const formatCapacity = (ml: number) => {
      if (ml >= 1000) return `${(ml / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L`;
      return `${ml.toLocaleString('pt-BR')} ml`;
    };
    specs.push({ icon: <Droplets className="h-5 w-5" />, label: "Capacidade", value: formatCapacity(capacity_ml), iconBgClass: "bg-cyan-500/10", iconColorClass: "text-cyan-500" });
  }
  if (weight_g) {
    specs.push({ icon: <Scale className="h-5 w-5" />, label: "Peso", value: formatWeight(weight_g), iconBgClass: "bg-info/10", iconColorClass: "text-info" });
  }

  if (compact) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-1.5 xl:gap-2">
        {specs.map((spec, index) => (
          <SpecItem key={index} {...spec} compact />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="font-display text-lg font-semibold text-foreground">
        Especificações
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {specs.map((spec, index) => (
          <SpecItem key={index} {...spec} />
        ))}
      </div>
    </div>
  );
}
