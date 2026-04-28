import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = "product-grid-columns";

export type ColumnCount = 3 | 4 | 5 | 6 | 8;

function GridIcon({ cols, rows = 2 }: { cols: number; rows?: number }) {
  const size = 18;
  const gap = 2;
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
          rx={1}
          fill="currentColor"
        />
      );
    }
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {rects}
    </svg>
  );
}

interface ColumnOption {
  value: ColumnCount;
  label: string;
  cols: number;
  rows: number;
}

const columnOptions: ColumnOption[] = [
  { value: 3, label: "3 colunas", cols: 3, rows: 2 },
  { value: 4, label: "4 colunas", cols: 4, rows: 2 },
  { value: 5, label: "5 colunas", cols: 5, rows: 2 },
  { value: 6, label: "6 colunas", cols: 3, rows: 3 },
  { value: 8, label: "8 colunas", cols: 4, rows: 3 },
];

function getDefaultColumns(): ColumnCount {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = Number(saved) as ColumnCount;
      if ([3, 4, 5, 6, 8].includes(parsed)) return parsed;
    }
  } catch {}
  if (typeof window !== "undefined") {
    const w = window.innerWidth;
    if (w < 1024) return 3;
  }
  return 5;
}

interface ColumnSelectorProps {
  value: ColumnCount;
  onChange: (cols: ColumnCount) => void;
  className?: string;
}

export function ColumnSelector({ value, onChange, className }: ColumnSelectorProps) {
  const available = columnOptions;

  return (
    <div className={cn(
      "inline-flex items-center gap-0.5 p-1 rounded-xl bg-muted/60 border border-border/40",
      className
    )}>
      <AnimatePresence mode="popLayout">
        {available.map((opt) => {
          const isActive = value === opt.value;
          return (
            <Tooltip key={opt.value}>
              <TooltipTrigger asChild>
                <button
                  aria-label={opt.label}
                  className={cn(
                    "relative flex items-center justify-center h-9 w-9 rounded-lg transition-colors duration-150",
                    isActive
                      ? "text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                  onClick={() => {
                    onChange(opt.value);
                    try { localStorage.setItem(STORAGE_KEY, String(opt.value)); } catch {}
                  }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="column-selector-bg"
                      className="absolute inset-0 rounded-lg bg-primary shadow-sm"
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}
                  <span className="relative z-10">
                    <GridIcon cols={opt.cols} rows={opt.rows} />
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {opt.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export { getDefaultColumns, STORAGE_KEY };
