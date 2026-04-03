/**
 * Kit Type Cards — Seletor visual de tipo de kit
 * Cards visuais com ícone + descrição, substituindo radio buttons
 */

import { Package, Box, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface KitTypeCardsProps {
  value: string;
  onChange: (value: 'montado' | 'original' | 'simples') => void;
}

const KIT_TYPES = [
  {
    id: 'montado' as const,
    label: 'Montado',
    description: 'Itens organizados dentro da caixa, pronto para presentear',
    icon: Package,
    color: 'primary',
  },
  {
    id: 'original' as const,
    label: 'Original',
    description: 'Embalagem original do fornecedor, sem remontagem',
    icon: Box,
    color: 'amber',
  },
  {
    id: 'simples' as const,
    label: 'Simples',
    description: 'Agrupamento de produtos sem embalagem especial',
    icon: Layers,
    color: 'blue',
  },
];

export function KitTypeCards({ value, onChange }: KitTypeCardsProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {KIT_TYPES.map((type) => {
        const isSelected = value === type.id;
        const Icon = type.icon;

        return (
          <motion.button
            key={type.id}
            onClick={() => onChange(type.id)}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            className={cn(
              "relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 text-center",
              isSelected
                ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                : "border-border/50 bg-card hover:border-border hover:bg-muted/30"
            )}
          >
            {/* Selection indicator */}
            {isSelected && (
              <motion.div
                layoutId="kit-type-indicator"
                className="absolute inset-0 rounded-xl border-2 border-primary"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}

            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
              isSelected ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
            )}>
              <Icon className="h-5 w-5" />
            </div>

            <div>
              <p className={cn(
                "text-sm font-semibold transition-colors",
                isSelected ? "text-primary" : "text-foreground"
              )}>
                {type.label}
              </p>
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                {type.description}
              </p>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
