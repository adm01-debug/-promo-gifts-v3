import { Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { ThemePreset } from '@/lib/theme-presets';

interface PresetCardProps {
  preset: ThemePreset;
  isActive: boolean;
  onSelect: (id: string) => void;
}

export function PresetCard({ preset, isActive, onSelect }: PresetCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className={cn(
        'relative cursor-pointer rounded-lg border bg-card p-4 transition-all duration-200 overflow-hidden',
        isActive
          ? 'border-primary ring-2 ring-primary shadow-glow-primary'
          : 'border-border hover:shadow-md hover:-translate-y-0.5'
      )}
      onClick={() => onSelect(preset.id)}
    >
      {/* Swatches bar */}
      <div className="flex h-7 rounded-md overflow-hidden mb-3">
        {preset.swatches.map((color, i) => (
          <div
            key={i}
            className="flex-1"
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      {/* Active check */}
      {isActive && (
        <div className="absolute top-3 right-3">
          <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
            <Check className="h-3 w-3 text-primary-foreground" />
          </div>
        </div>
      )}

      {/* Info */}
      <div className="flex items-center gap-1.5">
        <span className="text-sm">{preset.emoji}</span>
        <h3 className="text-xs font-bold text-foreground">{preset.name}</h3>
      </div>
      <p className="text-[11px] text-muted-foreground mt-0.5 italic">{preset.description}</p>
    </motion.div>
  );
}
