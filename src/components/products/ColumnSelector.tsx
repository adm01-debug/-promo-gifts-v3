import { useState, useEffect } from "react";
import { Columns3, Grid2x2, Grid3x3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = "product-grid-columns";

export type ColumnCount = 1 | 2 | 3 | 4 | 5 | 6 | 8;

// Custom grid icon with configurable columns
function GridCustomIcon({ cols, rows = 2 }: { cols: number; rows?: number }) {
  const size = 22;
  const gap = 1.5;
  const cellW = (size - (cols - 1) * gap) / cols;
  const cellH = (size - (rows - 1) * gap) / rows;
  const rects: React.ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      rects.push(
        <rect
          key={`${r}-${c}`}
          x={c * (cellW + gap)}
          y={r * (cellH + gap)}
          width={cellW}
          height={cellH}
          rx={0.6}
          fill="currentColor"
        />
      );
    }
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="h-7 w-7">
      {rects}
    </svg>
  );
}

interface ColumnOption {
  value: ColumnCount;
  label: string;
  icon: React.ReactNode;
  minWidth: number;
}

const columnOptions: ColumnOption[] = [
  { value: 1, label: "1 coluna", icon: <GridCustomIcon cols={1} rows={2} />, minWidth: 0 },
  { value: 2, label: "2 colunas", icon: <GridCustomIcon cols={2} rows={2} />, minWidth: 0 },
  { value: 3, label: "3 colunas", icon: <Columns3 className="h-7 w-7" />, minWidth: 640 },
  { value: 4, label: "4 colunas", icon: <Grid2x2 className="h-7 w-7" />, minWidth: 768 },
  { value: 5, label: "5 colunas", icon: <Grid3x3 className="h-7 w-7" />, minWidth: 1024 },
  { value: 6, label: "6 colunas", icon: <GridCustomIcon cols={3} rows={2} />, minWidth: 1280 },
  { value: 8, label: "8 colunas", icon: <GridCustomIcon cols={4} rows={3} />, minWidth: 1536 },
];

function getDefaultColumns(): ColumnCount {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = parseInt(saved, 10) as ColumnCount;
      if ([1, 2, 3, 4, 5, 6, 8].includes(parsed)) return parsed;
    }
  } catch {}
  // Responsive default based on screen width
  if (typeof window !== "undefined") {
    const w = window.innerWidth;
    if (w < 640) return 1;
    if (w < 768) return 2;
    if (w < 1024) return 3;
  }
  return 5;
}

function getAvailableOptions(screenWidth: number): ColumnOption[] {
  return columnOptions.filter((opt) => screenWidth >= opt.minWidth);
}

interface ColumnSelectorProps {
  value: ColumnCount;
  onChange: (cols: ColumnCount) => void;
  className?: string;
}

export function ColumnSelector({ value, onChange, className }: ColumnSelectorProps) {
  const isMobile = useIsMobile();
  const [screenWidth, setScreenWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1280);

  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const available = getAvailableOptions(screenWidth);

  // Clamp value to available options
  useEffect(() => {
    const maxAvailable = available[available.length - 1]?.value ?? 3;
    if (value > maxAvailable) {
      onChange(maxAvailable);
    }
  }, [available, value, onChange]);

  if (available.length <= 1) return null;

  return (
    <div className={cn("flex items-center gap-0 p-0.5 rounded-lg bg-secondary/60 border border-border/30", className)}>
      <AnimatePresence mode="popLayout">
        {available.map((opt) => (
          <Tooltip key={opt.value}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-10 w-10 min-w-0 p-0 relative transition-all duration-200",
                  value === opt.value 
                    ? "text-primary-foreground" 
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => {
                  onChange(opt.value);
                  try { localStorage.setItem(STORAGE_KEY, String(opt.value)); } catch {}
                }}
              >
                {value === opt.value && (
                  <motion.div
                    layoutId="column-selector-bg"
                    className="absolute inset-1 rounded-md bg-primary shadow-sm"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{opt.icon}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs bg-popover text-popover-foreground border border-border z-50">
              {opt.label}
            </TooltipContent>
          </Tooltip>
        ))}
      </AnimatePresence>
    </div>
  );
}

export { getDefaultColumns, STORAGE_KEY };
