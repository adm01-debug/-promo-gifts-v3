import * as React from "react";
import { motion, Reorder } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Columns3,
  Eye,
  EyeOff,
  GripVertical,
  RotateCcw,
  Lock,
  Unlock,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

export interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  locked?: boolean;
  order: number;
}

export interface ColumnVisibilityProps {
  columns: ColumnConfig[];
  onChange: (columns: ColumnConfig[]) => void;
  storageKey?: string;
  className?: string;
}

export interface ColumnItemProps {
  column: ColumnConfig;
  onToggle: () => void;
  onLock: () => void;
}

// ============================================================================
// HOOK: useColumnVisibility
// ============================================================================

export function useColumnVisibility(
  initialColumns: Omit<ColumnConfig, "order">[],
  storageKey?: string
) {
  const [columns, setColumns] = React.useState<ColumnConfig[]>(() => {
    // Try to load from storage
    if (storageKey) {
      try {
        const stored = localStorage.getItem(`columns_${storageKey}`);
        if (stored) {
          return JSON.parse(stored);
        }
      } catch (e) {
        console.error("Failed to load column config:", e);
      }
    }
    // Initialize with order
    return initialColumns.map((col, index) => ({
      ...col,
      order: index,
    }));
  });

  // Persist to storage
  React.useEffect(() => {
    if (storageKey) {
      try {
        localStorage.setItem(`columns_${storageKey}`, JSON.stringify(columns));
      } catch (e) {
        console.error("Failed to save column config:", e);
      }
    }
  }, [columns, storageKey]);

  const toggleColumn = React.useCallback((id: string) => {
    setColumns(prev => prev.map(col => 
      col.id === id ? { ...col, visible: !col.visible } : col
    ));
  }, []);

  const lockColumn = React.useCallback((id: string) => {
    setColumns(prev => prev.map(col => 
      col.id === id ? { ...col, locked: !col.locked } : col
    ));
  }, []);

  const reorderColumns = React.useCallback((newOrder: ColumnConfig[]) => {
    setColumns(newOrder.map((col, index) => ({ ...col, order: index })));
  }, []);

  const resetColumns = React.useCallback(() => {
    setColumns(initialColumns.map((col, index) => ({
      ...col,
      order: index,
      visible: true,
      locked: false,
    })));
  }, [initialColumns]);

  const showAll = React.useCallback(() => {
    setColumns(prev => prev.map(col => ({ ...col, visible: true })));
  }, []);

  const hideAll = React.useCallback(() => {
    setColumns(prev => prev.map(col => 
      col.locked ? col : { ...col, visible: false }
    ));
  }, []);

  const visibleColumns = React.useMemo(
    () => columns.filter(col => col.visible).sort((a, b) => a.order - b.order),
    [columns]
  );

  return {
    columns,
    visibleColumns,
    toggleColumn,
    lockColumn,
    reorderColumns,
    resetColumns,
    showAll,
    hideAll,
    setColumns,
  };
}

// ============================================================================
// COLUMN ITEM COMPONENT
// ============================================================================

function ColumnItem({ column, onToggle, onLock }: ColumnItemProps) {
  return (
    <motion.div
      layout
      className={cn(
        "flex items-center gap-2 p-2 rounded-md",
        "hover:bg-muted/50 group cursor-grab active:cursor-grabbing"
      )}
    >
      <GripVertical className="h-4 w-4 text-muted-foreground/50 group-hover:text-muted-foreground" />
      
      <Checkbox
        id={`col-${column.id}`}
        checked={column.visible}
        onCheckedChange={onToggle}
        disabled={column.locked}
        aria-label={`${column.visible ? "Ocultar" : "Mostrar"} coluna ${column.label}`}
      />
      
      <label
        htmlFor={`col-${column.id}`}
        className={cn(
          "flex-1 text-sm cursor-pointer",
          !column.visible && "text-muted-foreground line-through"
        )}
      >
        {column.label}
      </label>

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={onLock}
        aria-label={column.locked ? "Desbloquear coluna" : "Bloquear coluna"}
      >
        {column.locked ? (
          <Lock className="h-3.5 w-3.5 text-amber-500" />
        ) : (
          <Unlock className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </Button>

      <div className={cn(
        "flex items-center gap-1",
        column.visible ? "text-primary" : "text-muted-foreground"
      )}>
        {column.visible ? (
          <Eye className="h-4 w-4" />
        ) : (
          <EyeOff className="h-4 w-4" />
        )}
      </div>
    </motion.div>
  );
}

// ============================================================================
// COLUMN VISIBILITY COMPONENT
// ============================================================================

export function ColumnVisibility({
  columns,
  onChange,
  className,
}: ColumnVisibilityProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const visibleCount = columns.filter(c => c.visible).length;
  const totalCount = columns.length;

  const handleToggle = (id: string) => {
    onChange(columns.map(col => 
      col.id === id ? { ...col, visible: !col.visible } : col
    ));
  };

  const handleLock = (id: string) => {
    onChange(columns.map(col => 
      col.id === id ? { ...col, locked: !col.locked } : col
    ));
  };

  const handleReorder = (newOrder: ColumnConfig[]) => {
    onChange(newOrder.map((col, index) => ({ ...col, order: index })));
  };

  const handleShowAll = () => {
    onChange(columns.map(col => ({ ...col, visible: true })));
  };

  const handleReset = () => {
    onChange(columns.map((col, index) => ({
      ...col,
      visible: true,
      locked: false,
      order: index,
    })));
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("gap-2", className)}
        >
          <Columns3 className="h-4 w-4" />
          Colunas
          <span className="text-xs text-muted-foreground">
            ({visibleCount}/{totalCount})
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="end">
        <div className="p-3 border-b flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-sm">Colunas visíveis</h4>
            <p className="text-xs text-muted-foreground">
              Arraste para reordenar
            </p>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShowAll}
              className="h-7 text-xs"
            >
              Todas
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleReset}
              className="h-7 w-7"
              title="Resetar para padrão"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="max-h-64 overflow-auto p-2">
          <Reorder.Group
            axis="y"
            values={columns}
            onReorder={handleReorder}
            className="space-y-1"
          >
            {columns.sort((a, b) => a.order - b.order).map((column) => (
              <Reorder.Item
                key={column.id}
                value={column}
                dragListener={!column.locked}
              >
                <ColumnItem
                  column={column}
                  onToggle={() => handleToggle(column.id)}
                  onLock={() => handleLock(column.id)}
                />
              </Reorder.Item>
            ))}
          </Reorder.Group>
        </div>

        <div className="p-3 border-t bg-muted/30">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Lock className="h-3 w-3" />
            Colunas bloqueadas não podem ser ocultadas
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ============================================================================
// TABLE HEADER WITH VISIBILITY
// ============================================================================

export interface TableHeaderProps {
  columns: ColumnConfig[];
  onColumnChange: (columns: ColumnConfig[]) => void;
  children?: React.ReactNode;
  className?: string;
}

export function TableHeader({
  columns,
  onColumnChange,
  children,
  className,
}: TableHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between gap-4 mb-4", className)}>
      <div className="flex-1">{children}</div>
      <ColumnVisibility columns={columns} onChange={onColumnChange} />
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export { ColumnItem };
